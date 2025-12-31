import { ResponseGroupWithStatsAndSegment, SegmentVizConfig, SplitWithSegmentGroup, Point } from "./types";
import { generateCartesian } from '../statistics/generateCartesian';
import { Group, GroupingQuestion, ViewMaps } from "../statistics/types";
import { computeSegmentGroupBounds, getWidthHeight } from "./geometry";
import { setBasisSplitIndices } from "../statistics/setBasisSplitIndices";
import { buildSegmentVizViewId } from "./buildSegmentVizViewId";
import { Question } from "shared-schemas";
import { pointImageForResponseGroup } from "../imageGeneration";
import { GroupColorOverride } from "shared-types";

//helper to create a string key for a question, for quick matching
function getQuestionKey(q: Question): string {
  return Object.values(q).join("")
}

export function initializeSplitsWithSegments(segmentVizConfig: SegmentVizConfig): { basisSplitIndices: number[], splits: SplitWithSegmentGroup[], viewMaps: ViewMaps, vizWidth: number, vizHeight: number } {

  //create the array to hold the splits we produce
  const splits: SplitWithSegmentGroup[] = [];
  let splitIdx = -1;

  //create the array to hold all the basis splits
  const allBasisSplits: { splitIdx: number, groups: Group[] }[] = [];

  //track views and their split indices
  const viewMaps: ViewMaps = {};

  //number of x-axis grouping questions (for index offset calculation)
  const numXQuestions = segmentVizConfig.groupingQuestions.x.length;

  //compute the vizWidth and vizHeight (will be returned to caller)
  const [vizWidth, vizHeight] = getWidthHeight(segmentVizConfig);

  //generate the x-axis views
  //viewsX will be an array of arrays, where each inner array
  //consists of {question: GroupingQuestion, active: boolean},
  //indicating which x-axis grouping questions are active in the
  //view represented by the inner array.
  const viewsX = generateCartesian<{ question: GroupingQuestion, active: boolean }>(
    segmentVizConfig.groupingQuestions.x.map((gq) => ([
      {
        question: gq,
        active: true
      },
      {
        question: gq,
        active: false
      }
    ]))
  )
  //generate the y-axis views
  //viewsY will be an array of arrays, where each inner array
  //consists of {question: GroupingQuestion, active: boolean},
  //indicating which y-axis grouping questions are active in the
  //view represented by the inner array.
  const viewsY = generateCartesian<{ question: GroupingQuestion, active: boolean }>(
    segmentVizConfig.groupingQuestions.y.map((gq) => ([
      {
        question: gq,
        active: true
      },
      {
        question: gq,
        active: false
      }
    ]))
  )

  //loop through the x-axis views
  for (const viewX of viewsX) {
    //loop through the y-axis views
    for (const viewY of viewsY) {

      /**
       * viewX and viewY together represent a single "view"
       * in which each x-axis question is either active or not
       * and each y-axis question is either active or not.
       * 
       * Within the view, there are "splits"
       * Each split is defined by a response group
       * or null (meaning "any response group") on each
       * grouping question.
       */

      //determine which grouping questions are active in this view
      //build flat array of active question indices (x-questions first, then y-questions)
      const activeXIndices: number[] = [];
      const activeYIndices: number[] = [];

      //collect active x-axis question indices
      viewX.forEach((gq, xIdx) => {
        if (gq.active) {
          activeXIndices.push(xIdx);
        }
      });

      //collect active y-axis question indices
      viewY.forEach((gq, yIdx) => {
        if (gq.active) {
          activeYIndices.push(yIdx);
        }
      });

      //generate viewId using the canonical helper function
      //This ensures viewMap keys match what clients will generate
      const viewId = buildSegmentVizViewId(activeXIndices, activeYIndices, numXQuestions);

      //determine whether this view uses a color range override and if so which one
      //Store which axis and index it came from for easy lookup later
      let colorRangeOverride: {
        override: GroupColorOverride;
        axis: 'x' | 'y';
        questionIndex: number;
      } | null = null;
      OverrideLoop: for (const override of segmentVizConfig.images.groupColorOverrides) {
        const overrideQuestionKey = getQuestionKey(override.question.question);
        for (const xGroupingQuestionIndex of activeXIndices) {
          if (getQuestionKey(segmentVizConfig.groupingQuestions.x[xGroupingQuestionIndex].question) === overrideQuestionKey) {
            colorRangeOverride = {
              override,
              axis: 'x',
              questionIndex: xGroupingQuestionIndex
            };
            break OverrideLoop;
          }
        }
        for (const yGroupingQuestionIndex of activeYIndices) {
          if (getQuestionKey(segmentVizConfig.groupingQuestions.y[yGroupingQuestionIndex].question) === overrideQuestionKey) {
            colorRangeOverride = {
              override,
              axis: 'y',
              questionIndex: yGroupingQuestionIndex
            };
            break OverrideLoop;
          }
        }
      }
      //colorRangeOverrides is now null if no override applies.
      //Otherwise it is {
      //  override: GroupColorOverride;
      //  axis: 'x' | 'y';
      //  questionIndex: number;
      //}

      //initialize array to track splits for this view
      const viewSplitIndices: number[] = [];
      viewMaps[viewId] = viewSplitIndices;

      //construct the x-axis response groups for the splits
      //at the current view
      const xGroups = generateCartesian<Group>(
        (viewX.map((gq) => {
          if (!gq.active) {
            return ([{
              question: gq.question.question,
              responseGroup: null
            }])
          }
          return (gq.question.responseGroups.map((rg) => ({
            question: gq.question.question,
            responseGroup: rg
          })))
        })) as Group[][]
      )

      //construct the y-axis response groups for the splits
      //at the current view
      const yGroups = generateCartesian<Group>(
        (viewY.map((gq) => {
          if (!gq.active) {
            return ([{
              question: gq.question.question,
              responseGroup: null
            }])
          }
          return (gq.question.responseGroups.map((rg) => ({
            question: gq.question.question,
            responseGroup: rg
          })))
        })) as Group[][]
      )

      //iterate through the x-axis groups
      let xGroupIdx = -1;
      for (const xGroup of xGroups) {
        xGroupIdx++;
        //iterate through the y-axis groups
        let yGroupIdx = -1;
        for (const yGroup of yGroups) {
          yGroupIdx++;

          //here we are!
          //this is a new split!!!

          //increment the split index
          splitIdx++;

          //record that this split belongs to the current view
          viewSplitIndices.push(splitIdx);

          //compute the basis split indices
          const basisSplitIndices: number[] = [];

          //compute the groups array
          const groups: Group[] = [...xGroup, ...yGroup];

          //check if this is a basis split.
          //if so, push it the allBasisSplits array
          if (groups.every((group) => group.responseGroup !== null)) {
            allBasisSplits.push(({
              splitIdx: splitIdx,
              groups: groups
            }))
          }


          //set the totalWeight
          const totalWeight = 0;

          //set the totalCount
          const totalCount = 0;

          //set the segment group bounds
          const segmentGroupBounds = computeSegmentGroupBounds(
            { x: xGroupIdx, y: yGroupIdx },
            { x: xGroups.length, y: yGroups.length },
            vizWidth,
            vizHeight,
            segmentVizConfig.groupGapX,
            segmentVizConfig.groupGapY
          )

          //set the pointIds
          //empty for now, because we are initializing without data.
          const points: Point[][] = segmentVizConfig.responseQuestion.responseGroups.expanded.map((_) => ([]));

          //determine the color range for this split (defaults to base range)
          let colorRangeForSplit: [string, string] = segmentVizConfig.images.baseColorRange;
          if (colorRangeOverride !== null) {
            //The groups array has x-questions first, then y-questions
            //So we can calculate the index: for x-axis use questionIndex directly,
            //for y-axis add numXQuestions to the questionIndex
            const groupIndexInGroups = colorRangeOverride.axis === 'x'
              ? colorRangeOverride.questionIndex
              : numXQuestions + colorRangeOverride.questionIndex;

            const relevantGroup = groups[groupIndexInGroups];

            //relevantGroup.responseGroup should match one in override.question.responseGroups
            if (relevantGroup.responseGroup !== null) {
              //Find which index this responseGroup is in the grouping question's responseGroups
              const responseGroupIndex = colorRangeOverride.override.question.responseGroups.findIndex(
                rg => rg.label === relevantGroup.responseGroup!.label
              );

              if (responseGroupIndex !== -1) {
                //Use the corresponding color range from the override
                colorRangeForSplit = colorRangeOverride.override.colorRanges[responseGroupIndex];
              }
            }
          }

          //set the response-groups-with-stats-and-segments
          const responseGroups: {
            collapsed: ResponseGroupWithStatsAndSegment[],
            expanded: ResponseGroupWithStatsAndSegment[]
          } = {
            collapsed: segmentVizConfig.responseQuestion.responseGroups.collapsed.map((rg, rgIdx) => ({
              ...rg,
              totalCount: 0,
              totalWeight: 0,
              proportion: 0,
              bounds: { x: 0, y: 0, width: 0, height: 0 },
              pointPositions: [], //empty for now, because we are initializing without data
              pointImage: pointImageForResponseGroup({
                colorRange: colorRangeForSplit,
                responseGroupIndex: rgIdx,
                numResponseGroups: segmentVizConfig.responseQuestion.responseGroups.collapsed.length,
                circleRadius: segmentVizConfig.images.circleRadius
              })
            })),
            expanded: segmentVizConfig.responseQuestion.responseGroups.expanded.map((rg, rgIdx) => ({
              ...rg,
              totalCount: 0,
              totalWeight: 0,
              proportion: 0,  //proportions initialized to zero
              bounds: { x: 0, y: 0, width: 0, height: 0 },  //bound initialized to 0.
              pointPositions: [], //empty for now, because we are initializing without data
              pointImage: pointImageForResponseGroup({
                colorRange: colorRangeForSplit,
                responseGroupIndex: rgIdx,
                numResponseGroups: segmentVizConfig.responseQuestion.responseGroups.expanded.length,
                circleRadius: segmentVizConfig.images.circleRadius
              })
            }))
          }

          //push the split
          splits.push(({
            basisSplitIndices: basisSplitIndices,
            groups: groups,
            totalWeight: totalWeight,
            totalCount: totalCount,
            segmentGroupBounds: segmentGroupBounds,
            points: points,
            responseGroups: responseGroups
          }))
        }
      }
    }
  }


  setBasisSplitIndices(splits, allBasisSplits)

  return {
    basisSplitIndices: allBasisSplits.map(bs => bs.splitIdx),
    splits: splits,
    viewMaps: viewMaps,
    vizWidth: vizWidth,
    vizHeight: vizHeight,
  }

}
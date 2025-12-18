import { ResponseGroupWithStatsAndSegment, SegmentVizConfig, SplitWithSegmentGroup, Point } from "./types";
import { generateCartesian } from '../statistics/generateCartesian';
import { Group, GroupingQuestion } from "../statistics/types";
import { computeSegmentGroupBounds, getWidthHeight } from "./geometry";

export function initializeSplitsWithSegments(segmentVizConfig: SegmentVizConfig): { basisSplitIndices: number[], splits: SplitWithSegmentGroup[] } {

  //create the array to hold the splits we produce
  const splits: SplitWithSegmentGroup[] = [];
  let splitIdx = -1;

  //create the array to hold all the basis splits
  const allBasisSplits: { splitIdx: number, groups: Group[] }[] = [];

  //compute the vizWidth and vizHeight
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




      //construct the x-axis response groups for the splits
      //at the current view
      const xGroups = generateCartesian<Group>(
        (viewX.map((gq) => {
          if (gq.active) {
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
          if (gq.active) {
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
          xGroupIdx++;

          //here we are!
          //this is a new split!!!

          //increment the split index
          splitIdx++;

          //compute the basis split indices
          const basisSplitIndices: number[] = [];

          //compute the groups array
          const groups: Group[] = [...xGroup, ...yGroup];

          //check if this is a basis split.
          //if so, push the the allBasisSplits array
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

          //set the response-groups-with-stats-and-segments
          const responseGroups: {
            collapsed: ResponseGroupWithStatsAndSegment[],
            expanded: ResponseGroupWithStatsAndSegment[]
          } = {
            collapsed: segmentVizConfig.responseQuestion.responseGroups.collapsed.map((rg) => ({
              ...rg,
              totalCount: 0,
              totalWeight: 0,
              proportion: 0,
              bounds: { x: 0, y: 0, width: 0, height: 0 },
              pointPositions: [] //empty for now, because we are initializing without data
            })),
            expanded: segmentVizConfig.responseQuestion.responseGroups.expanded.map((rg) => ({
              ...rg,
              totalCount: 0,
              totalWeight: 0,
              proportion: 0,  //proportions initialized to zero
              bounds: { x: 0, y: 0, width: 0, height: 0 },  //bound initialized to 0.
              pointPositions: [] //empty for now, because we are initializing without data
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


  //pass through the whole array to set the basis split indices
  //reset the splitIdx
  splitIdx = 0;
  for (const split of splits) {
    splitIdx++;

    //check whether the current split is a basis split
    if (allBasisSplits.map((bs) => bs.splitIdx).includes(splitIdx)) {
      //if so, set and continue
      split.basisSplitIndices = [splitIdx];
      continue;
    }

    //The current split is not a basis split    
    split.basisSplitIndices = split.groups
      //start with the full array of all basis splits
      //iterate through the groups of the current split
      //at each one, eliminate any remaining basis splits
      //that do not match the current group.
      .reduce(
        (remainingBasisSplits, currGroup, currGroupIdx) => {
          //if the current group is null
          if (currGroup.responseGroup === null) {
            //any remaining basis splits work for the current group
            return remainingBasisSplits;
          }
          //the current group is not null
          return remainingBasisSplits.filter((basisSplit) =>
            basisSplit.groups[currGroupIdx].responseGroup?.label === currGroup.responseGroup?.label)
        },
        allBasisSplits
      )
      .map((basisSplit) => basisSplit.splitIdx)
  }



  return {
    basisSplitIndices: allBasisSplits.map(bs => bs.splitIdx),
    splits: splits
  }

}
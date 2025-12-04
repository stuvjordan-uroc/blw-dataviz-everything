import { GroupingQuestion } from "../types";
import { SegmentVizConfig, SegmentGroup, PointSet } from './types';
import { Statistics } from "../statistics";
import { getQuestionKey } from '../utils';
import { computeSegmentGroupBounds } from "./geometry";
import { getActiveQuestionsInSplit, getNumberSegmentGroups, getIndices, getFullySpecifiedSplitIndices, getBasisSplitIndices } from "./splitAnalysis";
import { populatePoints } from "./pointGeneration";
import { populateVizSegments } from "./segments";



export function initialize(
  statsInstanceRef: Statistics,
  segmentVizConfig: SegmentVizConfig,
  vizWidth: number,
  vizHeight: number) {

  //this will map each response question key to a visualization for that response question
  const vizMap: Map<
    string,
    {
      groupingQuestions: {
        x: GroupingQuestion[];
        y: GroupingQuestion[];
        excludedQuestionKeys: string[];
      };
      fullySpecifiedSplitIndices: number[];
      segmentGroups: SegmentGroup[];
      points: PointSet[];
    }
  > = new Map();

  //we'll need the stats config for a bunch of the computations that follow
  const statsConfig = statsInstanceRef.getStatsConfig();

  //get all the splits from the stats instance...we'll need it to populate 
  //the points arrays and segment groups for each response question
  const allSplits = statsInstanceRef.getSplits()

  //loop through the response questions to construct the viz for each one
  for (const responseQuestion of statsConfig.responseQuestions) {

    //if this response question is not included in the viz config, go to the next one
    if (!(segmentVizConfig.responseQuestionKeys.includes(getQuestionKey(responseQuestion)))) {
      continue;
    }


    //======================================================
    // COMPUTE GROUPING QUESTIONS FOR THIS RESPONSE QUESTION
    //======================================================

    //construct the lists of x and y grouping questions that are included in the viz of this response question
    //It's critical that these list have the same ordering as the keys in segmentVizConfig groupingQuestionKeys.
    //That allows us to correctly order the segment groups along the x and y axes in the viz.

    const groupingQuestionsX: GroupingQuestion[] = [];
    for (const gqKey of segmentVizConfig.groupingQuestionKeys.x) {
      if (gqKey === getQuestionKey(responseQuestion)) {
        continue;
      }
      const fullQ = statsConfig.groupingQuestions.find((gq) => getQuestionKey(gq) === gqKey);
      if (fullQ) {
        groupingQuestionsX.push(fullQ)
      }
    }
    const groupingQuestionsY: GroupingQuestion[] = [];
    for (const gqKey of segmentVizConfig.groupingQuestionKeys.y) {
      if (gqKey === getQuestionKey(responseQuestion)) {
        continue;
      }
      const fullQ = statsConfig.groupingQuestions.find((gq) => getQuestionKey(gq) === gqKey);
      if (fullQ) {
        groupingQuestionsY.push(fullQ)
      }
    }

    //construct the list of grouping questions that are excluded from the viz
    const groupingQuestionsExcludedKeys = statsConfig.groupingQuestions
      .map((gq) => getQuestionKey(gq))
      .filter((gqKey) => (
        !groupingQuestionsX.map((gqX) => getQuestionKey(gqX)).includes(gqKey) &&
        !groupingQuestionsY.map((gqY) => getQuestionKey(gqY)).includes(gqKey)
      ))

    //============================================================================
    // GET THE INDICES OF THE FULLY SPECIFIED SPLITS FOR THIS RESPONSE QUESTION
    //===========================================================================

    // These are the splits that are null on all the excluded questions and 
    // not null on all the included questions.

    // These splits drive the population of the points array

    const fullySpecifiedSplitIndices = getFullySpecifiedSplitIndices({
      allSplits: allSplits,
      groupingQuestionsExcludedKeys: groupingQuestionsExcludedKeys,
      groupingQuestionsX: groupingQuestionsX,
      groupingQuestionsY: groupingQuestionsY
    })

    //==============================================================================
    // POPULATE THE POINTS ARRAY FROM THE SPLITS
    //==============================================================================

    //points will be populated for each fully specified split
    //for this response question
    const newPointSets = populatePoints({
      prevPointSets: [],
      responseQuestion: responseQuestion,
      allSplits: allSplits,
      fullySpecifiedSplitIndices: fullySpecifiedSplitIndices,
      syntheticSampleSize: segmentVizConfig.syntheticSampleSize
    })

    //TODO:  update the rest of code now that the points object has a new type.
    //Then go back to the updating callback

    //=============================================================================
    // SET THE SEGMENT GROUP BOUNDS
    //=============================================================================
    //note that these depend only on the config for the viz and the stats instance
    //ref.  They do NOT depend on the data in the stats instance,
    //and thus they do not change if/when data is hydrated or updated.

    let splitIdx = -1;
    const segmentGroups: SegmentGroup[] = [];
    //loop through the splits
    for (const split of allSplits) {
      splitIdx++;

      //This split is needed for the current response question only if
      //it is null on all groupingQuestions excluded from this viz

      //get the grouping question keys that are null at this split
      const nullKeys = split.groups
        .filter((group) => group.responseGroup === null)
        .map((group) => getQuestionKey(group.question))
      //if any of the excluded grouping questions are NOT in the list of null questions on this split,
      //move on to the next split.
      if (groupingQuestionsExcludedKeys.some((gqKey) => !nullKeys.includes(gqKey))) {
        continue;
      }

      //get questions that are active at this split, along with the response group indices for
      //their response groups at this split
      const activeQuestions = getActiveQuestionsInSplit(split, groupingQuestionsX, groupingQuestionsY);

      //compute the number of segment groups in the view to which this split belongs along each axis
      const numSegmentGroups = getNumberSegmentGroups(activeQuestions);

      //compute the x- and y-indices of the segment group represented by this split in the view to which this group belongs
      const segmentGroupIndices = getIndices(activeQuestions)

      //compute the segment group bounds for this split
      const segmentGroup = computeSegmentGroupBounds(
        segmentGroupIndices,
        numSegmentGroups,
        vizWidth,
        vizHeight,
        segmentVizConfig.groupGapX,
        segmentVizConfig.groupGapY
      )

      //find the basis splits for the current split
      const basisSplitIndices = getBasisSplitIndices({
        split: split,
        allBasisSplitIndices: fullySpecifiedSplitIndices,
        allSplits: allSplits
      })

      //push this segment group onto the segment groups array
      segmentGroups.push({
        splitIndex: splitIdx,
        basisSplitIndices: basisSplitIndices,
        segmentGroup: segmentGroup,
        segments: null
      })
    }

    //==============================================================================
    // POPULATE SEGMENTS WITHIN EACH GROUP, WHERE DATA IS AVAILABLE
    //==============================================================================

    //segmentGroups now holds the un-hydrated segment groups
    //newPointSets now holds the hydrated points
    //to hydrate the segments within the segments groups, 
    // we now need to use the data from statsInstanceRef

    const hydratedSegmentGroups = populateVizSegments({
      responseQuestion: responseQuestion,
      responseGap: segmentVizConfig.responseGap,
      segmentGroups: segmentGroups,
      pointSets: newPointSets,
      allSplits: allSplits
    })

    //===========================================================================
    // SET THE KEY + VALUE IN THE VIZMAP FOR THIS RESPONSE QUESTION
    //===========================================================================
    vizMap.set(getQuestionKey(responseQuestion), {
      groupingQuestions: {
        x: groupingQuestionsX,
        y: groupingQuestionsY,
        excludedQuestionKeys: groupingQuestionsExcludedKeys
      },
      fullySpecifiedSplitIndices: fullySpecifiedSplitIndices,
      points: newPointSets,
      segmentGroups: hydratedSegmentGroups
    })


  }
  return vizMap;
}


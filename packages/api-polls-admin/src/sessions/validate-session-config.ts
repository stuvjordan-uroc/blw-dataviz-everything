import { BadRequestException } from "@nestjs/common";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, or } from "drizzle-orm";
import { questions, sessionConfigSchema } from "shared-schemas";
import type {
  SegmentVizConfig,
  ResponseQuestion,
  GroupingQuestion,
  GroupColorOverride
} from "shared-types";

/**
 * Augmented types with questionKey for validation
 */
type ResponseQuestionWithKey = ResponseQuestion & { questionKey: string };
type GroupingQuestionWithKey = GroupingQuestion & { questionKey: string };
type GroupColorOverrideWithKey = GroupColorOverride & {
  question: GroupingQuestionWithKey
};
type SegmentVizConfigWithKeys = Omit<SegmentVizConfig, 'responseQuestion' | 'groupingQuestions' | 'images'> & {
  responseQuestion: ResponseQuestionWithKey;
  groupingQuestions: {
    x: GroupingQuestionWithKey[];
    y: GroupingQuestionWithKey[];
  };
  images: Omit<SegmentVizConfig['images'], 'groupColorOverrides'> & {
    groupColorOverrides: GroupColorOverrideWithKey[];
  };
};

/**
 * Validate session configuration and all referenced questions
 * 
 * This function consolidates all validation logic for session creation/updates:
 * 1. Validates JSON structure against sessionConfigSchema (Zod)
 * 2. Ensures at least one question in questionOrder
 * 3. Ensures at least one visualization
 * 4. Collects all questions referenced in visualizations (response + grouping)
 * 5. Validates all viz questions are in questionOrder
 * 6. Validates all questions exist in the questions table
 * 7. Performs comprehensive per-visualization validations
 * 
 * @param sessionConfig - The session configuration to validate
 * @param tx - Database transaction or connection to use for question lookup
 * @throws BadRequestException if any validation fails
 */
export async function validateSessionConfig(
  sessionConfig: {
    questionOrder: Array<{ varName: string; batteryName: string; subBattery: string }>;
    visualizations: Array<SegmentVizConfig & { id?: string }>
  },
  tx: ReturnType<typeof drizzle> | Parameters<Parameters<ReturnType<typeof drizzle>['transaction']>[0]>[0]
): Promise<void> {
  // Step 1: Validate JSON structure against Zod schema
  sessionConfigSchema.parse(sessionConfig);

  const { questionOrder } = sessionConfig;

  // Helper function to generate question key
  const getQuestionKey = (q: { varName: string; batteryName: string; subBattery: string }) =>
    `${q.varName}:${q.batteryName}:${q.subBattery}`;

  // Augment all questions with questionKey property for easier validation
  const visualizations = sessionConfig.visualizations as SegmentVizConfigWithKeys[];

  for (const viz of visualizations) {
    // Add questionKey to response question
    viz.responseQuestion.questionKey = getQuestionKey(viz.responseQuestion.question);

    // Add questionKey to all x-axis grouping questions
    for (const gq of viz.groupingQuestions.x) {
      gq.questionKey = getQuestionKey(gq.question);
    }

    // Add questionKey to all y-axis grouping questions
    for (const gq of viz.groupingQuestions.y) {
      gq.questionKey = getQuestionKey(gq.question);
    }

    // Add questionKey to all GroupColorOverrides
    for (const override of viz.images.groupColorOverrides) {
      override.question.questionKey = getQuestionKey(override.question.question);
    }
  }

  // Step 2: Require at least one question in questionOrder
  if (questionOrder.length === 0) {
    throw new BadRequestException(
      "Session must have at least one question in questionOrder array"
    );
  }

  // Step 3: Require at least one visualization
  if (visualizations.length === 0) {
    throw new BadRequestException(
      "Session must have at least one visualization"
    );
  }

  // Step 4: Collect all questions referenced in visualizations
  // Create unique string keys for each question: "varName:batteryName:subBattery"
  const vizQuestions = new Set<string>();
  for (const viz of visualizations) {
    // Add response question
    vizQuestions.add(viz.responseQuestion.questionKey);

    // Add x-axis grouping questions
    for (const gq of viz.groupingQuestions.x) {
      vizQuestions.add(gq.questionKey);
    }

    // Add y-axis grouping questions
    for (const gq of viz.groupingQuestions.y) {
      vizQuestions.add(gq.questionKey);
    }
  }

  // Step 5: Validate all visualization questions are in questionOrder
  // Build a set of question keys from questionOrder for O(1) lookup
  const questionOrderSet = new Set(questionOrder.map(getQuestionKey));

  const missingFromOrder = Array.from(vizQuestions).filter(
    qKey => !questionOrderSet.has(qKey)
  );

  if (missingFromOrder.length > 0) {
    throw new BadRequestException(
      `The following questions are referenced in visualizations but not in questionOrder: ${missingFromOrder.join(", ")}`
    );
  }

  // Step 6: Validate that all questions exist in questions.questions table
  // Build OR conditions for composite key matching (varName, batteryName, subBattery)
  const questionConditions = questionOrder.map((q) =>
    and(
      eq(questions.varName, q.varName),
      eq(questions.batteryName, q.batteryName),
      eq(questions.subBattery, q.subBattery)
    )
  );

  const existingQuestions = await tx
    .select()
    .from(questions)
    .where(or(...questionConditions));

  // Since composite key is unique, we can just check the count
  if (existingQuestions.length !== questionOrder.length) {
    // Find which specific questions are missing for error message
    const missingQuestions = questionOrder.filter((q) => {
      return !existingQuestions.some(
        (eq) =>
          eq.varName === q.varName &&
          eq.batteryName === q.batteryName &&
          eq.subBattery === q.subBattery
      );
    });

    throw new BadRequestException(
      `The following questions do not exist in the question bank: ${missingQuestions
        .map(
          (q) =>
            `(varName: ${q.varName}, battery: ${q.batteryName}, subBattery: ${q.subBattery || "(none)"})`
        )
        .join(", ")}`
    );
  }

  // Step 7: Validate each visualization in the config
  for (const viz of visualizations) {
    /**
     * On the response question, 
     * values of each expanded response group are a subset of the values
     * of exactly one collapsed response group.
     */
    for (const expRg of viz.responseQuestion.responseGroups.expanded) {
      const matchingCollapsed = viz.responseQuestion.responseGroups.collapsed.filter(
        collRg => expRg.values.every(val => collRg.values.includes(val))
      );

      if (matchingCollapsed.length === 0) {
        throw new BadRequestException(
          `Expanded response group "${expRg.label}" values are not a subset of any collapsed response group`
        );
      }
      if (matchingCollapsed.length > 1) {
        throw new BadRequestException(
          `Expanded response group "${expRg.label}" values match multiple collapsed response groups: ${matchingCollapsed.map(c => c.label).join(', ')}`
        );
      }
    }

    /**
     * On the response question,
     * the values arrays of the expanded response groups are 
     * mutually exclusive
     */
    const allExpandedValues = viz.responseQuestion.responseGroups.expanded.flatMap(rg => rg.values);
    const uniqueExpandedValues = new Set(allExpandedValues);
    if (allExpandedValues.length !== uniqueExpandedValues.size) {
      throw new BadRequestException(
        `Response question expanded response groups have overlapping values (values must be mutually exclusive)`
      );
    }

    /**
     * On the response question, the union of values from the collapsed 
     * response group exactly equal the union of values from the expanded
     * response groups.
     */
    const collapsedUnion = new Set(viz.responseQuestion.responseGroups.collapsed.flatMap(rg => rg.values));
    const expandedUnion = new Set(viz.responseQuestion.responseGroups.expanded.flatMap(rg => rg.values));

    if (collapsedUnion.size !== expandedUnion.size ||
      ![...collapsedUnion].every(val => expandedUnion.has(val))) {
      throw new BadRequestException(
        `Response question collapsed and expanded response groups must have the same union of values`
      );
    }

    /**
     * The response question does not appear in either
     * groupingQuestions.x or groupingQuestions.y
     */
    const responseQKey = viz.responseQuestion.questionKey;
    const groupingQKeys = [
      ...viz.groupingQuestions.x.map(gq => gq.questionKey),
      ...viz.groupingQuestions.y.map(gq => gq.questionKey)
    ];

    if (groupingQKeys.includes(responseQKey)) {
      throw new BadRequestException(
        `Response question (${responseQKey}) cannot also be a grouping question`
      );
    }

    /**
     * neither groupingQuestions.x nor groupingQuestions.y have repeats
     */
    const xKeys = viz.groupingQuestions.x.map(gq => gq.questionKey);
    const yKeys = viz.groupingQuestions.y.map(gq => gq.questionKey);

    if (new Set(xKeys).size !== xKeys.length) {
      throw new BadRequestException(`groupingQuestions.x contains duplicate questions`);
    }
    if (new Set(yKeys).size !== yKeys.length) {
      throw new BadRequestException(`groupingQuestions.y contains duplicate questions`);
    }

    /**
     * groupingQuestions.x and groupingQuestions.y are non-overlapping 
     */
    const ySet = new Set(yKeys);
    const overlap = xKeys.filter(key => ySet.has(key));

    if (overlap.length > 0) {
      throw new BadRequestException(
        `groupingQuestions.x and groupingQuestions.y overlap: ${overlap.join(', ')}`
      );
    }

    /**
     * For every question in the union of responseQuestion,
     * groupingQuestions.x, and groupingQuestions.y...
     * 
     * (a) values arrays are mutually exclusive across the response groups.
     * (b) each response group's label is different from those of the other response groups on the question.
     */
    const allQuestions = [
      { questionKey: viz.responseQuestion.questionKey, responseGroups: viz.responseQuestion.responseGroups.expanded, type: 'expanded' },
      { questionKey: viz.responseQuestion.questionKey, responseGroups: viz.responseQuestion.responseGroups.collapsed, type: 'collapsed' },
      ...viz.groupingQuestions.x.map(gq => ({ questionKey: gq.questionKey, responseGroups: gq.responseGroups })),
      ...viz.groupingQuestions.y.map(gq => ({ questionKey: gq.questionKey, responseGroups: gq.responseGroups }))
    ];

    for (const q of allQuestions) {
      // Check (a): mutually exclusive values
      const allValues = q.responseGroups.flatMap(rg => rg.values);
      const uniqueValues = new Set(allValues);
      if (allValues.length !== uniqueValues.size) {
        const typeInfo = 'type' in q ? ` (${q.type})` : '';
        throw new BadRequestException(
          `Question ${q.questionKey}${typeInfo} has overlapping values across response groups (values must be mutually exclusive)`
        );
      }

      // Check (b): unique labels
      const labels = q.responseGroups.map(rg => rg.label);
      const uniqueLabels = new Set(labels);
      if (labels.length !== uniqueLabels.size) {
        const typeInfo = 'type' in q ? ` (${q.type})` : '';
        throw new BadRequestException(
          `Question ${q.questionKey}${typeInfo} has duplicate response group labels (labels must be unique)`
        );
      }
    }

    /**
     * If syntheticSampleSize is defined, it is a strictly positive integer.
     */
    if (viz.syntheticSampleSize !== undefined) {
      if (!Number.isInteger(viz.syntheticSampleSize) || viz.syntheticSampleSize <= 0) {
        throw new BadRequestException(
          `syntheticSampleSize must be a strictly positive integer, got: ${viz.syntheticSampleSize}`
        );
      }
    }

    /**
     * All lengths are non-negative.
     */
    const lengths = [
      { name: 'minGroupAvailableWidth', value: viz.minGroupAvailableWidth },
      { name: 'minGroupHeight', value: viz.minGroupHeight },
      { name: 'groupGapX', value: viz.groupGapX },
      { name: 'groupGapY', value: viz.groupGapY },
      { name: 'responseGap', value: viz.responseGap },
      { name: 'baseSegmentWidth', value: viz.baseSegmentWidth }
    ];

    for (const { name, value } of lengths) {
      if (value < 0) {
        throw new BadRequestException(`${name} must be non-negative, got: ${value}`);
      }
    }

    /**
     * images.circleRadius is strictly positive.
     */
    if (viz.images.circleRadius <= 0) {
      throw new BadRequestException(
        `images.circleRadius must be strictly positive, got: ${viz.images.circleRadius}`
      );
    }

    /**
     * For each GroupColorOverride in images.groupColorOverrides,
     * the length of the colorRanges array equal to the length of
     * question.responseGroups.
     */
    for (const override of viz.images.groupColorOverrides) {
      if (override.colorRanges.length !== override.question.responseGroups.length) {
        const qKey = override.question.questionKey;
        throw new BadRequestException(
          `GroupColorOverride for ${qKey} has ${override.colorRanges.length} color ranges but question has ${override.question.responseGroups.length} response groups (must be equal)`
        );
      }
    }
  }
}

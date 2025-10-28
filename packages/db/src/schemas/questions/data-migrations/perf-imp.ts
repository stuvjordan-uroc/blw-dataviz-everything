import type {
  DataMigrationConfig,
  TableRowsMap,
} from "../../../types/migrations";
import type { BatteryInsert, QuestionInsert } from "../schema";
import { fetchS3File } from "../../../scripts/utils";

export const config: DataMigrationConfig = {
  name: "perfImpQuestions",
  schemaName: "questions",
  dataSources: [
    {
      s3Key: "questions.json",
      tableName: "batteries",
      transformer: perfImpBatteriesTransformer,
    },
    {
      s3Key: "questions.json",
      tableName: "questions",
      transformer: perfImpQuestionsTransformer,
    },
  ],
  rollback: perfImpRollback,
};

type ImpPerfQuestionsJson = {
  prefix_importance: string;
  prefix_performance: string;
  prompts: {
    variable_name: string;
    question_text: string;
    short_text: string;
    category: string;
  }[];
};

async function perfImpBatteriesTransformer(
  s3Key: string
): Promise<TableRowsMap> {
  const questionsJSON = (await fetchS3File(
    s3Key,
    "json"
  )) as ImpPerfQuestionsJson;
  const subBatteries = new Set(
    questionsJSON.prompts.map((prompt) => prompt.category)
  );
  const rows = [
    {
      name: "dem_chacteristics_importance",
      subBatteries: [...subBatteries],
      prefix: questionsJSON.prefix_importance,
    },
    {
      name: "dem_chacteristics_performance",
      subBatteries: [...subBatteries],
      prefix: questionsJSON.prefix_performance,
    },
  ] as BatteryInsert[];
  return {
    batteries: rows,
  };
}

async function perfImpQuestionsTransformer(
  s3Key: string
): Promise<TableRowsMap> {
  const questionsJSON = (await fetchS3File(
    s3Key,
    "json"
  )) as ImpPerfQuestionsJson;
  const rows: QuestionInsert[] = questionsJSON.prompts
    .map((prompt) => ({
      varName: prompt.variable_name,
      text: prompt.question_text,
      batteryName: "democratic_characterstics_importance",
      subBattery: prompt.category,
      responses: ["Not relevant -- This is not "], //TODO
    }))
    .concat(
      questionsJSON.prompts.map((prompt) => ({
        varName: prompt.variable_name,
        text: prompt.question_text,
        batteryName: "democratic_characterstics_performance",
        subBattery: prompt.category,
        responses: ["The U.S. does not meet this standard"], //TODO
      }))
    );
  return {
    questions: rows,
  };
}

//TODO

function perfImpRollback(): Promise<void> {}

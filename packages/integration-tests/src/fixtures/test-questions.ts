import type { BatteryInsert, SubBatteryInsert, QuestionInsert } from "shared-schemas";

/**
 * Test battery fixture
 */
export const testBattery: BatteryInsert = {
  name: "test",
  prefix: null,
};

/**
 * Test sub-battery fixture
 */
export const testSubBattery: SubBatteryInsert = {
  batteryName: "test",
  name: "test",
};

/**
 * Test questions fixtures
 * All questions belong to battery "test" and subBattery "test"
 */
export const testQuestions: QuestionInsert[] = [
  {
    varName: "satisfaction",
    text: "How satisfied are you overall?",
    batteryName: "test",
    subBattery: "test",
    responses: [
      "Very dissatisfied",
      "Somewhat dissatisfied",
      "Neutral",
      "Somewhat satisfied",
      "Very satisfied",
      "Skipped",
    ],
  },
  {
    varName: "mood",
    text: "How would you describe your current mood?",
    batteryName: "test",
    subBattery: "test",
    responses: [
      "Very negative",
      "Negative",
      "Neutral",
      "Positive",
      "Very positive",
      "Prefer not to say",
    ],
  },
  {
    varName: "gender",
    text: "What is your gender?",
    batteryName: "test",
    subBattery: "test",
    responses: [
      "Male",
      "Female",
      "Non-binary",
      "Other",
      "Prefer not to say",
      "Skipped",
    ],
  },
  {
    varName: "race",
    text: "What is your race/ethnicity?",
    batteryName: "test",
    subBattery: "test",
    responses: [
      "White",
      "Black or African American",
      "Asian",
      "Hispanic or Latino",
      "Native American or Alaska Native",
      "Two or more races",
      "Other",
      "Prefer not to say",
    ],
  },
  {
    varName: "age",
    text: "What is your age group?",
    batteryName: "test",
    subBattery: "test",
    responses: [
      "18-24",
      "25-34",
      "35-44",
      "45-54",
      "55-64",
      "65+",
      "Prefer not to say",
    ],
  },
  {
    varName: "education",
    text: "What is your highest level of education?",
    batteryName: "test",
    subBattery: "test",
    responses: [
      "Less than high school",
      "High school graduate",
      "Some college",
      "Associate degree",
      "Bachelor's degree",
      "Graduate or professional degree",
      "Skipped",
    ],
  },
];


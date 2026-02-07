/**
 * HierarchicalQuestionList - Displays questions organized by battery and sub-battery
 *
 * This component groups consecutive questions that share the same battery/sub-battery
 * context into visual cards, displaying prefixes once per group to reduce redundancy.
 *
 * Visual hierarchy:
 * - Battery Card (outermost): Groups questions from the same battery
 *   - Battery Prefix: User-facing context text shown once per battery group
 *   - Sub-Battery Card (nested): Groups questions from the same sub-battery
 *     - Sub-Battery Prefix: Additional context shown once per sub-battery group
 *     - Question Cards: Individual questions with radio button responses
 */

import type { QuestionWithDetails } from "shared-types";
import { groupQuestionsByHierarchy } from "../utils/groupQuestions";
import * as styles from "./HierarchicalQuestionList.css";

interface HierarchicalQuestionListProps {
  questions: QuestionWithDetails[];
  answers: Map<string, number | string>;
  onAnswerChange: (varName: string, value: number | string) => void;
}

export function HierarchicalQuestionList({
  questions,
  answers,
  onAnswerChange,
}: HierarchicalQuestionListProps) {
  // Group questions hierarchically
  const batteryGroups = groupQuestionsByHierarchy(questions);

  return (
    <div>
      {batteryGroups.map((batteryGroup, batteryIndex) => (
        <div key={batteryIndex} className={styles.batteryCard}>
          {/* Battery prefix - shown once per battery group */}
          {batteryGroup.batteryPrefix && (
            <div className={styles.batteryPrefix}>
              {batteryGroup.batteryPrefix}
            </div>
          )}

          {/* Sub-battery groups within this battery */}
          {batteryGroup.subBatteryGroups.map((subBatteryGroup, subIndex) => (
            <div key={subIndex}>
              {/* Only create a sub-battery card if there's a prefix to show */}
              {subBatteryGroup.subBatteryPrefix ? (
                <div className={styles.subBatteryCard}>
                  {/* Sub-battery prefix */}
                  <div className={styles.subBatteryPrefix}>
                    {subBatteryGroup.subBatteryPrefix}
                  </div>

                  {/* Questions within this sub-battery */}
                  {subBatteryGroup.questions.map((question, qIndex) => (
                    <QuestionCard
                      key={`${batteryIndex}-${subIndex}-${qIndex}`}
                      question={question}
                      answers={answers}
                      onAnswerChange={onAnswerChange}
                    />
                  ))}
                </div>
              ) : (
                // No sub-battery prefix - render questions directly within battery card
                subBatteryGroup.questions.map((question, qIndex) => (
                  <QuestionCard
                    key={`${batteryIndex}-${subIndex}-${qIndex}`}
                    question={question}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                  />
                ))
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * QuestionCard - Renders an individual question with its response options
 */
interface QuestionCardProps {
  question: QuestionWithDetails;
  answers: Map<string, number | string>;
  onAnswerChange: (varName: string, value: number | string) => void;
}

function QuestionCard({
  question,
  answers,
  onAnswerChange,
}: QuestionCardProps) {
  return (
    <div className={styles.questionCard}>
      {/* Question text */}
      <div className={styles.questionText}>
        {question.text || question.varName}
      </div>

      {/* Response options (radio buttons) */}
      {question.responses && question.responses.length > 0 && (
        <div className={styles.responseList}>
          {question.responses.map((response, responseIndex) => {
            // Get the actual DB index for this response
            const dbIndex = question.responseIndices[responseIndex];
            return (
              <label key={responseIndex} className={styles.responseOption}>
                <input
                  type="radio"
                  name={`question-${question.varName}-${question.batteryName}-${question.subBattery}`}
                  value={dbIndex}
                  checked={answers.get(question.varName) === dbIndex}
                  onChange={() => onAnswerChange(question.varName, dbIndex)}
                  className={styles.radioInput}
                />
                {response}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

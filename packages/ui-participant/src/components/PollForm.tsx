import { useState, FormEvent } from "react";
import type { QuestionWithDetails, RespondentAnswer } from "shared-types";
import * as styles from "./PollForm.css";

interface PollFormProps {
  questions: QuestionWithDetails[];
  sessionId: number;
  submitEndpoint: string;
  onSuccess: () => void;
}

export function PollForm({
  questions,
  sessionId,
  submitEndpoint,
  onSuccess,
}: PollFormProps) {
  // Store answer as response index (number) for multiple choice, or text (string) for free-form
  const [answers, setAnswers] = useState<Map<string, number | string>>(
    new Map(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswerChange = (varName: string, value: number | string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      newAnswers.set(varName, value);
      return newAnswers;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Convert Map to RespondentAnswer array
    const respondentAnswers: RespondentAnswer[] = questions
      .filter((q) => answers.has(q.varName))
      .map((q) => {
        const answer = answers.get(q.varName);
        return {
          varName: q.varName,
          batteryName: q.batteryName,
          subBattery: q.subBattery,
          responseIndex:
            typeof answer === "number"
              ? answer
              : parseInt(answer as string, 10),
        };
      });

    try {
      const response = await fetch(submitEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          answers: respondentAnswers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit responses");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allQuestionsAnswered = questions.every((q) => answers.has(q.varName));

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.questionList}>
        {questions.map((question, index) => (
          <div key={index} className={styles.questionCard}>
            <label className={styles.questionLabel}>
              <div className={styles.questionText}>
                {index + 1}. {question.text || question.varName}
              </div>
              {question.responses && question.responses.length > 0 ? (
                <div className={styles.responseList}>
                  {question.responses.map((response, responseIndex) => (
                    <label
                      key={responseIndex}
                      className={styles.responseOption}
                    >
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={responseIndex}
                        checked={
                          answers.get(question.varName) === responseIndex
                        }
                        onChange={() =>
                          handleAnswerChange(question.varName, responseIndex)
                        }
                        className={styles.radioInput}
                      />
                      {response}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={answers.get(question.varName) || ""}
                  onChange={(e) =>
                    handleAnswerChange(question.varName, e.target.value)
                  }
                  className={styles.textInput}
                />
              )}
            </label>
          </div>
        ))}
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <button
        type="submit"
        disabled={!allQuestionsAnswered || isSubmitting}
        className={`${styles.submitButton} ${
          allQuestionsAnswered && !isSubmitting
            ? styles.submitButtonEnabled
            : styles.submitButtonDisabled
        }`}
      >
        {isSubmitting ? "Submitting..." : "Submit Responses"}
      </button>
    </form>
  );
}

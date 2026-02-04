import { useState, FormEvent } from "react";
import type { QuestionWithDetails, RespondentAnswer } from "shared-types";
import * as styles from "./PollForm.css";

interface PollFormProps {
  questions: QuestionWithDetails[];
  sessionId: number;
  submitEndpoint: string;
  onSuccess: () => void;
  onError: (errorMessage: string) => void;
}

export function PollForm({
  questions,
  sessionId,
  submitEndpoint,
  onSuccess,
  onError,
}: PollFormProps) {
  // Store answer as response index (number) for multiple choice, or text (string) for free-form
  const [answers, setAnswers] = useState<Map<string, number | string>>(
    new Map(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        // Try to parse JSON error response, fallback to generic message
        let errorMessage = "Failed to submit your responses. Please try again.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Response wasn't JSON, use status-specific message
          if (response.status === 404) {
            errorMessage =
              "This session was not found. Please check your link.";
          } else if (response.status >= 500) {
            errorMessage = "Server error. Please try again in a moment.";
          }
        }
        throw new Error(errorMessage);
      }

      // Submission successful - navigate to visualization view
      onSuccess();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.";
      // Don't stay on the form - navigate to error state
      onError(errorMessage);
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

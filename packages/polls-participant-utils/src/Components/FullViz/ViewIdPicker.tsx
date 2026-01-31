import { useState, useEffect, useId } from "react";
import type { ViewIdLookup, GroupingQuestion } from "shared-types";

/**
 * Headless hook for ViewIdPicker logic
 *
 * Tracks which questions are active (matching ViewIdLookup structure)
 * and automatically computes + notifies parent of viewId changes.
 */
function useViewIdPicker(
  allQuestions: GroupingQuestion[],
  viewIdLookup: ViewIdLookup,
  initialViewId: string,
  onViewIdChange: (viewId: string) => void,
) {
  // Find the base view (all questions inactive) to use as fallback
  const baseView = viewIdLookup.find(([questions]) =>
    questions.every((q) => !q.active),
  );

  if (!baseView) {
    throw new Error(
      "ViewIdLookup must contain a base view with all questions inactive",
    );
  }

  // State mirrors ViewIdLookup format: array of {question, active}
  const [questionStates, setQuestionStates] = useState(() => {
    // Find the initial view in viewIdLookup
    const initialEntry = viewIdLookup.find(
      ([_, viewId]) => viewId === initialViewId,
    );
    if (initialEntry) {
      return initialEntry[0];
    }
    // Fallback: use base view
    return baseView[0];
  });

  // Find matching viewId and notify parent when question states change
  useEffect(() => {
    for (const [questions, viewId] of viewIdLookup) {
      const matches = questions.every(
        (q, i) => q.active === questionStates[i].active,
      );
      if (matches) {
        onViewIdChange(viewId);
        return;
      }
    }
    // Fallback: use base view's viewId
    onViewIdChange(baseView[1]);
  }, [questionStates, viewIdLookup, onViewIdChange]);

  const toggleQuestion = (index: number) => {
    setQuestionStates((prev) =>
      prev.map((qs, i) => (i === index ? { ...qs, active: !qs.active } : qs)),
    );
  };

  return { questionStates, toggleQuestion };
}

/**
 * ViewIdPicker - UI control for selecting which view to display
 *
 * Allows user to select which grouping questions are active,
 * which determines the viewId and thus which splits are visible.
 *
 * Uses ViewIdLookup to map question selections to viewIds.
 */
export interface ViewIdPickerProps {
  /**
   * All grouping questions (x-axis questions first, then y-axis questions)
   */
  allQuestions: GroupingQuestion[];

  /**
   * Lookup structure mapping active question combinations to viewIds
   */
  viewIdLookup: ViewIdLookup;

  /**
   * Initial viewId to display (determines which questions start as active)
   */
  initialViewId: string;

  /**
   * Optional label text for the control group.
   * If provided, renders a label element associated with the button group.
   */
  label?: string;

  /**
   * Callback fired when user selects a different view
   */
  onViewIdChange: (viewId: string) => void;
}

export function ViewIdPicker({
  allQuestions,
  viewIdLookup,
  initialViewId,
  label,
  onViewIdChange,
}: ViewIdPickerProps) {
  const { questionStates, toggleQuestion } = useViewIdPicker(
    allQuestions,
    viewIdLookup,
    initialViewId,
    onViewIdChange,
  );

  const labelId = label ? `view-id-picker-label-${useId()}` : undefined;

  return (
    <div
      className="view-id-picker"
      role="group"
      aria-labelledby={labelId}
      aria-label={!label ? "Select grouping questions" : undefined}
    >
      {label && (
        <div id={labelId} className="view-id-picker__label">
          {label}
        </div>
      )}
      {questionStates.map((qs, index) => (
        <button
          key={index}
          role="button"
          aria-pressed={qs.active}
          tabIndex={0}
          onClick={() => toggleQuestion(index)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleQuestion(index);
            }
          }}
          className={`view-id-picker__question${
            qs.active ? " view-id-picker__question--active" : ""
          }`}
        >
          {qs.question.questionDisplayLabel}
        </button>
      ))}
    </div>
  );
}

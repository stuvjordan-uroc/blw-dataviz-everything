import React, { useState, useCallback } from "react";

/**
 * Headless hook for DisplayModePicker logic
 *
 * Manages toggle state between expanded and collapsed modes.
 * Provides accessibility props for the toggle button.
 */
function useDisplayModePicker(
  onDisplayModeChange: (mode: "expanded" | "collapsed") => void,
  initialMode: "expanded" | "collapsed" = "expanded",
  labelId?: string,
) {
  const [currentMode, setCurrentMode] = useState<"expanded" | "collapsed">(
    initialMode,
  );

  const toggleMode = useCallback(() => {
    const newMode = currentMode === "expanded" ? "collapsed" : "expanded";
    setCurrentMode(newMode);
    onDisplayModeChange(newMode);
  }, [currentMode, onDisplayModeChange]);

  const getToggleProps = useCallback(() => {
    const baseProps = {
      role: "switch" as const,
      "aria-checked": currentMode === "expanded",
      tabIndex: 0,
      onClick: toggleMode,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleMode();
        }
      },
    };

    // Use aria-labelledby if label is provided, otherwise aria-label
    if (labelId) {
      return {
        ...baseProps,
        "aria-labelledby": labelId,
      };
    } else {
      return {
        ...baseProps,
        "aria-label": `Display mode: ${currentMode}`,
      };
    }
  }, [currentMode, toggleMode, labelId]);

  return {
    currentMode,
    toggleMode,
    getToggleProps,
  };
}

/**
 * DisplayModePicker - UI control for toggling between expanded and collapsed display modes
 *
 * Expanded mode: Shows all response groups from the expanded responseGroups array
 * Collapsed mode: Shows aggregated response groups from the collapsed responseGroups array
 */
export interface DisplayModePickerProps {
  /**
   * Callback fired when user toggles display mode
   */
  onDisplayModeChange: (mode: "expanded" | "collapsed") => void;

  /**
   * Initial display mode (defaults to "expanded")
   */
  initialMode?: "expanded" | "collapsed";

  /**
   * Label text for the control (e.g., "Display Mode", "Response Groups")
   * If provided, will render a label element with proper ARIA association
   */
  label?: string;
}

export function DisplayModePicker({
  onDisplayModeChange,
  initialMode = "expanded",
  label,
}: DisplayModePickerProps) {
  const labelId = label ? "display-mode-picker-label" : undefined;
  const picker = useDisplayModePicker(
    onDisplayModeChange,
    initialMode,
    labelId,
  );

  return (
    <div className="display-mode-picker">
      {label && (
        <label id={labelId} className="display-mode-picker__control-label">
          {label}
        </label>
      )}
      <button
        {...picker.getToggleProps()}
        className={`display-mode-picker__toggle display-mode-picker__toggle--${picker.currentMode}`}
      >
        <span className="display-mode-picker__state-label">
          {picker.currentMode === "expanded" ? "Expanded" : "Collapsed"}
        </span>
      </button>
    </div>
  );
}

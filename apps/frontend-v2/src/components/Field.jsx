import React from "react";

// Label, control, hint, and error, wired with ids for screen readers.
export default function Field({ label, hint, error, optional, counter, children }) {
  const id = React.useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  const control = React.Children.only(children);
  return (
    <div className={`field ${error ? "field-invalid" : ""}`}>
      <div className="field-top">
        <label htmlFor={id}>
          {label}
          {optional && <span className="field-optional">Optional</span>}
        </label>
        {counter && <span className="field-counter">{counter}</span>}
      </div>
      {React.cloneElement(control, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

export const counterText = (value, max) => `${value.length}/${max}`;

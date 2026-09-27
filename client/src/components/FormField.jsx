import { cloneElement } from "react";
import { PasswordInput } from "./PasswordInput.jsx";

export function FormField({ label, error, hint, children, ...props }) {
  const id = props.id || props.name || children?.props?.name;
  const control = children ? (
    cloneElement(children, {
      id: children.props.id || id,
      "aria-invalid": Boolean(error),
      "aria-describedby": error ? `${id}-error` : undefined,
    })
  ) : props.type === "password" ? (
    <PasswordInput
      id={id}
      visibilityLabel={label.toLowerCase()}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
    />
  ) : (
    <input
      id={id}
      className="field"
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
    />
  );
  return (
    <div className="block">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>
      {control}{" "}
      {error ? (
        <span
          id={`${id}-error`}
          className="mt-1.5 block text-xs font-medium text-rose-600"
        >
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </div>
  );
}

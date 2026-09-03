export function Spinner({ label = "Loading" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

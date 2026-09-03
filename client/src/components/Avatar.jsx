import { useEffect, useState } from "react";

export function getAvatarInitial({ email, initial, name } = {}) {
  const value = initial || email?.trim()?.charAt(0) || name?.trim()?.charAt(0);
  return value?.toUpperCase() || "C";
}

export function Avatar({
  src,
  email,
  initial,
  name,
  className = "size-10",
  imageClassName = "",
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  const label = name || email || "CampusCollab member";
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 font-black text-brand-700 ${className}`}
      aria-label={`${label} avatar`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className={`size-full object-cover ${imageClassName}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">
          {getAvatarInitial({ email, initial, name })}
        </span>
      )}
    </span>
  );
}

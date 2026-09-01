const VERSION = 1;

export function pendingGigKey(userId) {
  return `campuscollab:pending-gig:${userId}`;
}

export function readPendingGig(userId) {
  if (!userId || typeof window === "undefined") return null;
  try {
    const value = JSON.parse(
      window.localStorage.getItem(pendingGigKey(userId)),
    );
    return value?.version === VERSION && value.values ? value : null;
  } catch {
    return null;
  }
}

export function savePendingGig(userId, values, selectedSkills) {
  if (!userId || typeof window === "undefined") return;
  const meaningful =
    values.title?.trim() ||
    values.description?.trim() ||
    values.category?.trim() ||
    selectedSkills.length;
  if (!meaningful) {
    clearPendingGig(userId);
    return;
  }
  window.localStorage.setItem(
    pendingGigKey(userId),
    JSON.stringify({
      version: VERSION,
      values,
      selectedSkills,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function clearPendingGig(userId) {
  if (!userId || typeof window === "undefined") return;
  window.localStorage.removeItem(pendingGigKey(userId));
}

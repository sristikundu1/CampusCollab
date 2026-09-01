export function calculateProfileCompletion(
  profile,
  publishedPortfolioCount = 0,
) {
  const checks = [
    [10, Boolean(profile.displayName?.trim())],
    [10, Boolean(profile.headline?.trim())],
    [20, Boolean(profile.bio?.trim())],
    [10, Boolean(profile.department?.trim() || profile.graduationYear)],
    [10, Boolean(profile.experienceLevel)],
    [
      10,
      profile.availability?.status &&
        profile.availability.status !== "UNAVAILABLE",
    ],
    [15, (profile.skillEntries?.length ?? 0) > 0],
    [5, (profile.externalLinks?.length ?? 0) > 0],
    [10, publishedPortfolioCount > 0],
  ];
  const score = checks.reduce(
    (total, [weight, complete]) => total + (complete ? weight : 0),
    0,
  );
  return {
    completionScore: score,
    isCompleteForApplications:
      score >= 70 &&
      Boolean(profile.bio?.trim()) &&
      (profile.skillEntries?.length ?? 0) > 0,
  };
}

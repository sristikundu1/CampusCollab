import { Check, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar.jsx";
import { CustomSkillForm } from "../components/skills/CustomSkillForm.jsx";
import { useAuth } from "../context/auth-context.js";
import { useToast } from "../context/toast-context.js";
import { AppShell } from "../layouts/AppShell.jsx";
import { apiError, profileApi, skillApi } from "../services/api.js";

export function ProfileOnboardingPage() {
  const { user, syncProfileSummary } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [catalogue, setCatalogue] = useState([]);
  const [selected, setSelected] = useState({});
  const [department, setDepartment] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([profileApi.own(), skillApi.list()])
      .then(([profileResponse, skillsResponse]) => {
        const nextProfile = profileResponse.data.data.profile;
        setProfile(nextProfile);
        setCatalogue(skillsResponse.data.data.skills);
        setDepartment(nextProfile.department ?? "");
        setExperienceLevel(nextProfile.experienceLevel ?? "");
        setHoursPerWeek(nextProfile.availability?.hoursPerWeek ?? "");
        setSelected(
          Object.fromEntries(
            (nextProfile.skills ?? []).map((skill) => [
              skill.id,
              { skillId: skill.id, level: skill.level ?? "BEGINNER" },
            ]),
          ),
        );
      })
      .catch((reason) => setError(apiError(reason).message))
      .finally(() => setLoading(false));
  }, []);

  const selectedCount = useMemo(() => Object.keys(selected).length, [selected]);

  const toggleSkill = (skill) =>
    setSelected((current) => {
      if (current[skill.id]) {
        const next = { ...current };
        delete next[skill.id];
        return next;
      }
      return {
        ...current,
        [skill.id]: { skillId: skill.id, level: "BEGINNER" },
      };
    });

  const createSkill = async (body) => {
    try {
      const skill = (await skillApi.create(body)).data.data.skill;
      setCatalogue((current) =>
        current.some((entry) => entry.id === skill.id)
          ? current
          : [...current, skill].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSelected((current) => ({
        ...current,
        [skill.id]: { skillId: skill.id, level: "BEGINNER" },
      }));
      notify("Skill added and selected.");
      return skill;
    } catch (reason) {
      notify(apiError(reason).message, "error");
      return null;
    }
  };

  const finish = async (status) => {
    if (busy) return;
    setError("");
    const hours = Number(hoursPerWeek);
    if (
      status === "COMPLETE" &&
      hoursPerWeek !== "" &&
      (!Number.isInteger(hours) || hours < 1 || hours > 80)
    ) {
      setError("Hours per week must be a whole number between 1 and 80.");
      return;
    }
    setBusy(true);
    try {
      if (status === "COMPLETE") {
        await profileApi.replaceSkills(Object.values(selected));
        if (hoursPerWeek !== "")
          await profileApi.updateAvailability({
            status: "AVAILABLE",
            hoursPerWeek: hours,
            availableFrom: null,
          });
      }
      const updated = (
        await profileApi.update({
          ...(status === "COMPLETE" && department.trim()
            ? { department: department.trim() }
            : {}),
          ...(status === "COMPLETE" && experienceLevel
            ? { experienceLevel }
            : {}),
          onboardingStatus: status,
        })
      ).data.data.profile;
      syncProfileSummary?.(updated);
      setSelected({});
      setDepartment("");
      setExperienceLevel("");
      setHoursPerWeek("");
      notify(
        status === "SKIPPED"
          ? "You can complete your profile at any time."
          : "Profile setup saved.",
      );
      navigate("/dashboard", { replace: true });
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <AppShell>
        <div className="mx-auto h-96 max-w-4xl animate-pulse rounded-3xl bg-slate-200" />
      </AppShell>
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <section className="surface overflow-hidden">
          <div className="border-b border-slate-100 bg-brand-50/60 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar
                src={profile?.avatarUrl}
                email={profile?.email || user?.email}
                initial={profile?.avatarInitial}
                name={profile?.displayName}
                className="size-20 border-4 border-white text-2xl shadow-sm"
              />
              <div>
                <p className="eyebrow flex items-center gap-2">
                  <Sparkles size={15} /> Optional profile setup
                </p>
                <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
                  Help people discover your strengths
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Add as much or as little as you want. You can skip this and
                  update everything later from Profile.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-7 p-6 sm:p-8">
            {error && (
              <p
                className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"
                role="alert"
              >
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Department
                </span>
                <input
                  className="field"
                  maxLength={120}
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  placeholder="e.g. CSE"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Experience level
                </span>
                <select
                  className="field"
                  value={experienceLevel}
                  onChange={(event) => setExperienceLevel(event.target.value)}
                >
                  <option value="">Not selected</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Hours per week
                </span>
                <input
                  className="field"
                  type="number"
                  min="1"
                  max="80"
                  value={hoursPerWeek}
                  onChange={(event) => setHoursPerWeek(event.target.value)}
                  placeholder="e.g. 10"
                />
              </label>
            </div>
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Skills & Technologies
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Select existing skills or add your own.
                  </p>
                </div>
                <span className="text-xs font-bold text-brand-700">
                  {selectedCount} selected
                </span>
              </div>
              <div className="mt-4 flex max-h-56 flex-wrap content-start gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-4">
                {catalogue.map((skill) => {
                  const active = Boolean(selected[skill.id]);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition ${active ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"}`}
                    >
                      {active && <Check size={13} />} {skill.name}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">
                <CustomSkillForm compact onCreate={createSkill} />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => finish("SKIPPED")}
              >
                Skip for now
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => finish("COMPLETE")}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="animate-spin" size={17} /> Saving…
                  </>
                ) : (
                  "Save and continue"
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

import { Check, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../context/toast-context.js";
import { AppShell } from "../layouts/AppShell.jsx";
import { apiError, projectApi, skillApi } from "../services/api.js";
const blankOpening = () => ({
  roleName: "",
  description: "",
  capacity: 1,
  requiredSkillIds: [],
});
export function ProjectFormPage() {
  const { projectId } = useParams(),
    edit = Boolean(projectId),
    navigate = useNavigate(),
    { notify } = useToast();
  const [form, setForm] = useState({
      title: "",
      description: "",
      projectType: "ACADEMIC",
      visibility: "PLATFORM",
      requiredSkillIds: [],
      expectedStartAt: "",
      expectedEndAt: "",
      openings: [blankOpening()],
    }),
    [skills, setSkills] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    void skillApi.list().then((r) => setSkills(r.data.data.skills));
    if (edit)
      void projectApi.get(projectId).then(({ data }) => {
        const p = data.data.project;
        setForm({
          title: p.title,
          description: p.description,
          projectType: p.projectType,
          visibility: p.visibility,
          requiredSkillIds: p.skills.map((s) => s.id),
          expectedStartAt: p.expectedStartAt?.slice(0, 10) || "",
          expectedEndAt: p.expectedEndAt?.slice(0, 10) || "",
          openings: p.openings.map((o) => ({
            id: o.id,
            roleName: o.roleName,
            description: o.description,
            capacity: o.capacity,
            requiredSkillIds: o.skills.map((s) => s.id),
          })),
        });
      });
  }, [edit, projectId]);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const opening = (i, key, value) =>
    setForm((f) => ({
      ...f,
      openings: f.openings.map((o, index) =>
        index === i ? { ...o, [key]: value } : o,
      ),
    }));
  const toggle = (values, id) =>
    values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const base = {
        title: form.title,
        description: form.description,
        projectType: form.projectType,
        visibility: form.visibility,
        requiredSkillIds: form.requiredSkillIds,
        ...(form.expectedStartAt
          ? { expectedStartAt: new Date(form.expectedStartAt).toISOString() }
          : {}),
        ...(form.expectedEndAt
          ? { expectedEndAt: new Date(form.expectedEndAt).toISOString() }
          : {}),
      };
      let id = projectId;
      if (edit) {
        await projectApi.update(projectId, base);
        for (const role of form.openings)
          role.id
            ? await projectApi.updateOpening(projectId, role.id, {
                roleName: role.roleName,
                description: role.description,
                capacity: Number(role.capacity),
                requiredSkillIds: role.requiredSkillIds,
              })
            : await projectApi.addOpening(projectId, {
                ...role,
                capacity: Number(role.capacity),
              });
      } else {
        id = (
          await projectApi.create({
            ...base,
            openings: form.openings.map((o) => ({
              ...o,
              capacity: Number(o.capacity),
            })),
          })
        ).data.data.project.id;
      }
      notify(edit ? "Project updated." : "Project draft created.");
      navigate(`/my-projects/${id}/manage`);
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Collaboration workspace</p>
        <h1 className="mt-2 text-3xl font-black">
          {edit ? "Edit project" : "Create a project"}
        </h1>
        <p className="mt-2 text-slate-600">
          Define the outcome and specific roles students can join.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-6">
          <section className="surface grid gap-5 p-6 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-bold">
              Project title
              <input
                required
                minLength={5}
                className="field mt-2"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </label>
            <label className="sm:col-span-2 text-sm font-bold">
              Description
              <textarea
                required
                minLength={20}
                className="field mt-2 min-h-40"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
            <label className="text-sm font-bold">
              Type
              <select
                className="field mt-2"
                value={form.projectType}
                onChange={(e) => set("projectType", e.target.value)}
              >
                {[
                  "RESEARCH",
                  "ACADEMIC",
                  "STARTUP",
                  "HACKATHON",
                  "PERSONAL",
                  "OTHER",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold">
              Visibility
              <select
                className="field mt-2"
                value={form.visibility}
                onChange={(e) => set("visibility", e.target.value)}
              >
                <option value="PLATFORM">All CampusCollab students</option>
                <option value="UNIVERSITY">My university only</option>
                <option value="PRIVATE">Private</option>
              </select>
            </label>
            <label className="text-sm font-bold">
              Expected start
              <input
                className="field mt-2"
                type="date"
                value={form.expectedStartAt}
                onChange={(e) => set("expectedStartAt", e.target.value)}
              />
            </label>
            <label className="text-sm font-bold">
              Expected end
              <input
                className="field mt-2"
                type="date"
                value={form.expectedEndAt}
                onChange={(e) => set("expectedEndAt", e.target.value)}
              />
            </label>
          </section>
          <SkillPicker
            title="Project skills"
            skills={skills}
            selected={form.requiredSkillIds}
            onToggle={(id) =>
              set("requiredSkillIds", toggle(form.requiredSkillIds, id))
            }
          />
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Team openings</h2>
                <p className="text-sm text-slate-500">
                  Create clear roles with guarded capacity.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  set("openings", [...form.openings, blankOpening()])
                }
              >
                <Plus size={16} />
                Add role
              </button>
            </div>
            {form.openings.map((o, i) => (
              <div key={o.id || i} className="surface p-6">
                <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
                  <label className="text-sm font-bold">
                    Role name
                    <input
                      required
                      className="field mt-2"
                      value={o.roleName}
                      onChange={(e) => opening(i, "roleName", e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-bold">
                    Capacity
                    <input
                      required
                      min="1"
                      max="100"
                      type="number"
                      className="field mt-2"
                      value={o.capacity}
                      onChange={(e) => opening(i, "capacity", e.target.value)}
                    />
                  </label>
                  <label className="sm:col-span-2 text-sm font-bold">
                    Role description
                    <textarea
                      required
                      className="field mt-2 min-h-24"
                      value={o.description}
                      onChange={(e) =>
                        opening(i, "description", e.target.value)
                      }
                    />
                  </label>
                </div>
                <SkillPicker
                  title="Role skills"
                  skills={skills}
                  selected={o.requiredSkillIds}
                  onToggle={(id) =>
                    opening(
                      i,
                      "requiredSkillIds",
                      toggle(o.requiredSkillIds, id),
                    )
                  }
                />
                {form.openings.length > 1 && !o.id && (
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-rose-700"
                    onClick={() =>
                      set(
                        "openings",
                        form.openings.filter((_, x) => x !== i),
                      )
                    }
                  >
                    <Trash2 size={15} />
                    Remove role
                  </button>
                )}
              </div>
            ))}
          </section>
          {error && (
            <p className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <button disabled={busy} className="btn-primary">
              <Save size={17} />
              {busy ? "Saving…" : "Save project"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
function SkillPicker({ title, skills, selected, onToggle }) {
  return (
    <fieldset className="surface p-5">
      <legend className="px-2 text-sm font-black">{title}</legend>
      <div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
        {skills.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={() => onToggle(s.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${selected.includes(s.id) ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600"}`}
          >
            {selected.includes(s.id) && <Check size={13} />} {s.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

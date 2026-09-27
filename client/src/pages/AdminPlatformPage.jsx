import { Building2, Plus, ShieldCheck, Tags, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "../context/toast-context.js";
import { AppShell } from "../layouts/AppShell.jsx";
import { confirmAction } from "../lib/confirm-action.js";
import { adminApi, apiError } from "../services/api.js";

const label = (value) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());

export function AdminPlatformPage() {
  const { notify } = useToast();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [skill, setSkill] = useState({ name: "", category: "" });
  const [university, setUniversity] = useState({
    name: "",
    shortName: "",
    countryCode: "BD",
  });

  const load = useCallback(async () => {
    setError("");
    try {
      const [userResponse, skillResponse, universityResponse] =
        await Promise.all([
          adminApi.users(),
          adminApi.skills(),
          adminApi.universities(),
        ]);
      setUsers(userResponse.data.data.users);
      setSkills(skillResponse.data.data.skills);
      setUniversities(universityResponse.data.data.universities);
    } catch (reason) {
      setError(apiError(reason).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const userAction = async (user, action) => {
    if (
      !(await confirmAction({
        title:
          action === "suspend"
            ? "Suspend this account?"
            : "Reinstate this account?",
        text: "This administrative action is immediate and permanently audited.",
        confirmText:
          action === "suspend" ? "Suspend account" : "Reinstate account",
        icon: "warning",
        danger: action === "suspend",
      }))
    )
      return;
    setBusy(user.id);
    try {
      const body = {
        reasonCode:
          action === "suspend" ? "ADMIN_SAFETY_ACTION" : "ADMIN_REINSTATED",
      };
      if (action === "suspend") await adminApi.suspendUser(user.id, body);
      else await adminApi.reinstateUser(user.id, body);
      notify(`Account ${action === "suspend" ? "suspended" : "reinstated"}.`);
      await load();
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setBusy("");
    }
  };

  const createSkill = async (event) => {
    event.preventDefault();
    setBusy("skill");
    try {
      await adminApi.createSkill({ ...skill, aliases: [] });
      setSkill({ name: "", category: "" });
      notify("Skill added.");
      await load();
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setBusy("");
    }
  };

  const createUniversity = async (event) => {
    event.preventDefault();
    setBusy("university");
    try {
      await adminApi.createUniversity({ ...university, status: "PROPOSED" });
      setUniversity({ name: "", shortName: "", countryCode: "BD" });
      notify("University added for review.");
      await load();
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <AppShell>
      <div>
        <p className="eyebrow">Restricted administration</p>
        <h1 className="mt-2 text-3xl font-black">Platform administration</h1>
        <p className="mt-2 text-slate-600">
          Manage accounts and trusted reference data through scoped, audited
          commands.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["users", "Users", Users],
            ["skills", "Skills", Tags],
            ["universities", "Universities", Building2],
          ].map(([value, text, Icon]) => (
            <button
              key={value}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${tab === value ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
              onClick={() => setTab(value)}
            >
              <Icon size={16} /> {text}
            </button>
          ))}
        </div>
        {error && (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-700">
            {error}
          </p>
        )}
        {tab === "users" && (
          <section className="surface mt-6 overflow-hidden">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black">Accounts</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-black">{user.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {label(user.status)}
                    </p>
                  </div>
                  {user.status === "ACTIVE" ? (
                    <button
                      className="btn-secondary !text-rose-700"
                      disabled={busy === user.id}
                      onClick={() => userAction(user, "suspend")}
                    >
                      Suspend
                    </button>
                  ) : [
                      "TEMPORARILY_SUSPENDED",
                      "INDEFINITELY_SUSPENDED",
                    ].includes(user.status) ? (
                    <button
                      className="btn-secondary"
                      disabled={busy === user.id}
                      onClick={() => userAction(user, "reinstate")}
                    >
                      Reinstate
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )}
        {tab === "skills" && (
          <section className="surface mt-6 p-5">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Tags /> Skill catalogue
            </h2>
            <form
              className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
              onSubmit={createSkill}
            >
              <input
                aria-label="Skill name"
                className="field"
                placeholder="Skill name"
                required
                value={skill.name}
                onChange={(event) =>
                  setSkill((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <input
                aria-label="Skill category"
                className="field"
                placeholder="Category"
                required
                value={skill.category}
                onChange={(event) =>
                  setSkill((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              />
              <button className="btn-primary" disabled={busy === "skill"}>
                <Plus size={16} /> Add
              </button>
            </form>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {skills.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="font-black">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.category} · {item.status}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
        {tab === "universities" && (
          <section className="surface mt-6 p-5">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Building2 /> Universities and domains
            </h2>
            <form
              className="mt-5 grid gap-3 sm:grid-cols-[1fr_140px_90px_auto]"
              onSubmit={createUniversity}
            >
              <input
                aria-label="University name"
                className="field"
                placeholder="University name"
                required
                value={university.name}
                onChange={(event) =>
                  setUniversity((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <input
                aria-label="University short name"
                className="field"
                placeholder="Short name"
                value={university.shortName}
                onChange={(event) =>
                  setUniversity((current) => ({
                    ...current,
                    shortName: event.target.value,
                  }))
                }
              />
              <input
                aria-label="Country code"
                className="field"
                maxLength={2}
                required
                value={university.countryCode}
                onChange={(event) =>
                  setUniversity((current) => ({
                    ...current,
                    countryCode: event.target.value.toUpperCase(),
                  }))
                }
              />
              <button className="btn-primary" disabled={busy === "university"}>
                <Plus size={16} /> Add
              </button>
            </form>
            <div className="mt-5 space-y-3">
              {universities.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-indigo-600" />
                    <p className="font-black">{item.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.countryCode} · {item.status}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {item.domains?.map((domain) => domain.domain).join(", ") ||
                      "No domains configured"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

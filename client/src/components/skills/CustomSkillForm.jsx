import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";

export function CustomSkillForm({ onCreate, compact = false }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event?.preventDefault();
    if (name.trim().length < 2 || category.trim().length < 2) return;
    setSaving(true);
    try {
      const created = await onCreate({
        name: name.trim(),
        category: category.trim(),
      });
      if (created) {
        setName("");
        setCategory("");
      }
    } finally {
      setSaving(false);
    }
  };
  const Container = compact ? "div" : "form";
  return (
    <Container
      {...(!compact ? { onSubmit: submit } : {})}
      className={`rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-center gap-2 text-sm font-bold text-brand-900">
        <Plus size={16} /> Add a skill not listed
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Create a reusable skill for your profile and future gigs.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          aria-label="Custom skill name"
          className="field !py-2.5"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Three.js"
          maxLength={80}
        />
        <input
          aria-label="Custom skill category"
          className="field !py-2.5"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="e.g. Frontend"
          maxLength={80}
        />
        <button
          type={compact ? "button" : "submit"}
          onClick={compact ? submit : undefined}
          className="btn-secondary !px-4 !py-2.5"
          disabled={
            saving || name.trim().length < 2 || category.trim().length < 2
          }
        >
          {saving ? (
            <LoaderCircle className="animate-spin" size={16} />
          ) : (
            <Plus size={16} />
          )}{" "}
          Add
        </button>
      </div>
    </Container>
  );
}

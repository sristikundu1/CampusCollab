import { zodResolver } from "@hookform/resolvers/zod";
import { Check, LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { FormField } from "../FormField.jsx";
import { CustomSkillForm } from "../skills/CustomSkillForm.jsx";

const schema = z
  .object({
    title: z.string().trim().min(5, "Use at least 5 characters").max(180),
    description: z
      .string()
      .trim()
      .min(20, "Describe the work in at least 20 characters")
      .max(10000),
    category: z.string().trim().min(2).max(80),
    workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]),
    locationText: z.string().trim().max(160),
    visibility: z.enum(["PLATFORM", "UNIVERSITY"]),
    capacity: z.coerce.number().int().min(1).max(100),
    deadlineAt: z.string(),
    budgetType: z.enum(["UNPAID", "FIXED", "RANGE"]),
    minAmount: z.string(),
    maxAmount: z.string(),
    currency: z.string().trim().length(3),
  })
  .superRefine((value, context) => {
    if (
      value.budgetType !== "UNPAID" &&
      (!value.minAmount || Number(value.minAmount) < 0)
    )
      context.addIssue({
        code: "custom",
        path: ["minAmount"],
        message: "Enter a valid amount",
      });
    if (
      value.budgetType === "RANGE" &&
      Number(value.maxAmount) < Number(value.minAmount)
    )
      context.addIssue({
        code: "custom",
        path: ["maxAmount"],
        message: "Maximum must be at least the minimum",
      });
  });

export function GigForm({ initial, skills, saving, onSubmit, onCreateSkill }) {
  const budget = initial?.budget;
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title || "",
      description: initial?.description || "",
      category: initial?.category || "",
      workMode: initial?.workMode || "REMOTE",
      locationText: initial?.locationText || "",
      visibility: initial?.visibility || "PLATFORM",
      capacity: initial?.capacity || 1,
      deadlineAt: initial?.deadlineAt
        ? new Date(initial.deadlineAt).toISOString().slice(0, 16)
        : "",
      budgetType: budget?.type || "UNPAID",
      minAmount:
        budget?.minMinor !== undefined ? String(budget.minMinor / 100) : "",
      maxAmount:
        budget?.maxMinor !== undefined ? String(budget.maxMinor / 100) : "",
      currency: budget?.currency || "BDT",
    },
  });
  const [selected, setSelected] = useStateFromInitial(initial?.skills || []);
  const budgetType = watch("budgetType");
  const createSkill = async (input) => {
    const skill = await onCreateSkill(input);
    if (skill)
      setSelected((current) =>
        current.some((entry) => entry.id === skill.id)
          ? current
          : [...current, { id: skill.id, level: "BEGINNER" }],
      );
    return skill;
  };
  const submit = (values) =>
    onSubmit({
      title: values.title,
      description: values.description,
      category: values.category,
      workMode: values.workMode,
      locationText: values.locationText || undefined,
      visibility: values.visibility,
      capacity: values.capacity,
      deadlineAt: values.deadlineAt
        ? new Date(values.deadlineAt).toISOString()
        : null,
      skillRequirements: selected.map((entry) => ({
        skillId: entry.id,
        level: entry.level,
        required: true,
      })),
      budget:
        values.budgetType === "UNPAID"
          ? { type: "UNPAID" }
          : {
              type: values.budgetType,
              minMinor: Math.round(Number(values.minAmount) * 100),
              ...(values.budgetType === "RANGE"
                ? { maxMinor: Math.round(Number(values.maxAmount) * 100) }
                : {}),
              currency: values.currency.toUpperCase(),
            },
    });
  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="surface space-y-6 p-5 sm:p-7"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField label="Gig title" error={errors.title?.message}>
            <input
              className="field"
              {...register("title")}
              placeholder="Build a responsive student club website"
            />
          </FormField>
        </div>
        <div>
          <FormField label="Category" error={errors.category?.message}>
            <input
              className="field"
              {...register("category")}
              placeholder="Web Development"
            />
          </FormField>
        </div>
        <div>
          <FormField label="Capacity" error={errors.capacity?.message}>
            <input className="field" type="number" {...register("capacity")} />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label="Description" error={errors.description?.message}>
            <textarea
              className="field min-h-44 resize-y"
              {...register("description")}
              placeholder="Explain the scope, deliverables, and ideal collaborator…"
            />
          </FormField>
        </div>
        <div>
          <FormField label="Work mode">
            <select className="field" {...register("workMode")}>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">On-site</option>
            </select>
          </FormField>
        </div>
        <div>
          <FormField label="Location">
            <input
              className="field"
              {...register("locationText")}
              placeholder="Dhaka or campus building"
            />
          </FormField>
        </div>
        <div>
          <FormField label="Visibility">
            <select className="field" {...register("visibility")}>
              <option value="PLATFORM">All CampusCollab students</option>
              <option value="UNIVERSITY">My university only</option>
            </select>
          </FormField>
        </div>
        <div>
          <FormField label="Application deadline">
            <input
              className="field"
              type="datetime-local"
              {...register("deadlineAt")}
            />
          </FormField>
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-bold">Required skills</legend>
        <p className="mt-1 text-xs text-slate-500">
          Choose skills and the expected proficiency. Add a custom skill when
          the catalogue does not include it.
        </p>
        <div className="mt-3">
          <CustomSkillForm compact onCreate={createSkill} />
        </div>
        <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3 sm:grid-cols-2">
          {skills.map((skill) => {
            const entry = selected.find((item) => item.id === skill.id);
            return (
              <div
                key={skill.id}
                className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 ${entry ? "border-brand-200 bg-brand-50" : "border-transparent bg-slate-50"}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      entry
                        ? selected.filter((item) => item.id !== skill.id)
                        : [...selected, { id: skill.id, level: "BEGINNER" }],
                    )
                  }
                  className="flex min-w-0 items-center gap-2 text-left text-sm font-semibold"
                >
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded ${entry ? "bg-brand-600 text-white" : "border border-slate-300 bg-white"}`}
                  >
                    {entry && <Check size={13} />}
                  </span>
                  <span>
                    <span className="block truncate">{skill.name}</span>
                    <span className="block text-[11px] font-medium text-slate-500">
                      {skill.category}
                    </span>
                  </span>
                </button>
                {entry && (
                  <select
                    aria-label={`${skill.name} required level`}
                    className="rounded-lg border border-brand-200 bg-white p-1.5 text-xs"
                    value={entry.level}
                    onChange={(event) =>
                      setSelected(
                        selected.map((item) =>
                          item.id === skill.id
                            ? { ...item, level: event.target.value }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-bold">Budget indication</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <FormField label="Type">
            <select className="field" {...register("budgetType")}>
              <option value="UNPAID">Unpaid collaboration</option>
              <option value="FIXED">Fixed</option>
              <option value="RANGE">Range</option>
            </select>
          </FormField>
          {budgetType !== "UNPAID" && (
            <>
              <FormField
                label={budgetType === "RANGE" ? "Minimum" : "Amount"}
                error={errors.minAmount?.message}
              >
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register("minAmount")}
                />
              </FormField>
              {budgetType === "RANGE" && (
                <FormField label="Maximum" error={errors.maxAmount?.message}>
                  <input
                    className="field"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("maxAmount")}
                  />
                </FormField>
              )}
              <FormField label="Currency">
                <input
                  className="field uppercase"
                  maxLength={3}
                  {...register("currency")}
                />
              </FormField>
            </>
          )}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <button className="btn-primary" disabled={saving}>
          {saving ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <Save size={17} />
          )}{" "}
          {initial ? "Save changes" : "Create draft"}
        </button>
      </div>
    </form>
  );
}

function useStateFromInitial(skills) {
  return useState(
    skills.map((skill) => ({ id: skill.id, level: skill.level || "BEGINNER" })),
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Spinner } from "../Spinner.jsx";

const schema = z.object({
  status: z.enum(["AVAILABLE", "LIMITED", "UNAVAILABLE"]),
  hoursPerWeek: z.coerce.number().int().min(0).max(80),
  availableFrom: z.string(),
});
export function AvailabilityEditor({ availability, saving, onSave }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      status: availability?.status ?? "UNAVAILABLE",
      hoursPerWeek: availability?.hoursPerWeek ?? 0,
      availableFrom: availability?.availableFrom
        ? String(availability.availableFrom).slice(0, 10)
        : "",
    },
  });
  const submit = (values) =>
    onSave({
      status: values.status,
      hoursPerWeek:
        values.status === "UNAVAILABLE" ? null : values.hoursPerWeek,
      availableFrom: values.availableFrom
        ? new Date(`${values.availableFrom}T00:00:00.000Z`).toISOString()
        : null,
    });
  return (
    <section className="surface p-6">
      <p className="eyebrow">Availability</p>
      <h2 className="mt-1 text-xl font-bold">When you can contribute</h2>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit(submit)}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Status</span>
          <select className="field" {...register("status")}>
            <option value="AVAILABLE">Available</option>
            <option value="LIMITED">Limited availability</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-semibold">
              Hours per week
            </span>
            <input
              className="field"
              type="number"
              {...register("hoursPerWeek")}
            />
            {errors.hoursPerWeek && (
              <span className="text-xs text-rose-600">
                {errors.hoursPerWeek.message}
              </span>
            )}
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold">
              Available from
            </span>
            <input
              className="field"
              type="date"
              {...register("availableFrom")}
            />
          </label>
        </div>
        <button className="btn-primary w-full" disabled={saving}>
          {saving ? <Spinner label="Saving" /> : "Update availability"}
        </button>
      </form>
    </section>
  );
}

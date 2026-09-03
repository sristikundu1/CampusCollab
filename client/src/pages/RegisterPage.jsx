import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormField } from "../components/FormField.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { AuthLayout } from "../layouts/AuthLayout.jsx";
import { apiError, authApi } from "../services/api.js";
const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");
const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    email: z.string().email("Enter a valid university email"),
    password,
    confirmPassword: z.string(),
    primaryExperience: z.enum(["SEEKING_WORK", "OWNING_WORK"]),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export function RegisterPage() {
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { primaryExperience: "SEEKING_WORK" },
  });
  const submit = async (values) => {
    setSubmitting(true);
    try {
      const { data } = await authApi.register(values);
      if (data.data.requiresEmailVerification) {
        navigate("/verify-email", {
          state: { email: values.email, message: data.data.message },
        });
      } else {
        navigate("/login", {
          replace: true,
          state: {
            registrationMessage: data.data.message,
            registeredNow: true,
          },
        });
      }
    } catch (error) {
      const parsed = apiError(error);
      for (const item of parsed.details)
        if (item.path) setError(item.path, { message: item.message });
      if (!parsed.details.length) setError("root", { message: parsed.message });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <AuthLayout
      eyebrow="Join the community"
      title="Create your student account"
      subtitle="Use your university email so CampusCollab can keep the community trusted."
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <FormField
          label="Full name"
          autoComplete="name"
          placeholder="Your name"
          error={errors.name?.message}
          {...register("name")}
        />
        <FormField
          label="University email"
          type="email"
          autoComplete="email"
          placeholder="you@university.edu"
          error={errors.email?.message}
          {...register("email")}
        />
        <div>
          <label
            htmlFor="primary-experience"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            I’m primarily here to
          </label>
          <select
            id="primary-experience"
            className="field"
            {...register("primaryExperience")}
          >
            <option value="SEEKING_WORK">Find work and collaborate</option>
            <option value="OWNING_WORK">Build a team or offer work</option>
          </select>
        </div>
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 10 characters"
          error={errors.password?.message}
          {...register("password")}
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {errors.root && (
          <p
            className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            {errors.root.message}
          </p>
        )}
        <button className="btn-primary w-full" disabled={submitting}>
          {submitting ? <Spinner label="Creating account" /> : "Create account"}
        </button>
        <p className="text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-brand-600">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

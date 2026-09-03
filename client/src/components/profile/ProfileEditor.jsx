import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "../FormField.jsx";
import { Spinner } from "../Spinner.jsx";
import { Avatar } from "../Avatar.jsx";
import { prepareAvatarImage } from "../../lib/avatar-image.js";

const schema = z.object({
  displayName: z.string().trim().min(2).max(80),
  headline: z.string().trim().max(120),
  department: z.string().trim().max(120),
  graduationYear: z.union([
    z.literal(""),
    z.coerce.number().int().min(1900).max(2200),
  ]),
  bio: z.string().trim().max(2000),
  experienceLevel: z.enum(["", "BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  visibility: z.enum(["PLATFORM", "UNIVERSITY", "PRIVATE"]),
  website: z.union([
    z.literal(""),
    z
      .string()
      .url()
      .refine((value) => value.startsWith("https://"), "Use an HTTPS URL"),
  ]),
  github: z.union([
    z.literal(""),
    z
      .string()
      .url()
      .refine((value) => value.startsWith("https://"), "Use an HTTPS URL"),
  ]),
  linkedin: z.union([
    z.literal(""),
    z
      .string()
      .url()
      .refine((value) => value.startsWith("https://"), "Use an HTTPS URL"),
  ]),
});

export function ProfileEditor({ profile, email, saving, onCancel, onSave }) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? null);
  const [avatarError, setAvatarError] = useState("");
  const [processingImage, setProcessingImage] = useState(false);
  const links = Object.fromEntries(
    (profile.externalLinks ?? []).map((link) => [
      link.type.toLowerCase(),
      link.url,
    ]),
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: profile.displayName ?? "",
      headline: profile.headline ?? "",
      department: profile.department ?? "",
      graduationYear: profile.graduationYear ?? "",
      bio: profile.bio ?? "",
      experienceLevel: profile.experienceLevel ?? "",
      visibility: profile.visibility ?? "PLATFORM",
      website: links.website ?? "",
      github: links.github ?? "",
      linkedin: links.linkedin ?? "",
    },
  });
  const submit = (values) =>
    onSave({
      displayName: values.displayName,
      avatarUrl,
      headline: values.headline,
      department: values.department,
      graduationYear: values.graduationYear || null,
      bio: values.bio,
      experienceLevel: values.experienceLevel || null,
      visibility: values.visibility,
      externalLinks: [
        ["WEBSITE", values.website],
        ["GITHUB", values.github],
        ["LINKEDIN", values.linkedin],
      ]
        .filter(([, url]) => url)
        .map(([type, url]) => ({ type, url })),
    });
  const chooseAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarError("");
    setProcessingImage(true);
    try {
      setAvatarUrl(await prepareAvatarImage(file));
    } catch (error) {
      setAvatarError(error.message);
    } finally {
      setProcessingImage(false);
    }
  };
  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="surface mt-6 space-y-5 p-6"
      noValidate
    >
      <div>
        <p className="eyebrow">Edit profile</p>
        <h2 className="mt-1 text-xl font-bold">Your professional identity</h2>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
        <Avatar
          src={avatarUrl}
          email={email}
          name={profile.displayName}
          className="size-20 border-4 border-white text-2xl shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Profile photo</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            JPEG, PNG, or WebP. The image is cropped and compressed securely.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="btn-secondary cursor-pointer !px-4 !py-2">
              {processingImage ? "Preparing…" : "Choose photo"}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={processingImage || saving}
                onChange={chooseAvatar}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                className="btn-secondary !px-4 !py-2 text-rose-700"
                onClick={() => setAvatarUrl(null)}
                disabled={processingImage || saving}
              >
                Remove photo
              </button>
            )}
          </div>
          {avatarError && (
            <p
              className="mt-2 text-xs font-semibold text-rose-600"
              role="alert"
            >
              {avatarError}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Display name"
          error={errors.displayName?.message}
          {...register("displayName")}
        />
        <FormField
          label="Headline"
          placeholder="MERN developer and product builder"
          error={errors.headline?.message}
          {...register("headline")}
        />
        <FormField
          label="Department"
          placeholder="Computer Science and Engineering"
          error={errors.department?.message}
          {...register("department")}
        />
        <FormField
          label="Graduation year"
          type="number"
          error={errors.graduationYear?.message}
          {...register("graduationYear")}
        />
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          About
        </span>
        <textarea className="field min-h-32 resize-y" {...register("bio")} />
        {errors.bio && (
          <span className="mt-1 block text-xs text-rose-600">
            {errors.bio.message}
          </span>
        )}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Experience level
          </span>
          <select className="field" {...register("experienceLevel")}>
            <option value="">Not selected</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Profile visibility
          </span>
          <select className="field" {...register("visibility")}>
            <option value="PLATFORM">Everyone on CampusCollab</option>
            <option value="UNIVERSITY">My university</option>
            <option value="PRIVATE">Private</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          label="Website"
          placeholder="https://..."
          error={errors.website?.message}
          {...register("website")}
        />
        <FormField
          label="GitHub"
          placeholder="https://github.com/..."
          error={errors.github?.message}
          {...register("github")}
        />
        <FormField
          label="LinkedIn"
          placeholder="https://linkedin.com/in/..."
          error={errors.linkedin?.message}
          {...register("linkedin")}
        />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" disabled={saving || processingImage}>
          {saving ? <Spinner label="Saving" /> : "Save profile"}
        </button>
      </div>
    </form>
  );
}

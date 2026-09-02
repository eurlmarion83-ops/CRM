"use client";

import { useRef, useState, useTransition } from "react";
import { ALLOWED_IMAGE_TYPES, MAX_PROFILE_PHOTO_BYTES } from "@/lib/attachments";
import { updatePractitionerPhotoAction, removePractitionerPhotoAction } from "./actions";

export function PhotoUpload({ currentPhotoUrl, initials }: { currentPhotoUrl: string | null; initials: string }) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Format non supporté (PNG, JPEG ou WebP uniquement).");
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setError("Image trop volumineuse (2 Mo maximum).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPreview(dataUrl);
      const formData = new FormData();
      formData.set("name", file.name);
      formData.set("type", file.type);
      formData.set("data", dataUrl);
      startTransition(() => updatePractitionerPhotoAction(formData));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- photo encodée en base64, pas d'optimisation next/image utile
        <img src={preview} alt="Photo de profil" className="h-20 w-20 rounded-full object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-light text-xl font-semibold text-brand-dark">
          {initials}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <input ref={fileInputRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} onChange={handleFileChange} className="hidden" />
        <button
          type="button"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full border border-brand px-4 py-2 text-sm font-medium text-brand-dark hover:bg-brand-light disabled:opacity-50"
        >
          {isPending ? "Envoi..." : "Changer la photo"}
        </button>
        {preview && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setPreview(null);
              startTransition(() => removePractitionerPhotoAction());
            }}
            className="text-xs text-danger underline disabled:opacity-50"
          >
            Retirer la photo
          </button>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}

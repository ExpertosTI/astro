"use client";

import { useRef, useState } from "react";
import { processImageFile, isLikelyImageFile } from "@/lib/image-process";
import styles from "@/app/match/match.module.css";

type Props = {
  value?: string;
  onChange: (url: string) => void;
  onError: (msg: string) => void;
  label?: string;
  variant?: "avatar" | "thumb" | "grid";
};

export function ImageUploader({
  value,
  onChange,
  onError,
  label = "Subir foto",
  variant = "grid",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!isLikelyImageFile(file)) {
      onError("Selecciona una imagen (JPG, PNG, WebP, HEIC…)");
      return;
    }
    setLoading(true);
    onError("");
    try {
      const url = await processImageFile(file);
      onChange(url);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al procesar imagen");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const className =
    variant === "avatar"
      ? styles.avatarUploader
      : variant === "thumb"
        ? styles.photoThumb
        : styles.photoAdd;

  return (
    <label className={className} title={label}>
      {loading ? (
        <span className={styles.uploadSpinner} />
      ) : value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className={styles.uploadPreview} />
      ) : (
        <span className={styles.uploadPlus}>+</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        disabled={loading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </label>
  );
}

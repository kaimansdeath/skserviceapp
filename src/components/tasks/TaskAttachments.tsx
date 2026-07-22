"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { deleteAttachment } from "@/app/actions/attachments";

export type AttachmentItem = {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  byUserName: string | null;
  createdAt: string;
};

/**
 * Фото/відео задачі: перегляд, довантаження "постфактум" (навіть для закритої задачі),
 * вставка з буфера обміну (Ctrl+V), drag&drop, видалення (керівник відділу).
 */
export default function TaskAttachments({
  taskId,
  items,
  canUpload,
  canDelete,
}: {
  taskId: string;
  items: AttachmentItem[];
  canUpload: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("tasks");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: File[]) {
    const list = files.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (list.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of list) fd.append("files", f);
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError(t("uploadError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-neutral-700">
        {t("attachments")}{" "}
        <span className="font-normal text-neutral-400">({items.length})</span>
      </p>

      {items.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((a) => (
            <figure
              key={a.id}
              className="group relative overflow-hidden rounded-lg border border-neutral-200"
            >
              {a.mimeType.startsWith("image/") ? (
                <a href={`/api/files/${a.filePath}`} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${a.filePath}`}
                    alt={a.fileName}
                    className="h-32 w-full object-cover transition hover:opacity-90"
                    loading="lazy"
                  />
                </a>
              ) : (
                <video
                  src={`/api/files/${a.filePath}`}
                  controls
                  preload="metadata"
                  className="h-32 w-full bg-black object-contain"
                />
              )}
              {canDelete && (
                <button
                  className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-sm text-neutral-400 opacity-0 shadow transition hover:text-red-600 group-hover:opacity-100 disabled:opacity-40"
                  title={t("deleteFile")}
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(t("deleteFileConfirm"))) return;
                    startTransition(async () => {
                      await deleteAttachment(a.id);
                      router.refresh();
                    });
                  }}
                >
                  ✕
                </button>
              )}
              <figcaption className="truncate px-2 py-1 text-xs text-neutral-500">
                {a.byUserName ?? ""} ·{" "}
                {new Date(a.createdAt).toLocaleDateString("uk-UA", { timeZone: "Europe/Kyiv" })}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {canUpload && (
        <div
          tabIndex={0}
          className={
            "cursor-pointer rounded-lg border-2 border-dashed p-4 text-center text-sm outline-none transition " +
            (dragOver
              ? "border-brand bg-brand/5 text-brand-dark"
              : "border-neutral-300 text-neutral-500 hover:border-brand/60 focus:border-brand")
          }
          onClick={() => fileRef.current?.click()}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length > 0) {
              e.preventDefault();
              upload(files);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            upload(Array.from(e.dataTransfer.files));
          }}
        >
          {uploading ? t("uploading") : t("dropHint")}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = "";
              upload(list);
            }}
          />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

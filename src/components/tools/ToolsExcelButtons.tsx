"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export default function ToolsExcelButtons() {
  const t = useTranslations("tools.excel");
  const locale = useLocale();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/tools/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.created !== undefined) {
      setResult(t("imported", { count: data.created }));
      router.refresh();
    } else {
      setResult(t("importError"));
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <a
        href={`/api/export/tools?locale=${locale}`}
        className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
      >
        ⤓ {t("export")}
      </a>
      <button
        className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-50"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
      >
        ⤒ {pending ? "…" : t("import")}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) startTransition(() => upload(f));
        }}
      />
      {result && <span className="text-xs text-neutral-500">{result}</span>}
    </span>
  );
}

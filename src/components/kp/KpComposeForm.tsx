"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Field, inputCls, btnPrimary } from "@/components/ui/Field";

const TYPES = ["LASER", "CNC", "UNIVERSAL", "OTHER"] as const;
type EquipmentType = (typeof TYPES)[number];

const ACCEPT =
  ".pdf,.docx,.doc,.xlsx,.xls,.txt,image/png,image/jpeg,image/webp,image/gif,application/pdf";

const ALLOWED = (f: File) =>
  /^(application\/pdf|image\/(png|jpeg|webp|gif)|text\/plain)$/.test(f.type) ||
  /\.(pdf|docx?|xlsx?|txt|png|jpe?g|webp|gif)$/i.test(f.name);

type GenResult = { id: string; fileName: string; fullName: string; warnings: string[] };

export default function KpComposeForm({ onGenerated }: { onGenerated: () => void }) {
  const t = useTranslations("kp");
  const fileRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  const [equipmentType, setEquipmentType] = useState<EquipmentType>("CNC");
  const [machineName, setMachineName] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("грн");
  const [deliveryTerm, setDeliveryTerm] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [result, setResult] = useState<GenResult | null>(null);

  // Вставка з буфера обміну (Ctrl+V) — глобально, поки відкрита вкладка складання
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.files;
      if (items && items.length > 0) {
        addFiles(Array.from(items));
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const int = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(int);
  }, [busy]);

  function addFiles(list: File[]) {
    const ok = list.filter(ALLOWED);
    if (ok.length === 0) return;
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of ok) {
        if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
      }
      return merged.slice(0, 10);
    });
    setError(null);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function generate() {
    if (!machineName.trim()) {
      setError(t("errNoName"));
      return;
    }
    if (files.length === 0) {
      setError(t("errNoFiles"));
      return;
    }
    const total = files.reduce((sum, f) => sum + f.size, 0);
    if (total > 40 * 1024 * 1024) {
      setError(t("errTotalTooBig"));
      return;
    }
    setBusy(true);
    setError(null);
    setDetail(null);
    setResult(null);
    setElapsed(0);
    setPhase(t("phaseUploading"));

    const fd = new FormData();
    fd.append("equipmentType", equipmentType);
    fd.append("machineName", machineName.trim());
    fd.append("price", price.trim());
    fd.append("currency", currency.trim());
    fd.append("deliveryTerm", deliveryTerm.trim());
    for (const f of files) fd.append("files", f);

    const phaseTimer = setTimeout(() => setPhase(t("phaseAnalyzing")), 4000);
    const phaseTimer2 = setTimeout(() => setPhase(t("phaseBuilding")), 40000);

    try {
      const res = await fetch("/api/kp/generate", { method: "POST", body: fd });
      const raw = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(raw);
      } catch {
        // не JSON (напр. сторінка помилки проксі 413/502) — показуємо статус і початок відповіді
        if (!res.ok) {
          setError(t("errGeneric"));
          setDetail(`HTTP ${res.status} ${res.statusText} · ${raw.slice(0, 300) || t("errNoBody")}`);
          return;
        }
      }
      if (!res.ok) {
        const code = typeof data.error === "string" ? data.error : "UNKNOWN";
        setError(errorText(code, t));
        setDetail(`HTTP ${res.status} · ${String(data.detail ?? code).slice(0, 400)}`);
        return;
      }
      setResult({
        id: String(data.id),
        fileName: String(data.fileName),
        fullName: String(data.fullName),
        warnings: Array.isArray(data.warnings) ? (data.warnings as string[]) : [],
      });
      onGenerated();
    } catch (e) {
      // сюди потрапляють мережеві збої: обрив з'єднання, перевищення ліміту тіла запиту
      setError(t("errNetwork"));
      setDetail(e instanceof Error ? e.message : "network error");
    } finally {
      clearTimeout(phaseTimer);
      clearTimeout(phaseTimer2);
      setBusy(false);
      setPhase(null);
    }
  }

  const card = "rounded-xl border border-neutral-200 bg-white p-4";

  return (
    <div className="space-y-4">
      <div className={card + " grid gap-4 sm:grid-cols-2"}>
        <Field label={t("equipmentType")}>
          <select
            className={inputCls}
            value={equipmentType}
            onChange={(e) => setEquipmentType(e.target.value as EquipmentType)}
            disabled={busy}
          >
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`type_${x}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("machineName")}>
          <input
            className={inputCls}
            value={machineName}
            onChange={(e) => setMachineName(e.target.value)}
            placeholder={t("machineNamePh")}
            disabled={busy}
          />
        </Field>
        <Field label={t("price")}>
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="714 363.30"
              inputMode="decimal"
              disabled={busy}
            />
            <select
              className={inputCls + " w-28"}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={busy}
            >
              <option value="грн">грн</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </Field>
        <Field label={t("deliveryTerm")}>
          <input
            className={inputCls}
            value={deliveryTerm}
            onChange={(e) => setDeliveryTerm(e.target.value)}
            placeholder={t("deliveryTermPh")}
            disabled={busy}
          />
        </Field>
      </div>

      {/* Зона завантаження: drag&drop + вставка з буфера + клік */}
      <div
        ref={zoneRef}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => fileRef.current?.click()}
        className={
          "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition " +
          (dragOver ? "border-brand bg-brand/5" : "border-neutral-300 bg-white hover:border-brand/60")
        }
      >
        <p className="text-sm font-medium text-neutral-700">{t("dropTitle")}</p>
        <p className="mt-1 text-xs text-neutral-500">{t("dropHint")}</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span
              key={f.name + f.size}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs"
            >
              <span className="max-w-52 truncate font-medium text-neutral-700">{f.name}</span>
              <span className="text-neutral-400">{(f.size / 1024 / 1024).toFixed(1)} МБ</span>
              {!busy && (
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-neutral-400 transition hover:text-red-600"
                  aria-label="remove"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{error}</p>
          {detail && (
            <details>
              <summary className="cursor-pointer text-xs text-red-500">{t("errDetails")}</summary>
              <p className="mt-1 break-all font-mono text-xs text-red-600">{detail}</p>
            </details>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={busy} onClick={generate}>
          {busy ? t("generating") : t("generate")}
        </button>
        {busy && (
          <span className="flex items-center gap-2 text-sm text-neutral-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            {phase} · {elapsed}s
          </span>
        )}
      </div>

      {result && (
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-4">
          <p className="text-sm font-semibold text-brand-dark">{t("done")}</p>
          <p className="mt-1 text-sm text-neutral-700">{result.fullName}</p>
          <a
            href={`/api/kp/documents/${result.id}/download`}
            className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            {t("download")} · {result.fileName}
          </a>
          {result.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-amber-800">
              {result.warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function errorText(code: string, t: ReturnType<typeof useTranslations<"kp">>): string {
  if (code === "NO_API_KEY") return t("noApiKey");
  if (code === "NO_NAME") return t("errNoName");
  if (code === "NO_FILES" || code === "NO_READABLE_INPUT") return t("errNoFiles");
  if (code === "FILE_TOO_BIG") return t("errFileTooBig");
  if (code.startsWith("AI_")) return t("errAi");
  return t("errGeneric");
}

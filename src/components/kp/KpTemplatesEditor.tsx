"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { inputCls, btnPrimary, btnSecondary } from "@/components/ui/Field";

type Tmpl = { equipmentType: string; systemPrompt: string; updatedAt: string };

const TYPES = ["LASER", "CNC", "UNIVERSAL", "OTHER"];

export default function KpTemplatesEditor({ active }: { active: boolean }) {
  const t = useTranslations("kp");
  const [templates, setTemplates] = useState<Tmpl[] | null>(null);
  const [type, setType] = useState("CNC");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!active || templates !== null) return;
    fetch("/api/kp/templates")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setTemplates(d.items))
      .catch(() => setTemplates([]));
  }, [active, templates]);

  useEffect(() => {
    const found = templates?.find((x) => x.equipmentType === type);
    setText(found?.systemPrompt ?? "");
    setMsg(null);
  }, [type, templates]);

  async function save(reset = false) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/kp/templates", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(reset ? { equipmentType: type, reset: true } : { equipmentType: type, systemPrompt: text }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error();
      setTemplates((prev) =>
        prev
          ? prev.map((x) => (x.equipmentType === type ? { ...x, systemPrompt: d.systemPrompt } : x))
          : prev
      );
      if (reset) setText(d.systemPrompt);
      setMsg(t("tmplSaved"));
    } catch {
      setMsg(t("errGeneric"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm text-neutral-600">{t("tmplHint")}</p>
      <select className={inputCls + " w-auto"} value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((x) => (
          <option key={x} value={x}>
            {t(`type_${x}` as never)}
          </option>
        ))}
      </select>
      <textarea
        className={inputCls + " min-h-96 font-mono text-xs leading-relaxed"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      <div className="flex items-center gap-2">
        <button type="button" className={btnPrimary} disabled={saving || !text.trim()} onClick={() => save(false)}>
          {saving ? t("saving") : t("save")}
        </button>
        <button type="button" className={btnSecondary} disabled={saving} onClick={() => save(true)}>
          {t("tmplReset")}
        </button>
        {msg && <span className="text-sm text-brand-dark">{msg}</span>}
      </div>
    </div>
  );
}

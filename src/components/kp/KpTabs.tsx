"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import KpComposeForm from "./KpComposeForm";
import KpLibrary from "./KpLibrary";
import KpTemplatesEditor from "./KpTemplatesEditor";

type Tab = "compose" | "library" | "templates";

export default function KpTabs() {
  const t = useTranslations("kp");
  const [tab, setTab] = useState<Tab>("compose");
  const [libraryVersion, setLibraryVersion] = useState(0);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "compose", label: t("tabCompose") },
    { id: "library", label: t("tabLibrary") },
    { id: "templates", label: t("tabTemplates") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-white p-1">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={
              "rounded-lg px-4 py-2 text-sm transition " +
              (tab === x.id
                ? "bg-brand/10 font-semibold text-brand-dark"
                : "text-neutral-600 hover:bg-neutral-100")
            }
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className={tab === "compose" ? "" : "hidden"}>
        <KpComposeForm onGenerated={() => setLibraryVersion((v) => v + 1)} />
      </div>
      <div className={tab === "library" ? "" : "hidden"}>
        <KpLibrary version={libraryVersion} active={tab === "library"} />
      </div>
      <div className={tab === "templates" ? "" : "hidden"}>
        <KpTemplatesEditor active={tab === "templates"} />
      </div>
    </div>
  );
}

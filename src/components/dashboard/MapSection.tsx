"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import DashboardMap from "@/components/map/DashboardMap";
import type { MapMarker, MapLine } from "@/components/map/UkraineMap";
import MapControls from "./MapControls";

export default function MapSection({
  markers,
  polylines,
  brigades,
  periodMode,
  defaultOpen,
}: {
  markers: MapMarker[];
  polylines: MapLine[];
  brigades: { id: string; name: string }[];
  periodMode: boolean;
  defaultOpen: boolean;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-base font-bold">{t("dashboard.sections.map")}</span>
        <span className={"text-neutral-400 transition " + (open ? "rotate-180" : "")}>▾</span>
      </button>
      {open && (
        <div className="border-t border-neutral-100 p-4">
          <MapControls brigades={brigades} />
          <div className="overflow-hidden rounded-xl border border-neutral-200">
            <DashboardMap markers={markers} polylines={polylines} />
          </div>
          {!periodMode && (
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
              <span><span className="mr-1 inline-block h-3 w-3 rounded-full bg-[#009C4B] align-middle"></span>{t("status.ON_SITE")}</span>
              <span><span className="mr-1 inline-block h-3 w-3 rounded-full bg-[#F36E33] align-middle"></span>{t("status.EN_ROUTE")}</span>
              <span><span className="mr-1 inline-block h-3 w-3 rounded-full bg-[#DC2626] align-middle"></span>{t("dashboard.map.hasOverdue")}</span>
              <span><span className="mr-1 inline-block h-3 w-3 rounded-full bg-[#9CA3AF] align-middle"></span>{t("dashboard.map.atBase")}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

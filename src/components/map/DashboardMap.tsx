"use client";

import dynamic from "next/dynamic";
import type { MapMarker, MapLine } from "./UkraineMap";

const UkraineMap = dynamic(() => import("./UkraineMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[440px] w-full items-center justify-center rounded-xl bg-neutral-100 text-sm text-neutral-400">
      …
    </div>
  ),
});

export default function DashboardMap(props: { markers: MapMarker[]; polylines?: MapLine[] }) {
  return <UkraineMap {...props} />;
}

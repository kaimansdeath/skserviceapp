"use client";

import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[260px] w-full items-center justify-center rounded-lg bg-neutral-100 text-sm text-neutral-400">
      …
    </div>
  ),
});

export default MapPicker;

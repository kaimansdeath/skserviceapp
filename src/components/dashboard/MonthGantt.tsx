import { Fragment } from "react";
import { Link } from "@/i18n/routing";

export type GanttRow = {
  id: string;
  title: string;
  sub: string;
  startIdx: number; // 0-based день місяця
  endIdx: number; // включно
  color: string;
  overdue: boolean;
};

export default function MonthGantt({
  days,
  todayIdx,
  rows,
  emptyText,
}: {
  days: { n: number; weekend: boolean }[];
  todayIdx: number;
  rows: GanttRow[];
  emptyText: string;
}) {
  const grid = { display: "grid", gridTemplateColumns: `200px repeat(${days.length}, 26px)` } as const;

  return (
    <div className="overflow-x-auto">
      <div style={grid} className="min-w-max text-xs">
        {/* Шапка з числами */}
        <div></div>
        {days.map((d, i) => (
          <div
            key={i}
            className={
              "border-b border-neutral-200 py-1 text-center font-semibold " +
              (i === todayIdx
                ? "rounded-t bg-brand text-white"
                : d.weekend
                  ? "bg-neutral-100 text-neutral-400"
                  : "text-neutral-500")
            }
          >
            {d.n}
          </div>
        ))}
        {/* Рядки задач */}
        {rows.map((r) => (
          <Fragment key={r.id}>
            <div
              className="truncate border-b border-neutral-100 py-1.5 pr-2"
              title={`${r.title} · ${r.sub}`}
            >
              <span className={"font-medium " + (r.overdue ? "text-red-600" : "text-neutral-700")}>
                {r.title}
              </span>
              <span className="ml-1 text-neutral-400">{r.sub}</span>
            </div>
            {days.map((d, i) => (
              <div
                key={r.id + "-" + i}
                className={
                  "relative border-b border-neutral-100 " +
                  (i === todayIdx ? "bg-brand/5" : d.weekend ? "bg-neutral-50" : "")
                }
              >
                {i === r.startIdx && (
                  <Link
                    href={`/tasks/${r.id}`}
                    title={`${r.title} · ${r.sub}`}
                    className="absolute inset-y-1 left-0.5 block rounded-full opacity-90 transition hover:opacity-100"
                    style={{
                      width: `calc(${(r.endIdx - r.startIdx + 1) * 26 - 4}px)`,
                      backgroundColor: r.color,
                      zIndex: 1,
                    }}
                  />
                )}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
      {rows.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-400">{emptyText}</p>
      )}
    </div>
  );
}

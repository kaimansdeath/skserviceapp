import { Fragment } from "react";
import { Link } from "@/i18n/routing";

export type GanttBar = {
  id: string;
  startIdx: number; // 0-based день місяця
  endIdx: number; // включно
  color: string;
  title: string;
  lane: number;
};

export type GanttRow = {
  key: string;
  name: string;
  bars: GanttBar[];
  lanes: number;
};

/** Календар місяця: рядок = виконавець, полоси = його задачі */
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
  const grid = {
    display: "grid",
    gridTemplateColumns: `170px repeat(${days.length}, 26px)`,
  } as const;

  return (
    <div className="overflow-x-auto">
      <div style={grid} className="min-w-max text-xs">
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
        {rows.map((r) => {
          const rowH = Math.max(30, r.lanes * 11 + 8);
          return (
            <Fragment key={r.key}>
              <div
                className="flex items-center truncate border-b border-neutral-100 pr-2 font-medium text-neutral-700"
                style={{ height: rowH }}
                title={r.name}
              >
                {r.name}
              </div>
              {days.map((d, i) => (
                <div
                  key={r.key + "-" + i}
                  className={
                    "relative border-b border-neutral-100 " +
                    (i === todayIdx ? "bg-brand/5" : d.weekend ? "bg-neutral-50" : "")
                  }
                  style={{ height: rowH }}
                >
                  {r.bars
                    .filter((b) => b.startIdx === i)
                    .map((b) => (
                      <Link
                        key={b.id + "-" + b.lane}
                        href={`/tasks/${b.id}`}
                        title={b.title}
                        className="absolute left-0.5 block rounded-full opacity-90 transition hover:opacity-100"
                        style={{
                          top: 4 + b.lane * 11,
                          height: 8,
                          width: `${(b.endIdx - b.startIdx + 1) * 26 - 4}px`,
                          backgroundColor: b.color,
                          zIndex: 1,
                        }}
                      />
                    ))}
                </div>
              ))}
            </Fragment>
          );
        })}
      </div>
      {rows.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-400">{emptyText}</p>
      )}
    </div>
  );
}

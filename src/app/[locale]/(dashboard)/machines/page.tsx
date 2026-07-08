import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Верстати, згруповані за назвою моделі: назва — кількість, розгортається у список */
export default async function MachinesPage() {
  const t = await getTranslations();
  const locale = await getLocale();

  const machines = await prisma.machine.findMany({
    include: { type: true, client: true },
    orderBy: { model: "asc" },
  });

  const groups = new Map<string, any[]>();
  for (const m of machines as any[]) {
    const key = m.model.trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const sorted = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("machinesList.title")}</h1>
        <span className="text-sm text-neutral-500">
          {t("machinesList.total", { models: sorted.length, units: machines.length })}
        </span>
      </div>

      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-400">
            {t("machinesList.empty")}
          </div>
        )}
        {sorted.map(([model, list]) => (
          <details key={model} className="group rounded-xl border border-neutral-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
              <span className="flex items-center gap-3">
                <span className="text-neutral-400 transition group-open:rotate-90">▸</span>
                <span className="font-semibold">{model}</span>
                <span className="text-sm text-neutral-500">
                  {locale === "ru" ? list[0].type.nameRu : list[0].type.nameUk}
                </span>
              </span>
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-sm font-bold text-brand-dark">
                {list.length}
              </span>
            </summary>
            <div className="border-t border-neutral-100">
              <table className="w-full text-sm">
                <tbody>
                  {list.map((m: any) => (
                    <tr key={m.id} className="border-b border-neutral-50 last:border-0">
                      <td className="px-4 py-2 pl-10">
                        <Link href={`/machines/${m.id}`} className="text-brand-dark hover:underline">
                          {m.serialNumber ? `S/N ${m.serialNumber}` : t("machinesList.noSerial")}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/clients/${m.clientId}`} className="text-neutral-600 hover:underline">
                          {m.client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-neutral-400">{m.client.city}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

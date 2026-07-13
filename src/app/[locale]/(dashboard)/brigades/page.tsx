import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import BrigadeAddForm from "@/components/brigades/BrigadeAddForm";
import BrigadeRowActions from "@/components/brigades/BrigadeRowActions";
import UserRowActions from "@/components/brigades/UserRowActions";
import RenameButton from "@/components/brigades/RenameButton";

export const dynamic = "force-dynamic";

export default async function BrigadesPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (session.user.role === "STOREKEEPER") redirect("/tools");
  if (["BRIGADE_LEADER", "BRIGADE_MEMBER", "ACCOUNTANT"].includes(session.user.role))
    redirect(`/${params.locale}`);
  const isAdmin = session.user.role === "ADMIN";

  const [brigades, users] = await Promise.all([
    prisma.brigade.findMany({
      include: { users: { where: { role: { in: ["BRIGADE_LEADER", "BRIGADE_MEMBER"] } } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      include: { brigade: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">{t("brigades.title")}</h1>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">{t("brigades.fields.name")}</th>
                <th className="px-3 py-2">{t("roles.BRIGADE_LEADER")}</th>
                <th className="px-3 py-2">{t("brigades.active")}</th>
                {isAdmin && <th className="px-3 py-2">{t("common.actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {brigades.map((b: any) => (
                <tr key={b.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 font-medium">
                    {b.name}
                    {isAdmin && <RenameButton kind="brigade" id={b.id} currentName={b.name} />}
                  </td>
                  <td className="px-3 py-2">
                    {b.users
                      .map((u: any) =>
                        u.role === "BRIGADE_LEADER" ? `${u.name} ⭐` : u.name
                      )
                      .join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-semibold " +
                        (b.isActive ? "bg-brand/10 text-brand-dark" : "bg-neutral-200 text-neutral-500")
                      }
                    >
                      {b.isActive ? t("brigades.active") : t("brigades.inactive")}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      <BrigadeRowActions brigadeId={b.id} isActive={b.isActive} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isAdmin && (
          <div className="mt-3 max-w-md rounded-xl border border-neutral-200 bg-white p-4">
            <BrigadeAddForm />
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("brigades.usersTitle")}</h2>
          {isAdmin && (
            <Link
              href="/brigades/new-user"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              + {t("brigades.newUser")}
            </Link>
          )}
        </div>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">{t("brigades.fields.name")}</th>
                <th className="px-3 py-2">{t("brigades.fields.login")}</th>
                <th className="px-3 py-2">{t("brigades.fields.role")}</th>
                <th className="px-3 py-2">{t("brigades.fields.brigade")}</th>
                <th className="px-3 py-2">{t("brigades.fields.telegram")}</th>
                {isAdmin && <th className="px-3 py-2">{t("common.actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr
                  key={u.id}
                  className={
                    "border-b border-neutral-100 last:border-0 " + (u.isActive ? "" : "opacity-50")
                  }
                >
                  <td className="px-3 py-2 font-medium">
                    {u.name}
                    {isAdmin && <RenameButton kind="user" id={u.id} currentName={u.name} />}
                    {!u.isActive && (
                      <span className="ml-2 text-xs text-neutral-400">({t("brigades.userInactive")})</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{u.login}</td>
                  <td className="px-3 py-2">{t(`roles.${u.role}` as any)}</td>
                  <td className="px-3 py-2">{u.brigade?.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    {["BRIGADE_LEADER", "BRIGADE_MEMBER", "ADMIN", "STOREKEEPER"].includes(u.role) ? (
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-xs font-semibold " +
                          (u.telegramChatId
                            ? "bg-brand/10 text-brand-dark"
                            : "bg-orange-100 text-brand-orange")
                        }
                      >
                        {u.telegramChatId ? t("brigades.tgLinked") : t("brigades.tgNotLinked")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      <UserRowActions
                        userId={u.id}
                        isActive={u.isActive}
                        canLinkTg={["BRIGADE_LEADER", "BRIGADE_MEMBER", "ADMIN", "STOREKEEPER"].includes(u.role)}
                        isSelf={u.id === session.user.id}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

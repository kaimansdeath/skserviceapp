"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addTaskComment } from "@/app/actions/tasks";
import { inputCls, btnPrimary } from "@/components/ui/Field";

type Comment = {
  id: string;
  kind: "QUESTION" | "ANSWER" | "COMMENT";
  text: string;
  userName: string | null;
  createdAt: string;
};

const KIND_ICON: Record<Comment["kind"], string> = {
  QUESTION: "❓",
  ANSWER: "↩️",
  COMMENT: "💬",
};

export default function TaskDiscussion({
  taskId,
  comments,
}: {
  taskId: string;
  comments: Comment[];
}) {
  const t = useTranslations("tasks.discussion");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t("title")}</h2>
      <div className="rounded-xl border border-neutral-200 bg-white">
        <ul className="divide-y divide-neutral-100 text-sm">
          {comments.length === 0 && (
            <li className="px-4 py-4 text-center text-neutral-400">{t("empty")}</li>
          )}
          {comments.map((c) => (
            <li key={c.id} className="px-4 py-2.5">
              <div className="mb-0.5 flex items-center gap-2 text-xs text-neutral-400">
                <span>{KIND_ICON[c.kind]}</span>
                <span className="font-medium text-neutral-600">{c.userName ?? "—"}</span>
                <span>{c.createdAt}</span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5">{t(`kind.${c.kind}` as any)}</span>
              </div>
              <p className="whitespace-pre-wrap text-neutral-800">{c.text}</p>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 border-t border-neutral-100 p-3">
          <input
            className={inputCls}
            placeholder={t("placeholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim() && !pending) {
                startTransition(async () => {
                  await addTaskComment(taskId, text);
                  setText("");
                  router.refresh();
                });
              }
            }}
          />
          <button
            className={btnPrimary}
            disabled={pending || !text.trim()}
            onClick={() =>
              startTransition(async () => {
                await addTaskComment(taskId, text);
                setText("");
                router.refresh();
              })
            }
          >
            {pending ? "…" : t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}

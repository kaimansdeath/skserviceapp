import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { prepareInputs } from "@/lib/kp/extract";
import { generateKpContent } from "@/lib/kp/ai";
import { renderKpDocx } from "@/lib/kp/render";
import { saveKpFile } from "@/lib/kp/storage";
import { getSystemPrompt } from "@/lib/kp/templates";
import type { KpEquipmentTypeCode } from "@/lib/kp/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TYPES = new Set(["LASER", "CNC", "UNIVERSAL", "OTHER"]);
const MAX_FILES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // ліміт Anthropic для PDF ~32 МБ

/** Генерація КП: FormData(equipmentType, machineName, price?, currency?, deliveryTerm?, files[]) */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "NO_API_KEY" }, { status: 500 });
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: "BAD_FORM" }, { status: 400 });
  }

  const equipmentType = String(fd.get("equipmentType") ?? "");
  const machineName = String(fd.get("machineName") ?? "").trim();
  const price = String(fd.get("price") ?? "").trim();
  const currency = String(fd.get("currency") ?? "").trim();
  const deliveryTerm = String(fd.get("deliveryTerm") ?? "").trim();

  if (!TYPES.has(equipmentType)) return NextResponse.json({ error: "BAD_TYPE" }, { status: 400 });
  if (!machineName) return NextResponse.json({ error: "NO_NAME" }, { status: 400 });

  const rawFiles = fd.getAll("files").filter((f): f is File => f instanceof File);
  if (rawFiles.length === 0) return NextResponse.json({ error: "NO_FILES" }, { status: 400 });
  if (rawFiles.length > MAX_FILES) return NextResponse.json({ error: "TOO_MANY_FILES" }, { status: 400 });

  const files: Array<{ name: string; mime: string; buffer: Buffer }> = [];
  for (const f of rawFiles) {
    if (f.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "FILE_TOO_BIG", file: f.name }, { status: 400 });
    }
    files.push({ name: f.name, mime: f.type, buffer: Buffer.from(await f.arrayBuffer()) });
  }

  try {
    const prepared = await prepareInputs(files);
    if (prepared.blocks.length === 0) {
      return NextResponse.json({ error: "NO_READABLE_INPUT", warnings: prepared.notes }, { status: 400 });
    }

    const systemPrompt = await getSystemPrompt(equipmentType as KpEquipmentTypeCode);
    const ai = await generateKpContent({ systemPrompt, machineName, blocks: prepared.blocks });

    const rendered = await renderKpDocx({
      ai,
      machineName,
      price: price || undefined,
      currency: currency || undefined,
      deliveryTerm: deliveryTerm || undefined,
      photos: prepared.photos,
    });

    const warnings = [...prepared.notes, ...ai.warnings, ...rendered.warnings];
    const saved = await saveKpFile(machineName, rendered.buffer);

    const doc = await prisma.kpDocument.create({
      data: {
        machineName,
        equipmentType: equipmentType as never,
        fileName: saved.fileName,
        filePath: saved.relPath,
        size: saved.size,
        price: price || null,
        currency: currency || null,
        warnings: warnings.length ? JSON.stringify(warnings) : null,
        byUserId: session.user.id ?? null,
      },
    });

    return NextResponse.json({
      id: doc.id,
      fileName: doc.fileName,
      warnings,
      controlType: ai.controlType,
      fullName: ai.fullName,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    // Повний стек — у логи Railway, стислий текст — в інтерфейс
    console.error("[KP] generate failed:", e);
    const status = msg === "NO_API_KEY" ? 500 : msg.startsWith("AI_") ? 502 : 500;
    return NextResponse.json({ error: msg, detail: msg.slice(0, 500) }, { status });
  }
}

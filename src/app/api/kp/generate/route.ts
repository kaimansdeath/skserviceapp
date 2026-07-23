import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { KpEquipmentTypeCode } from "@/lib/kp/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const TYPES = new Set(["LASER", "CNC", "UNIVERSAL", "OTHER"]);
const MAX_FILES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Генерація КП: FormData(equipmentType, machineName, price?, currency?, deliveryTerm?, files[])
 * Увесь обробник обгорнутий у try/catch зі стадіями — щоб будь-який збій
 * повертався як JSON з назвою стадії, а не як порожня 500-ка.
 */
export async function POST(req: NextRequest) {
  let stage = "start";
  try {
    stage = "auth";
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED", stage }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN", stage }, { status: 403 });
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "NO_API_KEY", stage }, { status: 500 });
    }

    stage = "form";
    const fd = await req.formData();

    const equipmentType = String(fd.get("equipmentType") ?? "");
    const machineName = String(fd.get("machineName") ?? "").trim();
    const price = String(fd.get("price") ?? "").trim();
    const currency = String(fd.get("currency") ?? "").trim();
    const deliveryTerm = String(fd.get("deliveryTerm") ?? "").trim();

    if (!TYPES.has(equipmentType)) return NextResponse.json({ error: "BAD_TYPE", stage }, { status: 400 });
    if (!machineName) return NextResponse.json({ error: "NO_NAME", stage }, { status: 400 });

    const rawFiles = fd.getAll("files").filter((f): f is File => f instanceof File);
    if (rawFiles.length === 0) return NextResponse.json({ error: "NO_FILES", stage }, { status: 400 });
    if (rawFiles.length > MAX_FILES) return NextResponse.json({ error: "TOO_MANY_FILES", stage }, { status: 400 });

    stage = "read-files";
    const files: Array<{ name: string; mime: string; buffer: Buffer }> = [];
    for (const f of rawFiles) {
      if (f.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "FILE_TOO_BIG", file: f.name, stage }, { status: 400 });
      }
      files.push({ name: f.name, mime: f.type, buffer: Buffer.from(await f.arrayBuffer()) });
    }
    console.log(`[KP] files ok: ${files.map((f) => `${f.name} ${(f.buffer.length / 1024 / 1024).toFixed(1)}МБ`).join(", ")}`);

    // Динамічні імпорти: якщо якась бібліотека не вантажиться на сервері,
    // помилка буде видна зі стадією, а не як падіння всього роуту.
    stage = "load-extract";
    const { prepareInputs } = await import("@/lib/kp/extract");
    stage = "extract";
    const prepared = await prepareInputs(files);
    if (prepared.blocks.length === 0) {
      return NextResponse.json({ error: "NO_READABLE_INPUT", warnings: prepared.notes, stage }, { status: 400 });
    }

    stage = "prompt";
    const { getSystemPrompt } = await import("@/lib/kp/templates");
    const systemPrompt = await getSystemPrompt(equipmentType as KpEquipmentTypeCode);

    stage = "ai";
    const { generateKpContent } = await import("@/lib/kp/ai");
    const ai = await generateKpContent({ systemPrompt, machineName, blocks: prepared.blocks });
    console.log(`[KP] ai ok: ${ai.fullName}, specs=${ai.specs.length}`);

    stage = "render";
    const { renderKpDocx } = await import("@/lib/kp/render");
    const rendered = await renderKpDocx({
      ai,
      machineName,
      price: price || undefined,
      currency: currency || undefined,
      deliveryTerm: deliveryTerm || undefined,
      photos: prepared.photos,
    });

    stage = "save";
    const { saveKpFile } = await import("@/lib/kp/storage");
    const saved = await saveKpFile(machineName, rendered.buffer);

    stage = "db";
    const warnings = [...prepared.notes, ...ai.warnings, ...rendered.warnings];
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
    const err = e as Error;
    console.error(`[KP] generate failed at stage "${stage}":`, err?.stack || err);
    const msg = err?.message ? String(err.message) : "UNKNOWN";
    const status = msg.startsWith("AI_") ? 502 : 500;
    return NextResponse.json(
      { error: msg.startsWith("AI_") ? msg : "SERVER_ERROR", stage, detail: `${stage}: ${msg}`.slice(0, 600) },
      { status }
    );
  }
}

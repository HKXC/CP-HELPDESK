import { mkdir, readFile, writeFile } from "fs/promises";
import { isAbsolute, join } from "path";
import { randomBytes } from "crypto";

const UPLOAD_ROOT = join(process.cwd(), "uploads");

export function isBlobEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
}

// Store bytes, return a storage reference (blob URL on Vercel, portable
// RELATIVE path locally). Relative on purpose: absolute disk paths break
// when the project moves to another machine/drive, and uploads/ is
// gitignored by design — files travel via backup, DB rows must stay valid.
// The reference is never exposed to clients — downloads go through /api/attachments/[id]
// which enforces the parent ticket's authorization.
export async function putAttachment(
  ticketId: string,
  filename: string,
  contentType: string,
  bytes: Buffer
): Promise<string> {
  const key = `attachments/${ticketId}/${Date.now()}_${randomBytes(8).toString("hex")}_${safeName(filename)}`;
  if (isBlobEnabled()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, bytes, {
      access: "public",
      contentType: contentType || "application/octet-stream",
      addRandomSuffix: false,
    });
    return blob.url;
  }
  const dir = join(UPLOAD_ROOT, ticketId);
  await mkdir(dir, { recursive: true });
  const stored = `${Date.now()}_${safeName(filename)}`;
  await writeFile(join(dir, stored), bytes);
  return join("uploads", ticketId, stored);
}

export async function getAttachmentBytes(storagePath: string): Promise<Buffer> {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    const res = await fetch(storagePath);
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  // Back-compat: rows written before the portable-path change hold absolute
  // paths — use as-is; new rows are relative and resolve under uploads/ only.
  // turbopackIgnore keeps the trace scoped so Vercel doesn't bundle the repo.
  const abs = isAbsolute(storagePath)
    ? storagePath
    : join(/*turbopackIgnore: true*/ process.cwd(), "uploads", storagePath.replace(/^uploads[\/\\]/, ""));
  return readFile(abs);
}

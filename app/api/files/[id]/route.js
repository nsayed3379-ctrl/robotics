import { Readable } from "stream";
import { drive, rows, sub } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(req, { params }) {
  const s = await session();
  if (!s) return new Response("auth", { status: 401 });
  const d = drive();
  const m = (await d.files.get({ fileId: params.id, fields: "name,mimeType,appProperties" })).data;
  // Only uploads are served (never the data sheet): to their owner, the admin, or anyone once the admin has shared them.
  const owner = m.appProperties?.owner;
  if (!owner) return new Response("no", { status: 403 });
  if (s.role !== "admin" && owner !== s.username && !(await rows("Subs")).some(r => r[1] === owner && sub(r).shared.includes(params.id)))
    return new Response("This file hasn't been shared with the team", { status: 403 });
  const r = await d.files.get({ fileId: params.id, alt: "media" }, { responseType: "stream" });
  return new Response(Readable.toWeb(r.data), { headers: { "Content-Type": m.mimeType, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(m.name)}` } });
}

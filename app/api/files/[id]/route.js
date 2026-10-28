import { Readable } from "stream";
import { drive } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(req, { params }) {
  const s = await session();
  if (!s) return new Response("auth", { status: 401 });
  const d = drive();
  const m = (await d.files.get({ fileId: params.id, fields: "name,mimeType,appProperties" })).data;
  if (s.role !== "admin" && m.appProperties?.owner !== s.username) return new Response("no", { status: 403 });
  const r = await d.files.get({ fileId: params.id, alt: "media" }, { responseType: "stream" });
  return new Response(Readable.toWeb(r.data), { headers: { "Content-Type": m.mimeType, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(m.name)}` } });
}

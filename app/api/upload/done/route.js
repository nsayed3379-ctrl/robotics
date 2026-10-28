import { drive, rows, upsert } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function POST(req) {
  const s = await session();
  if (!s) return Response.json({ error: "auth" }, { status: 401 });
  const { day, id } = await req.json();
  const m = (await drive().files.get({ fileId: id, fields: "id,name,mimeType,appProperties" })).data;
  if (m.appProperties?.owner !== s.username) return Response.json({ error: "no" }, { status: 403 });
  const cur = (await rows("Subs")).find(r => +r[0] === +day && r[1] === s.username);
  await upsert(+day, s.username, { files: [...JSON.parse(cur?.[4] || "[]"), { id: m.id, name: m.name.replace(/^Day\d+_[^_]+_/, ""), mime: m.mimeType }] });
  return Response.json({ ok: true });
}

import { upsert } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function POST(req) {
  const s = await session();
  if (!s) return Response.json({ error: "auth" }, { status: 401 });
  const b = await req.json();
  const links = (b.links || []).filter(l => /^https?:\/\//i.test(l));
  await upsert(+b.day, s.username, { text: String(b.text || ""), links });
  return Response.json({ ok: true });
}

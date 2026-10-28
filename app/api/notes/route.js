import { rows, setCells } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await session();
  if (!s) return Response.json({ error: "auth" }, { status: 401 });
  const notes = (await rows("Notes")).filter(r => r[1] === s.username).slice(-30).reverse()
    .map(r => ({ id: r[0], kind: r[2], text: r[3] || "", day: +r[4] || 0, owner: r[5] || "", created: r[6] || "", read: !!r[7] }));
  return Response.json({ notes });
}
// Marks all of the caller's notifications read.
export async function POST() {
  const s = await session();
  if (!s) return Response.json({ error: "auth" }, { status: 401 });
  const data = (await rows("Notes")).flatMap((r, i) => r[1] === s.username && !r[7] ? [{ range: `Notes!H${i + 2}`, values: [["1"]] }] : []);
  if (data.length) await setCells(data);
  return Response.json({ ok: true });
}

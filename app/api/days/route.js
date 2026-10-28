import { rows, append, setRow } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
// The browser sends its own date: the server's clock may be in another timezone.
export async function POST(req) {
  const s = await session();
  if (s?.role !== "admin") return Response.json({ error: "no" }, { status: 403 });
  const { date } = await req.json().catch(() => ({}));
  await append("Days", [String((await rows("Days")).length + 1), isDate(date) ? date : ""]);
  return Response.json({ ok: true });
}
export async function PATCH(req) {
  const s = await session();
  if (s?.role !== "admin") return Response.json({ error: "no" }, { status: 403 });
  const { day, date } = await req.json().catch(() => ({}));
  const i = (await rows("Days")).findIndex(r => +r[0] === +day);
  if (i < 0 || (date && !isDate(date))) return Response.json({ error: "Bad day or date" }, { status: 400 });
  await setRow("Days", i, [String(+day), date || ""]);
  return Response.json({ ok: true });
}

import { rows, append } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function POST() {
  const s = await session();
  if (s?.role !== "admin") return Response.json({ error: "no" }, { status: 403 });
  await append("Days", [String((await rows("Days")).length + 1)]);
  return Response.json({ ok: true });
}

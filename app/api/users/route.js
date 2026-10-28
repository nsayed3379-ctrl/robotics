import bcrypt from "bcryptjs";
import { rows, append, setRow } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function POST(req) {
  const s = await session();
  if (s?.role !== "admin") return Response.json({ error: "no" }, { status: 403 });
  const b = await req.json();
  const un = String(b.username || "").trim().toLowerCase();
  if (!un || !b.password) return Response.json({ error: "Username and password required" }, { status: 400 });
  const row = [un, b.name || un, "member", await bcrypt.hash(String(b.password), 10)];
  const i = (await rows("Users")).findIndex(r => r[0] === un);
  if (i < 0) await append("Users", row); else await setRow("Users", i, row);
  return Response.json({ ok: true });
}

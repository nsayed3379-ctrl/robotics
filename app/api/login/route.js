import bcrypt from "bcryptjs";
import { rows } from "@/lib/google";
import { login } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function POST(req) {
  const { username, password } = await req.json();
  const u = (await rows("Users")).find(r => r[0] === String(username).trim().toLowerCase());
  if (!u || !(await bcrypt.compare(String(password), u[3]))) return Response.json({ error: "Wrong username or password" }, { status: 401 });
  await login({ username: u[0], name: u[1], role: u[2] });
  return Response.json({ ok: true });
}

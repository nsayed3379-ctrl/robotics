import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { rows } from "@/lib/google";
import { login } from "@/lib/auth";
export const dynamic = "force-dynamic";
const NEEDED = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "SHEET_ID", "SESSION_SECRET"];
export async function POST(req) {
  try {
    const missing = NEEDED.filter(k => !process.env[k]);
    if (missing.length) {
      console.error("login: missing env vars:", missing.join(", "));
      return NextResponse.json({ error: "Server is missing configuration (environment variables)" }, { status: 500 });
    }
    const { username, password } = (await req.json().catch(() => null)) || {};
    if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    const u = (await rows("Users")).find(r => r[0] === String(username).trim().toLowerCase());
    if (!u || !(await bcrypt.compare(String(password), u[3] || ""))) return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
    await login({ username: u[0], name: u[1], role: u[2] });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("login failed:", e);
    return NextResponse.json({ error: "Login failed on the server" }, { status: 500 });
  }
}

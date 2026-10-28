import { rows, upsert, notify } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
// Members flag or clear a blocker on their own day; the admin can clear anyone's. Flagging alerts every admin.
export async function POST(req) {
  const s = await session();
  if (!s) return Response.json({ error: "auth" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const day = +b.day, text = String(b.text || "").trim().slice(0, 500);
  const user = s.role === "admin" && b.username ? String(b.username) : s.username;
  if (!day || (text && user !== s.username)) return Response.json({ error: "Bad request" }, { status: 400 });
  await upsert(day, user, { stuck: text });
  const admins = (await rows("Users")).filter(r => r[2] === "admin" && r[0] !== s.username).map(r => r[0]);
  if (text) await notify(admins.map(a => [a, "stuck", `${s.name} is stuck on Day ${day}: ${text}`, day, user]));
  else if (user !== s.username) await notify([[user, "stuck", `${s.name} marked your Day ${day} blocker as solved`, day, user]]);
  return Response.json({ ok: true });
}

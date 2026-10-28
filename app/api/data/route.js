import { rows } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await session();
  if (!s) return Response.json({ error: "auth" }, { status: 401 });
  const [days, subs, users] = await Promise.all([rows("Days"), rows("Subs"), rows("Users")]);
  const all = subs.map(r => ({ day: +r[0], username: r[1], text: r[2] || "", links: JSON.parse(r[3] || "[]"), files: JSON.parse(r[4] || "[]") }));
  const admin = s.role === "admin";
  return Response.json({ me: s, days: days.map(r => +r[0]), subs: admin ? all : all.filter(x => x.username === s.username), users: admin ? users.map(r => ({ username: r[0], name: r[1], role: r[2] })) : [] });
}

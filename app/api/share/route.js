import { rows, setCells, sub, notify } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
// Admin only: opens (on: true) or hides some of one submission's files/links for the whole team. keys are file ids or link URLs.
export async function POST(req) {
  const s = await session();
  if (s?.role !== "admin") return Response.json({ error: "Only the admin can share files" }, { status: 403 });
  const { day, username, keys, on } = await req.json().catch(() => ({}));
  const all = await rows("Subs");
  const i = all.findIndex(r => +r[0] === +day && r[1] === username);
  if (i < 0 || !Array.isArray(keys)) return Response.json({ error: "Nothing to share" }, { status: 404 });
  const x = sub(all[i]), valid = new Set([...x.files.map(f => f.id), ...x.links]);
  const pick = keys.filter(k => valid.has(k));
  const shared = (on ? [...new Set([...x.shared, ...pick])] : x.shared.filter(k => !pick.includes(k))).filter(k => valid.has(k));
  // Writes only this column, so sharing doesn't count as the member updating their work.
  await setCells([{ range: "Subs!H1", values: [["shared"]] }, { range: `Subs!H${i + 2}`, values: [[JSON.stringify(shared)]] }]);
  if (on && pick.length && username !== s.username) await notify([[username, "share", `${s.name} shared your Day ${+day} ${pick.length > 1 ? "files/links" : "file/link"} with the team`, +day, username]]);
  return Response.json({ ok: true, shared });
}

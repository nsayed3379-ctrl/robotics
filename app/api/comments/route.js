import { randomUUID } from "crypto";
import { rows, append, deleteRow, notify } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
const no = (error, status) => Response.json({ error }, { status });

// A comment belongs to one submission (day + owner). @username tags notify that teammate; the owner hears about the rest.
export async function POST(req) {
  const s = await session();
  if (!s) return no("auth", 401);
  const b = await req.json().catch(() => ({}));
  const text = String(b.text || "").trim().slice(0, 2000), day = +b.day, owner = String(b.owner || "");
  if (!text || !day) return no("Write a comment first", 400);
  const users = (await rows("Users")).map(r => r[0]);
  if (!users.includes(owner)) return no("Unknown member", 400);
  await append("Comments", [randomUUID(), String(day), owner, s.username, text, new Date().toISOString()]);
  const short = text.length > 80 ? text.slice(0, 80) + "…" : text;
  const tagged = [...new Set([...text.matchAll(/@([\w.-]+)/g)].map(m => m[1].toLowerCase()))].filter(u => users.includes(u) && u !== s.username);
  await notify([
    ...tagged.map(u => [u, "mention", `${s.name} mentioned you on Day ${day}: ${short}`, day, owner]),
    ...(owner !== s.username && !tagged.includes(owner) ? [[owner, "comment", `${s.name} commented on your Day ${day} work: ${short}`, day, owner]] : []),
  ]);
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  const s = await session();
  if (!s) return no("auth", 401);
  const { id } = await req.json().catch(() => ({}));
  const all = await rows("Comments");
  const i = all.findIndex(r => r[0] === id);
  if (i < 0) return no("Comment not found", 404);
  if (s.role !== "admin" && all[i][3] !== s.username) return no("You can only delete your own comments", 403);
  await deleteRow("Comments", i);
  return Response.json({ ok: true });
}

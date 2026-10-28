import { randomUUID } from "crypto";
import { tabs, rows, append, setRow, deleteRow, task, taskRow, notify } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
const PRI = ["low", "med", "high"], ST = ["todo", "doing", "done"];
const no = (error, status) => Response.json({ error }, { status });
// Applies only the fields that were sent, each checked.
const apply = (t, b) => ({
  ...t,
  ...(b.title !== undefined && { title: String(b.title).trim().slice(0, 200) }),
  ...(b.deadline !== undefined && { deadline: /^\d{4}-\d{2}-\d{2}$/.test(b.deadline) ? b.deadline : "" }),
  ...(PRI.includes(b.priority) && { priority: b.priority }),
  ...(ST.includes(b.status) && { status: b.status }),
});
const gave = (s, t) => [t.assignee, "task", `${s.name} gave you a task: ${t.title}`];

export async function POST(req) {
  const s = await session();
  if (!s) return no("auth", 401);
  const b = await req.json().catch(() => ({}));
  const t = apply({ id: randomUUID(), title: "", deadline: "", priority: "med", status: "todo", assignee: s.username, by: s.username, created: new Date().toISOString() }, b);
  if (!t.title) return no("Give the task a title", 400);
  // Only the admin can give a task to someone else.
  if (s.role === "admin" && b.assignee) {
    if (!(await rows("Users")).some(r => r[0] === b.assignee)) return no("Unknown member", 400);
    t.assignee = b.assignee;
  }
  await append("Tasks", taskRow(t));
  if (t.assignee !== s.username) await notify([gave(s, t)]);
  return Response.json({ ok: true });
}

// The assignee can always move a task; its details belong to whoever created it, and the admin.
export async function PATCH(req) {
  const s = await session();
  if (!s) return no("auth", 401);
  const b = await req.json().catch(() => ({}));
  const [all, users] = await tabs("Tasks", "Users");
  const i = all.findIndex(r => r[0] === b.id);
  if (i < 0) return no("Task not found", 404);
  const t = task(all[i]), admin = s.role === "admin";
  if (!admin && t.assignee !== s.username) return no("no", 403);
  const n = apply(t, admin || t.by === s.username ? b : { status: b.status });
  if (!n.title) return no("Give the task a title", 400);
  if (admin && b.assignee && b.assignee !== t.assignee) {
    if (!users.some(r => r[0] === b.assignee)) return no("Unknown member", 400);
    n.assignee = b.assignee;
  }
  await setRow("Tasks", i, taskRow(n));
  if (n.assignee !== t.assignee && n.assignee !== s.username) await notify([gave(s, n)]);
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  const s = await session();
  if (!s) return no("auth", 401);
  const { id } = await req.json().catch(() => ({}));
  const all = await rows("Tasks");
  const i = all.findIndex(r => r[0] === id);
  if (i < 0) return no("Task not found", 404);
  if (s.role !== "admin" && task(all[i]).by !== s.username) return no("Only whoever made this task can delete it", 403);
  await deleteRow("Tasks", i);
  return Response.json({ ok: true });
}

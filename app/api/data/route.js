import { tabs, sub, task, comment } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await session();
  if (!s) return Response.json({ error: "auth" }, { status: 401 });
  const [days, subs, users, tasks, comments] = await tabs("Days", "Subs", "Users", "Tasks", "Comments");
  const tk = tasks.map(task);
  // Submissions and comments are team-wide (the feed); tasks stay with their assignee.
  return Response.json({
    me: s,
    days: days.map(r => +r[0]),
    dates: Object.fromEntries(days.filter(r => r[1]).map(r => [+r[0], r[1]])),
    subs: subs.map(sub),
    comments: comments.map(comment),
    tasks: s.role === "admin" ? tk : tk.filter(t => t.assignee === s.username),
    users: users.map(r => ({ username: r[0], name: r[1], role: r[2] })),
  });
}

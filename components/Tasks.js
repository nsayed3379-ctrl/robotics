"use client";
import { useEffect, useState } from "react";
import { post, send, ymd, fmt } from "@/lib/api";

const COLS = [["todo", "Todo"], ["doing", "In progress"], ["done", "Done"]];
const PRI = { high: "High", med: "Medium", low: "Low" }, RANK = { high: 0, med: 1, low: 2 };
const empty = { title: "", deadline: "", priority: "med", assignee: "" };
// Soonest deadline first (none last), then highest priority.
const order = (a, b) => (a.deadline || "9").localeCompare(b.deadline || "9") || RANK[a.priority] - RANK[b.priority];

export default function Tasks({ d, reload }) {
  const admin = d.me.role === "admin", me = d.me.username, today = ymd();
  const [list, setList] = useState(d.tasks), [view, setView] = useState("board"), [f, setF] = useState(empty), [edit, setEdit] = useState(null), [who, setWho] = useState(""), [over, setOver] = useState(null), [err, setErr] = useState("");
  useEffect(() => setList(d.tasks), [d.tasks]);
  const name = u => d.users.find(x => x.username === u)?.name || u;
  const run = async p => { const r = await p; setErr(r.error || ""); reload(); return r; };
  // Changes show at once; the reload afterwards puts things back if the server refused.
  const move = (t, status) => {
    if (t.status === status) return;
    setList(l => l.map(x => x.id === t.id ? { ...x, status } : x));
    run(send("PATCH", "/api/tasks", { id: t.id, status }));
  };
  const save = async () => {
    if (!f.title.trim()) return setErr("Give the task a title");
    const b = { ...f, assignee: admin ? f.assignee || me : undefined };
    const r = await run(edit ? send("PATCH", "/api/tasks", { id: edit, ...b }) : post("/api/tasks", b));
    if (!r.error) { setF(empty); setEdit(null); }
  };
  const del = t => {
    if (!confirm(`Delete “${t.title}”?`)) return;
    setList(l => l.filter(x => x.id !== t.id));
    run(send("DELETE", "/api/tasks", { id: t.id }));
  };
  const shown = list.filter(t => !who || t.assignee === who).sort(order);

  const card = (t, board) => {
    const late = t.deadline && t.deadline < today && t.status !== "done", c = COLS.findIndex(x => x[0] === t.status);
    return <div key={t.id} className={`task p-${t.priority} s-${t.status}`} draggable={board} onDragStart={e => e.dataTransfer.setData("text/plain", t.id)}>
      <div className="head"><b>{t.title}</b>
        {!board && <select value={t.status} onChange={e => move(t, e.target.value)} aria-label="Status">{COLS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}</div>
      <div className="meta">
        <span className={`pri ${t.priority}`}>{PRI[t.priority]}</span>
        {t.deadline && <span className={late ? "err" : ""}>📅 {fmt(t.deadline, { day: "numeric", month: "short" })}{late && " · late"}</span>}
        {admin ? <span>👤 {name(t.assignee)}</span> : t.by !== me && <span>from {name(t.by)}</span>}
      </div>
      <div className="acts">
        {board && <>
          <button className="g" disabled={c <= 0} onClick={() => move(t, COLS[c - 1][0])} aria-label="Move left">←</button>
          <button className="g" disabled={c >= 2} onClick={() => move(t, COLS[c + 1][0])} aria-label="Move right">→</button>
        </>}
        {(admin || t.by === me) && <>
          <button className="g" onClick={() => { setEdit(t.id); setF({ title: t.title, deadline: t.deadline, priority: t.priority, assignee: t.assignee }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
          <button className="g" onClick={() => del(t)}>Delete</button>
        </>}
      </div>
    </div>;
  };

  return <>
    <div className="card">
      <h3>{edit ? "Edit task" : admin ? "Give a task" : "Add a task"}</h3>
      <input placeholder="What needs doing?" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} onKeyDown={e => e.key === "Enter" && save()} />
      <div className="row wrap">
        <label>Deadline<input type="date" value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} /></label>
        <label>Priority<select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>{Object.entries(PRI).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        {admin && <label>For<select value={f.assignee || me} onChange={e => setF({ ...f, assignee: e.target.value })}>
          {d.users.map(u => <option key={u.username} value={u.username}>{u.name}{u.username === me ? " (me)" : ""}</option>)}</select></label>}
      </div>
      <button onClick={save}>{edit ? "Save changes" : "Add task"}</button>
      {edit && <> <button className="g" onClick={() => { setEdit(null); setF(empty); }}>Cancel</button></>}
      {err && <p className="err">{err}</p>}
    </div>
    <div className="bar">
      <div className="seg">{[["board", "Board"], ["list", "List"]].map(([k, l]) => <button key={k} className={view === k ? "on" : "g"} onClick={() => setView(k)}>{l}</button>)}</div>
      {admin && <select value={who} onChange={e => setWho(e.target.value)} aria-label="Show tasks for"><option value="">Everyone</option>{d.users.map(u => <option key={u.username} value={u.username}>{u.name}</option>)}</select>}
    </div>
    {view === "board" ? <div className="board">{COLS.map(([k, l]) => {
      const col = shown.filter(t => t.status === k);
      return <div key={k} className={`col${over === k ? " over" : ""}`}
        onDragOver={e => { e.preventDefault(); setOver(k); }}
        onDragLeave={e => !e.currentTarget.contains(e.relatedTarget) && setOver(null)}
        onDrop={e => { e.preventDefault(); setOver(null); const t = list.find(x => x.id === e.dataTransfer.getData("text/plain")); t && move(t, k); }}>
        <h4>{l} <span>{col.length}</span></h4>
        {col.map(t => card(t, true))}
        {!col.length && <p className="muted">Drop tasks here</p>}
      </div>;
    })}</div> : <>{shown.map(t => card(t, false))}{!shown.length && <p className="muted">No tasks yet.</p>}</>}
  </>;
}

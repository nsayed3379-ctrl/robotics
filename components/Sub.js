"use client";
import { useState } from "react";
import { post, send, ago } from "@/lib/api";

export const blank = { text: "", links: [], files: [], stuck: "" };
export const hasWork = s => !!(s.text.trim() || s.links.length || s.files.length);
const nameOf = (d, u) => d.users.find(x => x.username === u)?.name || u;

export function Files({ s }) {
  return <>
    {s.files.map(f => <div key={f.id}>📄 <a href={`/api/files/${f.id}`} target="_blank">{f.name}</a></div>)}
    {s.links.map((l, i) => <div key={i}>🔗 <a href={l} target="_blank" rel="noopener noreferrer">{l}</a></div>)}
  </>;
}

// Thread under one submission (day + owner). Typing @ suggests teammates to tag.
export function Comments({ d, day, owner, reload }) {
  const list = d.comments.filter(c => c.day === day && c.owner === owner);
  const [open, setOpen] = useState(list.length > 0), [t, setT] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const q = t.match(/@([\w.-]*)$/)?.[1]?.toLowerCase();
  const hints = q === undefined ? [] : d.users.filter(u => u.username !== d.me.username && (u.username.startsWith(q) || u.name.toLowerCase().startsWith(q))).slice(0, 5);
  const add = async () => {
    if (!t.trim() || busy) return;
    setBusy(true);
    const r = await post("/api/comments", { day, owner, text: t });
    setBusy(false);
    if (r.error) return setErr(r.error);
    setT(""); setErr(""); reload();
  };
  if (!open) return <button className="link cbtn" onClick={() => setOpen(true)}>💬 Comment</button>;
  return <div className="cmts">
    {list.map(c => <div key={c.id} className="cmt">
      <b>{nameOf(d, c.author)}</b> <span className="muted">{ago(c.created)}</span>
      {(c.author === d.me.username || d.me.role === "admin") && <button className="x" title="Delete comment" onClick={async () => { await send("DELETE", "/api/comments", { id: c.id }); reload(); }}>×</button>}
      <div className="pre">{c.text.split(/(@[\w.-]+)/g).map((p, i) => p.startsWith("@") ? <span key={i} className="at">{p}</span> : p)}</div>
    </div>)}
    <div className="row">
      <input value={t} onChange={e => setT(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Comment… type @ to tag someone" />
      <button className="g" disabled={busy || !t.trim()} onClick={add}>Send</button>
    </div>
    {hints.length > 0 && <div className="hints">{hints.map(u => <button key={u.username} className="g" onClick={() => setT(t.replace(/@[\w.-]*$/, `@${u.username} `))}>@{u.username} <span className="muted">{u.name}</span></button>)}</div>}
    {err && <p className="err">{err}</p>}
  </div>;
}

// One member's work for a day: team feed and the admin's day view.
export function SubCard({ d, day, owner, reload }) {
  const s = d.subs.find(x => x.day === day && x.username === owner) || blank;
  return <div className={`card${s.stuck ? " stuck" : ""}`}>
    <div className="head"><h3>{nameOf(d, owner)}</h3>{s.updated && <span className="muted">{ago(s.updated)}</span>}</div>
    {s.stuck && <div className="flag">🚧 Stuck: {s.stuck}
      {d.me.role === "admin" && <button className="g" onClick={async () => { await post("/api/stuck", { day, username: owner, text: "" }); reload(); }}>Mark solved</button>}</div>}
    {s.text && <p className="pre">{s.text}</p>}
    <Files s={s} />
    {!hasWork(s) && <em className="muted">Nothing submitted yet</em>}
    <Comments d={d} day={day} owner={owner} reload={reload} />
  </div>;
}

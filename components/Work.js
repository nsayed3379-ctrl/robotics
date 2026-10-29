"use client";
import { useState } from "react";
import { ymd, fmt } from "@/lib/api";
import { Files, hasWork } from "./Sub";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "My work": stats, a month calendar, and every submission with search and a date filter.
export default function Work({ d, openDay }) {
  const me = d.me.username, today = ymd();
  const [q, setQ] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState(""), [m, setM] = useState(today.slice(0, 7));
  const mine = d.subs.filter(s => s.username === me && hasWork(s));
  const done = new Set(mine.map(s => s.day));
  // A submission's date is its day's date; days the admin never dated fall back to when it was saved.
  const when = s => d.dates[s.day] || (s.updated ? ymd(new Date(s.updated)) : "");

  // Streak = team days in a row with work, newest first. Today's day doesn't break it before you've posted.
  const past = d.days.filter(n => !d.dates[n] || d.dates[n] <= today).sort((a, b) => b - a);
  if (past.length && !done.has(past[0]) && (!d.dates[past[0]] || d.dates[past[0]] === today)) past.shift();
  let streak = 0;
  while (streak < past.length && done.has(past[streak])) streak++;
  const month = mine.filter(s => when(s).startsWith(today.slice(0, 7))).length;
  const myTasks = d.tasks.filter(t => t.assignee === me);

  const [y, mo] = m.split("-").map(Number), lead = new Date(y, mo - 1, 1).getDay(), len = new Date(y, mo, 0).getDate();
  const at = {};
  d.days.forEach(n => { const dt = d.dates[n]; if (dt) at[dt] = { day: n, ok: done.has(n) || !!at[dt]?.ok }; });
  mine.forEach(s => { at[when(s)] = { day: s.day, ok: true }; });
  const shift = k => setM(ymd(new Date(y, mo - 1 + k, 1)).slice(0, 7));

  const ql = q.trim().toLowerCase();
  const list = mine
    .filter(s => (!ql || [s.text, ...s.links, ...s.files.map(f => f.name)].join("\n").toLowerCase().includes(ql)) && (!from || when(s) >= from) && (!to || (when(s) && when(s) <= to)))
    .sort((a, b) => b.day - a.day);

  return <>
    <div className="stats">
      <div className="stat"><b>{month}</b><span className="muted">days submitted in {fmt(today, { month: "long" })}</span></div>
      <div className="stat"><b>{streak ? "🔥 " : ""}{streak}</b><span className="muted">day streak</span></div>
      <div className="stat"><b>{myTasks.filter(t => t.status === "done").length}<small>/{myTasks.length}</small></b><span className="muted">tasks done</span></div>
    </div>

    <div className="card">
      <div className="head">
        <button className="g" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <h3>{fmt(`${m}-01`, { month: "long", year: "numeric" })}</h3>
        <button className="g" onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>
      <div className="cal">
        {WD.map(w => <span key={w} className="wd">{w}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={"x" + i} />)}
        {Array.from({ length: len }, (_, i) => {
          const dt = `${m}-${String(i + 1).padStart(2, "0")}`, a = at[dt];
          const cls = a?.ok ? "ok" : a && dt <= today ? "miss" : a ? "up" : "";
          return <button key={dt} className={`c ${cls}${dt === today ? " today" : ""}`} disabled={!a} onClick={() => openDay(a.day)}
            title={a ? `Day ${a.day}: ${a.ok ? "submitted" : dt <= today ? "missed" : "coming up"}` : undefined}>
            {i + 1}{a && <small>D{a.day} {a.ok ? "✓" : dt <= today ? "✗" : ""}</small>}
          </button>;
        })}
      </div>
      <div className="legend"><span><i className="ok" />Submitted</span><span><i className="miss" />Missed</span><span><i className="up" />Coming up</span></div>
    </div>

    <div className="filters">
      <input placeholder="Search your work, links, files…" value={q} onChange={e => setQ(e.target.value)} />
      <label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label>To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
    </div>
    {list.map(s => <div className="card" key={s.day}>
      <div className="head"><button className="link" onClick={() => openDay(s.day)}>Day {s.day}</button><span className="muted">{when(s) && fmt(when(s))}</span></div>
      {s.text && <p className="pre">{s.text}</p>}
      <Files s={s} badges />
      {d.comments.some(c => c.day === s.day && c.owner === me) && <p className="muted">💬 {d.comments.filter(c => c.day === s.day && c.owner === me).length} comments</p>}
    </div>)}
    {!list.length && <p className="muted">{mine.length ? "Nothing matches that search." : "You haven't submitted any work yet."}</p>}
  </>;
}

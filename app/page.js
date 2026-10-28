"use client";
import { useEffect, useState } from "react";
import { ask, post, send, ymd, fmt } from "@/lib/api";
import { Files, Comments, SubCard, blank, hasWork } from "@/components/Sub";
import Work from "@/components/Work";
import Tasks from "@/components/Tasks";
import Bell from "@/components/Bell";

function Mine({ d, day, s, reload }) {
  const [text, setText] = useState(s.text), [link, setLink] = useState(""), [p, setP] = useState(null), [err, setErr] = useState(""), [why, setWhy] = useState(null);
  const save = async patch => { await post("/api/submit", { day, text, links: s.links, ...patch }); reload(); };
  const up = async file => {
    setErr("");
    const { url } = await post("/api/upload/init", { day, name: file.name, type: file.type });
    if (!url) return setErr("Could not start upload");
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.upload.onprogress = e => setP(Math.round((e.loaded / e.total) * 100));
    x.onload = async () => { try { await post("/api/upload/done", { day, id: JSON.parse(x.responseText).id }); } catch { setErr("Upload failed"); } setP(null); reload(); };
    x.onerror = () => { setErr("Upload failed"); setP(null); };
    x.send(file);
  };
  const flag = async t => { setErr(""); const r = await post("/api/stuck", { day, text: t }); if (r.error) return setErr(r.error); setWhy(null); reload(); };
  return <div className={`card${s.stuck ? " stuck" : ""}`}>
    {s.stuck && <div className="flag">🚧 You told the admin you're stuck: {s.stuck} <button className="g" onClick={() => flag("")}>It's solved</button></div>}
    <textarea value={text} onChange={e => setText(e.target.value)} onBlur={() => text !== s.text && save({})} placeholder={`Day ${day} work…`} />
    <div className="row">
      <input value={link} onChange={e => setLink(e.target.value)} placeholder="Paste link (https://…)" />
      <button onClick={() => { if (/^https?:\/\//i.test(link)) { save({ links: [...s.links, link] }); setLink(""); } else setErr("Link must start with https://"); }}>Add link</button>
    </div>
    <div className="acts">
      <label className="btn">Attach PDF / picture<input type="file" hidden onChange={e => e.target.files[0] && up(e.target.files[0])} /></label>
      {p !== null && <progress value={p} max="100" />}
      {!s.stuck && why === null && <button className="g" onClick={() => setWhy("")}>🚧 I'm stuck</button>}
    </div>
    {why !== null && <div className="row" style={{ marginTop: 6 }}>
      <input autoFocus value={why} onChange={e => setWhy(e.target.value)} onKeyDown={e => e.key === "Enter" && why.trim() && flag(why)} placeholder="What's blocking you? The admin gets an alert." />
      <button onClick={() => why.trim() && flag(why)}>Tell admin</button>
      <button className="g" onClick={() => setWhy(null)}>Cancel</button>
    </div>}
    <div style={{ marginTop: 8 }}><Files s={s} /></div>
    {err && <p className="err">{err}</p>}
    <Comments d={d} day={day} owner={d.me.username} reload={reload} />
  </div>;
}

// What everyone posted for one day, latest first, so people can see who is already on what.
function Feed({ d, day, reload }) {
  const posted = d.subs.filter(s => s.day === day && (hasWork(s) || s.stuck)).sort((a, b) => b.updated.localeCompare(a.updated));
  const quiet = d.users.filter(u => u.role === "member" && !posted.some(s => s.username === u.username));
  return <>
    {posted.map(s => <SubCard key={s.username} d={d} day={day} owner={s.username} reload={reload} />)}
    {!posted.length && <p className="muted">Nobody has posted for Day {day} yet.</p>}
    {quiet.length > 0 && <p className="muted">Not posted yet: {quiet.map(u => u.name).join(", ")}</p>}
  </>;
}

// Opens on the day dated today, else the newest one.
const pick = r => r.days.find(n => r.dates[n] === ymd()) || r.days[r.days.length - 1] || 1;

export default function Home() {
  const [d, setD] = useState(null), [day, setDay] = useState(null), [tab, setTab] = useState("days"), [f, setF] = useState({}), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const load = async () => {
    const r = await ask("/api/data");
    setErr(r.status === 401 ? "" : r.error || "");
    setD(r.error ? { guest: true } : r);
    if (!r.error) setDay(x => x ?? pick(r));
  };
  useEffect(() => { load(); }, []);
  if (!d) return <main>Loading…</main>;
  if (d.guest) return <main style={{ maxWidth: 360 }}>
    <h1>Robotics Team Tracker</h1><br />
    <input placeholder="Username" onChange={e => setF({ ...f, username: e.target.value })} />
    <input placeholder="Password" type="password" onChange={e => setF({ ...f, password: e.target.value })} />
    <button onClick={async () => { const r = await post("/api/login", f); r.error ? setErr(r.error) : load(); }}>Log in</button>
    {err && <p className="err">{err}</p>}
  </main>;
  const admin = d.me.role === "admin", me = d.me.username;
  const sub = u => d.subs.find(x => x.day === day && x.username === u) || blank;
  const name = u => d.users.find(x => x.username === u)?.name || u;
  const go = (t, n) => { setTab(t); if (n) setDay(n); };
  const tabs = admin ? [["days", "Days"], ["tasks", "Tasks"]] : [["days", "Submit"], ["feed", "Team feed"], ["work", "My work"], ["tasks", "Tasks"]];
  const byDay = tab === "days" || tab === "feed", stuck = d.subs.filter(s => s.stuck);
  const setDate = async date => { setD({ ...d, dates: { ...d.dates, [day]: date } }); await send("PATCH", "/api/days", { day, date }); load(); };
  return <main>
    <div className="top"><h1>{d.me.name}{admin && " (Admin)"}</h1>
      <div className="row">
        <Bell onNew={load} onOpen={n => { n.kind === "task" ? go("tasks") : go(admin || n.owner === me ? "days" : "feed", n.day); load(); }} />
        <button className="g" onClick={async () => { await post("/api/logout"); setD({ guest: true }); }}>Log out</button>
      </div></div>
    <nav className="nav">{tabs.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</nav>
    {byDay && <div className="tabs">
      {d.days.map(n => <button key={n} className={n === day ? "on" : "g"} onClick={() => setDay(n)}>Day {n}</button>)}
      {admin && <button className="g" onClick={async () => { await post("/api/days", { date: ymd() }); await load(); setDay(d.days.length + 1); }}>+ Add day</button>}
    </div>}
    {byDay && (admin
      ? <label className="when">Date of Day {day} <input type="date" value={d.dates[day] || ""} onChange={e => setDate(e.target.value)} /></label>
      : d.dates[day] && <p className="muted when">{fmt(d.dates[day], { weekday: "long", day: "numeric", month: "long" })}</p>)}
    {tab === "days" && (admin ? <>
      {stuck.length > 0 && <div className="card stuck"><h3>🚧 Blockers ({stuck.length})</h3>
        {stuck.map(s => <div key={s.day + s.username}><button className="link" onClick={() => setDay(s.day)}>{name(s.username)} · Day {s.day}</button>: {s.stuck}</div>)}</div>}
      {d.users.filter(u => u.role === "member").map(u => <SubCard key={u.username} d={d} day={day} owner={u.username} reload={load} />)}
      <div className="card"><h3>Add member / reset password</h3>
        <input placeholder="Name" onChange={e => setF({ ...f, name: e.target.value })} />
        <input placeholder="Username" onChange={e => setF({ ...f, nu: e.target.value })} />
        <input placeholder="Password" onChange={e => setF({ ...f, np: e.target.value })} />
        <button onClick={async () => { const r = await post("/api/users", { name: f.name, username: f.nu, password: f.np }); setMsg(r.error || "Saved"); load(); }}>Save member</button> {msg}
      </div>
    </> : <Mine key={day} d={d} day={day} s={sub(me)} reload={load} />)}
    {tab === "feed" && <Feed d={d} day={day} reload={load} />}
    {tab === "work" && <Work d={d} openDay={n => go("days", n)} />}
    {tab === "tasks" && <Tasks d={d} reload={load} />}
  </main>;
}

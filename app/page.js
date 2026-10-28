"use client";
import { useEffect, useState } from "react";
const post = (u, b) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b || {}) }).then(r => r.json());

function Files({ s }) {
  return <>
    {s.files.map(f => <div key={f.id}>📄 <a href={`/api/files/${f.id}`} target="_blank">{f.name}</a></div>)}
    {s.links.map((l, i) => <div key={i}>🔗 <a href={l} target="_blank" rel="noopener noreferrer">{l}</a></div>)}
  </>;
}

function Mine({ day, s, reload }) {
  const [text, setText] = useState(s.text), [link, setLink] = useState(""), [p, setP] = useState(null), [err, setErr] = useState("");
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
  return <div className="card">
    <textarea value={text} onChange={e => setText(e.target.value)} onBlur={() => text !== s.text && save({})} placeholder={`Day ${day} work…`} />
    <div className="row">
      <input value={link} onChange={e => setLink(e.target.value)} placeholder="Paste link (https://…)" />
      <button onClick={() => { if (/^https?:\/\//i.test(link)) { save({ links: [...s.links, link] }); setLink(""); } else setErr("Link must start with https://"); }}>Add link</button>
    </div>
    <label className="btn">Attach PDF / picture<input type="file" hidden onChange={e => e.target.files[0] && up(e.target.files[0])} /></label>
    {p !== null && <progress value={p} max="100" style={{ marginLeft: 8 }} />}
    <div style={{ marginTop: 8 }}><Files s={s} /></div>
    {err && <p className="err">{err}</p>}
  </div>;
}

export default function Home() {
  const [d, setD] = useState(null), [day, setDay] = useState(1), [f, setF] = useState({}), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const load = async () => { const r = await fetch("/api/data"); setD(r.status === 401 ? { guest: true } : await r.json()); };
  useEffect(() => { load(); }, []);
  if (!d) return <main>Loading…</main>;
  if (d.guest) return <main style={{ maxWidth: 360 }}>
    <h1>Robotics Team Tracker</h1><br />
    <input placeholder="Username" onChange={e => setF({ ...f, username: e.target.value })} />
    <input placeholder="Password" type="password" onChange={e => setF({ ...f, password: e.target.value })} />
    <button onClick={async () => { const r = await post("/api/login", f); r.error ? setErr(r.error) : load(); }}>Log in</button>
    {err && <p className="err">{err}</p>}
  </main>;
  const admin = d.me.role === "admin";
  const sub = u => d.subs.find(x => x.day === day && x.username === u) || { text: "", links: [], files: [] };
  return <main>
    <div className="top"><h1>{d.me.name}{admin && " (Admin)"}</h1>
      <button className="g" onClick={async () => { await post("/api/logout"); setD({ guest: true }); }}>Log out</button></div>
    <div className="tabs">
      {d.days.map(n => <button key={n} className={n === day ? "on" : "g"} onClick={() => setDay(n)}>Day {n}</button>)}
      {admin && <button className="g" onClick={async () => { await post("/api/days"); await load(); setDay(d.days.length + 1); }}>+ Add day</button>}
    </div>
    {admin ? <>
      {d.users.filter(u => u.role === "member").map(u => <div className="card" key={u.username}>
        <h3>{u.name}</h3>{sub(u.username).text && <p style={{ whiteSpace: "pre-wrap" }}>{sub(u.username).text}</p>}
        <Files s={sub(u.username)} />{!sub(u.username).text && !sub(u.username).files.length && !sub(u.username).links.length && <em>Nothing submitted yet</em>}
      </div>)}
      <div className="card"><h3>Add member / reset password</h3>
        <input placeholder="Name" onChange={e => setF({ ...f, name: e.target.value })} />
        <input placeholder="Username" onChange={e => setF({ ...f, nu: e.target.value })} />
        <input placeholder="Password" onChange={e => setF({ ...f, np: e.target.value })} />
        <button onClick={async () => { const r = await post("/api/users", { name: f.name, username: f.nu, password: f.np }); setMsg(r.error || "Saved"); load(); }}>Save member</button> {msg}
      </div>
    </> : <Mine key={day} day={day} s={sub(d.me.username)} reload={load} />}
  </main>;
}

"use client";
import { useEffect, useRef, useState } from "react";
import { ask, post, ago } from "@/lib/api";

const ICON = { mention: "@", comment: "💬", stuck: "🚧", task: "✅", share: "🌐" };

// Checks every 30s (every 2 min while the tab is in the background). New ones also pop a desktop alert once allowed.
export default function Bell({ onOpen, onNew }) {
  const [notes, setNotes] = useState([]), [open, setOpen] = useState(false), [perm, setPerm] = useState("granted");
  const seen = useRef(null);
  const check = async () => {
    const r = await ask("/api/notes");
    if (!Array.isArray(r.notes)) return;
    const fresh = seen.current ? r.notes.filter(n => !n.read && !seen.current.has(n.id)) : [];
    seen.current = new Set(r.notes.map(n => n.id));
    setNotes(r.notes);
    if (!fresh.length) return;
    onNew();
    if (typeof Notification !== "undefined" && Notification.permission === "granted")
      fresh.forEach(n => { try { new Notification("Robotics Tracker", { body: n.text, tag: n.id }); } catch {} });
  };
  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    check();
    let n = 0;
    const t = setInterval(() => (!document.hidden || ++n % 4 === 0) && check(), 30000);
    return () => clearInterval(t);
  }, []);
  const unread = notes.filter(n => !n.read).length;
  // Opening marks everything read on the server; the highlight stays until the panel closes.
  const toggle = () => {
    if (open) setNotes(ns => ns.map(n => ({ ...n, read: true })));
    else if (unread) post("/api/notes");
    setOpen(!open);
  };
  return <div className="bell">
    <button className="g" onClick={toggle} aria-label={`Notifications, ${unread} unread`}>🔔{unread > 0 && <span className="badge">{unread}</span>}</button>
    {open && <div className="panel">
      {perm === "default" && <button className="g wide" onClick={async () => setPerm(await Notification.requestPermission())}>Turn on desktop alerts</button>}
      {!notes.length && <p className="muted">No notifications yet.</p>}
      {notes.map(n => <button key={n.id} className={`note${n.read ? "" : " new"}`} onClick={() => { toggle(); onOpen(n); }}>
        <span>{ICON[n.kind] || "•"}</span><span>{n.text}<br /><span className="muted">{ago(n.created)}</span></span>
      </button>)}
    </div>}
  </div>;
}

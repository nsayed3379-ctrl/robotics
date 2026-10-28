// Browser-side helpers.
// Never throws: non-2xx or unparseable responses come back as { error, status }.
export const ask = (u, o) => fetch(u, o).then(async r => {
  let j = {};
  try { j = JSON.parse(await r.text()) || {}; } catch {}
  return r.ok ? j : { ...j, status: r.status, error: j.error || `Server error (${r.status})` };
}, () => ({ error: "Network error" }));
export const send = (method, u, b) => ask(u, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(b || {}) });
export const post = (u, b) => send("POST", u, b);
// Local calendar date as YYYY-MM-DD (toISOString would give the UTC date).
export const ymd = (t = new Date()) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
export const fmt = (s, o = { day: "numeric", month: "short", year: "numeric" }) => new Date(s + "T00:00").toLocaleDateString(undefined, o);
export const ago = iso => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  return !iso ? "" : m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : fmt(ymd(new Date(iso)));
};

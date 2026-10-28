import { google } from "googleapis";
import { randomUUID } from "crypto";
export function client() {
  const c = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, "http://localhost:3000/api/auth/callback");
  c.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return c;
}
export const drive = () => google.drive({ version: "v3", auth: client() });
const sh = () => google.sheets({ version: "v4", auth: client() });
const id = () => process.env.SHEET_ID;
// Tabs added after the first release. They are created (and older tabs get their new header cells) on first use, so existing sheets keep working.
const LATE = {
  Tasks: ["id", "title", "deadline", "priority", "status", "assignee", "by", "created"],
  Comments: ["id", "day", "owner", "author", "text", "created"],
  Notes: ["id", "user", "kind", "text", "day", "owner", "created", "read"],
};
export const setCells = data => sh().spreadsheets.values.batchUpdate({ spreadsheetId: id(), requestBody: { valueInputOption: "RAW", data } });
async function addTabs() {
  const have = (await sh().spreadsheets.get({ spreadsheetId: id(), fields: "sheets.properties.title" })).data.sheets.map(x => x.properties.title);
  const miss = Object.keys(LATE).filter(t => !have.includes(t));
  if (!miss.length) return;
  await sh().spreadsheets.batchUpdate({ spreadsheetId: id(), requestBody: { requests: miss.map(title => ({ addSheet: { properties: { title } } })) } })
    .catch(e => { if (!/already exists/.test(e.message)) throw e; });
  await setCells([...miss.map(t => ({ range: `${t}!A1`, values: [LATE[t]] })), { range: "Days!B1", values: [["date"]] }, { range: "Subs!G1", values: [["stuck"]] }]);
}
// Every request runs as the one Google user from setup, so the whole team shares that user's Sheets read quota: read tabs in one batch.
export async function tabs(...names) {
  const get = () => sh().spreadsheets.values.batchGet({ spreadsheetId: id(), ranges: names });
  const r = await get().catch(async e => { if (!/Unable to parse range/.test(e.message)) throw e; await addTabs(); return get(); });
  return r.data.valueRanges.map(v => (v.values || []).slice(1));
}
export const rows = async tab => (await tabs(tab))[0];
export const append = (tab, ...rs) => sh().spreadsheets.values.append({ spreadsheetId: id(), range: tab, valueInputOption: "RAW", requestBody: { values: rs } });
export const setRow = (tab, i, row) => sh().spreadsheets.values.update({ spreadsheetId: id(), range: `${tab}!A${i + 2}`, valueInputOption: "RAW", requestBody: { values: [row] } });
export async function deleteRow(tab, i) {
  const m = await sh().spreadsheets.get({ spreadsheetId: id(), fields: "sheets.properties" });
  const sheetId = m.data.sheets.find(x => x.properties.title === tab).properties.sheetId;
  await sh().spreadsheets.batchUpdate({ spreadsheetId: id(), requestBody: { requests: [{ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: i + 1, endIndex: i + 2 } } }] } });
}
export const sub = r => ({ day: +r[0], username: r[1], text: r[2] || "", links: JSON.parse(r[3] || "[]"), files: JSON.parse(r[4] || "[]"), updated: r[5] || "", stuck: r[6] || "" });
export async function upsert(day, user, patch) {
  const s = await rows("Subs");
  const i = s.findIndex(r => +r[0] === day && r[1] === user);
  const n = { ...(i < 0 ? { text: "", links: [], files: [], stuck: "" } : sub(s[i])), ...patch };
  const row = [String(day), user, n.text, JSON.stringify(n.links), JSON.stringify(n.files), new Date().toISOString(), n.stuck];
  if (i < 0) await append("Subs", row); else await setRow("Subs", i, row);
}
export const task = r => ({ id: r[0], title: r[1] || "", deadline: r[2] || "", priority: r[3] || "med", status: r[4] || "todo", assignee: r[5] || "", by: r[6] || "", created: r[7] || "" });
export const taskRow = t => [t.id, t.title, t.deadline, t.priority, t.status, t.assignee, t.by, t.created];
export const comment = r => ({ id: r[0], day: +r[1], owner: r[2], author: r[3], text: r[4] || "", created: r[5] || "" });
// notes: [user, kind, text, day?, owner?] with kind mention | comment | stuck | task; day + owner point at a submission.
export const notify = notes => notes.length && append("Notes", ...notes.map(([user, kind, text, day = "", owner = ""]) => [randomUUID(), user, kind, text, String(day), owner, new Date().toISOString(), ""]));

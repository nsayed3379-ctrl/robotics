import { google } from "googleapis";
export function client() {
  const c = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, "http://localhost:3000/api/auth/callback");
  c.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return c;
}
export const drive = () => google.drive({ version: "v3", auth: client() });
const sh = () => google.sheets({ version: "v4", auth: client() });
const id = () => process.env.SHEET_ID;
export async function rows(tab) {
  const r = await sh().spreadsheets.values.get({ spreadsheetId: id(), range: tab });
  return (r.data.values || []).slice(1);
}
export const append = (tab, row) => sh().spreadsheets.values.append({ spreadsheetId: id(), range: tab, valueInputOption: "RAW", requestBody: { values: [row] } });
export const setRow = (tab, i, row) => sh().spreadsheets.values.update({ spreadsheetId: id(), range: `${tab}!A${i + 2}`, valueInputOption: "RAW", requestBody: { values: [row] } });
export async function upsert(day, user, patch) {
  const s = await rows("Subs");
  const i = s.findIndex(r => +r[0] === day && r[1] === user);
  const cur = i < 0 ? { text: "", links: [], files: [] } : { text: s[i][2] || "", links: JSON.parse(s[i][3] || "[]"), files: JSON.parse(s[i][4] || "[]") };
  const n = { ...cur, ...patch };
  const row = [String(day), user, n.text, JSON.stringify(n.links), JSON.stringify(n.files), new Date().toISOString()];
  if (i < 0) await append("Subs", row); else await setRow("Subs", i, row);
}

import fs from "fs";
import http from "http";
import { google } from "googleapis";
import bcrypt from "bcryptjs";
process.loadEnvFile(".env.local");
const pw = process.argv[2];
if (!pw) { console.log("Usage: node scripts/setup.mjs <admin-password>"); process.exit(1); }
const c = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, "http://localhost:3000/api/auth/callback");
console.log("Open this link in your browser and allow access:\n\n" + c.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/spreadsheets"] }) + "\n");
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost:3000");
  if (u.pathname !== "/api/auth/callback") return res.end();
  const { tokens } = await c.getToken(u.searchParams.get("code"));
  c.setCredentials(tokens);
  res.end("Done. You can close this tab.");
  const drive = google.drive({ version: "v3", auth: c }), sheets = google.sheets({ version: "v4", auth: c });
  const folder = (await drive.files.create({ requestBody: { name: "Robotics-Tracker", mimeType: "application/vnd.google-apps.folder" }, fields: "id" })).data.id;
  const sh = (await sheets.spreadsheets.create({ requestBody: { properties: { title: "Robotics-Tracker-Data" }, sheets: ["Users", "Days", "Subs", "Tasks", "Comments", "Notes"].map(title => ({ properties: { title } })) } })).data.spreadsheetId;
  const put = (range, values) => sheets.spreadsheets.values.update({ spreadsheetId: sh, range, valueInputOption: "RAW", requestBody: { values } });
  await put("Users!A1", [["username", "name", "role", "hash"], ["nursayed", "Nur Sayed", "admin", await bcrypt.hash(pw, 10)]]);
  await put("Days!A1", [["day", "date"], ["1", new Date().toLocaleDateString("en-CA")]]);
  await put("Subs!A1", [["day", "username", "text", "links", "files", "updated", "stuck"]]);
  await put("Tasks!A1", [["id", "title", "deadline", "priority", "status", "assignee", "by", "created"]]);
  await put("Comments!A1", [["id", "day", "owner", "author", "text", "created"]]);
  await put("Notes!A1", [["id", "user", "kind", "text", "day", "owner", "created", "read"]]);
  fs.appendFileSync(".env.local", `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\nFOLDER_ID=${folder}\nSHEET_ID=${sh}\nSESSION_SECRET=${crypto.randomUUID()}${crypto.randomUUID()}\n`);
  console.log("Setup done. Admin login: nursayed. Now run: npm run dev");
  process.exit(0);
}).listen(3000);

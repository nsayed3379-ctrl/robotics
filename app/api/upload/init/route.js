import { client } from "@/lib/google";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function POST(req) {
  const s = await session();
  if (!s) return Response.json({ error: "auth" }, { status: 401 });
  const { day, name, type } = await req.json();
  const { token } = await client().getAccessToken();
  const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Upload-Content-Type": type || "application/octet-stream", Origin: req.headers.get("origin") || "" },
    body: JSON.stringify({ name: `Day${+day}_${s.username}_${name}`, parents: [process.env.FOLDER_ID], appProperties: { owner: s.username, day: String(+day) } }),
  });
  return Response.json({ url: r.headers.get("location") });
}

import { cookies } from "next/headers";
export async function POST() { cookies().delete("s"); return Response.json({ ok: true }); }

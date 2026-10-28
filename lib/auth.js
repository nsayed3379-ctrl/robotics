import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);
export async function login(u) {
  const t = await new SignJWT(u).setProtectedHeader({ alg: "HS256" }).setExpirationTime("14d").sign(key());
  cookies().set("s", t, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 1209600 });
}
export async function session() {
  try { return (await jwtVerify(cookies().get("s")?.value || "", key())).payload; } catch { return null; }
}

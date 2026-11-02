import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { persistSession } from "./session-security";
import { db } from "./db";
export const hashToken = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export async function currentUser() {
  const cookie = (await cookies()).get("vibey-session")?.value;
  if (!cookie) return null;
  const s = await db.session.findUnique({
    where: { id: hashToken(cookie) },
    include: { user: {include:{capabilities:{where:{active:true}}}} },
  });
  return s && s.securityVersion === s.user.securityVersion && s.expires > new Date() && s.user.active ? s.user : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("401:Please sign in to continue.");
  return user;
}
export async function createSession(userId: string, verified?: { securityVersion: number; passwordHash: string }) {
  const token = await persistSession(userId, verified);
  const oldToken=(await cookies()).get("vibey-session")?.value;
  if(oldToken)await db.session.deleteMany({where:{id:hashToken(oldToken)}});
  (await cookies()).set("vibey-session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 86400,
  });
}

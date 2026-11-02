import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";

export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const opaque = () => randomBytes(32).toString("base64url");
export function googleConfiguration(env: NodeJS.ProcessEnv = process.env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || env.SITE_MODE !== "full_platform") return null;
  try {
    const origin = new URL(env.APP_ORIGIN || "");
    if (origin.origin !== env.APP_ORIGIN || origin.username || origin.password) return null;
    if (env.NODE_ENV === "production" ? origin.origin !== "https://mixermates.com" : !["localhost", "127.0.0.1"].includes(origin.hostname)) return null;
    return {clientId:env.GOOGLE_CLIENT_ID, clientSecret:env.GOOGLE_CLIENT_SECRET, origin:origin.origin, callback:origin.origin + "/api/auth/google/callback"};
  } catch { return null; }
}
export function googleAuthorization(config: NonNullable<ReturnType<typeof googleConfiguration>>, state: string, nonce: string, verifier: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({client_id:config.clientId, redirect_uri:config.callback, response_type:"code", scope:"openid email profile", state, nonce, code_challenge:createHash("sha256").update(verifier).digest("base64url"), code_challenge_method:"S256", prompt:"select_account"}).toString();
  return url.toString();
}
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
export async function verifyGoogleIdentity(token: string, clientId: string, nonceHash: string, keys: JWTVerifyGetKey = googleKeys) {
  const {payload} = await jwtVerify(token, keys, {algorithms:["RS256"],issuer:["https://accounts.google.com","accounts.google.com"],audience:clientId,requiredClaims:["iss","sub","aud","iat","exp","nonce"],maxTokenAge:"10m",clockTolerance:5});
  return googleClaims(payload,clientId,nonceHash);
}
export function googleClaims(p: JWTPayload, clientId: string, nonceHash: string) {
  if (!p.sub || p.sub.length > 191 || typeof p.nonce !== "string" || digest(p.nonce) !== nonceHash || p.email_verified !== true || typeof p.email !== "string" || p.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) || (p.azp !== undefined && p.azp !== clientId) || (Array.isArray(p.aud) && p.aud.length > 1 && p.azp !== clientId)) throw Error("Invalid Google identity.");
  return {subject:p.sub, email:p.email.toLowerCase(), name:typeof p.name === "string" ? p.name.trim().slice(0,80) : ""};
}

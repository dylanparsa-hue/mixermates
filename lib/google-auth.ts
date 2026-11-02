import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { permittedUsername } from "./social";
import { z } from "zod";
import { db } from "./db";
import { currentUser, createSession } from "./auth";
import { transaction } from "./domain-core";
import { boundedBody } from "./request-security";
import { consumeRateLimit } from "./security";
import { ageOn } from "./rules";
import { digest, opaque, googleAuthorization, googleConfiguration, verifyGoogleIdentity } from "./google-identity";

import { resolveGoogleAccount } from "./google-accounts";

const cookieName = "mm-google-flow";
const cookieOptions = {httpOnly:true,secure:process.env.NODE_ENV === "production",sameSite:"lax" as const,path:"/api/auth/google",maxAge:600};
const fail = (error: string,status=400) => NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
async function body(req: Request) { return JSON.parse((await boundedBody(req,4096)).toString("utf8")); }
async function pendingFlow() {
  const binding = (await cookies()).get(cookieName)?.value;
  if (!binding || !/^[\w-]{43}$/.test(binding)) return null;
  return db.googleAuthFlow.findFirst({where:{bindingHash:digest(binding),status:"PENDING",expiresAt:{gt:new Date()}}});
}
export async function googleAuth(req: Request, action: string) {
  try {
    const config = googleConfiguration();
    if (action === "status" && req.method === "GET") {
      const u = await currentUser();
      const linked = u ? !!(await db.oAuthAccount.findUnique({where:{userId_provider:{userId:u.id,provider:"google"}}})) : false;
      const pending = config ? await pendingFlow() : null;
      return NextResponse.json({configured:!!config,linked,pending:pending ? {name:pending.name,email:pending.email} : null},{headers:{"Cache-Control":"no-store"}});
    }
    if (!config) return fail("Google sign-in is awaiting connection. Please use email and password.",503);
    if (req.method === "POST" && req.headers.get("origin") !== config.origin) return fail("A same-origin request is required.",403);
    if (action === "start" && req.method === "POST") {
      // Unknown proxy headers are not trusted as client identity.
      await consumeRateLimit("google-start","shared",1000);
      const input = z.object({purpose:z.enum(["LOGIN","LINK"]).default("LOGIN"),password:z.string().max(128).optional()}).strict().parse(await body(req));
      const user = input.purpose === "LINK" ? await currentUser() : null;
      if (input.purpose === "LINK") {
        if (!user) return fail("Sign in with your existing account first.",401);
        await consumeRateLimit("google-link",user.id,10);
        if (!input.password || !(await compare(input.password,user.passwordHash))) return fail("Confirm your current password to link Google.",401);
      }
      const binding = opaque(),state = opaque(),nonce = opaque(),verifier = opaque();
      await db.googleAuthFlow.deleteMany({where:{expiresAt:{lt:new Date()}}});
      await db.googleAuthFlow.create({data:{id:digest(state),bindingHash:digest(binding),nonceHash:digest(nonce),verifier,purpose:input.purpose,userId:user?.id,securityVersion:user?.securityVersion,expiresAt:new Date(Date.now()+600000)}});
      (await cookies()).set(cookieName,binding,cookieOptions);
      return NextResponse.json({url:googleAuthorization(config,state,nonce,verifier)});
    }
    if (action === "callback" && req.method === "GET") {
      const url = new URL(req.url),state = url.searchParams.get("state"),binding = (await cookies()).get(cookieName)?.value;
      // Never derive callback destinations from Host/Forwarded/client return URLs.
      if (!state || !/^[\w-]{43}$/.test(state) || !binding || !/^[\w-]{43}$/.test(binding)) throw Error("Invalid flow.");
      const flow = await transaction(async tx => {
        const f = await tx.googleAuthFlow.findUnique({where:{id:digest(state)}});
        if (!f || f.bindingHash !== digest(binding) || f.expiresAt <= new Date() || f.status !== "STARTED") throw Error("Invalid flow.");
        const claimed = await tx.googleAuthFlow.updateMany({where:{id:f.id,status:"STARTED",expiresAt:{gt:new Date()}},data:{status:"CONSUMED",verifier:""}});
        if (claimed.count !== 1) throw Error("Invalid flow.");
        return f;
      });
      const code = url.searchParams.get("code");
      if (url.searchParams.has("error") || !code || code.length > 4096) throw Error("Google authorization cancelled.");
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:config.callback,grant_type:"authorization_code",code_verifier:flow.verifier}),signal:AbortSignal.timeout(10000),redirect:"error",cache:"no-store"});
      if (!tokenResponse.ok) throw Error("Google authorization failed.");
      const tokens = await tokenResponse.json();
      if (typeof tokens.id_token !== "string") throw Error("Missing identity.");
      const identity = await verifyGoogleIdentity(tokens.id_token,config.clientId,flow.nonceHash);
      const signedUser = await currentUser();
      const result = await resolveGoogleAccount(flow,identity,signedUser);
      if ("pending" in result) {
        (await cookies()).set(cookieName,binding,{...cookieOptions,maxAge:30*86400});
        return NextResponse.redirect(config.origin + "/?google=complete");
      }
      (await cookies()).set(cookieName,"",{...cookieOptions,maxAge:0});
      if ("existing" in result) return NextResponse.redirect(config.origin + "/?google=existing");
      await createSession(result.user.id,result.user);
      return NextResponse.redirect(config.origin + (flow.purpose === "LINK" ? "/profile?google=linked" : "/explore"));
    }
    if (action === "complete" && req.method === "POST") {
      const f = await pendingFlow();
      if (!f?.subject || !f.email) return fail("Google signup expired. Start again.");
      const input = z.object({name:z.string().trim().min(2).max(80),username:z.string().trim().regex(/^[a-zA-Z0-9_]{3,24}$/).transform(v=>v.toLowerCase()),dob:z.string().date(),city:z.string().trim().min(2).max(80)}).strict().parse(await body(req));
      if(!permittedUsername(input.username)) return fail("Choose another username. This name is reserved.");
      const dob = new Date(input.dob),age = ageOn(dob);
      if (age < 13 || age > 110) return fail("You must be at least 13 years old. Check your date of birth.");
      const passwordHash = await hash(opaque()+opaque(),12);
      const user = await transaction(async tx => {
        const claim = await tx.googleAuthFlow.deleteMany({where:{id:f.id,bindingHash:f.bindingHash,status:"PENDING",expiresAt:{gt:new Date()}}});
        if (claim.count !== 1) throw Error("Signup expired.");
        if (await tx.user.findUnique({where:{email:f.email!}})) throw Error("Account already exists. Sign in with your password, then link Google in Profile.");
        return tx.user.create({data:{...input,dob,email:f.email!,passwordHash,role:"ATTENDEE",verification:"UNVERIFIED",oauthAccounts:{create:{provider:"google",subject:f.subject!}}}});
      });
      await createSession(user.id,user);
      (await cookies()).set(cookieName,"",{...cookieOptions,maxAge:0});
      return NextResponse.json({ok:true});
    }
    return fail("Not found.",404);
  } catch (e: any) {
    // Do not return provider tokens, database details or secrets.
    if (action === "callback") {
      (await cookies()).set(cookieName,"",{...cookieOptions,maxAge:0});
      return NextResponse.redirect((googleConfiguration()?.origin || "https://mixermates.com") + "/?google=failed");
    }
    return fail(e?.code === "P2002" ? "This email or username is already in use. Sign in or choose another username." : "Google sign-in could not continue. Check your details and try again.",400);
  }
}

import { z } from "zod";
import { randomBytes,createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { mkdir,writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import { actor,audit,isolatedTestData,transaction, type Tx } from "./domain-core";
export const secretHash=(value:string)=>createHash("sha256").update(value).digest("hex");
export const emailInput=z.string().trim().max(254).email().transform(s=>s.toLowerCase());
export const passwordInput=z.string().min(10).max(72).refine(s=>Buffer.byteLength(s,"utf8")<=72,"Password must fit within 72 UTF-8 bytes.");
export const registrationInput=z.object({name:z.string().trim().min(2).max(80),username:z.string().trim().regex(/^[a-zA-Z0-9_]{3,24}$/).transform(s=>s.toLowerCase()),email:emailInput,password:passwordInput,dob:z.string().date().refine(s=>new Date(s).toISOString().slice(0,10)===s,"Invalid date of birth."),city:z.string().trim().min(2).max(80),instagram:z.string().trim().max(30).regex(/^[a-zA-Z0-9_.]*$/).optional()}).strict();
// Database-backed fixed-window buckets survive process restarts. Keys contain hashes, not identities.
export async function consumeRateLimit(scope:string,identity:string,limit:number,windowMs=900000) {
  const now=Date.now(),window=Math.floor(now/windowMs),id=secretHash(`${scope}:${identity}:${window}`);
  return transaction(async tx=>{
    await tx.rateLimitBucket.upsert({where:{id},create:{id,count:0,expiresAt:new Date((window+1)*windowMs)},update:{}});
    const result=await tx.rateLimitBucket.updateMany({where:{id,count:{lt:limit}},data:{count:{increment:1}}});
    if(result.count!==1)throw Error("429:Too many attempts. Try again later.");
    // Bounded retention; no in-memory reset can erase a live bucket.
    await tx.rateLimitBucket.deleteMany({where:{expiresAt:{lt:new Date(now-86400000)}}});
  });
}
export async function securityChange(adminId:string,userId:string,change:{role?:string;active?:boolean;organizerCapability?:boolean}) {
  if(change.role && !["ATTENDEE","ORGANIZER","STAFF","ADMIN"].includes(change.role))throw Error("400:Invalid role.");
  return transaction(async tx=>{
    const admin=await actor(tx,adminId);if(admin.role!=="ADMIN")throw Error("403:Administrator access required.");
    if(adminId===userId && (change.role && change.role!=="ADMIN" || change.active===false))throw Error("409:An administrator cannot remove their own access.");
    const previous=await tx.user.findUniqueOrThrow({where:{id:userId}});
    if(change.organizerCapability!==undefined)await tx.userCapability.upsert({where:{userId_capability:{userId,capability:"ORGANIZER"}},create:{userId,capability:"ORGANIZER",active:change.organizerCapability},update:{active:change.organizerCapability}});
    await tx.user.update({where:{id:userId},data:{...(change.role?{role:change.role}:{}),...(change.active!==undefined?{active:change.active}:{}),securityVersion:{increment:1}}});
    await tx.session.deleteMany({where:{userId}});
    await audit(tx,adminId,"ACCOUNT_SECURITY_CHANGED",userId,{entityType:"USER",previousState:`${previous.role}:${previous.active}`,newState:`${change.role||previous.role}:${change.active??previous.active}`});
  });
}
export interface RecoveryTransport { deliver(message:{recipient:string;token:string;expires:Date}):Promise<boolean> }
export const recoveryTransport:RecoveryTransport={async deliver(message){
  if(!isolatedTestData())return false;
  const directory=path.join(process.cwd(),".local","mail");await mkdir(directory,{recursive:true,mode:0o700});
  await writeFile(path.join(directory,randomBytes(16).toString("hex")+".json"),JSON.stringify({...message,kind:"PASSWORD_RESET",transport:"LOCAL_TEST_MAILBOX"}),{mode:0o600,flag:"wx"});return true;
}};
export const recoveryMessage="If an eligible account exists, recovery instructions will be sent when email delivery is available.";
export async function requestRecovery(email:string,transport:RecoveryTransport=recoveryTransport) {
  email=emailInput.parse(email);const token=randomBytes(32).toString("hex"),expires=new Date(Date.now()+900000);
  const user=await db.user.findUnique({where:{email}});
  if(user?.active){await transaction(async tx=>{await tx.passwordReset.deleteMany({where:{userId:user.id}});await tx.passwordReset.create({data:{id:secretHash(token),userId:user.id,expires}});});
    try {await transport.deliver({recipient:email,token,expires});}catch {/* Never disclose transport failures or token contents to logs or caller. */}
  }
  return {message:recoveryMessage};
}
export async function resetPassword(token:string,password:string) {
  z.string().regex(/^[a-f0-9]{64}$/).parse(token);password=passwordInput.parse(password);const passwordHash=await hash(password,12);
  return transaction(async tx=>{
    const reset=await tx.passwordReset.findUnique({where:{id:secretHash(token)},include:{user:true}});
    if(!reset || reset.expires<=new Date() || !reset.user.active)throw Error("400:Recovery link is invalid or expired.");
    const claim=await tx.passwordReset.deleteMany({where:{id:reset.id,expires:{gt:new Date()}}});if(claim.count!==1)throw Error("400:Recovery link is invalid or expired.");
    await tx.user.update({where:{id:reset.userId},data:{passwordHash,securityVersion:{increment:1}}});
    await tx.session.deleteMany({where:{userId:reset.userId}});await tx.passwordReset.deleteMany({where:{userId:reset.userId}});
    await audit(tx,reset.userId,"PASSWORD_RESET_COMPLETED",reset.userId,{entityType:"USER"});return {ok:true};
  });
}

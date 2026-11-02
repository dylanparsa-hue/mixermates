import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
const base=process.env.ACCESS_TEST_BASE_URL;
test("Direct application startup retains authorization and private data boundaries",{skip:!base},async t=>{
  if(!["localhost","127.0.0.1"].includes(new URL(base!).hostname)||!process.env.ACCESS_TEST_DATABASE_URL?.startsWith("file:")||process.env.ISOLATED_TEST_DATA!=="true")throw Error("Access tests require isolated local data.");
  const db=new PrismaClient({datasources:{db:{url:process.env.ACCESS_TEST_DATABASE_URL}}});const sessions:string[]=[];
  async function mint(userId:string){const token=randomBytes(32).toString("hex"),id=createHash("sha256").update(token).digest("hex");const user=await db.user.findUniqueOrThrow({where:{id:userId}});await db.session.create({data:{id,userId,securityVersion:user.securityVersion,expires:new Date(Date.now()+600000)}});sessions.push(id);return `vibey-session=${token}`;}
  function call(path:string,cookie="",body?:unknown){return fetch(base+path,{redirect:"manual",method:body===undefined?"GET":"POST",headers:{...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{"Content-Type":"application/json",Origin:base!})},body:body===undefined?undefined:JSON.stringify(body)});}
  try{
    const ordinary=await mint("attendee"),organizer=await mint("organizer");
    await t.test("home and discovery render the app even with legacy environment settings",async()=>{
      for(const path of ["/","/explore"]){const r=await call(path);assert.equal(r.status,200);const html=await r.text();assert(!html.includes('id="coming-title"'));assert(!html.includes("MixerMates — Coming Soon"));assert(!html.includes("18 Jalan Kiara"));assert.match(r.headers.get("cache-control")!,/no-store/);assert.match(r.headers.get("x-robots-tag")!,/noindex/);}
      const old=await call("/coming-soon");assert.equal(old.status,307);assert.equal(old.headers.get("location"),"/explore");
    });
    await t.test("admin pages remain restricted and client role flags cannot elevate",async()=>{
      assert.equal((await call("/admin")).headers.get("location"),"/admin/login");
      for(const cookie of [ordinary,organizer]){assert.equal((await call("/admin",cookie)).status,404);assert.equal((await call("/api/admin",cookie)).status,403);assert.equal((await call("/api/admin?role=ADMIN&approved=true",cookie)).status,403);}
    });
    await t.test("private APIs, uploads, unknown paths and private event invitations remain protected",async()=>{
      for(const path of ["profile","people","tickets","organizer","admin","ticket/missing","receipt/missing"]){const r=await call("/api/"+path);assert.equal(r.status,401,path);assert.match(r.headers.get("content-type")!,/application\/json/);assert(!JSON.stringify(await r.json()).includes("privateVenue"));}
      assert.equal((await call("/events/halloween-house-party")).status,404);
      for(const path of ["/uploads/"+"a".repeat(40)+".png","/_next/image?url=%2Fapi%2Fmedia%2F"+"a".repeat(40)+"&w=640&q=75","/api/not-real"]){assert.equal((await call(path)).status,404,path);}
    });
    await t.test("administrator login rejects wrong roles without revealing accounts",async()=>{
      const wrong=await call("/api/admin/login","",{email:"attendee@vibey.demo",password:"VibeyDemo2026!"});const missing=await call("/api/admin/login","",{email:"unknown@example.test",password:"not-a-valid-password"});assert.equal(wrong.status,401);assert.equal(missing.status,401);assert.deepEqual(await wrong.json(),await missing.json());
      const credentials=JSON.parse(await readFile(process.env.ACCESS_ADMIN_CREDENTIAL_FILE!,"utf8"));const valid=await call("/api/admin/login","",{email:credentials.email,password:credentials.password});assert.equal(valid.status,200);const cookie=valid.headers.get("set-cookie")!.split(";")[0];assert.match(valid.headers.get("set-cookie")!,/HttpOnly/);assert.equal((await call("/api/admin",cookie)).status,200);
    });
    await t.test("expired sessions and forged origins cannot read or mutate private records",async()=>{
      const cookie=await mint("attendee");await db.session.update({where:{id:sessions.at(-1)!},data:{expires:new Date(0)}});assert.equal((await call("/api/tickets",cookie)).status,401);
      const r=await fetch(base+"/api/profile",{method:"POST",headers:{Origin:"https://evil.example",Cookie:ordinary,"Content-Type":"application/json"},body:"{}"});assert.equal(r.status,403);
    });
  }finally{await db.session.deleteMany({where:{id:{in:sessions}}});await db.$disconnect();}
});

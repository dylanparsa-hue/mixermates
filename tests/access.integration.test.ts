import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
const base=process.env.ACCESS_TEST_BASE_URL;
test("Phase 1 HTTP, authorization, session and cache boundaries",{skip:!base},async t=>{
  if(!["localhost","127.0.0.1"].includes(new URL(base!).hostname) || !process.env.ACCESS_TEST_DATABASE_URL?.startsWith("file:") || process.env.ISOLATED_TEST_DATA!=="true")throw Error("Access tests are local isolated data only.");
  const db=new PrismaClient({datasources:{db:{url:process.env.ACCESS_TEST_DATABASE_URL}}});
  const sessionIds:string[]=[];
  const runId=randomBytes(8).toString("hex");
  const minted=async(userId:string,expired=false)=>{
    const token=randomBytes(32).toString("hex");const id=createHash("sha256").update(token).digest("hex");sessionIds.push(id);
    await db.session.create({data:{id,userId,securityVersion:(await db.user.findUniqueOrThrow({where:{id:userId}})).securityVersion,expires:new Date(Date.now()+(expired?-10000:600000))}});
    return `vibey-session=${token}`;
  };
  async function call(path:string,cookie="",body?:unknown,extra:Record<string,string>={}) {
    return fetch(base+path,{method:body===undefined?"GET":"POST",redirect:"manual",headers:{"x-forwarded-for":`phase1-${runId}`,...(body===undefined?{}:{"Content-Type":"application/json",Origin:base!}),...(cookie?{Cookie:cookie}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
  }
  try {
    const ordinary=await minted("attendee"),organizer=await minted("organizer"),staff=await minted("staff");
    let adminCookie="";
    await t.test("public page has exact safe copy, metadata, assets and no application data",async()=>{
      assert.equal((await call("/")).headers.get("location"),"/coming-soon");
      const r=await call("/coming-soon");const html=await r.text();assert.equal(r.status,200);assert.match(html,/Your Next/);assert.match(html,/Night Starts/);assert.match(html,/Here\./);assert.match(html,/Discover events\. Meet your people\./);assert.match(html,/MixerMates — Coming Soon/);assert(!html.includes("18 Jalan Kiara"));assert(!html.includes("admin-access.json"));assert(!html.includes("NEON / After Dark"));
      assert.match(r.headers.get("cache-control")!,/no-store/);assert.match(r.headers.get("x-robots-tag")!,/noindex/);
      for(const asset of ["/branding/processed/mixermates-logo-dark.png","/branding/processed/mixermates-icon-32.png","/manifest.webmanifest"]){assert.equal((await call(asset)).status,200);}
    });
    await t.test("anonymous and ordinary accounts cannot enter any unfinished page",async()=>{
      for(const cookie of ["",ordinary])for(const route of ["/explore","/map","/profile","/friends","/organizer","/create","/admin","/tickets","/events/halloween-house-party","/people/alex","/organizers/guessed-organizer"]){const r=await call(route,cookie);assert.equal(r.status,307,route);assert.equal(r.headers.get("location"),"/coming-soon");assert.match(r.headers.get("cache-control")!,/no-store/);}
      for(const query of ["?admin=true","?preview=true","?role=ADMIN","?invite=anything"]){assert.equal((await call("/explore"+query,ordinary)).status,307);}
      for(const cookie of ["",ordinary]) {
        let target="/explore";
        for(let hop=0;hop<3;hop++) {
          const r=await call(target,cookie,undefined,{RSC:"1","Next-Router-Prefetch":"1"});
          assert.match(r.headers.get("cache-control")!,/no-store/);
          if(r.status===200) {
            // Next 16 prefetch can return a dynamic route-tree descriptor without rendering page data.
            assert.match(r.headers.get("content-type")!,/text\/x-component/);
            const payload=await r.text();assert.match(payload,/"S":false/);
            for(const privateContent of ["ADMIN PREVIEW","Halloween","privateVenue","NEON / After Dark","restrictedOrganizer","components/vibey"])assert(!payload.includes(privateContent));
            break;
          }
          assert.equal(r.status,307,"Unauthorized RSC must redirect or return only the dynamic prefetch descriptor");
          const location=r.headers.get("location")!;
          if(location.startsWith("/coming-soon"))break;
          assert(location.startsWith("/explore?_rsc"),"Only the framework cache-key redirect is allowed before denial");
          assert(hop<2,"Prefetch must reach the denied route");target=location;
        }
        let rsc=await call("/explore",cookie,undefined,{RSC:"1"});
        if(rsc.headers.get("location")==="/explore?_rsc")rsc=await call("/explore?_rsc",cookie,undefined,{RSC:"1"});
        assert.match(rsc.headers.get("cache-control")!,/no-store/);
        if(rsc.status===200) {
          assert.match(rsc.headers.get("content-type")!,/text\/x-component/);
          const payload=await rsc.text();assert.match(payload,/NEXT_REDIRECT;replace;\/coming-soon;307;/);
          for(const privateContent of ["ADMIN PREVIEW","Halloween","privateVenue","passwordHash","NEON / After Dark"])assert(!payload.includes(privateContent));
        } else {assert.equal(rsc.status,307);assert.equal(rsc.headers.get("location"),"/coming-soon");}
      }
    });
    await t.test("API denial is safe JSON, including search and private media",async()=>{
      for(const path of ["events","events/halloween-house-party","events?q=Halloween","profile","people","organizer","admin","tickets","ticket/missing","receipt/missing","media/"+"a".repeat(40)]){
        for(const cookie of ["",ordinary]){const r=await call("/api/"+path,cookie);assert.equal(r.status,cookie?403:401,path);assert.match(r.headers.get("content-type")!,/application\/json/);assert(!JSON.stringify(await r.json()).includes("privateVenue"));}
      }
      assert.equal((await call("/uploads/"+"a".repeat(40)+".png")).status,404);
      assert.equal((await call("/_next/image?url=%2Fapi%2Fmedia%2F"+"a".repeat(40)+"&w=640&q=75")).status,404);
      assert.equal((await call("/api/not-real")).status,404);
    });
    await t.test("dedicated login rejects wrong role and unknown identity with the same response",async()=>{
      const credentials=JSON.parse(await readFile(process.env.ACCESS_ADMIN_CREDENTIAL_FILE!,"utf8"));
      const wrong=await call("/api/admin/login","",{email:"attendee@vibey.demo",password:"VibeyDemo2026!"});
      const unknown=await call("/api/admin/login","",{email:"unknown@example.test",password:"not-a-valid-password"});
      assert.equal(wrong.status,401);assert.equal(unknown.status,401);assert.deepEqual(await wrong.json(),await unknown.json());
      const valid=await call("/api/admin/login","",{email:credentials.email,password:credentials.password});assert.equal(valid.status,200);adminCookie=valid.headers.get("set-cookie")!.split(";")[0];assert.match(valid.headers.get("set-cookie")!,/HttpOnly/);assert.match(valid.headers.get("set-cookie")!,/SameSite=lax/i);
      assert.equal((await valid.json()).role,"ADMIN");
    });
    await t.test("admin accesses preview via direct entry and RSC but existing ownership remains enforced",async()=>{
      for(const path of ["/explore","/profile","/organizer","/admin","/events/halloween-house-party"]){const r=await call(path,adminCookie);assert.equal(r.status,200,path);assert((await r.text()).replace(/<!--.*?-->/g,"").includes("ADMIN PREVIEW"),"Missing preview indicator");assert.match(r.headers.get("cache-control")!,/no-store/);}
      // Next 16 canonicalizes bare RSC requests to its cache-key URL before rendering.
      let rsc=await call("/explore",adminCookie,undefined,{RSC:"1"});
      if(rsc.status===307){assert.equal(rsc.headers.get("location"),"/explore?_rsc");rsc=await call("/explore?_rsc",adminCookie,undefined,{RSC:"1"});}
      assert.equal(rsc.status,200);assert.match(rsc.headers.get("content-type")!,/text\/x-component/);assert.match(rsc.headers.get("cache-control")!,/no-store/);
      assert.equal((await call("/api/admin",adminCookie)).status,200);
      assert.equal((await call("/api/pause",adminCookie,{eventId:"halloween"})).status,403);
    });
    await t.test("organizer and staff preview is scoped, never admin or full discovery",async()=>{
      for(const cookie of [organizer,staff]){assert.equal((await call("/organizer",cookie)).status,200);assert.equal((await call("/admin",cookie)).status,307);assert.equal((await call("/explore",cookie)).status,307);assert.equal((await call("/api/admin",cookie)).status,403);}
      const events=await (await call("/api/organizer",staff)).json();const permitted=await db.event.findMany({where:{OR:[{organizerId:"staff"},{staff:{some:{userId:"staff",active:true}}}]},select:{id:true}});assert.deepEqual(events.events.map((e:any)=>e.id).sort(),permitted.map(e=>e.id).sort());
      assert.equal((await call("/api/events/neon-after-dark",staff)).status,404);
      assert.equal((await call("/api/event",staff,{})).status,403);
    });
    await t.test("real sales and money mutations cannot be unlocked by any account or JSON flags",async()=>{
      for(const path of ["book","review","refund","payout","promotion"]){const r=await call("/api/"+path,adminCookie,{paymentOutcome:"SUCCEEDED",approved:true,role:"ADMIN"});assert.equal(r.status,503,path);}
      assert.equal((await call("/api/demo","",{id:"admin"})).status,401);
      assert.equal((await call("/api/demo",ordinary,{id:"admin"})).status,403);
    });
    await t.test("session expiry, invalid token, role change, disable and logout revoke server access",async()=>{
      const expired=await minted("phase1_preview_admin",true);assert.equal((await call("/explore",expired)).status,307);
      assert.equal((await call("/api/admin","vibey-session=invalid")).status,401);
      await db.user.update({where:{id:"phase1_preview_admin"},data:{role:"ATTENDEE"}});assert.equal((await call("/explore",adminCookie)).status,307);assert.equal((await call("/api/admin",adminCookie)).status,403);
      await db.user.update({where:{id:"phase1_preview_admin"},data:{role:"ADMIN",active:false}});assert.equal((await call("/api/admin",adminCookie)).status,401);
      await db.user.update({where:{id:"phase1_preview_admin"},data:{active:true}});assert.equal((await call("/api/logout",adminCookie,{})).status,200);assert.equal((await call("/api/admin",adminCookie)).status,401);assert.equal((await call("/explore",adminCookie)).status,307);
    });
    await t.test("admin login is origin checked and rate limited",async()=>{
      assert.equal((await call("/api/admin/login","",{email:"x@example.test",password:"bad"},{Origin:"https://evil.example"})).status,403);
      for(let n=0;n<10;n++)assert.equal((await call("/api/admin/login","",{email:`rate-${runId}@example.test`,password:"bad"},{"x-forwarded-for":`phase1-rate-${runId}`})).status,401);
      assert.equal((await call("/api/admin/login","",{email:`rate-${runId}@example.test`,password:"bad"},{"x-forwarded-for":`phase1-rate-${runId}`})).status,429);
    });
  } finally {await db.user.updateMany({where:{id:"phase1_preview_admin"},data:{role:"ADMIN",active:true}});await db.session.deleteMany({where:{id:{in:sessionIds}}});await db.$disconnect();}
});

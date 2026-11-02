import {chromium,expect} from "@playwright/test";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import assert from "node:assert/strict";
import {testLabEnvironment} from "../lib/test-lab-guard";
assert(testLabEnvironment());
const base=process.env.APP_ORIGIN!,out="/Users/parsa/Desktop/EVENT FINDER/docs/organizer-phase1",b=await chromium.launch({channel:"chrome",headless:true}),c=await b.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"}),p=await c.newPage(),checks:any[]=[],errors:string[]=[];
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/,r=>r.abort());p.on("pageerror",e=>errors.push(e.message));
try{
 const a=JSON.parse(await readFile(".local/test-lab-access.json","utf8")),f=JSON.parse(await readFile(out+"/browser-results.json","utf8"));
 for(const [action,data] of [["login",{code:a.accessCode}],["switch",{role:"Customer"}]] as const)assert((await c.request.post(base+"/api/test-lab/"+action,{headers:{Origin:base},data})).ok());
 await mkdir(out+"/studio-screenshots",{recursive:true});
 for(const [name,tab,target] of [["my-events","My events",".setup-event-list,.setup-event-row,.setup-panel"],["settings","Settings","#organizer-name"],["tickets","Tickets",".setup-panel"]])for(const width of [390,1440])for(const theme of ["Dark","Light"]){
  await p.setViewportSize({width,height:900});await p.goto(base+"/organizer?tab="+encodeURIComponent(tab)+"&event="+f.eventId);await expect(p.locator(target).first()).toBeVisible();await p.getByRole("radio",{name:theme,exact:true}).first().check();await expect(p.locator("html")).toHaveAttribute("data-theme",theme.toLowerCase());
  await p.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})));window.scrollTo(0,0);});
  const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);const file=`${name}-${width}-${theme.toLowerCase()}.png`;await p.screenshot({path:out+"/studio-screenshots/"+file,fullPage:true});checks.push({file,width,theme,overflow});
 }
 assert.deepEqual(errors,[]);await writeFile(out+"/studio-results.json",JSON.stringify({passed:true,checks,pageErrors:errors},null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
}finally{await b.close();}

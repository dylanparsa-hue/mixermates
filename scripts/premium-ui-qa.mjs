// Reversible rendering checks, confined to the owned fictional development Lab.
import {chromium,expect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {testLabEnvironment} from '../lib/test-lab-guard.ts';
assert(testLabEnvironment(),'Owned isolated development Test Lab required');
const base=process.env.APP_ORIGIN,root='/Users/parsa/.codex/tmp/mixermates-correction-20261028',out='/Users/parsa/Desktop/EVENT FINDER/docs/premium-ui';
const f=JSON.parse(await readFile(root+'/scenario.json','utf8'));
const b=await chromium.launch({channel:'chrome',headless:true});
const c=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/,r=>r.abort());
const a=JSON.parse(await readFile('.local/test-lab-access.json','utf8'));
const post=async(k,data)=>{const r=await c.request.post(base+'/api/test-lab/'+k,{headers:{Origin:base},data});assert(r.ok(),k);return r.json()};
await post('login',{code:a.accessCode});await post('switch',{role:'Customer'});await post('select',{eventId:f.event.id});
const p=await c.newPage(),errors=[],measures=[],issues=[],interactions=[];
p.on('pageerror',e=>errors.push(e.message));await mkdir(out+'/after',{recursive:true});
const routes=[
['discovery','Customer','/explore','.event-card'],
['event-detail','Customer','/events/'+f.event.slug,'.detail-cover'],
['checkout','Customer','/join/'+f.event.slug,'.customer-tier'],
['payment','Customer','/bookings/'+(f.paymentBookingId||f.bookingId),'.customer-summary'],
['my-tickets','Customer','/my-bookings','.customer-booking-list'],
['wallet','Customer','/tickets','.tickets-page'],
['community','Customer','/friends','.mm-person'],
['profile','Customer','/profile','.identity-sheet'],
['test-lab','Customer','/test-lab','.mm-lab-context'],
['organizer','Organizer','/organizer?tab=My%20events','.setup-panel'],
['event-builder','Organizer','/create?edit='+f.event.id,'input[name=title]'],
['finance','Finance Reviewer','/organizer?tab=Booking%20reviews','.booking-review-entry'],
['admin','Administrator','/admin','.ops-metrics,.ops-grid,.metrics-grid,.operations'],
['entrance','Entrance Staff','/organizer?tab=Entrance&event='+f.event.id,'.entrance-counts'],
['ticket','Customer','/my-bookings','.customer-booking-list'],
];
const settle=async()=>{await p.locator('img[loading=lazy]').evaluateAll(xs=>xs.forEach(i=>i.loading='eager'));await p.evaluate(()=>Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>{}))]));await p.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'});});};
try{
for(const [name,role,url,ready] of routes){
 await post('switch',{role});await p.goto(base+url);await p.locator(ready).first().waitFor({timeout:30000});
 if(name==='ticket'){await p.getByRole('button',{name:/Open ticket/}).filter({hasText:'active'}).first().click();await p.locator('.entry-paper').waitFor();}
 for(const theme of ['light','dark']) for(const width of [320,375,390,430,768,1024,1440]){
  await p.setViewportSize({width,height:900});await p.evaluate(t=>{localStorage.setItem('mixermates-theme',t);window.dispatchEvent(new StorageEvent('storage',{key:'mixermates-theme',newValue:t}));},theme);await p.waitForTimeout(220);await settle();
  const measure=await p.evaluate(()=>{
   const visible=e=>{let r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>visible(i)&&i.complete&&!i.naturalWidth).map(i=>i.alt),wraps:[...document.querySelectorAll('.mm-person-actions .button')].filter(e=>e.getBoundingClientRect().height>60).map(e=>e.textContent.trim()),edgeText:[...document.querySelectorAll('.event-card h3,.mm-person h3,.booking-panel h2,.customer-summary h2')].filter(visible).filter(e=>{let box=e.closest('.event-card,.mm-person,.booking-panel,.customer-summary').getBoundingClientRect(),r=e.getBoundingClientRect();return r.left-box.left<12||box.right-r.right<12}).map(e=>e.textContent),theme:document.documentElement.dataset.theme};
  });measures.push({name,...measure});if(measure.scroll>width||measure.broken.length||measure.wraps.length||measure.edgeText.length)issues.push({name,...measure});
  if([390,1440].includes(width)||['discovery','event-detail'].includes(name)||(name==='admin'&&width===320)){
   const opts={path:`${out}/after/${name}-${theme}-${width}.png`,fullPage:name!=='ticket',mask:[p.locator('img[alt*="Private"][alt*="QR"]')]};await p.screenshot(opts);
   if(name==='ticket'&&[390,1440].includes(width)){await p.locator('.ticket-modal').evaluate(e=>e.scrollTo({top:e.scrollHeight,behavior:'instant'}));await p.screenshot({...opts,path:`${out}/after/ticket-${theme}-${width}-bottom.png`,fullPage:false});await p.locator('.ticket-modal').evaluate(e=>e.scrollTo({top:0,behavior:'instant'}));}
   if(['discovery','event-detail','profile','test-lab'].includes(name)&&[390,1440].includes(width))await p.screenshot({...opts,path:`${out}/after/${name}-${theme}-${width}-viewport.png`,fullPage:false});
  }
 }
 console.log(name+': 14 width/theme checks');
}
await p.goto(base+'/explore');await p.locator('.event-card').first().waitFor();
await p.getByRole('textbox',{name:'Search events',exact:true}).fill('no-such-fictional-night');await expect(p.getByRole('heading',{name:'A different vibe is out there.',exact:true})).toBeVisible();await p.getByRole('button',{name:'Clear search',exact:true}).click();
await p.getByRole('button',{name:'Filters',exact:true}).click();await p.getByLabel('Maximum price (RM)',{exact:true}).fill('0');await p.getByRole('button',{name:'Reset filters',exact:true}).click();await expect(p.locator('.event-card').first()).toBeVisible();interactions.push('Search, empty state, clear, filters and reset');
const day=p.locator('.discovery-date-rail button').nth(1);await day.click();await expect(day).toHaveAttribute('aria-pressed','true');await p.getByRole('button',{name:'All dates',exact:true}).click();interactions.push('Date rail selects a day and resets');
const save=p.getByRole('button',{name:'Save event',exact:true}).first();await save.click();await expect(p.getByRole('button',{name:'Unsave event',exact:true}).first()).toBeVisible();await p.getByRole('button',{name:'Unsave event',exact:true}).first().click();interactions.push('Saved event toggles persist and revert');
await p.goto(base+'/friends');await p.getByRole('tab',{name:'Discover',exact:true}).click();await p.getByRole('tab',{name:'Discover',exact:true}).focus();await p.keyboard.press('ArrowRight');await expect(p.getByRole('tab',{name:'Friends',exact:true})).toHaveAttribute('aria-selected','true');await p.keyboard.press('End');await expect(p.getByRole('tab',{name:'Messages',exact:true})).toHaveAttribute('aria-selected','true');await p.keyboard.press('Home');await p.getByLabel('Search people',{exact:true}).fill('not-a-person');await expect(p.getByRole('heading',{name:'No matching people',exact:true})).toBeVisible();interactions.push('Community keyboard tabs and empty search');
await p.setViewportSize({width:390,height:844});await p.goto(base+'/events/'+f.event.slug);await p.locator('.detail-cover').waitFor();await p.getByRole('link',{name:'Choose tickets',exact:false}).click();await expect(p.locator('#event-ticket-options')).toBeInViewport();interactions.push('Mobile booking action reaches actual ticket selection');
await p.goto(base+'/explore');await p.getByRole('button',{name:'Account menu',exact:true}).click();for(const theme of ['Light','Dark','System']){await p.getByRole('radio',{name:theme,exact:true}).first().check();await expect(p.locator('html')).toHaveAttribute('data-theme',theme==='System'?'light':theme.toLowerCase());}interactions.push('Appearance controls apply Light, Dark and System');
await p.setViewportSize({width:768,height:430});await settle();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);interactions.push('Landscape width has no document overflow');
await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.closest('.event-grid')).length),0);interactions.push('Discovery stays static with reduced motion');
}finally{await writeFile(out+'/responsive-results.json',JSON.stringify({measures,issues,errors,interactions},null,2));await b.close();}
assert.equal(issues.length,0,JSON.stringify(issues));assert.equal(errors.length,0,JSON.stringify(errors));console.log({checks:measures.length,issues:issues.length,errors:errors.length,interactions});

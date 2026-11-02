import test from "node:test";
import assert from "node:assert/strict";
import { apiAccess } from "../lib/access-policy";
import { getSiteConfig } from "../lib/site-config";
import { demoEvents } from "../lib/demo-events";
import { publicDemoIds } from "../lib/public-catalogue";
import { validatePublicRelease } from "../scripts/validate-public-release-env.mjs";
test("public demo catalogue has four distinct fictional future concepts and licensed local artwork",()=>{
  assert.equal(demoEvents.length,4);assert.equal(new Set(demoEvents.map(e=>e.category)).size,4);assert.deepEqual(demoEvents.map(e=>e.id),publicDemoIds);
  for(const e of demoEvents){assert(+new Date(e.startsAt)>+new Date('2026-10-29'));assert.match(e.venue,/Fictional/);assert.match(e.description,/Demo event.*not a real announcement/);assert.match(e.image,/^\/images\//);}
});
test("production cannot process sales, payouts, refunds, admission or payment destinations even with forged client flags",()=>{
  const old=(process.env as Record<string,string|undefined>).NODE_ENV;(process.env as Record<string,string|undefined>).NODE_ENV="production";
  try {for(const role of ['ADMIN','ORGANIZER','ATTENDEE'])for(const path of ['book','review','refund','payout','promotion','operations/refund-review','entrance/admit','checkin','job-operations/issuance','payment-destination','payment-destination-review']){
    const a=apiAccess(path,'POST',{id:'fictional',role},getSiteConfig({SITE_MODE:'full_platform',TICKET_SALES_MODE:'approved_events'}),true);assert.equal(a.allowed,false,path);assert.equal(a.status,503,path);
  }} finally {if(old===undefined)delete (process.env as Record<string,string|undefined>).NODE_ENV;else (process.env as Record<string,string|undefined>).NODE_ENV=old;}
});
test("public release startup refuses simulation, seed, bootstrap, non-HTTPS origins and live sales flags",()=>{
  const safe:NodeJS.ProcessEnv={NODE_ENV:'production',APP_ORIGIN:'https://mixermates.com',SITE_MODE:'full_platform',TICKET_SALES_MODE:'disabled',DATABASE_URL:'mysql://build:build@127.0.0.1:3306/build'};
  assert.doesNotThrow(()=>validatePublicRelease(safe));
  for(const [key,value] of [['NODE_ENV','development'],['APP_ORIGIN','http://mixermates.com'],['TICKET_SALES_MODE','approved_events'],['HOSTINGER_SEED_DEMO','true'],['HOSTINGER_DATABASE_BOOTSTRAP','true'],['MIXERMATES_TEST_LAB','enabled'],['ISOLATED_TEST_DATA','true'],['LOCAL_CUSTOMER_TEST_ENABLED','true'],['DEMO_MODE','true']])assert.throws(()=>validatePublicRelease({...safe,[key]:value}));
});

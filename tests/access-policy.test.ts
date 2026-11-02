import test from "node:test";
import assert from "node:assert/strict";
import { getSiteConfig, isLocalDemoRequest, configuredSocialLinks, type Environment } from "../lib/site-config";
import { apiAccess, pageAccess, classifyPage, canAccessInvitation } from "../lib/access-policy";
const admin={id:"admin",role:"ADMIN",active:true};
const attendee={id:"a",role:"ATTENDEE",active:true};
const organizer={id:"o",role:"ORGANIZER",active:true};
const staff={id:"s",role:"STAFF",active:true};
for(const site of [undefined,"invalid","coming_soon","full_platform"]){
  for(const sales of [undefined,"invalid","disabled","invite_only","approved_events"]){
    test(`safe configuration: site=${site}, sales=${sales}`,()=>{
      const c=getSiteConfig({SITE_MODE:site,TICKET_SALES_MODE:sales});
      assert.equal(c.siteMode,"full_platform");
      assert.equal(c.ticketSalesMode,"disabled");
      assert.equal(apiAccess("book","POST",admin,c,false).status,503);
    });
  }
}
const coming=getSiteConfig({SITE_MODE:"coming_soon"});
const full=getSiteConfig({SITE_MODE:"full_platform"});
for(const config of [coming,full,getSiteConfig({})]) {
  for(const path of ["/","/explore","/map","/profile","/friends","/tickets","/organizer","/create"]) {
    test(`application opens without a holding screen: ${config.requestedSiteMode} ${path}`,()=>assert.equal(pageAccess(path,null,config),"platform"));
  }
  test(`admin role remains protected: ${config.requestedSiteMode}`,()=>{
    assert.equal(pageAccess("/admin",null,config),"login");
    assert.equal(pageAccess("/admin",attendee,config),"forbidden");
    assert.equal(pageAccess("/admin",{...admin,active:false},config),"forbidden");
    assert.equal(pageAccess("/admin",admin,config),"platform");
  });
}
test("untrusted invitation query and client flags cannot open access",()=>{
  for(const value of [null,"valid-looking-token",{approved:true,expires:"2099-01-01",eventId:"secret"}])assert.equal(canAccessInvitation(value),false);
  assert.equal(classifyPage("/not-a-route"),"UNKNOWN");
  assert.equal(pageAccess("/not-a-route",admin,coming),"not_found");
  assert.equal(apiAccess("unknown","GET",admin,coming,false).status,404);
  assert.equal(apiAccess("admin/login","GET",null,coming,false).status,404);
});
test("full platform restores ordinary routes but never overrides admin roles or the sales lock",()=>{
  assert.equal(pageAccess("/explore",null,full),"platform");
  assert.equal(pageAccess("/admin",attendee,full),"forbidden");
  assert.equal(apiAccess("book","POST",attendee,full,false).status,503);
});
const demo:Environment={NODE_ENV:"development",SITE_MODE:"full_platform",DEMO_MODE:"true",LOCAL_DEMO_BOOKING_ENABLED:"true",ISOLATED_TEST_DATA:"true",DATABASE_URL:"file:/tmp/fictional-audit.db"};
test("demo mutation exception requires every isolated local condition",()=>{
  assert.equal(isLocalDemoRequest("http://localhost:3002",demo),true);
  for(const key of ["LOCAL_DEMO_BOOKING_ENABLED","ISOLATED_TEST_DATA","DEMO_MODE"]){assert.equal(isLocalDemoRequest("http://localhost:3002",{...demo,[key]:"false"}),false);}
  for(const change of [{NODE_ENV:"production"},{SITE_MODE:"coming_soon"},{DATABASE_URL:"mysql://example.invalid/db"},{DB_NAME:"db",DB_USER:"u",DB_PASSWORD:"not-real"}])assert.equal(isLocalDemoRequest("http://localhost:3002",{...demo,...change}),false);
  assert.equal(isLocalDemoRequest("https://mixermates.com",demo),false);
  assert.equal(isLocalDemoRequest("https://localhost.evil.example",demo),false);
});
test("social links are hidden unless configured and valid",()=>{
  assert.deepEqual(configuredSocialLinks({}),[]);
  assert.deepEqual(configuredSocialLinks({SOCIAL_INSTAGRAM_URL:"javascript:alert(1)",SOCIAL_TIKTOK_URL:"https://tiktok.com.evil.example/x"}),[]);
  assert.deepEqual(configuredSocialLinks({SOCIAL_INSTAGRAM_URL:"https://www.instagram.com/example/"}),[{label:"Instagram",url:"https://www.instagram.com/example/"}]);
});

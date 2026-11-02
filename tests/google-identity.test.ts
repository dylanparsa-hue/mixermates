import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from "jose";
import { digest, googleConfiguration, googleAuthorization, verifyGoogleIdentity } from "../lib/google-identity";
import { resolveGoogleAccount } from "../lib/google-accounts";
import { db } from "../lib/db";
import { isolatedTestData } from "../lib/domain-core";
import { opaque } from "../lib/google-identity";

test("Google requires an exact approved origin and credentials; redirects use PKCE and minimum scopes",()=>{
  assert.equal(googleConfiguration({SITE_MODE:"full_platform",NODE_ENV:"production",APP_ORIGIN:"https://evil.example",GOOGLE_CLIENT_ID:"unit",GOOGLE_CLIENT_SECRET:"unit"}),null);
  assert.equal(googleConfiguration({SITE_MODE:"full_platform",NODE_ENV:"production",APP_ORIGIN:"https://mixermates.com"}),null);
  const c=googleConfiguration({SITE_MODE:"full_platform",NODE_ENV:"production",APP_ORIGIN:"https://mixermates.com",GOOGLE_CLIENT_ID:"unit",GOOGLE_CLIENT_SECRET:"unit"})!;
  const u=new URL(googleAuthorization(c,"state","nonce","verifier"));
  assert.equal(u.origin,"https://accounts.google.com");assert.equal(u.searchParams.get("redirect_uri"),"https://mixermates.com/api/auth/google/callback");assert.equal(u.searchParams.get("scope"),"openid email profile");assert.equal(u.searchParams.get("code_challenge_method"),"S256");assert(!u.toString().includes("client_secret"));assert(!u.searchParams.has("access_type"));
});
test("Google signed identities reject forgery, replay nonce, wrong issuer/audience, expired and unverified claims",async()=>{
  const {privateKey,publicKey}=await generateKeyPair("RS256"),keys=createLocalJWKSet({keys:[{...await exportJWK(publicKey),kid:"test"}]}),now=Math.floor(Date.now()/1000);
  const sign=(data:any={},key=privateKey)=>new SignJWT({email:"person@example.test",email_verified:true,nonce:"correct",name:"Person",...data}).setProtectedHeader({alg:"RS256",kid:"test"}).setIssuer(data.iss || "https://accounts.google.com").setAudience(data.aud || "unit-client").setSubject(data.sub || "subject-123").setIssuedAt(now).setExpirationTime(data.exp || now+300).sign(key);
  assert.equal((await verifyGoogleIdentity(await sign(),"unit-client",digest("correct"),keys)).email,"person@example.test");
  for(const data of [{email_verified:false},{nonce:"wrong"},{iss:"https://evil.example"},{aud:"other-client"},{exp:now-100},{azp:"other-client"},{aud:["unit-client","other"]}]) await assert.rejects(verifyGoogleIdentity(await sign(data),"unit-client",digest("correct"),keys));
  const other=await generateKeyPair("RS256");await assert.rejects(verifyGoogleIdentity(await sign({},other.privateKey),"unit-client",digest("correct"),keys));
});
test("Google never links a matching email silently, preserves existing authority, and binds linking to current identity/version",{skip:!isolatedTestData()},async()=>{
  const stamp=opaque().slice(0,10).toLowerCase(),ids=[stamp+"admin",stamp+"guest"];
  const users=await Promise.all(ids.map((id,i)=>db.user.create({data:{id,email:id+"@example.test",username:id,name:"Fictional identity",dob:new Date("1990-01-01"),city:"Test",passwordHash:"unused",role:i ? "ATTENDEE":"ADMIN"}})));
  const identity={subject:stamp,email:users[0].email,name:"Fictional identity"},flow={id:stamp,purpose:"LOGIN",userId:null,securityVersion:null};
  try {
    assert.deepEqual(await resolveGoogleAccount(flow,identity,null),{existing:true});assert.equal(await db.oAuthAccount.count({where:{userId:users[0].id}}),0);
    const link={...flow,purpose:"LINK",userId:users[0].id,securityVersion:0};
    await assert.rejects(resolveGoogleAccount(link,identity,null));await assert.rejects(resolveGoogleAccount(link,identity,users[1]));await assert.rejects(resolveGoogleAccount({...link,securityVersion:1},identity,users[0]));
    await assert.rejects(resolveGoogleAccount(link,{...identity,email:users[1].email},users[0]));
    const result=await resolveGoogleAccount(link,identity,users[0]);assert.equal(result.user?.id,users[0].id);assert.equal(result.user?.role,"ADMIN");
    assert.equal((await resolveGoogleAccount(flow,identity,null)).user?.id,users[0].id);
    await assert.rejects(resolveGoogleAccount({...link,userId:users[1].id},{...identity,email:users[1].email},users[1]));
    await db.user.update({where:{id:users[0].id},data:{active:false}});await assert.rejects(resolveGoogleAccount(flow,identity,null));
    const pendingId=stamp+"pending";await db.googleAuthFlow.create({data:{id:pendingId,bindingHash:stamp,nonceHash:stamp,verifier:stamp,purpose:"LOGIN",expiresAt:new Date(Date.now()+60000)}});
    assert.deepEqual(await resolveGoogleAccount({...flow,id:pendingId},{...identity,subject:stamp+"new",email:stamp+"new@example.test"},null),{pending:true});
    assert.equal(await db.user.count({where:{id:{in:ids}}}),2);await db.googleAuthFlow.delete({where:{id:pendingId}});
  } finally {await db.adminAuditLog.deleteMany({where:{userId:{in:ids}}});await db.user.deleteMany({where:{id:{in:ids}}});}
});

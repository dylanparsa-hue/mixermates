import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readdir,readFile,stat} from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
import {compare,hash} from 'bcryptjs';
import {db} from '../lib/db';
import {transaction,eventPermission} from '../lib/domain-core';
import {emailInput,passwordInput,registrationInput,consumeRateLimit,securityChange,requestRecovery,resetPassword,secretHash} from '../lib/security';
import {createInvitation,redeemInvitation,revokeInvitation} from '../lib/invitations';
import {reserveBooking,issueTickets,approveRegistration,cancelBooking,expireReservation,updateEventLifecycle,revokeTicket,eligibility,assertBookingTransition} from '../lib/booking-domain';
import {submitPaymentDestination,reviewPaymentDestination,submitPaymentEvidence,reviewPayment,reviewByobEvidence} from '../lib/payment-foundation';
import {setEventStaff} from '../lib/staff-permissions';
import {canAccessEvent,canSeePrivateLocation} from '../lib/event-access';
import {checkIn} from '../lib/services';
const base=process.env.TEST_BASE_URL||'';
if(process.env.ISOLATED_TEST_DATA!=='true' || !process.env.DATABASE_URL?.startsWith('file:') || !['localhost','127.0.0.1'].includes(new URL(base).hostname) || process.env.DB_PASSWORD!==undefined)throw Error('Phase 2 tests require isolated loopback SQLite.');
const until=()=>new Date(Date.now()+3600000);
test('Phase 2 isolated backend security and transaction journeys',async t=>{
 const prefix='p2_'+randomUUID().slice(0,8),uids:string[]=[],eids:string[]=[],uploads:string[]=[];let destId='';
 const pw=await hash('LocalTestPassword2026!',4);
 const user=async(role='ATTENDEE')=>{const id=prefix+'_'+uids.length;uids.push(id);return db.user.create({data:{id,email:id+'@example.test',username:id,name:id,passwordHash:pw,dob:new Date('1990-01-01'),city:'Test',role}});};
 const admin=await user('ADMIN'),org=await user('ORGANIZER'),a=await user(),b=await user(),scanner=await user(),other=await user('ORGANIZER');
 const makeEvent=async(opts:any={})=>{const id=prefix+'_'+eids.length;eids.push(id);const event=await db.event.create({data:{id,slug:id,title:'Isolated Phase 2 rehearsal',description:'Fictional test only',category:'Music',genre:'House',image:'/images/event-1.jpg',city:'Test',venue:'Hidden venue',privateVenue:'PRIVATE test address',latitude:3,longitude:101,startsAt:new Date(Date.now()+86400000),endsAt:new Date(Date.now()+90000000),age:18,organizerId:org.id,capacity:10,origin:'REAL',testOnly:true,status:'PUBLISHED',approvalRequired:true,configurationStatus:'TEST_ONLY',...opts}});const tier=await db.eventTicketTier.create({data:{eventId:id,name:'Test',price:0,quantity:10,maxPerOrder:2}});return {event,tier};};
 const file=async(userId:string)=>{const id=randomBytes(20).toString('hex');uploads.push(id);return db.fileUpload.create({data:{id,userId,path:id+'.png',private:true,mime:'image/png',data:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1kAAAAASUVORK5CYII=','base64')}});};
 const reserve=(userId:string,x:any,key=randomUUID())=>reserveBooking(userId,{eventId:x.event.id,tierId:x.tier.id,quantity:1,idempotencyKey:key,expiresAt:until()});
 const api=async(path:string,who:any,body?:any)=>{let cookie='';if(who){const token=randomBytes(32).toString('hex');await db.session.create({data:{id:secretHash(token),userId:who.id,securityVersion:(await db.user.findUniqueOrThrow({where:{id:who.id}})).securityVersion,expires:until()}});cookie='vibey-session='+token;}return fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie,'x-forwarded-for':prefix},body:body===undefined?undefined:JSON.stringify(body)});};
 try {
 await t.test('registration normalizes identities and rejects impossible dates and bcrypt truncation',()=>{
  assert.equal(emailInput.parse(' PERSON@Example.test '),'person@example.test');assert(!passwordInput.safeParse('é'.repeat(37)).success);assert(!passwordInput.safeParse('short').success);
  const sample={name:' Person ',username:' PERSON_1 ',email:' PERSON@Example.test ',password:'StrongPassword123!',dob:'2000-02-29',city:' KL '};const parsed=registrationInput.parse(sample);assert.equal(parsed.username,'person_1');assert.equal(parsed.name,'Person');assert(!registrationInput.safeParse({...sample,dob:'2001-02-29'}).success);assert(!registrationInput.safeParse({...sample,role:'ADMIN'}).success);
 });
 await t.test('shared rate bucket survives a new database client and enforces concurrent limit',async()=>{
  const outcomes=await Promise.allSettled(Array.from({length:7},()=>consumeRateLimit('phase2',prefix,3,3600000)));assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,3);
  const second=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}});try{assert.equal((await second.rateLimitBucket.findUniqueOrThrow({where:{id:secretHash(`phase2:${prefix}:${Math.floor(Date.now()/3600000)}`)}})).count,3);}finally{await second.$disconnect();}
  await assert.rejects(consumeRateLimit('phase2',prefix,3,3600000),/429/);
 });
 await t.test('security changes revoke sessions, require admin, support multiple capabilities and disable accounts',async()=>{
  await db.session.create({data:{id:randomUUID(),userId:a.id,expires:until()}});await assert.rejects(securityChange(org.id,a.id,{role:'ADMIN'}),/403/);
  await securityChange(admin.id,a.id,{organizerCapability:true});assert.equal(await db.session.count({where:{userId:a.id}}),0);assert.equal((await db.user.findUniqueOrThrow({where:{id:a.id}})).role,'ATTENDEE');assert.equal(await db.userCapability.count({where:{userId:a.id,capability:'ORGANIZER',active:true}}),1);
  await securityChange(admin.id,a.id,{active:false});assert.equal((await api('login',null,{email:a.email,password:'LocalTestPassword2026!'})).status,401);await securityChange(admin.id,a.id,{active:true});
 });
 await t.test('HTTP login rotates hashed sessions and account changes invalidate old cookies immediately',async()=>{
  const login=await api('login',null,{email:b.email.toUpperCase(),password:'LocalTestPassword2026!'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0];const token=cookie.split('=')[1];assert(await db.session.findUnique({where:{id:secretHash(token)}}));assert.equal(await db.session.findUnique({where:{id:token}}),null);
  await securityChange(admin.id,b.id,{role:'ORGANIZER'});assert.equal((await fetch(base+'/api/tickets',{headers:{Cookie:cookie}})).status,401);await securityChange(admin.id,b.id,{role:'ATTENDEE'});
  const known=await api('reset-request',null,{email:b.email}),unknown=await api('reset-request',null,{email:prefix+'missing@example.test'});assert.equal(known.status,200);assert.deepEqual(await known.json(),await unknown.json());
 });
 await t.test('recovery is generic, hash-only, expiring, single-use and revokes sessions',async()=>{
  let token='';let expiry=new Date();const response=await requestRecovery(a.email,{deliver:async m=>{token=m.token;expiry=m.expires;return true;}});assert.deepEqual(response,await requestRecovery(prefix+'absent@example.test'));assert.match(token,/^[a-f0-9]{64}$/);assert(expiry.getTime()-Date.now()<=900000);
  const row=await db.passwordReset.findUniqueOrThrow({where:{userId:a.id,id:secretHash(token)}});assert.notEqual(row.id,token);await db.session.create({data:{id:randomUUID(),userId:a.id,expires:until()}});
  await resetPassword(token,'ChangedPassword2026!');assert.equal(await db.session.count({where:{userId:a.id}}),0);assert(await compare('ChangedPassword2026!',(await db.user.findUniqueOrThrow({where:{id:a.id}})).passwordHash));await assert.rejects(resetPassword(token,'ChangedAgain2026!'),/expired/);
  await requestRecovery(a.email,{deliver:async m=>{token=m.token;return true;}});await db.passwordReset.update({where:{id:secretHash(token)},data:{expires:new Date(0)}});await assert.rejects(resetPassword(token,'ChangedAgain2026!'),/expired/);
  const before:string[]=await readdir('.local/mail').catch(()=>[] as string[]);await requestRecovery(a.email);const after=await readdir('.local/mail');const added=after.filter(x=>!before.includes(x));assert.equal(added.length,1);assert.equal((await stat('.local/mail/'+added[0])).mode&0o777,0o600);assert.equal(JSON.parse(await readFile('.local/mail/'+added[0],'utf8')).transport,'LOCAL_TEST_MAILBOX');
 });
 const privateX=await makeEvent({access:'INVITATION_ONLY',invitationsEnabled:true});let invite:any;
 await t.test('invitation tokens are hashed, account-bound and event-bound; unknown and forwarded links fail',async()=>{
  await assert.rejects(createInvitation(a.id,{eventId:privateX.event.id,inviteeId:a.id,expiresAt:until()}),/403/);
  invite=await createInvitation(org.id,{eventId:privateX.event.id,inviteeId:a.id,expiresAt:until()});assert(!('tokenHash' in invite));assert.equal((await db.eventInvitation.findUniqueOrThrow({where:{id:invite.id}})).tokenHash,secretHash(invite.token));
  await assert.rejects(redeemInvitation(b.id,privateX.event.id,invite.token),/404/);await assert.rejects(redeemInvitation(a.id,'wrong-event',invite.token),/404/);await assert.rejects(redeemInvitation(a.id,privateX.event.id,'f'.repeat(64)),/404/);
  await assert.rejects(reserve(b.id,privateX),/invitation/);assert.equal(await canAccessEvent(privateX.event,b),false);assert.equal((await api('invitations/redeem',null,{eventId:privateX.event.id,token:invite.token})).status,401);
 });
 await t.test('concurrent invitation redemption consumes exactly one use; expiry and revocation deny reuse',async()=>{
  const grants=await Promise.all([redeemInvitation(a.id,privateX.event.id,invite.token),redeemInvitation(a.id,privateX.event.id,invite.token)]);assert.equal(grants[0].id,grants[1].id);assert.equal((await db.eventInvitation.findUniqueOrThrow({where:{id:invite.id}})).usageCount,1);assert.equal(await canAccessEvent(privateX.event,a),true);
  const x=await createInvitation(org.id,{eventId:privateX.event.id,inviteeId:b.id,expiresAt:until()});await db.eventInvitation.update({where:{id:x.id},data:{expiresAt:new Date(0)}});await assert.rejects(redeemInvitation(b.id,privateX.event.id,x.token),/404/);
  const booking=await reserve(a.id,privateX);await revokeInvitation(org.id,invite.id);await assert.rejects(redeemInvitation(a.id,privateX.event.id,invite.token),/404/);assert.equal((await db.booking.findUniqueOrThrow({where:{id:booking.id}})).lifecycle,'RESERVED');assert.equal(await canSeePrivateLocation(privateX.event,a),false);
 });
 const x=await makeEvent();
 await t.test('scanner permissions are event-scoped, deny finance/location and revoke immediately',async()=>{
  await setEventStaff(org.id,{eventId:x.event.id,userId:scanner.id,active:true,canViewGuests:true,canCheckIn:true});await transaction(tx=>eventPermission(tx,scanner.id,x.event.id,'checkin'));
  await assert.rejects(transaction(tx=>eventPermission(tx,scanner.id,x.event.id,'payments')),/403/);await assert.rejects(transaction(tx=>eventPermission(tx,scanner.id,privateX.event.id,'checkin')),/403/);assert.equal(await canSeePrivateLocation(x.event,scanner),false);
  const projection=await (await api('organizer',scanner)).json();const projected=projection.events.find((e:any)=>e.id===x.event.id);assert(projected);assert(!projected.privateVenue);assert.equal(projected.bookings.length,0);
  await setEventStaff(org.id,{eventId:x.event.id,userId:scanner.id,active:false});await assert.rejects(transaction(tx=>eventPermission(tx,scanner.id,x.event.id,'checkin')),/403/);
 });
 await t.test('competing final-seat reservations obey both caps; duplicate idempotency creates one reservation',async()=>{
  const last=await makeEvent({capacity:1});await db.eventTicketTier.update({where:{id:last.tier.id},data:{quantity:1}});
  const race=await Promise.allSettled([reserve(a.id,last),reserve(b.id,last)]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal((await db.event.findUniqueOrThrow({where:{id:last.event.id}})).reservedCount,1);assert.equal((await db.eventTicketTier.findUniqueOrThrow({where:{id:last.tier.id}})).sold,1);
  const key=randomUUID(),both=await Promise.all([reserve(a.id,x,key),reserve(a.id,x,key)]);assert.equal(both[0].id,both[1].id);await assert.rejects(reserve(b.id,x,key),/mismatch/);
  await Promise.all([cancelBooking(a.id,both[0].id),cancelBooking(a.id,both[0].id)]);assert.equal((await db.event.findUniqueOrThrow({where:{id:x.event.id}})).reservedCount,0);assert.equal((await db.eventTicketTier.findUniqueOrThrow({where:{id:x.tier.id}})).sold,0);
 });
 await t.test('conflicting registration decisions resolve once without issuing contradictory tickets',async()=>{
  const y=await makeEvent(),q=await reserve(b.id,y);const result=await Promise.allSettled([approveRegistration(org.id,q.id,true),approveRegistration(org.id,q.id,false)]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);const row=await db.booking.findUniqueOrThrow({where:{id:q.id}});assert(['APPROVED','REJECTED'].includes(row.registrationState));assert.equal(await db.adminAuditLog.count({where:{targetId:q.id,action:{in:['REGISTRATION_APPROVED','REGISTRATION_REJECTED']}}}),1);assert.equal(await db.ticket.count({where:{bookingId:q.id}}),row.registrationState==='APPROVED'?1:0);
 });
 await t.test('reservation expiry releases inventory once and terminal bookings cannot issue tickets',async()=>{
  const booking=await reserve(a.id,x);await db.booking.update({where:{id:booking.id},data:{reservationExpiresAt:new Date(0)}});await Promise.all([expireReservation(org.id,booking.id),expireReservation(org.id,booking.id)]);assert.equal((await db.event.findUniqueOrThrow({where:{id:x.event.id}})).reservedCount,0);await assert.rejects(issueTickets(org.id,booking.id),/409/);assert.throws(()=>assertBookingTransition('EXPIRED','CONFIRMED'),/409/);
 });
 let paid:any,recipient:any,booking:any,evidence:any;
 await t.test('organizer-owned private QR requires independent admin approval; pending replacements preserve active version',async()=>{
  const qr=await file(org.id);recipient=await submitPaymentDestination(org.id,{methodType:'DUITNOW',label:'Isolated test QR',recipientName:'Fictional organizer',recipientReference:'TEST ONLY',qrAssetId:qr.id});destId=recipient.destinationId;
  await assert.rejects(reviewPaymentDestination(org.id,recipient.id,true),/403/);await reviewPaymentDestination(admin.id,recipient.id,true);
  const replacement=await submitPaymentDestination(org.id,{methodType:'DUITNOW',label:'New QR',recipientName:'Replacement test',recipientReference:'TEST NEW',qrAssetId:qr.id},destId);assert.equal((await db.paymentDestination.findUniqueOrThrow({where:{id:destId}})).activeVersionId,recipient.id);
  paid=await makeEvent({paymentDestinationId:destId});await db.eventTicketTier.update({where:{id:paid.tier.id},data:{price:3500}});booking=await reserve(a.id,paid);await reviewPaymentDestination(admin.id,replacement.id,true);assert.equal((await db.booking.findUniqueOrThrow({where:{id:booking.id}})).recipientVersionId,recipient.id);assert.equal(JSON.parse(booking.recipientSnapshot).recipientName,'Fictional organizer');
 });
 await t.test('receipt alone and registration approval never confirm payment or issue a paid ticket',async()=>{
  const receipt=await file(a.id);evidence=await submitPaymentEvidence(a.id,booking.id,receipt.id);assert.equal((await submitPaymentEvidence(a.id,booking.id,receipt.id)).id,evidence.id);
  await approveRegistration(org.id,booking.id,true);assert.equal((await db.booking.findUniqueOrThrow({where:{id:booking.id}})).paymentState,'PROOF_SUBMITTED');assert.equal(await db.ticket.count({where:{bookingId:booking.id}}),0);await assert.rejects(issueTickets(org.id,booking.id),/payment confirmation/);assert.equal(await canSeePrivateLocation(paid.event,a),false);
  await assert.rejects(reviewPayment(org.id,booking.id,{evidenceId:evidence.id,decision:'CONFIRMED',fundsVerified:false,receivedAmount:3500}),/actual incoming/);await assert.rejects(reviewPayment(org.id,booking.id,{evidenceId:evidence.id,decision:'CONFIRMED',fundsVerified:true,receivedAmount:1}),/actual incoming/);
  await assert.rejects(reviewPayment(a.id,booking.id,{evidenceId:evidence.id,decision:'CONFIRMED',fundsVerified:true,receivedAmount:3500}),/403/);
 });
 await t.test('foreign evidence, wrong recipients and scanner finance cannot approve a payment',async()=>{
  const invalid=await file(a.id);await db.fileUpload.update({where:{id:invalid.id},data:{data:Buffer.alloc(10_000_001)}});await assert.rejects(submitPaymentEvidence(a.id,booking.id,invalid.id),/400/);
  const foreign=await file(b.id);await assert.rejects(submitPaymentEvidence(a.id,booking.id,foreign.id),/400/);await assert.rejects(submitPaymentEvidence(b.id,booking.id,foreign.id),/403/);
  await setEventStaff(org.id,{eventId:paid.event.id,userId:scanner.id,active:true,canCheckIn:true});await assert.rejects(reviewPayment(scanner.id,booking.id,{evidenceId:evidence.id,decision:'CONFIRMED',fundsVerified:true,receivedAmount:3500}),/403/);
  await assert.rejects(reviewPayment(org.id,booking.id,{evidenceId:'wrong-evidence',decision:'CONFIRMED',fundsVerified:true,receivedAmount:3500}),/match/);
 });
 await t.test('funds confirmation is authorized and idempotent, with one issuance audit and notification',async()=>{
  await reviewPayment(org.id,booking.id,{evidenceId:evidence.id,decision:'CONFIRMED',fundsVerified:true,receivedAmount:3500});
  await Promise.all([issueTickets(org.id,booking.id),issueTickets(org.id,booking.id)]);assert.equal(await db.ticket.count({where:{bookingId:booking.id}}),1);assert.equal(await db.adminAuditLog.count({where:{targetId:booking.id,action:'TICKETS_ISSUED'}}),1);assert.equal(await db.notification.count({where:{dedupeKey:'tickets:'+booking.id}}),1);
  await reviewPayment(org.id,booking.id,{evidenceId:evidence.id,decision:'CONFIRMED',fundsVerified:true,receivedAmount:3500});await assert.rejects(reviewPayment(org.id,booking.id,{evidenceId:'wrong',decision:'CONFIRMED',fundsVerified:true,receivedAmount:3500}),/409/);assert.equal(await canSeePrivateLocation(paid.event,a),true);
 });
 await t.test('AUD-01 suspended event rejects QR and manual check-in without attendance writes',async()=>{
  const ticket=await db.ticket.findFirstOrThrow({where:{bookingId:booking.id}});await updateEventLifecycle(admin.id,paid.event.id,'SUSPENDED');for(const method of ['QR','MANUAL'] as const)await assert.rejects(checkIn(org.id,paid.event.id,ticket.token,method),/409/);
  assert.equal(await db.ticketCheckIn.count({where:{ticketId:ticket.id}}),0);assert.equal(await db.attendanceRecord.count({where:{ticketId:ticket.id}}),0);await assert.rejects(issueTickets(org.id,booking.id),/409/);await assert.rejects(updateEventLifecycle(org.id,paid.event.id,'PUBLISHED'),/403/);await updateEventLifecycle(admin.id,paid.event.id,'PUBLISHED');
 });
 await t.test('concurrent QR/manual claims admit once and private attendance never becomes public',async()=>{
  await db.event.update({where:{id:paid.event.id},data:{access:'PRIVATE'}});await db.user.update({where:{id:a.id},data:{attendancePublic:true,discoverable:true}});await db.booking.update({where:{id:booking.id},data:{attendancePublic:true}});
  const ticket=await db.ticket.findFirstOrThrow({where:{bookingId:booking.id}});const attempts=await Promise.allSettled([checkIn(org.id,paid.event.id,ticket.token,'QR'),checkIn(org.id,paid.event.id,ticket.token,'MANUAL')]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal(await db.ticketCheckIn.count({where:{ticketId:ticket.id}}),1);assert.equal(await db.attendanceRecord.count({where:{ticketId:ticket.id}}),1);
  const profile=await (await api('people/'+a.username,b)).json();assert(!JSON.stringify(profile).includes(paid.event.title));
  await updateEventLifecycle(admin.id,paid.event.id,'SUSPENDED');const own=await (await api('profile',a)).json();assert(!JSON.stringify(own).includes('PRIVATE test address'));await updateEventLifecycle(admin.id,paid.event.id,'PUBLISHED');
 });
 await t.test('revoked, cancelled, completed, ended and wrong-event tickets cannot admit',async()=>{
  for(const state of ['REVOKED','CANCELLED','COMPLETED','ENDED','WRONG']){const y=await makeEvent({approvalRequired:false});const q=await reserve(a.id,y);const tickets=await issueTickets(org.id,q.id);if(state==='REVOKED')await revokeTicket(org.id,tickets[0].id);if(state==='CANCELLED'||state==='COMPLETED')await updateEventLifecycle(admin.id,y.event.id,state);if(state==='ENDED')await db.event.update({where:{id:y.event.id},data:{endsAt:new Date(0)}});await assert.rejects(checkIn(org.id,state==='WRONG'?x.event.id:y.event.id,tickets[0].token),/400|404|409/);assert.equal(await db.attendanceRecord.count({where:{ticketId:tickets[0].id}}),0);}
 });
 await t.test('cancellation after real-model funds confirmation marks refund pending without simulating refund',async()=>{
  const y=await makeEvent({paymentDestinationId:destId,approvalRequired:false});await db.eventTicketTier.update({where:{id:y.tier.id},data:{price:3500}});const q=await reserve(b.id,y),f=await file(b.id),e=await submitPaymentEvidence(b.id,q.id,f.id);await reviewPayment(org.id,q.id,{evidenceId:e.id,decision:'CONFIRMED',fundsVerified:true,receivedAmount:3500});await cancelBooking(b.id,q.id);assert.equal((await db.booking.findUniqueOrThrow({where:{id:q.id}})).paymentState,'REFUND_PENDING');assert.equal(await db.refund.count({where:{payment:{bookingId:q.id}}}),0);await assert.rejects(issueTickets(org.id,q.id),/409/);
 });
 await t.test('BYOB review is independent, cannot confirm money, and blocks issuance until approved',async()=>{
  const y=await makeEvent({approvalRequired:false});const q=await reserve(b.id,y);await db.booking.update({where:{id:q.id},data:{byobRequired:true,byobState:'PENDING',entryPath:'BYOB_TEST'}});await assert.rejects(issueTickets(org.id,q.id),/BYOB/);const f=await file(b.id),e=await submitPaymentEvidence(b.id,q.id,f.id,'BYOB');await reviewByobEvidence(org.id,e.id,true);assert.equal((await db.booking.findUniqueOrThrow({where:{id:q.id}})).paymentState,'NOT_REQUIRED');await issueTickets(org.id,q.id);assert.equal(await db.ticket.count({where:{bookingId:q.id}}),1);
 });
 await t.test('transaction failure rolls back inventory, audit and notification together',async()=>{
  const before=await db.event.findUniqueOrThrow({where:{id:x.event.id}});const audits=await db.adminAuditLog.count({where:{eventId:x.event.id}});await assert.rejects(transaction(async tx=>{await tx.event.update({where:{id:x.event.id},data:{reservedCount:{increment:1}}});await tx.adminAuditLog.create({data:{userId:org.id,action:'ROLLBACK_TEST',targetId:x.event.id,eventId:x.event.id}});await tx.notification.create({data:{userId:'nonexistent-'+prefix,title:'Fail',body:'Must rollback'}});}));assert.equal((await db.event.findUniqueOrThrow({where:{id:x.event.id}})).reservedCount,before.reservedCount);assert.equal(await db.adminAuditLog.count({where:{eventId:x.event.id}}),audits);
 });
 await t.test('demo classification and test flags cannot authorize production admission',async()=>{
  const q=await db.booking.findUniqueOrThrow({where:{id:booking.id},include:{user:true,recipientVersion:true,payment:{include:{reviews:true,evidence:true}}}}),event=await db.event.findUniqueOrThrow({where:{id:paid.event.id}});const old=process.env.ISOLATED_TEST_DATA;process.env.ISOLATED_TEST_DATA='false';try{assert.equal(eligibility(q,event,q.payment,{admission:true}).eligible,false);await assert.rejects(reserve(a.id,x),/503/);}finally{process.env.ISOLATED_TEST_DATA=old;}
  assert.equal(eligibility({...q,origin:'DEMO',testOnly:false},event,q.payment).eligible,false);
 });
 await t.test('management APIs deny anonymous, customer and cross-organizer access; scanner receipt denied',async()=>{
  assert.equal((await api('security/account',org,{userId:a.id,role:'ADMIN'})).status,403);assert.equal((await api('staff',other,{eventId:x.event.id,userId:b.id,active:true})).status,403);assert.equal((await api('event-state',a,{eventId:x.event.id,status:'SUSPENDED'})).status,403);
  await setEventStaff(org.id,{eventId:paid.event.id,userId:scanner.id,active:true,canCheckIn:true,canViewGuests:true});assert.equal((await api('receipt/'+booking.id,scanner)).status,403);
 });
 }finally{
  const bookings=await db.booking.findMany({where:{eventId:{in:eids}}});const bids=bookings.map(x=>x.id),payments=await db.payment.findMany({where:{bookingId:{in:bids}}}),pids=payments.map(x=>x.id),tickets=await db.ticket.findMany({where:{bookingId:{in:bids}}}),tids=tickets.map(x=>x.id);
  await db.ticketCheckIn.deleteMany({where:{ticketId:{in:tids}}});await db.attendanceRecord.deleteMany({where:{eventId:{in:eids}}});await db.ticket.deleteMany({where:{id:{in:tids}}});await db.paymentReview.deleteMany({where:{paymentId:{in:pids}}});await db.paymentEvidence.deleteMany({where:{paymentId:{in:pids}}});await db.refund.deleteMany({where:{paymentId:{in:pids}}});await db.payment.deleteMany({where:{id:{in:pids}}});await db.commissionEntry.deleteMany({where:{booking:{id:{in:bids}}}});
    await db.bookingFeeSnapshot.deleteMany({where:{booking:{id:{in:bids}}}});
    await db.booking.deleteMany({where:{id:{in:bids}}});await db.invitationGrant.deleteMany({where:{eventId:{in:eids}}});await db.eventInvitation.deleteMany({where:{eventId:{in:eids}}});await db.event.deleteMany({where:{id:{in:eids}}});
  if(destId){await db.paymentDestination.update({where:{id:destId},data:{activeVersionId:null}});await db.paymentRecipientVersion.deleteMany({where:{destinationId:destId}});await db.paymentDestination.delete({where:{id:destId}});}
  await db.fileUpload.deleteMany({where:{id:{in:uploads}}});await db.adminAuditLog.deleteMany({where:{userId:{in:uids}}});await db.userBadge.deleteMany({where:{userId:{in:uids}}});await db.user.deleteMany({where:{id:{in:uids}}});await db.$disconnect();
 }
});

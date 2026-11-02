import {db} from '../lib/db';
import {redeemInvitation} from '../lib/invitations';
import {reserveBooking,approveRegistration,issueTickets} from '../lib/booking-domain';
import {submitPaymentEvidence,reviewPayment} from '../lib/payment-foundation';
import {setEventStaff} from '../lib/staff-permissions';
import {readFile,writeFile} from 'node:fs/promises';
if(process.env.NODE_ENV==='production'||process.env.DB_PASSWORD!==undefined||!process.env.DATABASE_URL?.includes('mixermates-phase6-20261026/preview/')||process.env.ISOLATED_TEST_DATA!=='true')throw Error('Isolated Phase 6 only');
if(await db.booking.findFirst({where:{eventId:'halloween-phase4-test'}}))throw Error('Preserve existing fixture');
const f=JSON.parse(await readFile('.local/phase4-fixture.json','utf8'));
await redeemInvitation('attendee',f.eventId,new URLSearchParams(new URL(f.link).hash.slice(1)).get('invite')!);
const rows=[];
for(let i=0;i<2;i++){
 const b=await reserveBooking('attendee',{eventId:f.eventId,tierId:'p4-fixture-general',quantity:1,entryKey:'fee',answers:{'p4-name':'Alex Fictional Morgan','p4-age':'28','p4-instagram':'fictional_alex','p4-entry':'Entrance Fee — RM35'},idempotencyKey:crypto.randomUUID(),expiresAt:new Date(Date.now()+3600000)});
 const upload=await db.fileUpload.create({data:{userId:'attendee',private:true,mime:'image/png',path:'p6-proof-'+i,data:await readFile('docs/phase4/fixtures/fictional-receipt.png')}});
 const proof=await submitPaymentEvidence('attendee',b.id,upload.id);
 await reviewPayment('organizer',b.id,{evidenceId:proof.id,decision:'CONFIRMED',fundsVerified:true,receivedAmount:3500,notes:'FICTIONAL software rehearsal; no actual money transferred.'});
 if(i===1){await approveRegistration('organizer',b.id,true);await issueTickets('organizer',b.id);}
 rows.push(b.id);
}
await setEventStaff('organizer',{eventId:f.eventId,userId:'staff',active:true,canViewGuests:true,canCheckIn:true});
await writeFile('.local/phase6-fixture.json',JSON.stringify({eventId:f.eventId,pending:rows[0],confirmed:rows[1]}),{mode:0o600});console.log('Prepared fictional pending/confirmed Phase 6 browser bookings.');await db.$disconnect();

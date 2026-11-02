import {db} from '../lib/db.ts';
import {databaseUrl} from '../lib/database-url.ts';
import {isolatedTestData} from '../lib/domain-core.ts';
import {expireReservation} from '../lib/booking-domain.ts';
const production=process.env.NODE_ENV==='production';
const target=databaseUrl();
if(production){if(process.env.EXPIRY_WORKER_ENABLED!=='true'||!process.env.EXPIRY_ACTOR_ID||!target?.startsWith('mysql://')||process.env.APP_ORIGIN!=='https://mixermates.com')throw Error('Production expiry requires the explicitly configured worker, administrator actor and approved application origin.');}
else if(!isolatedTestData())throw Error('Nonproduction expiry requires an isolated local test database.');
try {
 if(production){const actor=await db.user.findUnique({where:{id:process.env.EXPIRY_ACTOR_ID}});if(!actor?.active||actor.role!=='ADMIN')throw Error('Production expiry requires an active provisioned administrator.');}
 const due=await db.booking.findMany({where:{origin:'REAL',testOnly:!production,lifecycle:{in:['RESERVED','PENDING']},reviewHold:false,reservationExpiresAt:{lte:new Date()},paymentState:{not:'CONFIRMED'},inventoryHeld:true},select:{id:true,event:{select:{organizerId:true}}},take:200});
 let expired=0,failed=0;
 for(const b of due){try{await expireReservation(process.env.EXPIRY_ACTOR_ID||b.event.organizerId,b.id);expired++;}catch(error){if(!String(error.message).startsWith('409:'))failed++;}}
 console.log(JSON.stringify({examined:due.length,expired,failed}));if(failed)process.exitCode=1;
}finally{await db.$disconnect();}

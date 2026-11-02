// Explicitly run once after backup/migration verification. Never imported by startup.
import { db } from "../lib/db";
import { transaction } from "../lib/domain-core";
import { demoEvents } from "../lib/demo-events";
import { publicCatalogueWhere } from "../lib/public-catalogue";
if (process.env.INSTALL_APPROVED_PUBLIC_DEMOS !== "20261029" || process.env.TICKET_SALES_MODE !== "disabled" || process.env.HOSTINGER_SEED_DEMO !== "false" || process.env.HOSTINGER_DATABASE_BOOTSTRAP !== "false") throw Error("Explicit approved demo installation and disabled financial/startup modes required.");
await transaction(async tx=>{
  const owner=await tx.user.findFirst({where:{role:"ADMIN",active:true},orderBy:{createdAt:"asc"}});
  if(!owner)throw Error("An existing active administrator is required. No privileged account will be created.");
  for(const demo of demoEvents){
    const existing=await tx.event.findUnique({where:{id:demo.id}});
    if(existing){if(existing.origin!=="PUBLIC_DEMO" || existing.slug!==demo.slug)throw Error("Demo identifier collision. Existing event preserved.");continue;}
    const {price,...details}=demo;
    const startsAt=new Date(demo.startsAt);
    await tx.event.create({data:{...details,startsAt,endsAt:new Date(+startsAt+10800000),organizerId:owner.id,city:"Kuala Lumpur",latitude:0,longitude:0,privateVenue:"",locationVisibility:"HIDDEN",guestListVisibility:"PRIVATE",origin:"PUBLIC_DEMO",testOnly:true,status:"PUBLISHED",access:"PUBLIC",salesPaused:true,invitationsEnabled:false,configurationStatus:"DEMO_ONLY",reviewOutcome:"NONE",shortDescription:"Fictional demo · no real venue, payments or admission",capacity:100,policies:"Fictional showcase only. This event does not accept bookings, payments or issue admission tickets.",tiers:{create:{name:"Sample admission · unavailable",price,quantity:100,description:"Illustrative sample price only. Cannot be purchased.",availability:"UNAVAILABLE"}}}});
  }
  const visible=await tx.event.findMany({where:publicCatalogueWhere,select:{id:true}});
  if(visible.length!==4 || visible.some(e=>!demoEvents.some(d=>d.id===e.id)))throw Error("Initial catalogue must contain exactly the four approved demos; no data changed.");
});
console.log("Four public demos installed/verified. Existing records preserved. No money, booking, ticket or account created.");
await db.$disconnect();

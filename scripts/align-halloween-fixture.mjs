import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
if(process.env.NODE_ENV==='production' || process.env.ISOLATED_TEST_DATA!=='true' || !process.env.DATABASE_URL?.startsWith('file:') || process.env.DB_PASSWORD!==undefined)throw Error('Only isolated local SQLite fixture alignment is allowed.');
const source=JSON.parse(await readFile(new URL('../prisma/fixtures/halloween-source.json',import.meta.url),'utf8'));
const db=new PrismaClient();
try {
 await db.$transaction(async tx=>{
  const e=await tx.event.findUnique({where:{id:'halloween'}});if(!e)return;
  await tx.event.update({where:{id:e.id},data:{status:'DRAFT',salesPaused:true,access:'INVITATION_ONLY',invitationsEnabled:false,configurationStatus:'UNCONFIRMED',sourceConfiguration:JSON.stringify(source),venue:'Venue unconfirmed',privateVenue:'',latitude:0,longitude:0,description:'UNCONFIRMED DRAFT. Halloween House Party, invitation only, 18+. Year, time, capacity, venue, current payment instructions and the RM35/BYOB relationship await organizer confirmation. Existing demo time and tier columns are historical placeholders, not approved event details.'}});
  for(const [label,required] of [['Instagram username',true],['Invited by',false],['Phone number',false]])await tx.eventRegistrationField.updateMany({where:{eventId:e.id,label},data:{required}});
  for(const label of ['Full name as on IC','Age'])if(!await tx.eventRegistrationField.findFirst({where:{eventId:e.id,label}}))await tx.eventRegistrationField.create({data:{eventId:e.id,label,required:true,type:'text'}});
 });
 console.log('Isolated Halloween draft aligned; unknowns explicit; no records deleted or event published.');
}finally {await db.$disconnect();}

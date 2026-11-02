import { z } from "zod";
import { actor,audit,eventPermission,transaction } from "./domain-core";
const staffInput=z.object({eventId:z.string().min(1).max(191),userId:z.string().min(1).max(191),active:z.boolean(),canViewGuests:z.boolean().default(false),canCheckIn:z.boolean().default(false),canReviewPayments:z.boolean().default(false),canApproveRegistrations:z.boolean().default(false),canViewLocation:z.boolean().default(false)}).strict();
export async function setEventStaff(actorId:string,input:z.input<typeof staffInput>) {
  const d=staffInput.parse(input);return transaction(async tx=>{
    await eventPermission(tx,actorId,d.eventId,"manage");await actor(tx,d.userId);
    const old=await tx.eventStaff.findUnique({where:{eventId_userId:{eventId:d.eventId,userId:d.userId}}});
    const result=await tx.eventStaff.upsert({where:{eventId_userId:{eventId:d.eventId,userId:d.userId}},create:d,update:d});
    const assignments=await tx.eventStaff.count({where:{userId:d.userId,active:true}});
    await tx.userCapability.upsert({where:{userId_capability:{userId:d.userId,capability:"EVENT_STAFF"}},create:{userId:d.userId,capability:"EVENT_STAFF",active:assignments>0},update:{active:assignments>0}});
    await tx.user.update({where:{id:d.userId},data:{securityVersion:{increment:1}}});await tx.session.deleteMany({where:{userId:d.userId}});
    await audit(tx,actorId,d.active?"EVENT_STAFF_UPDATED":"EVENT_STAFF_REMOVED",d.userId,{eventId:d.eventId,entityType:"EVENT_STAFF",previousState:old?.active?"ACTIVE":"INACTIVE",newState:d.active?"ACTIVE":"INACTIVE"});return result;
  });
}

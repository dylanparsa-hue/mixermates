import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { secretHash,emailInput } from "./security";
import { actor,audit,eventPermission,eventFence,transaction,type Tx } from "./domain-core";
const invitationInput=z.object({eventId:z.string().min(1).max(191),inviteeId:z.string().min(1).max(191),inviteeEmail:emailInput.optional(),expiresAt:z.coerce.date(),usageLimit:z.number().int().min(1).max(100).default(1)}).strict();
export async function createInvitation(actorId:string,input:z.input<typeof invitationInput>) {
  const data=invitationInput.parse(input);if(data.expiresAt<=new Date() || data.expiresAt.getTime()>Date.now()+90*86400000)throw Error("400:Set an invitation expiry within 90 days.");
  const token=randomBytes(32).toString("hex");
  const invitation=await transaction(async tx=>{
    const {event}=await eventPermission(tx,actorId,data.eventId,"manage");
    if(event.access==="PUBLIC" || !event.invitationsEnabled || !["DRAFT","PENDING_REVIEW","PUBLISHED"].includes(event.status))throw Error("409:Invitations are not enabled for this private event.");
    const invitee=await actor(tx,data.inviteeId);
    if(data.inviteeEmail && data.inviteeEmail!==invitee.email.toLowerCase())throw Error("400:Invitation identity does not match.");
    const invitation=await tx.eventInvitation.create({data:{...data,inviterId:actorId,tokenHash:secretHash(token)}});
    await audit(tx,actorId,"INVITATION_CREATED",invitation.id,{eventId:event.id,entityType:"INVITATION"});
    const {tokenHash,...safe}=invitation;return safe;
  });return {...invitation,token}; // Secret returned once to authenticated issuer; never logged or listed.
}
export async function redeemInvitation(userId:string,eventId:string,token:string) {
  if(!/^[a-f0-9]{64}$/.test(token))throw Error("404:Invitation unavailable.");
  return transaction(async tx=>{
    const user=await actor(tx,userId);const invite=await tx.eventInvitation.findUnique({where:{tokenHash:secretHash(token)},include:{event:true}});
    if(!invite || invite.eventId!==eventId || invite.status!=="ACTIVE" || invite.revokedAt || invite.expiresAt<=new Date() || !invite.event.invitationsEnabled || invite.inviteeId!==user.id || (invite.inviteeEmail && invite.inviteeEmail!==user.email.toLowerCase()))throw Error("404:Invitation unavailable.");
    await eventFence(tx,invite.event,true);
    const previous=await tx.invitationGrant.findUnique({where:{invitationId_userId:{invitationId:invite.id,userId}}});
    if(previous?.status==="ACTIVE" && previous.expiresAt>new Date())return previous;
    const claim=await tx.eventInvitation.updateMany({where:{id:invite.id,status:"ACTIVE",revokedAt:null,expiresAt:{gt:new Date()},usageCount:{lt:invite.usageLimit}},data:{usageCount:{increment:1}}});
    if(claim.count!==1 || previous)throw Error("404:Invitation unavailable.");
    const grant=await tx.invitationGrant.create({data:{invitationId:invite.id,eventId,userId,expiresAt:invite.expiresAt}});
    await audit(tx,userId,"INVITATION_REDEEMED",invite.id,{eventId,entityType:"INVITATION"});return grant;
  });
}
export async function validEventGrant(tx:Tx,userId:string,eventId:string) {
  return tx.invitationGrant.findFirst({where:{userId,eventId,status:"ACTIVE",expiresAt:{gt:new Date()},invitation:{status:"ACTIVE",revokedAt:null,expiresAt:{gt:new Date()}}}});
}
export async function revokeInvitation(actorId:string,id:string) {
  return transaction(async tx=>{
    const invite=await tx.eventInvitation.findUniqueOrThrow({where:{id}});await eventPermission(tx,actorId,invite.eventId,"manage");
    if(invite.status==="REVOKED")return {ok:true};
    await tx.eventInvitation.update({where:{id},data:{status:"REVOKED",revokedAt:new Date()}});
    await tx.invitationGrant.updateMany({where:{invitationId:id},data:{status:"REVOKED",revokedAt:new Date()}});
    await audit(tx,actorId,"INVITATION_REVOKED",id,{eventId:invite.eventId,entityType:"INVITATION",previousState:invite.status,newState:"REVOKED"});
    // Paid/approved bookings are not silently cancelled by link revocation.
    return {ok:true};
  });
}

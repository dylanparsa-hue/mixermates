import { transaction, audit } from "./domain-core";
/** Only called after signature/issuer/audience/nonce/email validation in the callback. */
export async function resolveGoogleAccount(flow: {id:string;purpose:string;userId:string|null;securityVersion:number|null}, identity:{subject:string;email:string;name:string}, signedUser:{id:string;securityVersion:number}|null) {
  return transaction(async tx => {
    const linked = await tx.oAuthAccount.findUnique({where:{provider_subject:{provider:"google",subject:identity.subject}},include:{user:true}});
    if (flow.purpose === "LINK") {
      if (!signedUser || signedUser.id !== flow.userId || signedUser.securityVersion !== flow.securityVersion) throw Error("Account changed.");
      const owner = await tx.user.findUniqueOrThrow({where:{id:signedUser.id}});
      if (!owner.active || owner.securityVersion !== flow.securityVersion || owner.email.toLowerCase() !== identity.email || (linked && linked.userId !== owner.id)) throw Error("Account cannot be linked.");
      const existing = await tx.oAuthAccount.findUnique({where:{userId_provider:{userId:owner.id,provider:"google"}}});
      if (existing && existing.subject !== identity.subject) throw Error("A different Google account is already linked.");
      if (!linked) await tx.oAuthAccount.create({data:{provider:"google",subject:identity.subject,userId:owner.id}});
      await audit(tx,owner.id,"GOOGLE_ACCOUNT_LINKED",owner.id,{entityType:"USER"});
      return {user:owner};
    }
    if (linked) {
      if (!linked.user.active) throw Error("Account unavailable.");
      return {user:linked.user};
    }
    if (await tx.user.findUnique({where:{email:identity.email}})) return {existing:true};
    await tx.googleAuthFlow.update({where:{id:flow.id},data:{status:"PENDING",subject:identity.subject,email:identity.email,name:identity.name,expiresAt:new Date(Date.now()+30*86400000)}});
    return {pending:true};
  });
}

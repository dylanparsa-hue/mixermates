import { db } from "./db";
import { isAdmin, isOrganizer, type AccessUser } from "./access-policy";
import { getSiteConfig } from "./site-config";
import { canAccessEvent } from "./event-access";
export async function canReadUploadedMedia(file: {userId:string;path:string;private:boolean}, user:AccessUser) {
  if (file.private) return false;
  if (getSiteConfig().siteMode === "full_platform") {
    const events=await db.event.findMany({where:{image:file.path}});
    if(!events.length)return true;
    for(const event of events)if(await canAccessEvent(event,user))return true;
    return false;
  }
  if (isAdmin(user)) return true;
  if (!isOrganizer(user)) return false;
  if (file.userId === user!.id) return true;
  return !!await db.event.findFirst({where:{image:file.path,OR:[{organizerId:user!.id},{staff:{some:{userId:user!.id,active:true}}}]},select:{id:true}});
}

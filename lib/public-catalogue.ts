import { RELEASE_SCOPE } from "./release-scope";
export const publicDemoIds = ["mm-demo-neon", "mm-demo-sunset", "mm-demo-live", "mm-demo-table"];
export function publicCatalogueEnabled() {
  return RELEASE_SCOPE === "public_demo" || process.env.PUBLIC_DEMO_CATALOGUE === "true";
}
/** Legacy fixtures stay stored but never become public merely by opening the site. */
export const publicCatalogueWhere = {
  OR: [
    {id:{in:publicDemoIds},origin:"PUBLIC_DEMO",testOnly:true,access:"PUBLIC",status:"PUBLISHED",salesPaused:true},
    {origin:"REAL",testOnly:false,access:"PUBLIC",status:"PUBLISHED",reviewOutcome:"APPROVED",reviewedById:{not:null},creationKey:{not:null}},
  ],
};
export async function publiclyListed(id: string) {
  if (!publicCatalogueEnabled()) return true;
  const { db } = await import("./db");
  return !!(await db.event.findFirst({where:{id,AND:[publicCatalogueWhere]},select:{id:true}}));
}

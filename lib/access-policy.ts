import type { SiteConfig } from "./site-config";
export type AccessUser = { id: string; role: string; active?: boolean; capabilities?: {capability:string;active?:boolean}[] } | null;
export type RouteClass = "PUBLIC_APPLICATION" | "PUBLIC_STATIC_ASSET" | "AUTHENTICATION" | "ADMIN_PREVIEW" | "ORGANIZER_SCOPED" | "CUSTOMER_SCOPED" | "EVENT_INVITATION" | "PRIVATE_API" | "TICKET_SALES" | "HEALTH_CHECK" | "UNKNOWN";
export const isAdmin = (user: AccessUser) => !!user && user.active !== false && user.role === "ADMIN";
export const isOrganizer = (user: AccessUser) => !!user && user.active !== false && (["ORGANIZER","STAFF"].includes(user.role) || !!user.capabilities?.some(c=>c.active!==false && ["ORGANIZER","EVENT_STAFF"].includes(c.capability)));
export function classifyPage(path: string): RouteClass {
  if (path === "/") return "PUBLIC_APPLICATION";
  if (["/admin/login","/organizer/login"].includes(path)) return "AUTHENTICATION";
  if (path === "/admin") return "ADMIN_PREVIEW";
  if (["/organizer","/create"].includes(path)) return "ORGANIZER_SCOPED";
  if (/^\/organizers\/[^/]+$/.test(path)) return "EVENT_INVITATION";
  if (/^\/events\/[^/]+$/.test(path)) return "EVENT_INVITATION";
  if (["/profile","/tickets","/friends"].includes(path) || /^\/people\/[^/]+$/.test(path)) return "CUSTOMER_SCOPED";
  if (["/explore","/map"].includes(path)) return "ADMIN_PREVIEW";
  return "UNKNOWN";
}
const getRoutes = new Set(["blocked-accounts","financial-summary","organizer-subscription","event-operations","job-operations","operations","setup","me","events","people","tickets","notifications","clubs","profile","organizer","admin"]);
const postRoutes = new Set(["event-operations/request","event-operations/review","job-operations/run","job-operations/retry","job-operations/issuance","operations/refund-request","operations/refund-review","operations/support-request","operations/support-review","operations/preferences","operations/notice","entrance/preview","entrance/admit","staff-assignment","event-workspace","organizer-identity","event-draft","event-submit","event-review","payment-destination","payment-destination-review","payment-destination-action","verification-submit","verification-review","become-organizer","invitations","invitations/redeem","invitations/revoke","staff","security/account","event-state","booking/cancel","booking/expire","ticket/revoke","preview/login","admin/login","login","register","logout","demo","reset-request","reset-password","upload","activity","save","book","refund","review","checkin","profile","club","attendance-privacy","attendees","notifications","social","message","event","pause","verification","payout","promotion","report-event","deactivate","admin-action"]);
const moneyActions = new Set(["book","review","refund","payout","promotion"]);
const productionBlockedActions = new Set([...moneyActions,"operations/refund-request","operations/refund-review","entrance/admit","checkin","job-operations/issuance","payment-destination","payment-destination-review","payment-destination-action"]);
export function classifyApi(path: string, method: string): RouteClass {
  const get = method === "GET" || method === "HEAD";
  if (!["GET","HEAD","POST"].includes(method)) return "UNKNOWN";
  if (!(get ? getRoutes.has(path) || /^(organizers|entrance|entrance-export|ticket-export|events|people|ticket|receipt|media|payment-qr)\/[^/]+$/.test(path) : postRoutes.has(path))) return "UNKNOWN";
  if (["event-operations","event-operations/request","operations","operations/refund-review","operations/support-request","operations/preferences","operations/notice","notifications","staff-assignment","setup","event-workspace","organizer-identity","event-draft","event-submit","payment-destination","payment-destination-action","verification-submit","invitations","invitations/revoke","staff","event-state","booking/expire","ticket/revoke"].includes(path))return "ORGANIZER_SCOPED";
  if(["event-operations/review","job-operations","job-operations/run","job-operations/retry","job-operations/issuance","security/account","event-review","payment-destination-review","verification-review"].includes(path))return "ADMIN_PREVIEW";
  if (["me","preview/login","login","register","logout","admin/login","demo","reset-request","reset-password"].includes(path)) return "AUTHENTICATION";
  if (moneyActions.has(path)) return "TICKET_SALES";
  if (path.startsWith("entrance-export/") || path.startsWith("entrance/") || path === "organizer" || ["event","pause","verification","checkin"].includes(path) || path.startsWith("receipt/")) return "ORGANIZER_SCOPED";
  if (path === "admin" || path === "admin-action") return "ADMIN_PREVIEW";
  if (path.startsWith("events/")) return "EVENT_INVITATION";
  return "PRIVATE_API";
}
export function apiAccess(path: string, method: string, user: AccessUser, config: SiteConfig, localDemo: boolean) {
  const category = classifyApi(path,method);
  if (category === "UNKNOWN") return { allowed:false, status:404, error:"Not found." };
  if (process.env.NODE_ENV === "production" && method === "POST" && productionBlockedActions.has(path)) return {allowed:false,status:503,error:"Real payments, refunds, ticket sales and admission are not available. This release is for browsing and account setup."};
  if ((["admin/login","preview/login","reset-request","reset-password"].includes(path) && method === "POST") || path === "me" || (path === "logout" && method === "POST")) return {allowed:true};
  if (category === "TICKET_SALES") {
    if (!user) return {allowed:false,status:401,error:"Please sign in to continue."};
    if (!localDemo || config.siteMode !== "full_platform") return {allowed:false,status:503,error:"Ticket sales and payment actions are disabled during local development."};
  }
  return {allowed:true};
}
export function pageAccess(path: string, user: AccessUser, config: SiteConfig) {
  const category = classifyPage(path);
  if (category === "UNKNOWN") return "not_found" as const;
  if (["/admin/login","/organizer/login"].includes(path)) return "public" as const;
  if (path === "/admin" && !isAdmin(user)) return user ? "forbidden" as const : "login" as const;
  // Full-platform account creation/event ownership rules remain at the existing action layer.
  return "platform" as const;
}
// Raw client flags or credentials never grant access; persisted, identity-bound grants are validated in invitations.ts.
export function canAccessInvitation(_credential: unknown) { return false; }

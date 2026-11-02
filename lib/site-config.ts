import { databaseUrl } from "./database-url";
import { RELEASE_SCOPE } from "./release-scope";
export type SiteMode = "coming_soon" | "full_platform";
export type TicketSalesMode = "disabled" | "invite_only" | "approved_events";
export type Environment = Record<string, string | undefined>;
export type SiteConfig = ReturnType<typeof getSiteConfig>;
export function getSiteConfig(env: Environment = process.env) {
  const validSite = env.SITE_MODE === "coming_soon" || env.SITE_MODE === "full_platform";
  const validSales = ["disabled", "invite_only", "approved_events"].includes(env.TICKET_SALES_MODE || "");
  const requestedSiteMode: SiteMode = validSite ? env.SITE_MODE as SiteMode : "coming_soon";
  const requestedTicketSalesMode: TicketSalesMode = validSales ? env.TICKET_SALES_MODE as TicketSalesMode : "disabled";
  return {
    siteMode: RELEASE_SCOPE === "coming_soon" ? "coming_soon" as const : RELEASE_SCOPE === "public_demo" ? "full_platform" as const : requestedSiteMode,
    requestedSiteMode,
    requestedTicketSalesMode,
    // Enabled live-sales modes await the later release gate. No env flag unlocks real sales.
    ticketSalesMode: "disabled" as const,
    invalidSiteMode: !!env.SITE_MODE && !validSite,
    invalidTicketSalesMode: !!env.TICKET_SALES_MODE && !validSales,
    releasePinned: RELEASE_SCOPE === "coming_soon",
  };
}
export function isIsolatedDemoEnvironment(env: Environment = process.env) {
  return RELEASE_SCOPE === "development" && env.NODE_ENV !== "production" &&
    getSiteConfig(env).siteMode === "full_platform" && env.DEMO_MODE === "true" &&
    env.LOCAL_DEMO_BOOKING_ENABLED === "true" && env.ISOLATED_TEST_DATA === "true" &&
    databaseUrl(env)?.startsWith("file:") === true;
}
export function isLocalDemoRequest(origin: string, env: Environment = process.env) {
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && isIsolatedDemoEnvironment(env);
  } catch { return false; }
}
export function assertLocalDemoMutation() {
  if (!isIsolatedDemoEnvironment()) throw new Error("503:Ticket sales and payment actions are disabled during local development.");
}
export function configuredSocialLinks(env: Environment = process.env) {
  const candidates = [["Instagram",env.SOCIAL_INSTAGRAM_URL,"instagram.com"], ["TikTok",env.SOCIAL_TIKTOK_URL,"tiktok.com"]];
  return candidates.flatMap(([label,value,domain]) => {
    if (!value) return [];
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password || ![domain,`www.${domain}`].includes(url.hostname)) return [];
      return [{label: label!,url:url.toString()}];
    } catch { return []; }
  });
}

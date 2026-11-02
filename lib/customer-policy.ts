import { simulatorEvent } from "./simulator-policy";
import { isolatedTestData } from "./domain-core";
import { getSiteConfig } from "./site-config";
/** Pure release policy; production activation remains an independent release gate. */
export function salesModeAllows(
  mode: string,
  eventAccess: string,
  hasGrant: boolean,
) {
  return mode === "invite_only"
    ? eventAccess !== "PUBLIC" && hasGrant
    : mode === "approved_events"
      ? eventAccess === "PUBLIC" || hasGrant
      : false;
}
export function customerTestEnabled() {
  return (
    isolatedTestData() && process.env.LOCAL_CUSTOMER_TEST_ENABLED === "true"
  );
}
export function assertCustomerEnvironment() {
  if (!customerTestEnabled())
    throw Error(
      "503:Booking is not open yet. Real ticket sales remain disabled.",
    );
}
export function customerEventReady(e: any) {
  return (
    !!e &&
    e.origin === "REAL" &&
    e.testOnly &&
    e.status === "PUBLISHED" &&
    !e.salesPaused &&
    e.startsAt > new Date() &&
    e.configurationStatus === "FICTIONAL_APPROVED" &&
    e.reviewOutcome === "APPROVED" &&
    (simulatorEvent(e) ||
      e.organizer?.verification === "VERIFIED" ||
      (e.tiers?.length > 0 && e.tiers.every((t: any) => t.price === 0)))
  );
}
export const currentSalesStatus = () => ({
  enabled: false,
  mode: getSiteConfig().ticketSalesMode,
  testOnly: customerTestEnabled(),
});

export function assertEventSalesMode(access: string, grant: boolean) {
  const config = getSiteConfig();
  if (config.invalidTicketSalesMode)
    throw Error("503:Registration is unavailable.");
  if (
    config.requestedTicketSalesMode !== "disabled" &&
    !salesModeAllows(config.requestedTicketSalesMode, access, grant)
  )
    throw Error(
      "403:This sales mode does not permit registration for this event.",
    );
}

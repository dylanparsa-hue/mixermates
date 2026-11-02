/** Historical accounting decoder only. No application access, billing, renewal or UI uses this catalogue. */
export const organizerPlans = [
  {
    id: "STARTER",
    name: "Starter",
    price: 999,
    limit: 2,
    description: "Start small. Bring your first nights to life.",
  },
  {
    id: "PRO",
    name: "Pro",
    price: 4999,
    limit: 7,
    description: "Build your rhythm with a regular event lineup.",
  },
  {
    id: "BUSINESS",
    name: "Business",
    price: 9999,
    limit: 25,
    description: "Make room for a bigger calendar and more nights.",
  },
] as const;
export type OrganizerPlanId = (typeof organizerPlans)[number]["id"];
export function organizerPlan(id: string) {
  const plan = organizerPlans.find((p) => p.id === id);
  if (!plan) throw Error("400:Choose Starter, Pro or Business.");
  return plan;
}
export type OrganizerSubscriptionView = {
  plan: OrganizerPlanId;
  name: string;
  price: number;
  limit: number;
  used: number;
  active: boolean;
  status: string;
  periodStart: string;
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
  pendingPlan: OrganizerPlanId | null;
  simulated: true;
};
/** Anniversary in Malaysia time; short months clamp without losing the original day. */
export function subscriptionPeriod(anchor: Date, now: Date) {
  const offset = 8 * 3600000,
    start = new Date(+anchor + offset);
  const current = new Date(+now + offset);
  const boundary = (months: number) => {
    const year = start.getUTCFullYear(),
      month = start.getUTCMonth() + months;
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(
      Date.UTC(
        year,
        month,
        Math.min(start.getUTCDate(), last),
        start.getUTCHours(),
        start.getUTCMinutes(),
        start.getUTCSeconds(),
        start.getUTCMilliseconds(),
      ) - offset,
    );
  };
  let months = Math.max(
    0,
    (current.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      current.getUTCMonth() -
      start.getUTCMonth(),
  );
  if (months && boundary(months) > now) months--;
  return { start: boundary(months), end: boundary(months + 1) };
}

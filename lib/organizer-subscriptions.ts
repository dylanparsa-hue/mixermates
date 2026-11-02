/** Retired Phase 2. Historical tables are retained, never renewed or used as access gates. */
import { actor, type Tx } from "./domain-core";
import { db } from "./db";
export async function organizerSubscription(userId: string, _now = new Date()) {
  await actor(db, userId);
  return null;
}
export async function subscriptionViewInTx(
  tx: Tx,
  userId: string,
  _now = new Date(),
) {
  await actor(tx, userId);
  return null;
}
export async function activateFictionalSubscription(
  _userId: string,
  _plan: string,
  _now = new Date(),
): Promise<never> {
  throw Error(
    "410:Organizer subscriptions are retired. Create events for free with your existing account.",
  );
}
export async function cancelFictionalSubscription(
  _userId: string,
  _now = new Date(),
): Promise<never> {
  throw Error(
    "410:Subscriptions are retired. Historical charges require an authorized migration review.",
  );
}

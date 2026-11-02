import { testLabEnvironment, type LabEnvironment } from "./test-lab-guard";

export { TEST_EVENT_POLICY } from "./simulator-constants";
export const SIMULATOR_PROVIDER = "LOCAL_TEST_SIMULATOR";
export function simulatorEnvironment(
  env: LabEnvironment = process.env,
  cwd = process.cwd(),
) {
  return (
    env.MIXERMATES_PAYMENT_SIMULATOR === "enabled" &&
    testLabEnvironment(env, cwd) &&
    !Object.keys(env).some((k) =>
      /^(ADYEN_|BRAINTREE_|SQUARE_|RAZORPAY_|CHECKOUT_|IPAY88_|MOLPAY_|GATEWAY_)/i.test(
        k,
      ),
    )
  );
}
export function simulatorEvent(e: any) {
  return (
    simulatorEnvironment() &&
    e?.testOnly === true &&
    e.paymentMode === "TEST_SIMULATOR" &&
    e.configurationStatus === "FICTIONAL_APPROVED" &&
    e.origin === "REAL"
  );
}
/** Only a persisted server provider receipt can satisfy the simulator payment gate. */
export function simulatorPaymentConfirmed(b: any, e: any, p: any) {
  return (
    simulatorEvent(e) &&
    b.testOnly === true &&
    b.origin === "REAL" &&
    !b.recipientVersionId &&
    !b.recipientSnapshot &&
    !b.evidenceRequired &&
    p?.provider === SIMULATOR_PROVIDER &&
    p.origin === "REAL" &&
    p.amount === b.total &&
    p.confirmedAt &&
    p.workflowState === "CONFIRMED" &&
    b.paymentState === "CONFIRMED" &&
    p.simulationAttempts?.some(
      (a: any) =>
        a.paymentId === p.id &&
        a.kind === "PAYMENT" &&
        a.outcome === "SUCCESS" &&
        a.testOnly &&
        a.reference.startsWith("TEST-"),
    )
  );
}

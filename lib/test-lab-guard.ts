import path from "node:path";
import { databaseUrl } from "./database-url";
import { RELEASE_SCOPE } from "./release-scope";
export type LabEnvironment = Record<string, string | undefined>;
const loopback = (v: string) => ["localhost", "127.0.0.1", "[::1]"].includes(v);
/** This policy is deliberately stricter than the legacy isolated-data helpers. */
export function testLabEnvironment(
  env: LabEnvironment = process.env,
  cwd = process.cwd(),
) {
  if (
    RELEASE_SCOPE !== "development" ||
    env.NODE_ENV !== "development" ||
    env.MIXERMATES_TEST_LAB !== "enabled" ||
    env.ISOLATED_TEST_DATA !== "true" ||
    env.LOCAL_CUSTOMER_TEST_ENABLED !== "true" ||
    env.TICKET_SALES_MODE !== "disabled" ||
    env.SITE_MODE !== "coming_soon" ||
    env.DEMO_MODE !== "false" ||
    env.LOCAL_DEMO_BOOKING_ENABLED !== "false" ||
    env.HOSTINGER_DATABASE_BOOTSTRAP !== "false" ||
    env.HOSTINGER_SEED_DEMO !== "false"
  )
    return false;
  // Portable disposable directory identity; marker, DB containment and request guards still apply.
  if (path.resolve(cwd) !== cwd || path.basename(cwd) !== "preview" ||
      !/^mixermates-(?:correction-\d{8}(?:-phase[23])?|local-[a-zA-Z0-9_-]+)$/.test(path.basename(path.dirname(cwd)))) return false;
  if (
    Object.keys(env).some(
      (k) =>
        k.startsWith("DB_") ||
        /^(SMTP_|SENDGRID_|RESEND_|TWILIO_|STRIPE_|PAYPAL_|MAILGUN_|AWS_|TRANSACTIONAL_|PAYMENT_|BANK_|DUITNOW_|TOUCH_N_GO_|SMS_|MAIL_|EMAIL_PROVIDER)/.test(
          k,
        ),
    )
  )
    return false;
  if (databaseUrl(env) !== "file:" + path.join(cwd, "prisma/audit.db"))
    return false;
  try {
    const url = new URL(env.APP_ORIGIN || "");
    return (
      url.protocol === "http:" &&
      loopback(url.hostname) &&
      !!url.port &&
      !url.username &&
      !url.password &&
      url.pathname === "/"
    );
  } catch {
    return false;
  }
}
export function testLabRequest(
  request: Request,
  env: LabEnvironment = process.env,
  cwd = process.cwd(),
) {
  if (!testLabEnvironment(env, cwd)) return false;
  try {
    const url = new URL(request.url),
      app = new URL(env.APP_ORIGIN!);
    if (
      !loopback(url.hostname) ||
      url.port !== app.port ||
      url.protocol !== "http:"
    )
      return false;
    if (
      ![app.host, "127.0.0.1:" + app.port].includes(
        request.headers.get("host") || url.host,
      )
    )
      return false;
    if (
      request.headers.has("forwarded") ||
      (request.headers.has("x-forwarded-host") &&
        request.headers.get("x-forwarded-host") !== url.host)
    )
      return false;
    if (
      request.headers.has("x-forwarded-for") &&
      !loopback(request.headers.get("x-forwarded-for")!)
    )
      return false;
    if (
      request.method !== "GET" &&
      request.method !== "HEAD" &&
      request.headers.get("origin") !== app.origin
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

export async function register() {
  const { RELEASE_SCOPE } = await import("./lib/release-scope");
  if (RELEASE_SCOPE === "public_demo" && process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { validatePublicRelease } = await import("./scripts/validate-public-release-env.mjs");
    validatePublicRelease();
  }
  const { getSiteConfig } = await import("./lib/site-config");
  const config = getSiteConfig();
  if (config.invalidSiteMode || config.invalidTicketSalesMode) console.warn("Invalid MixerMates mode configuration; safe defaults are active.");
  if (config.requestedTicketSalesMode !== "disabled") console.warn("MixerMates ticket sales remain locked until launch acceptance.");
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.SITE_MODE === "full_platform" &&
    process.env.HOSTINGER_DATABASE_BOOTSTRAP === "true" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { initializeHostedDatabase } =
      await import("./lib/hostinger-bootstrap");
    await initializeHostedDatabase();
  }
}

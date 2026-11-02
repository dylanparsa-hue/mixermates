// Legacy coming_soon scope is retained for old artifacts; its holding screen is retired.
// Changing this source cannot publish anything; deployments require owner approval.
export const RELEASE_SCOPE: "development" | "coming_soon" | "public_demo" = "development";

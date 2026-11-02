import { getSiteConfig } from "@/lib/site-config";
import { ThemeProvider } from "@/components/theme";
import { themeInitScript } from "@/lib/theme-init";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import localFont from "next/font/local";
const bodyFont = localFont({
  src: "../public/fonts/manrope.ttf",
  variable: "--font-body",
  display: "swap",
  weight: "200 800",
});
const campaignFont = localFont({
  src: "../public/fonts/archivo.ttf",
  variable: "--font-campaign",
  display: "swap",
  weight: "100 900",
});
const displayFont = localFont({
  src: "../public/fonts/oxanium.ttf",
  variable: "--font-heading",
  display: "swap",
  weight: "200 800",
});
export function generateMetadata(): Metadata {
  const coming = getSiteConfig().siteMode === "coming_soon";
  return {
    metadataBase: new URL("https://mixermates.com"),
    title: coming
      ? "MixerMates — Coming Soon"
      : "MixerMates — Find Your Vibe. Find Your People.",
    description:
      "Discover nightlife, music events and new connections with MixerMates.",
    robots: { index: false, follow: false },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/branding/processed/mixermates-icon-32.png",
      apple: "/branding/processed/mixermates-icon-180.png",
    },
    openGraph: {
      title: coming
        ? "MixerMates — Coming Soon"
        : "MixerMates — Find Your Vibe. Find Your People.",
      description: "Discover your next night and the people who make it.",
      siteName: "MixerMates",
      url: "https://mixermates.com",
      images: [
        {
          url: "/branding/processed/mixermates-social.png",
          width: 1280,
          height: 640,
          alt: "MixerMates",
        },
      ],
    },
  };
}
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090B18" },
    { media: "(prefers-color-scheme: light)", color: "#FAFAFF" },
  ],
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const LabBar =
    process.env.NODE_ENV === "development" &&
    process.env.MIXERMATES_TEST_LAB === "enabled"
      ? require("@/components/test-lab-bar").TestLabBar
      : null;
  let initialLab = null;
  if (LabBar) {
    try {
      const { labContext, labRoles } = await import("@/lib/test-lab");
      const { headers } = await import("next/headers");
      const context = await labContext(
        new Request(process.env.APP_ORIGIN! + "/test-lab", {
          headers: await headers(),
        }),
      );
      initialLab = {
        role: context.role,
        roles: labRoles,
        identity: context.user
          ? { name: context.user.name, role: context.user.role }
          : null,
      };
    } catch {
      /* No controller or failed local guard: render no Lab chrome. */
    }
  }
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${bodyFont.variable} ${displayFont.variable} ${campaignFont.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          {LabBar && <LabBar initial={initialLab} />}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

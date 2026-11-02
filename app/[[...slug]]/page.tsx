import { publicOrganizerProfile } from "@/lib/organizer-public-profile";
import { PlatformClient as Vibey } from "@/components/platform-client";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { currentUser } from "@/lib/auth";
import { pageAccess, classifyPage } from "@/lib/access-policy";
import { getSiteConfig } from "@/lib/site-config";
import { db } from "@/lib/db";
import { canAccessEvent } from "@/lib/event-access";
import { PreviewShell } from "@/components/preview-shell";
export const dynamicParams = true;
export const revalidate = 0;
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug = [] } = await params;
  const path = "/" + slug.join("/");
  const localCandidate =
    process.env.NODE_ENV === "development" &&
    process.env.MIXERMATES_TEST_LAB === "enabled";
  const lab = localCandidate &&
    (await (await import("@/lib/test-lab")).localLabAccess());
  // Bootstrap a fictional session automatically, only in the verified disposable Lab.
  // Cookies are written in a route handler, never while rendering a server component.
  let verifiedLocal = false;
  if (localCandidate && !lab) {
    try {
      await (await import("@/lib/test-lab")).assertLabEnvironment(
        new Request(process.env.APP_ORIGIN! + path, { headers: await headers() }),
      );
      verifiedLocal = true;
    } catch {
      /* Non-Lab environments retain the existing release policy. */
    }
    if (verifiedLocal && (path === "/test-lab" || classifyPage(path) !== "UNKNOWN")) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(await searchParams)) {
        if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
        else if (value !== undefined) query.set(key, value);
      }
      const next = (path === "/" ? "/explore" : path) + (query.size ? "?" + query : "");
      redirect("/api/test-lab/enter?next=" + encodeURIComponent(next));
    }
  }
  if (path === "/test-lab" && localCandidate) {
    if (!lab) notFound();
    const { TestLab } = await import("@/components/test-lab");
    return <TestLab />;
  }
  const user = await currentUser();
  const decision = pageAccess(
    path,
    user,
    lab ? { ...getSiteConfig(), siteMode: "full_platform" } : getSiteConfig(),
  );
  if (decision === "not_found" || decision === "forbidden") notFound();
  if (decision === "coming_soon") {
    redirect("/coming-soon");
  }
  if (decision === "login") redirect("/admin/login");
  if(path.startsWith("/organizers/")) {
    if(!await publicOrganizerProfile(slug[1],user))notFound();
  }
  if (path.startsWith("/events/") && classifyPage(path) === "EVENT_INVITATION") {
    const event = await db.event.findFirst({
      where: { OR: [{ id: slug[1] }, { slug: slug[1] }] },
      select: { id: true, organizerId: true, access: true, status: true },
    });
    if (!event || !(await canAccessEvent(event, user))) notFound();
  }
  if (decision === "admin_preview" || decision === "organizer_preview") {
    return (
      <PreviewShell userId={user!.id} role={user!.role}>
        <Vibey restrictedOrganizer={decision === "organizer_preview"} />
      </PreviewShell>
    );
  }
  return <Vibey />;
}

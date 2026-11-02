import { db } from "./db";
import { isAdmin, type AccessUser } from "./access-policy";
import { eligibility } from "./booking-domain";
import { publiclyListed } from "./public-catalogue";
export async function canAccessEvent(
  event: { id: string; organizerId: string; access: string; status: string },
  user: AccessUser,
) {
  if (user?.active === false) return false;
  if (isAdmin(user) || user?.id === event.organizerId) return true;
  if (
    user &&
    (await db.eventStaff.findFirst({
      where: {
        eventId: event.id,
        userId: user.id,
        active: true,
        OR: [
          { canViewGuests: true },
          { canCheckIn: true },
          { canReviewPayments: true },
          { canApproveRegistrations: true },
        ],
      },
    }))
  )
    return true;
  if (event.status !== "PUBLISHED") return false;
  if (event.access === "PUBLIC" && !(await publiclyListed(event.id)))
    return false;
  if (event.access === "PUBLIC") return true;
  if (!user) return false;
  if (
    await db.invitationGrant.findFirst({
      where: {
        eventId: event.id,
        userId: user.id,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
        invitation: {
          status: "ACTIVE",
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      },
    })
  )
    return true;
  return !!(await db.booking.findFirst({
    where: {
      eventId: event.id,
      userId: user.id,
      lifecycle: "CONFIRMED",
      registrationState: { in: ["APPROVED", "NOT_REQUIRED"] },
    },
  }));
}
export async function canSeePrivateLocation(
  event: { id: string; organizerId: string; access: string; status: string },
  user: AccessUser,
) {
  if (!user || user.active === false) return false;
  if (isAdmin(user) || user.id === event.organizerId) return true;
  if (
    await db.eventStaff.findFirst({
      where: {
        eventId: event.id,
        userId: user.id,
        active: true,
        canViewLocation: true,
      },
    })
  )
    return true;
  const b = await db.booking.findFirst({
    where: { eventId: event.id, userId: user.id, lifecycle: "CONFIRMED" },
    include: {
      user: true,
      event: true,
      recipientVersion: true,
      payment: {
        include: { reviews: true, evidence: true, simulationAttempts: true },
      },
    },
  });
  return (
    !!b && eligibility(b, b.event, b.payment, { admission: true }).eligible
  );
}

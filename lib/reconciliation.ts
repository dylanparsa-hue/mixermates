import { Prisma } from "@prisma/client";
import { db } from "./db";
import { eventPermission, audit } from "./domain-core";
import { listPage } from "./guest-list";
export function csvRow(row: unknown[]) {
  return (
    row
      .map((value) => {
        const s = String(value ?? "");
        return (
          '"' +
          (/^[\s\u0000-\u001f]*[=+@-]/.test(s) ? "'" : "") +
          s.replaceAll('"', '""') +
          '"'
        );
      })
      .join(",") + "\r\n"
  );
}
export function financialFilter(
  eventId: string,
  filter: string,
): Prisma.BookingWhereInput {
  const base: Prisma.BookingWhereInput = {
    eventId,
    origin: "REAL",
    paymentRequired: true,
  };
  const confirmed = {
    payment: {
      confirmedAt: { not: null },
      reviews: { some: { decision: "CONFIRMED", fundsVerified: true } },
    },
  };
  const filters: Record<string, Prisma.BookingWhereInput> = {
    PENDING_EVIDENCE: { paymentState: "PROOF_SUBMITTED" },
    UNDER_REVIEW: { paymentState: "UNDER_REVIEW" },
    REJECTED: { paymentState: "REJECTED" },
    AWAITING_APPROVAL: {
      ...confirmed,
      registrationState: "PENDING",
      lifecycle: { in: ["RESERVED", "PENDING"] },
    },
    ISSUANCE_RECOVERY: {
      ...confirmed,
      registrationState: { in: ["APPROVED", "NOT_REQUIRED"] },
      lifecycle: { in: ["RESERVED", "PENDING"] },
      tickets: { none: {} },
    },
    REFUNDS: {
      OR: [
        { paymentState: "REFUND_PENDING" },
        {
          payment: {
            refunds: {
              some: {
                status: {
                  in: [
                    "REQUESTED",
                    "UNDER_REVIEW",
                    "APPROVED",
                    "AWAITING_ORGANIZER_TRANSFER",
                    "TRANSFER_REPORTED",
                  ],
                },
              },
            },
          },
        },
      ],
    },
    CANCELLED_FUNDS: {
      ...confirmed,
      lifecycle: "CANCELLED",
      paymentState: { not: "REFUNDED" },
    },
    NEEDS_REVIEW: {
      payment: { evidence: { some: { riskIndicators: { not: "[]" } } } },
    },
    DISPUTED: {
      OR: [
        { paymentState: "DISPUTED" },
        { payment: { refunds: { some: { status: "DISPUTED" } } } },
      ],
    },
  };
  return { ...base, ...filters[filter] };
}
async function reviewWhere(eventId: string, filter: string) {
  const base = financialFilter(eventId, filter);
  if (filter !== "DISPUTED") return base;
  const reports = await db.report.findMany({
    where: {
      eventId,
      bookingId: { not: null },
      category: "PAYMENT",
      status: { in: ["OPEN", "UNDER_REVIEW"] },
    },
    select: { bookingId: true },
    distinct: ["bookingId"],
  });
  return {
    ...base,
    OR: [
      ...((base.OR || []) as Prisma.BookingWhereInput[]),
      { id: { in: reports.map((r) => r.bookingId!) } },
    ],
  };
}
const select = {
  id: true,
  user: { select: { name: true } },
  tier: { select: { name: true } },
  total: true,
  lifecycle: true,
  paymentState: true,
  registrationState: true,
  recipientVersionId: true,
  recipientSnapshot: true,
  createdAt: true,
  payment: {
    select: {
      confirmedAt: true,
      evidence: {
        select: { id: true, status: true, riskIndicators: true },
        take: 1,
        orderBy: { createdAt: "desc" as const },
      },
      reviews: {
        where: { decision: "CONFIRMED", fundsVerified: true },
        orderBy: { createdAt: "asc" as const },
        take: 1,
        select: {
          reviewer: { select: { name: true } },
          receivedAmount: true,
          createdAt: true,
        },
      },
      refunds: { select: { status: true, amount: true } },
    },
  },
} as const;
function record(b: any) {
  return {
    id: b.id,
    customer: b.user.name,
    tier: b.tier.name,
    expected: b.total,
    paymentState: b.paymentState,
    registration: b.registrationState,
    lifecycle: b.lifecycle,
    recipientVersionId: b.recipientVersionId,
    recipient:
      JSON.parse(b.recipientSnapshot || "{}").recipientName || "Unavailable",
    confirmedAt: b.payment?.confirmedAt || null,
    reviewer: b.payment?.reviews[0]?.reviewer.name || null,
    evidence: b.payment?.evidence[0]?.status || "NONE",
    refunds: b.payment?.refunds || [],
  };
}
export async function reconciliation(
  userId: string,
  eventId: string,
  raw: Record<string, unknown> = {},
) {
  await eventPermission(db, userId, eventId, "payments");
  const where = await reviewWhere(eventId, String(raw.filter || "ALL"));
  const total = await db.booking.count({ where }),
    pages = Math.max(1, Math.ceil(total / 50)),
    page = Math.min(listPage(raw.page), pages);
  const base: Prisma.BookingWhereInput = {
    eventId,
    origin: "REAL",
    paymentRequired: true,
  };
  const [groups, confirmed, refunds, rows, outstanding, concerns] =
    await Promise.all([
      db.booking.groupBy({
        by: ["paymentState"],
        where: base,
        _count: true,
        _sum: { total: true },
      }),
      db.payment.aggregate({
        where: {
          booking: base,
          confirmedAt: { not: null },
          reviews: { some: { decision: "CONFIRMED", fundsVerified: true } },
        },
        _sum: { amount: true },
        _count: true,
      }),
      db.refund.groupBy({
        by: ["status"],
        where: { payment: { booking: base } },
        _sum: { amount: true },
        _count: true,
      }),
      db.booking.findMany({
        where,
        select,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * 50,
        take: 50,
      }),
      db.booking.aggregate({
        where: {
          ...base,
          lifecycle: { in: ["RESERVED", "PENDING"] },
          paymentState: {
            in: [
              "AWAITING_PAYMENT",
              "PROOF_SUBMITTED",
              "UNDER_REVIEW",
              "REJECTED",
            ],
          },
        },
        _sum: { total: true },
      }),
      db.booking.aggregate({
        where: await reviewWhere(eventId, "DISPUTED"),
        _sum: { total: true },
      }),
    ]);
  const sum = (states: string[]) =>
    groups
      .filter((g) => states.includes(g.paymentState))
      .reduce((n, g) => n + (g._sum.total || 0), 0);
  return {
    total,
    page,
    pages,
    pageSize: 50,
    rows: rows.map(record),
    summary: {
      expected: sum(groups.map((g) => g.paymentState)),
      evidenceSubmitted: sum(["PROOF_SUBMITTED"]),
      underReview: sum(["UNDER_REVIEW"]),
      organizerReceived: confirmed._sum.amount || 0,
      rejected: sum(["REJECTED"]),
      outstanding: outstanding._sum.total || 0,
      disputed: concerns._sum.total || 0,
      pendingRefundObligations: sum(["REFUND_PENDING"]),
      reportedRefunds: refunds
        .filter((r) => r.status === "TRANSFER_REPORTED")
        .reduce((n, r) => n + (r._sum.amount || 0), 0),
      refunds: refunds.map((r) => ({
        status: r.status,
        amount: r._sum.amount || 0,
        count: r._count,
      })),
    },
    notice:
      "Organizer-received money is not MixerMates revenue. Review states may overlap with refund obligations; no bank settlement is inferred.",
  };
}
export async function financialExport(
  userId: string,
  eventId: string,
  filter = "ALL",
) {
  await eventPermission(db, userId, eventId, "payments");
  await audit(db, userId, "FINANCIAL_REVIEW_EXPORTED", eventId, {
    eventId,
    entityType: "EVENT",
    reasonCode: filter.slice(0, 100),
  });
  let cursor: string | undefined,
    header = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        await eventPermission(db, userId, eventId, "payments");
        if (!header) {
          controller.enqueue(
            new TextEncoder().encode(
              csvRow([
                "Booking reference",
                "Ticket tier",
                "Expected MYR sen",
                "Payment state",
                "Registration state",
                "Booking state",
                "Recipient version",
                "Independently confirmed at",
                "Refund states",
              ]),
            ),
          );
          header = true;
          return;
        }
        const rows = await db.booking.findMany({
          where: await reviewWhere(eventId, filter),
          orderBy: { id: "asc" },
          take: 200,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select,
        });
        if (!rows.length) {
          controller.close();
          return;
        }
        cursor = rows[rows.length - 1].id;
        controller.enqueue(
          new TextEncoder().encode(
            rows
              .map(record)
              .map((b) =>
                csvRow([
                  b.id,
                  b.tier,
                  b.expected,
                  b.paymentState,
                  b.registration,
                  b.lifecycle,
                  b.recipientVersionId,
                  b.confirmedAt?.toISOString() || "",
                  b.refunds.map((r: any) => r.status).join("; "),
                ]),
              )
              .join(""),
          ),
        );
      } catch (e) {
        controller.error(e);
      }
    },
  });
}

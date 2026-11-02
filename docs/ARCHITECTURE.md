# Architecture and implementation boundaries

## Structure

- `app/[[...slug]]/page.tsx`: App Router entry for the local consumer experience.
- `components/vibey.tsx`: navigation, session state, notifications, account switching and route composition.
- `components/shared.tsx`: consistent controls, modal focus trap, event cards, design helpers and formatting.
- Feature modules: exploration, event/booking, tickets, map, profiles, friends, event creation, organizer and admin.
- `app/api/[...path]/route.ts`: server API boundary. Every private read and mutation authenticates and authorizes on the server; UI hiding is never the permission check.
- `lib/services.ts`: transactional booking, review, check-in and refunds, independent of React.
- `lib/rules.ts`: deterministic age, fee and public-profile projection rules.
- `lib/auth.ts`: cryptographically random sessions with hashed database tokens and HTTP-only cookies.
- `prisma/schema.prisma`: relational source of truth. Profile, privacy and interests are colocated on User for this local milestone; registration answers use bounded private JSON on Booking. These can be normalized as the platform grows without changing the public API.

## Critical invariants

Money uses integer sen and server-side tier prices. `PLATFORM_FEE_BPS` snapshots a fee per simulated payment. Stock is reserved atomically at successful demo submission, including pending invitations. Failed payments never reserve stock. Rejections and eligible refunds release it exactly once. Event details/tier definitions are locked once any bookings exist, with the check and edits in one transaction. A booking idempotency key is unique.

Tickets are only created for approved, paid/eligible bookings. Each QR is a 256-bit random token, contains no personal information, and must be validated online. Attendee QR access is restricted to the booking owner. Authorized organizers/assigned staff can see entry tokens for their own event’s door operation. Ticket status changes use a conditional update; the check-in table has a unique ticket constraint. Check-in also records staff, timestamp, audit and verified attendance in the same transaction.

Verified attendance has a unique user/event constraint, even for multi-ticket orders. Only check-in creates it; it is never inferred from a purchase. Badges use those counts. Manual organizer code entry uses the same protected check-in path as camera scanning. ID checks must be affirmed before entry, including the camera path. DOB is an eligibility input, not identity/age proof.

Booking, payment, ticket and attendance records survive browser refresh and server restart. There are no localStorage records pretending to be the database.

## Privacy and authorization

Public serializers whitelist user profile fields and omit DOB, email, password hash and account internals. Event responses remove `privateVenue`; an approved owner booking or event ownership is required to reveal it. Map coordinates for seeded private events are approximate. Organizers must enter approximate public coordinates when creating their own private event.

Attendance and profile discovery are private by default. Event consent is independent and revocable. Public profile memories require account-level public preference AND event-level explicit consent. Event attendee discovery additionally requires the viewer to have verified attendance. Minor accounts cannot appear in adult discovery, create events or use the demo social/messaging system. This is intentionally stricter than allowing adult/minor contact.

Messages require accepted friendship, conversation membership, adult accounts, active accounts and no block in either direction. Staff may check in only assigned events; staff API responses omit private answers/receipts, guest emails and revenue. CSV exports are available only to owners. CSV formulas are neutralized.

Receipt files live outside `public/` under unpredictable filenames. An ownership record prevents attaching someone else’s receipt to a booking. The receipt read endpoint checks owner/organizer access. Public photo/artwork uploads are explicitly public. File content is limited to PNG/JPEG magic bytes and 4 MB, and the server returns `nosniff`. Before production, re-encode images and move both public and private files into durable managed object storage with scanning, quotas and lifecycle deletion.

## Demo-only integrations

- Payments have no network provider, card fields, host QR, bank account or real-money transaction. Touch ’n Go is a labeled simulated option.
- Payout requests group unsettled approved demo payments and snapshot the net amount. Admin approval changes the simulated status; no actual transfer occurs. Duplicate claims are guarded transactionally. Payments assigned to settlement cannot be refunded in this demo.
- Password recovery exposes a token directly in the recovery form only in development demo mode; production never returns that token. A real email delivery service and anti-abuse controls are required before launch.
- MapLibre/OpenFreeMap requires an internet connection but no paid API key. Event locations and list navigation remain local/database-backed.
- Notification records and preferences work; no email/push scheduler is connected. Optional social notifications are respected. No unsolicited promotional messages are sent.
- Analytics count stored views, reservations, check-ins, promotion impressions and clicks. Activity writes are briefly rate-limited to avoid refresh spam. These are operational demo counts, not advertising-grade unique reach or attribution guarantees.

## Next engineering work

Use a separate production PostgreSQL database with provider-specific migrations, concurrent-load tests and constraints for social pair identities. Introduce a proper job queue/outbox for delivery, session cleanup, reminders and reservation expiration. Current pending invitations reserve stock until review; production needs a clear expiry policy.

Add distributed rate limiting and request/upload quotas, full observability, retention/deletion policy and backups. Replace dev account seeding/admin bootstrapping with restricted operational provisioning. Review dependency advisories, CSP, deployment headers, malware scanning and privacy obligations before handling real user data.

Complete full event cancellation/request handling, receipt/registration data retention workflows, invitation tokens, sale scheduling UI and richer permissions/staff management. Current event creation supports basic professional themes and a bounded question builder; it is not a drag-and-drop builder. Multi-choice answers/file questions beyond the Halloween sample receipt are not implemented.

Validate real age-verification, organizer identity and Malaysian payment/merchant/settlement/refund requirements with appropriate providers and professional review before accepting money. The app implements no escrow, holding of funds or real payout promises.

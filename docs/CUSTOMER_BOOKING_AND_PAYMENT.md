# Customer booking and independent payment review

This is a local fictional rehearsal. Public Coming Soon and real-sales lock remain active. No actual money, real attendee identity or actual Halloween admission is certified.

## Customer

Open the account-bound event link and sign in as the named account. The invitation token is removed from the address bar and redeemed server-side. Private invitations require an existing account; adult registration is available only for an approved public event in the isolated test environment. Saved booking and My bookings links retain their login destination.

Select a tier, quantity and configured entry option. Complete the organizer's active required fields. The server validates age, choices, file ownership, availability, sale window and exact integer-sen price; a browser total cannot override it. Review and submit once. Refreshing retains the booking rather than creating another order.

The payment panel shows the booking's approved immutable organizer recipient and QR. Save/import it in a supported wallet or use another screen; wallet import support is not guaranteed by MixerMates. Copy the booking reference. Never transfer to a substituted destination. In the fictional rehearsal do not transfer money.

Upload a genuine PNG/JPG/WebP receipt privately (maximum 10,000,000 bytes). Receipt submission means pending review, not confirmed funds or admission. Corrections retain prior submissions. Uploaded-on-time proof holds inventory for manual review; it does not expire automatically with the short pre-proof deadline. A rejected receipt may be corrected while the held booking remains eligible. Releasing a review hold requires an explicit cancellation/decision, with refund handling where relevant.

Payment, registration and BYOB states are separate. A ticket appears only when all applicable gates pass. If funds were confirmed but issuance is delayed, do not pay again: the reviewer can retry the existing issuer. My bookings shows private history and in-app updates. No delivery email/SMS integration is claimed.

The private ticket contains the holder's submitted IC-name field, event details and admission credential. Keep it private. The safe share preview removes the credential, holder, booking reference, exact venue and private event artwork. Downloads are standalone SVG images; screenshots and downloaded credentials are not an independent validity authority. Server status controls admission. Used/revoked/cancelled tickets do not permit another entry.

## Organizer / administrator

Use the protected Booking reviews tab and select an event you are permitted to manage. Review the customer's private answers and evidence. A scanner can view guest/admission scope; it cannot inspect receipts or confirm money. The event owner/admin can generate an account-bound invitation for an existing username; delivery is manual and no external message is sent automatically.

For funds, independently inspect the organizer's actual incoming transaction record, match amount, booking reference and the exact recipient version, enter notes and explicitly attest the independent check. A plausible screenshot alone is insufficient. Record confirmed, rejected or under-review through the existing payment service. Confirmation is committed before ticket issuance. In the isolated fixture the attestation is a clearly labeled software rehearsal, never a claim of real settlement.

Review registration separately, record meaningful notes, and approve or reject. Review BYOB evidence separately when configured; it does not confirm money. The shared issuer checks all gates transactionally and reuses any existing tickets. A failed issuance leaves funds confirmed and offers retry. Counts distinguish submitted proof, confirmed money, registration, issued tickets, check-in and available stock. Confirmed organizer funds are not platform revenue.

## Door and expiry

Assign a dedicated active scanner through the existing staff service. Confirm the ticket/event and identity under the owner's approved procedure; QR and manual code use the same check-in service. Exactly one successful admission and attendance record can be committed. Wrong-event, revoked and duplicate attempts are rejected. Physical camera permissions, scanning conditions, ID handling and poor connectivity require real-device rehearsal before an event.

Pre-proof holds default to 60 minutes locally, configurable from 15 to 1440 minutes and capped at event start. This is not yet an approved real business policy. `scripts/expire-reservations.mjs` calls the existing transactional expiry service, processes at most 200 due holds, and excludes submitted-proof holds and confirmed money. Hostinger server cron, an active admin actor and logs must be configured after deployment approval; no browser timer performs cleanup. See the deployment plan. Review-held stock requires timely human review, including after the event.

## Development locations

Preview: `http://localhost:3001`; isolated data under `/Users/parsa/.codex/tmp/mixermates-phase4-20261020/workspace`. Private fixture links stay in its `.local` directory. Regression and build copies are siblings and have their own connection settings. Never run the updated client against the original project `prisma/dev.db`. Do not copy local `.env`, database, credentials, fixtures or receipt images into hosting.

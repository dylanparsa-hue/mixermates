# Current simplified owner entry — 28 October 2026

Open **http://localhost:3091/explore**. A verified local visitor without a controller session is sent to the compact sign-in; after one access-code entry, the normal website opens. The private code remains in `/Users/parsa/.codex/tmp/mixermates-correction-20261028/preview/.local/test-lab-access.json`.

Use Customer / Organizer / Admin in **Workspace**. Organizer now uses the same Alex Test identity and its optional capability. **Review tools** selects independent fictional payment/registration reviewers or entrance staff, and provides the properly account-bound private TEST invitation. It shows the actual acting name; no repeated password is needed. The old developer checklist remains under Developer tools and is optional. Alex's TEST organizer access is already activated from QA. No real subscriptions, payments or entry exist.

The seven new scenarios and exact normal testing instructions are in `CRITICAL_UI_FIXES_REPORT.md`. Previous guide entries below describe earlier previews and the retained developer infrastructure.

# Current premium preview — 28 October 2026

Use **http://localhost:3091/test-lab** in the separate `/Users/parsa/.codex/tmp/mixermates-correction-20261028/preview` workspace. The private entry code is in `.local/test-lab-access.json` there. Sign in once, then choose the server-backed Customer, Organizer, Administrator, Finance Reviewer, Entrance Staff or Community Friend. All existing workflow/security guidance below still applies; prior3081 paths describe the preserved earlier UI.

The approved fictional **TEST · After Hours Studio** includes an active TEST ticket and a separate pending payment example. **TEST · Door & Cancellation Rehearsal** is intentionally cancelled after check-in/duplicate/cancellation QA. These are examples only; create a fresh fictional event to rehearse independently. No real event, payment or admission is authorized.

# MixerMates local Test Lab guide

Open **http://localhost:3081/test-lab**. The preview uses a fresh fictional database in `/Users/parsa/.codex/tmp/mixermates-correction-20261027/preview`, separate from the rejected preview and canonical application database.

## Enter once

Open the private local file `/Users/parsa/.codex/tmp/mixermates-correction-20261027/preview/.local/test-lab-access.json`. Copy its `accessCode` into “Local access code”. Do not send the code in chat or upload the file. The adjacent `TEST-LAB-ACCESS.txt` explains access. There is no hard-coded administrator password.

After entry, use **Testing as** at the top of every page. It changes the actual fictional server session. It does not ask for another password. Each role has its own name, permissions and local notifications. “End lab session” signs out the controller and active persona. Sessions also expire; entering again is normal after expiry.

A fresh unapproved **Owner Fresh Night Rehearsal** draft is available with two 20-seat tiers and original rooftop artwork; creation, full mobile builder edits and reload persistence were checked. You may submit that draft or create your own. Earlier completed/cancelled/refunded scenarios remain in the selector.

## First rehearsal

1. Switch to **Organizer**. Open “Create a fresh fictional event”, edit the future Kuala Lumpur dates/name/venue/artwork/capacity/price and save a draft. The quick form supplies one tier and a required ID-name question. Use **Open full event builder** for more tiers, images and registration rules.
2. Choose **Submit for review**. Switch to **Administrator**, inspect the submitted event and choose **Approve fictional event**. Drafts never approve themselves.
3. Switch to **Customer** and choose **Book a TEST ticket**. Select a tier/quantity, enter the fictional name and submit the registration. The ordinary event page also directs approved lab scenarios to this customer flow.
4. On the booking page, read the fictional recipient and TEST warning. **Do not use a banking app or transfer money.** Upload a fictional PNG/JPG/WebP, or return to the Lab and choose **Submit sample TEST receipt**. Payment stays unconfirmed and no ticket is issued yet.
5. Switch to **Finance Reviewer**. Open the payment review queue if you want to inspect evidence and amounts. Check the explicit fictional-funds acknowledgement and choose **Confirm TEST funds received**.
6. Switch to **Organizer** and **Approve registration**. This final eligible check issues the TEST ticket. Customer self-approval remains forbidden.
7. Switch to **Customer**. Open **My bookings & TEST tickets**, then the ticket and **Full-screen QR**. This is the actual private admission QR, clearly labelled TEST. Sharing/export privacy behavior remains in the normal ticket UI.
8. Switch to **Entrance Staff**. Use **Validate TEST ticket**, acknowledge the required fictional ID check and admit. Try again: duplicate admission is rejected. **Open entrance scanner** provides the full camera/manual workflow; a physical phone camera still needs a real device rehearsal.
9. Return to **Customer → Profile & Event Passport**. Attendance, rather than a purchase alone, creates the Passport entry.

## Other scenarios

- **Refunds:** use a fresh paid booking before check-in. Customer requests; Finance Reviewer approves, advances to awaiting transfer and records a fictional transfer report; Customer explicitly acknowledges it. These are records, not bank transfers. Used tickets can be ineligible for refunds under the existing rules.
- **Rescheduling:** before attendance, Organizer requests a one-day move; Administrator inspects it in Event operations and approves/rejects. Customer sees a local update and the booking retains original terms. The full event-operations screen offers other reviewed changes.
- **Cancellation:** Organizer opens **Cancellation & event controls**, finds the event, expands **Cancel event**, reads its booking/ticket/payment impact and confirms. This pauses sales, cancels eligible bookings, revokes unused tickets and creates local updates/refund obligations where applicable.
- **Signup/login/recovery:** “Test account creation” opens the real customer signup form. Use a fictional @example.test email. It creates an ordinary customer. Sign out the current persona and use “Test customer login”. Forgot-password recovery writes only to the local mailbox; “Open local recovery mailbox” loads that signup customer's token into the reset form. Return to the Customer persona for the standard guided scenario.
- **Profile/social:** edit the actual profile/privacy controls. As Customer, find **Sam Test** and connect. Switch to **Community Friend** to accept and reply, then back to Customer to receive the message. Discovery stays adult/opt-in and messaging stays friendship-only.
- **Support/notifications:** open a local support case from Customer. Administrator uses Support to reply; Customer reads the private response in My Tickets → Support cases. Booking, review, refund and event changes generate real local in-app notifications for the appropriate persona. No external email/SMS is sent.
- **History:** the event selector preserves previous fictional scenarios. Prefer a fresh event when exploring a different branch. No destructive reset is provided.

## Restart / fresh workspace

The preview is left running on loopback. If stopped, run the private `.local/start-test-lab.py` launcher documented next to the access file, or use the exact restart command in LOCAL_DEVELOPMENT.md. Do not run the project's older default dev script, which binds all interfaces.

For a completely new disposable lab, run `python3 scripts/prepare-test-lab.py --directory /Users/parsa/.codex/tmp/mixermates-correction-YYYYMMDD/preview --port <unused-port>` from canonical source, replacing the date with a new directory name. It refuses existing destinations, copies sanitized source, creates fictional data and writes a loopback launcher. Normal browser testing needs no database scripts or JSON edits.

Technical QA and agent visual review are separate from your visual acceptance. Production, real sales, external providers and physical door/camera acceptance remain closed.

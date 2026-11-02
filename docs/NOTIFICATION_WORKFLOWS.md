# Notification workflows — Phase 6

The existing Notification table remains the transactional in-app outbox. `notify` upserts a stable dedupe key inside the same transaction as the operation. Failure rolls back the operation and notification together; the existing bounded transaction retry can retry the complete action. No parallel notification database or external job system was created.

| Trigger | Recipient | Destination |
| --- | --- | --- |
| Registration received / payment instructions | Booking owner | Owned booking |
| New registration / new evidence | Event organizer | Existing Booking reviews |
| Evidence received, funds/BYOB/registration review, ticket issuance | Booking owner | Owned booking or My bookings |
| Event submission | Organizer and active admins | My events / Event setup |
| Organizer verification submission/review | Active admins / applicant | Event setup / organizer setup |
| Payment QR submission/review | Active admins / organizer | Event setup / Payment methods |
| Event review / suspension review | Event organizer | My events |
| Event cancellation | Affected active bookings' owners | Owned booking |
| Refund request and status transition | Organizer / booking owner | Refunds / My bookings |
| Private support case / response | Active admins / reporter | Support / My bookings |

Payment-review dedupe keys include the evidence version, so a later correction/rejection generates a new update while retrying the same decision does not. Read/unread writes include the current user's ID. In-app previews never disclose another user's receipt, token or venue. Every linked target still checks permissions. The inbox shows the latest 100 records, ten per page; unread counts cover all records. Historical notification rows are not deleted. Older legacy links retain their protected original destinations.

There is **no configured production transactional email transport**. No real mail was sent. In-app availability remains independent of optional preferences. Social/promotional consent guards already in the app are preserved. Event-reminder and organizer-announcement opt-ins are stored, but scheduled delivery/announcement broadcasting is not implemented.

`lib/notification-mock.ts` permits isolated fictional testing only. A failure leaves AVAILABLE_MOCK_FAILED and a safe audit attempt; a retry can produce AVAILABLE_MOCK_DELIVERED, after which repeated delivery is deduplicated. In-app content stays available. Default mock delivery writes a private deterministic `.local/mail` JSON file, never SMTP. Tests inject failure/success transports and assert retry/deduplication without sending email. This is local transport rehearsal, not external email acceptance. Production retry-worker/monitoring/provider and credentials remain unresolved.

Silent structural rescheduling is locked. Event-change notification workflows are incomplete until controlled before/after review and affected-booking consent/policy are implemented. Critical operational-failure escalation beyond the existing audit/recovery records also remains incomplete.

# Event rescheduling — local Phase 7

Open Organizer → Event operations at http://localhost:3021/organizer. Select your event. Published events use **Request event change** for date/time, venue/location and important entry instructions. Ordinary draft editing remains in the existing setup page. Price, access, age, payment destination and tier commitments cannot be changed through this request.

1. Enter proposed local start/end (event timezone), venue/location, entry instructions and reason. Review the existing affected booking count and submit.
2. New bookings, issuance and entry pause while review is pending. Existing dates and booking/payment snapshots remain stored.
3. A separate administrator opens Event operations, compares labelled previous/proposed values and affected bookings, adds notes and approves or rejects. The requester cannot approve their own request.
4. Approval atomically checks current lifecycle, terms version and pending pointer, applies the change, records review/effective time and creates one private-safe in-app update per affected booking. Rejection restores the prior sales pause state. Cancellation, suspension or completion invalidates pending requests.
5. Affected customers open their booking to see old/new schedule, authorized venue, ticket consistency explanation and refund/support links. Notification bodies contain no private address. Unconfirmed guests cannot recover private locations or a private-address-bearing organizer reason from the change history.

The same ticket ID and admission credential remain unless another state transition legitimately revokes them. Entry always checks current approved event conditions. Ended events, used-ticket commitments, conflicting/stale requests, duplicate approvals and changes racing cancellation are rejected or invalidated. Financial and policy changes have separate review; rescheduling never promises a refund automatically.

History records previous/proposed values, requester/reviewer, reason, review notes, affected booking IDs, terms version and review/effective/notified timestamps. Notified means in-app/outbox creation, not actual email delivery. Evidence: tests/phase7.test.ts, phase7/mysql-results.json and browser-results.json. No real event was rescheduled.

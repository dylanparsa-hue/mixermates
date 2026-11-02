# Phase 1 route and authorization inventory

October 19, 2026. Central classifier: lib/access-policy.ts. Actual auth: lib/auth.ts database sessions; Proxy only supplies cache/privacy headers. No invitation credential is issued.

| Class | Routes / methods | Coming Soon behavior | Full-platform local behavior |
| --- | --- | --- | --- |
| Public Coming Soon | GET / and /coming-soon | Root redirects to dedicated public page; authorized admin root previews platform | Root platform; /coming-soon always public |
| Authentication | GET /admin/login; POST /api/admin/login | Real password, active ADMIN role; generic denial; same-origin and IP/account throttle | Same admin restrictions |
| Authentication status | GET/HEAD /api/me; POST /api/logout | Own safe user only or null; logout revokes DB session | Same |
| Existing account entry | POST /api/login, register, demo, reset-request, reset-password | Denied; no demo escalation or ordinary signup | Existing auth; demo only explicit isolated SQLite/loopback/nonproduction flags |
| Admin preview | /explore, /map, /admin; GET /api/admin; POST /api/admin-action | Active ADMIN; original action authorization still applies | Admin area still role restricted; normal discovery restored |
| Organizer-scoped | /organizer, /create, /events/:id; GET /api/organizer; POST event, pause, verification, checkin | Active organizer/staff with owned/assigned object permission; create/event/pause/verification are organizer-only | Original object guards, with private-event access checks |
| Customer-scoped | /profile, /tickets, /friends, /people/:id | Active ADMIN preview only; ordinary sessions cannot bypass | Existing account, privacy, social/block/age policies |
| Event / future invitation | GET/HEAD /api/events, /api/events/:id | Admin, or owned/assigned management scope only | Public published events; private details require owner/admin/assigned staff or approved booking; no anonymous private detail |
| Other private APIs | GET/HEAD people, people/:id, tickets, ticket/:id, notifications, clubs, profile; POST activity, save, profile, club, attendance-privacy, attendees, notifications, social, message, report-event, deactivate | ADMIN preview, plus existing ownership/privacy checks | Existing account/object rules |
| Ticket sales / money | POST book, review, refund, payout, promotion | Disabled (503 for permitted admin; ordinary/anonymous denied earlier) | Real sales still disabled. Fictional regression only with every isolated demo flag, SQLite, loopback, nonproduction, development artifact |
| Media / uploads | GET/HEAD /api/media/:id; GET /uploads/:name; POST /api/upload | Admin or scoped management; uploaded private files never public; uploads organizer-only or admin | Original public-media and upload checks; private bytes stay protected |
| Private receipt | GET/HEAD /api/receipt/:booking | Booking owner or event owner; passing preview alone does not grant another owner's receipt | Same |
| Public static assets | /_next/static, /fonts, /branding, /images, /icon.svg, /manifest.webmanifest | Required branding/fonts/CSS/scripts remain available | Same; these directories contain no private uploads |
| Image optimizer | /_next/image | Only existing static branding/images permitted; uploaded/external URLs denied | Same safe allowlist |
| Health check | None added | Unknown route/API returns 404; no DB health leak | Same |
| Unknown routes / methods | Everything not explicitly classified | 404 or framework 405, JSON errors for known API handler | Same |

Dynamic pages and API/media responses are no-store with cookie variation; robots disallows all, no private sitemap, generic social metadata. Next 16 canonicalizes RSC URLs before content rendering; tests follow its same-path _rsc redirect and verify auth/no-store on the payload. A prefetch may return a 200 dynamic route-tree descriptor without page data; an RSC navigation may encode NEXT_REDIRECT to Coming Soon in a 200 Flight response. Neither response contains preview records or private content, and both are no-store. Static JS availability is not a data authorization bypass; the server protects data and mutations independently.

Organizer/staff access is tested with already authenticated scoped accounts. There is no new public organizer onboarding/sign-in workflow in this phase. Existing valid organizer sessions work; the dedicated new sign-in is ADMIN-only. Future invitations/approved customer links remain denied pending Phase 2+.

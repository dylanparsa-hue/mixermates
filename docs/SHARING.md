> **Current policy — October 19, 2026:** Development is local only. Historical sharing/deployment steps below are not authorization to publish. Follow [DEPLOYMENT_POLICY.md](DEPLOYMENT_POLICY.md) and [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md). Phase 0 report: [PHASE_0_REPORT.md](PHASE_0_REPORT.md).

# Friend testing preview

Started October 17, 2026.

Public HTTPS URL: https://areas-relate-surfaces-tumor.trycloudflare.com

This is a temporary Cloudflare Quick Tunnel to an isolated production-mode Next.js server bound to `127.0.0.1:3001`. Keep the Mac awake and connected, and keep the server/tunnel processes running. This is not independent, always-on cloud hosting; the random hostname changes if the tunnel is restarted.

The snapshot and SQLite test database live in `/Users/parsa/.codex/tmp/vibey-share-preview-20261017/`. The primary workspace database and private uploads were excluded. Privileged seeded demo accounts have randomized passwords and production mode disables demo switching. The attendee test account is `test@vibey.test`; the password was provided in the chat. It has an approved fictional Halloween booking for testing the new ticket interface. All payments remain simulations. New accounts can be created through the normal sign-up form.

Verified through the public URL: event discovery, test-account login with a secure session surviving navigation, profile display, sample ticket, reference barcode and QR reveal/hide.

The public app is a snapshot. Later source edits require refreshing the snapshot/build and restarting the production server. Starting another tunnel creates a new hostname; set `APP_ORIGIN` on the production server to that hostname so browser writes remain allowed.

## Running processes

- Production server: retained execution session 61507, port 3001.
- Cloudflare tunnel: retained execution session 56147.
- Original development server remains on port 3000.

Stop only the two preview processes to take the public test link offline. The test database remains on disk.

Cloudflare reference: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

Alex Morgan (`@alex`) was marked VERIFIED in the local and shared test databases at the user’s request. The verified badge and generic “Verified Profile” label were checked on the public HTTPS profile. The updated production build passed.

October 18 premium refresh deployed and checked over HTTPS. Custom collectible artwork loaded, seven event cards rendered, and the verified Alex profile retained its state. See TRANSITIONS.md for motion attribution and validation.

The five-palette website refresh was reverted at the user’s request. The installed design skills and standing preference remain.

The temporary services were restarted on October 18. The previous tunnel hostname expired; use the new URL above. The navy/lime rollback is live and was verified in the browser with seven events and no palette selector.

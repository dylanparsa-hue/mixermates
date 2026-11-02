# MixerMates — private development source

MixerMates uses Next.js, React, TypeScript and Prisma. Current work runs locally with contained fictional SQLite data and disabled real sales. The private GitHub backup does not authorize deployment to Hostinger or any other host.

Start with [Setup on another computer](docs/SETUP_ON_ANOTHER_COMPUTER.md). It covers frozen dependency installation, new database initialization, fictional account provisioning, localhost startup and regression checks. Use the guarded preparation scripts; do not point a development/test command at the original database or production.

The current organizer flow is **Event Details → Tickets → Design Event Page → Submit for Approval**. Same-account organizer access is free. The live designer and saved customer page share rendering, and independent administrator review is separate from payment readiness. The fixed 5% fee and existing booking, refund and admission protections remain.

See [Organizer Phase 3 handoff](docs/ORGANIZER_PHASE_3_REPORT.md) for implemented changes, actual checks and remaining work. Google provider verification, approved platform Booking Terms and additional session scheduling remain open. Owner visual acceptance is separate.

Fictional owner account passwords are generated locally into `~/.mixermates-private/MIXERMATES_OWNER_TEST_ACCESS.txt`, outside this repository, with owner-only permissions. Do not commit that file, `.env`, databases, uploaded content, private QR evidence or real credentials. Automated fixture values in test/seed code are fictional and must never be used for public accounts.

Current task instructions in [AGENTS.md](AGENTS.md), the Phase 3 handoff and the portable setup guide take precedence over older reports. Historical documents remain for implementation history and do not grant production, sales or deployment authority.

# Google connection — 29 October 2026

Google sign-in is **connected and verified live** at https://mixermates.com. The owner accepted Google's setup agreements and installed the replacement Client Secret directly in Hostinger. The original briefly exposed secret was revoked before connection. Credentials are stored only in Hostinger and an owner-only private directory outside this repository.

Google project: `MixerMates` (`mixermates-login`), owned by `mixermatesco@gmail.com`. Web client: `MixerMates Production Web`. Authorized domain: `mixermates.com`. Exact callback: `https://mixermates.com/api/auth/google/callback`. Only `openid email profile` are configured; no sensitive/restricted scopes or retained provider tokens.

Hostinger rebuild `01a18389-abd1-73a4-9464-30398f3e71d2` completed at 01:26 MYT on 29 October, using unchanged `public-demo-20261029-r2` source. Both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. The anonymous Google status endpoint reports `configured: true`. All 25 live HTTPS/safety checks pass.

The owner's real customer signup was observed, and a fresh sign-out → Continue with Google → account selection → authenticated customer profile passed for the owner-created ordinary customer identity. That account remains ATTENDEE. A mismatched Google email was correctly refused when attempting to link the independently authorized `scaloramedia@gmail.com` Admin identity. The Admin can continue using its existing password; linking requires the Google account with that exact same email and password confirmation in Profile. No Google signup grants Admin or organizer authority.

## Remaining Google publishing step

The Cloud app remains **External / Testing**. Its Publish app button is disabled until app branding is complete; public, owner-approved privacy-policy and terms URLs have not been supplied. Do not invent a policy URL or falsely claim brand verification. Google documents an exception for requests limited to name/email/profile/OpenID: users need not be on the test-user list and their authorization does not expire after seven days. Both the live test and this documented exception support the current basic-login configuration. Broad production publishing/branding is still a separate unfinished step.

Official sources: [OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Manage App Audience and basic-sign-in testing exception](https://support.google.com/cloud/answer/15549945?hl=en).

## Later configuration maintenance

Use Google Cloud → project `mixermates-login` → Google Auth Platform. Configure only the exact callback above. Keep the secret in Hostinger environment variables; never paste it in source, chat or reports. Hostinger environment changes rebuild the current source. After any change, verify the live provider flow and the production safety checks. Preserve the one-account linking rules, existing sessions/roles, and disabled real sales/billing/admission.

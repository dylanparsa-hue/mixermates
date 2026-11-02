# Owner review: MixerMates privacy notice

Prepared 29 October 2026 against the current application source and the verified Google connection. This is a local drafting task: no policy page, footer change, Google publishing submission or production change has been made. [Read the bilingual draft](PRIVACY_POLICY_DRAFT.md).

## Decisions needed to finish the notice

| Decision | What needs confirming |
| --- | --- |
| Operator identity | Full legal name of the individual or entity operating MixerMates, postal address and country. The brand alone does not identify the responsible operator. |
| Privacy contact | Confirm that `mixermatesco@gmail.com`, already the Google support contact, will be monitored for privacy requests and complaints, or provide another address. Identify the person responsible for responses. |
| Intended audience | Current signup permits ages 13+; social features require 18+. Confirm whether to retain this or make the service 18+ only. Any change needs implementation, not just a different sentence in the policy. Resolve protections/consent for younger users if they remain eligible. |
| Retention and requests | Approve retention periods by data category, deletion exceptions, backup expiry and a workable access/correction/deletion process. There is no complete automated erasure workflow today. Do not promise a fixed deletion deadline before the process exists. |
| Providers and countries | Confirm the actual Hostinger database/hosting region, managed backup locations/retention, operator-held backups, people with access, email arrangements and any additional vendors. Assess international-transfer arrangements using the actual locations. |
| Secondary uses | Confirm the proposed no-sale and no-AI-training commitments across the business, not merely this source tree. No advertising pixel or behavioral-analytics SDK was found in the application reviewed; hosting/provider practices still need confirmation. |

The effective date remains blank until publication. English and Bahasa Melayu wording should be reviewed together after these decisions. No business identity, retention deadline, data residency, certification or universal encryption claim has been invented.

## Evidence behind the wording

| Draft topic | Current implementation / operational evidence |
| --- | --- |
| Account fields, optional profile and social records | `prisma/schema.prisma`: User, OAuthAccount, GoogleAuthFlow, Session, Message, Notification, FileUpload and related models; `lib/profile.ts`; profile/social handlers in `app/api/[...path]/route.ts`. |
| Ordinary public profile excludes email and full DOB | `lib/rules.ts`, `publicUser`. Other authorized operational views can have different fields; the draft does not promise nobody else can ever see them. |
| Google identity access/use/storage | `lib/google-identity.ts`, `lib/google-auth.ts`, `lib/google-accounts.ts`. Scopes are OpenID/email/profile; identifier stored for linking; verified email/name used; no Google photo imported; no provider tokens persisted. Temporary pending flows can hold name/email/subject until cleanup. |
| Login/linking verification | `docs/public-release/google-connection.json`, including successful real login and refused different-email Admin link. Personal test-account details are in the private owner inventory outside this repository. |
| Authentication storage | `lib/auth.ts`, `lib/session-security.ts`: seven-day session cookie; `lib/google-auth.ts`: ten-minute Google flow cookie. Expiry does not imply immediate physical database deletion. |
| Deactivation | `app/api/[...path]/route.ts`, `deactivate`: sets account inactive, hides discovery, increments security version and deletes sessions. It does not erase user/message/upload/audit records or remove the Google association. |
| Deletion and unlinking requests | No complete self-service erasure or Google-unlink endpoint was found. Requests need a verified, manual operational procedure before the policy promises their handling. Production password-recovery email delivery is also not configured; the policy does not promise automatic reset emails or password access for Google-only users. |
| Public images | Profile upload handlers require non-private media. `lib/media-access.ts` permits non-private files according to its access rules. Replacing a URL does not purge the underlying FileUpload record; embedded metadata is not explicitly stripped before storage. |
| Cookies and browser storage | `components/theme.tsx`, `lib/theme-init.ts`, `components/customer-booking.tsx`, `lib/auth.ts` and `lib/google-auth.ts`. Theme is local storage; invitation references use session storage. No production Test Lab cookie is described. |
| Third-party map traffic | `components/map.tsx`: browser loads OpenFreeMap styles/tiles; MapLibre worker is self-hosted. Viewing map regions creates external requests; the app does not request device GPS for these features. |
| First-party activity/security data | `app/api/[...path]/route.ts`, activity/auth handlers; `lib/security.ts`: event interaction counts, rate limits and authentication records. The draft therefore avoids an inaccurate “we do not track anything” statement. |
| Public demo limits | `docs/PUBLIC_RELEASE_REPORT.md`, `docs/public-release/google-connection-smoke.json`: four fictional demos, real finance/admission disabled, Test Lab inaccessible. Dormant payment/ticket capabilities are not presented as live collection purposes. |

## Publication after approval

The requested deliverable is a draft for review. Approval of the wording would not by itself implement missing retention/deletion controls or authorize publishing unfinished text.

After the owner supplies the missing details and approves a final version, prepare a public notice on the MixerMates domain, link it from the homepage/footer and authentication entry points, and use the identical URL in Google branding. A separate Terms of Service document is still needed for the broader Google publishing configuration. This draft is not that document, and it does not promise Google will verify or publish the app automatically. Confirm domain ownership/branding requirements when making the later submission.

## Sources checked

- [Google: Manage OAuth App Branding](https://support.google.com/cloud/answer/15549049?hl=en): required app links and accessible, consistent privacy disclosures for Google publishing.
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy): accurate disclosures about accessed data, uses, storage and sharing, plus minimum relevant permissions.
- [Malaysia Personal Data Protection Commissioner: A Quick Guide to Privacy Notice](https://www.pdp.gov.my/ppdpv1/wp-content/uploads/2025/01/A-Quick-Guide-to-PRIVACY-NOTICE.pdf): national-language and English notices; explains required notice subjects. A Bahasa Melayu draft is included rather than assuming an English-only notice is enough.
- [Malaysia Personal Data Protection Commissioner: data protection principles](https://www.pdp.gov.my/en/principles-of-personal-data-protection/): notice/choice, disclosure, security, retention, integrity and access principles. This drafting reference is not a claim of full statutory compliance or an assessment of registration/DPO obligations.
- [Google privacy policy](https://policies.google.com/privacy), [Hostinger privacy policy](https://www.hostinger.com/legal/privacy-policy), [OpenFreeMap privacy policy](https://openfreemap.org/privacy/): provider notices linked for readers. Their statements are not substituted for verification of MixerMates' own hosting configuration and practices.

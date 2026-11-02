# Visual sources

Downloaded Unsplash placeholder photography is stored locally so normal event discovery does not depend on remote image requests. Re-evaluate imagery and licensing/attribution needs for production campaigns.

| Local file | Source photo |
| --- | --- |
| hero.jpg | https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3 |
| neon.jpg | https://images.unsplash.com/photo-1514525253161-7a46d19cd819 |
| halloween.jpg | https://images.unsplash.com/photo-1509557965875-b88c97052f0e |
| sunset.jpg | https://images.unsplash.com/photo-1500534623283-312aade485b7 |
| festival.jpg | https://images.unsplash.com/photo-1459749411175-04bf5292ceea |
| rooftop.jpg | https://images.unsplash.com/photo-1514933651103-005eec06c04b |
| live.jpg | https://images.unsplash.com/photo-1501612780327-45045538702b |
| social.jpg | https://images.unsplash.com/photo-1511795409834-ef04bbd61622 |

The VIBEY wordmark, app icon and favicon are code-native original vector/typographic assets. Lucide supplies interface icons. The user-supplied webp was inspected for visual direction. Event names, venues and organizers in the seed are fictional demo content, not official ticket listings.


## Editorial profile cover

- Tool: built-in `image_gen` (Image Generation skill), generation mode.
- Final project asset: `/Users/parsa/Desktop/EVENT FINDER/public/images/profile-cover.png`.
- Default demo portrait: `public/images/profile-avatar.jpg`, Unsplash placeholder https://images.unsplash.com/photo-1534528741775-53994a69daeb.
- The supplied screenshot was used to guide the native CSS layout. Its people, username, and NFT achievement claims were not inserted as account data. Badges reflect VIBEY membership and verified attendance.

Final generation prompt:

> Generate a photographic website profile cover asset ONLY, no UI, no text, no logos, no phone frame. Portrait 2:3 composition. Two adult stylish Malaysian friends in their mid-twenties at an intimate underground music event, one in front looking over their shoulder and the other just behind, dark clothing, candid editorial fashion photography. Intense red-orange vermilion wash on the backdrop, deep cherry-red shadows, charcoal black, warm natural skin undertones, subtle analog film grain. Dramatic saturated red lighting similar to a dark fashion editorial, sophisticated and atmospheric. Frame their heads in the upper-middle and bodies to the lower edge. Top 20 percent has empty red-lit backdrop suitable for interface badges later; bottom 25 percent fades naturally into near-black charcoal. Photorealistic, no illustration, high contrast but visible facial details. This will sit behind a centered round avatar on a premium social profile.


## Navy / blue / lime refresh

The existing generated profile cover is treated with grayscale/luminosity blending over a blue CSS gradient. No new raster image was generated for this refresh. The latest user references guide the palette, typography, responsive profile composition and white perforated ticket UI; app content remains VIBEY content.

Locally hosted variable fonts use `next/font/local` and do not require third-party font requests:

- Oxanium: `public/fonts/oxanium.ttf`, Google Fonts source https://github.com/google/fonts/tree/main/ofl/oxanium. SIL Open Font License in `public/fonts/Oxanium-LICENSE.txt`.
- Manrope: `public/fonts/manrope.ttf`, Google Fonts source https://github.com/google/fonts/tree/main/ofl/manrope. SIL Open Font License in `public/fonts/Manrope-LICENSE.txt`.
- CODE128 ticket reference is rendered locally with JsBarcode. The reference barcode is informational; entry validation continues to use the unique server-issued QR token.

## MixerMates name update — October 18, 2026

The visible product name, wordmark, M app icon, manifest, profiles and exported tickets use MixerMates. The chrome/lime hero pass was edited with the image-generation tool to replace the original lettering; its transparent asset is `public/images/mixermates-collectible.png`. The original asset remains for provenance and is not referenced by the interface.

## Official MixerMates brand — October 19, 2026

The current interface uses the user's supplied logo artwork, archived unchanged in `public/branding/original/`. Optimized transparent production PNGs, centered app icons and exact-wordmark light/dark variants are in `public/branding/processed/`. See `docs/BRANDING.md` for measurements, processing and file usage. The previous code-native M icon and lime collectible described above are historical and no longer used; their source files are retained outside the public app in `/Users/parsa/.codex/tmp/mixermates-previous-art/`. The hero now uses the existing locally stored concert photograph.

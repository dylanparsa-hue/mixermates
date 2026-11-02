# Premium UI and motion

Source: https://github.com/Jakubantalik/transitions.dev (MIT; license in TRANSITIONS-LICENSE.txt).

The root tokens and modal, sliding-tabs, staggered text reveal, card tilt, and toast recipes are copied into app/styles/transitions.css. React lifecycle orchestration is in components/motion.tsx and components/shared.tsx. App-specific surfaces and responsive styling are in app/styles/premium.css. Exit timers use the CSS duration tokens; reduced-motion preferences disable motion. Pointer tilt is mouse-only and its wrapper permits vertical touch scrolling.

The refresh adds immersive event posters, an actual event-date filter, a floating mobile dock, chrome-edged profile treatments, ribbed neon community covers, and a custom collectible pass. Existing booking, privacy, approval, and entry-code behavior is retained.

Generated artwork: public/images/vibey-collectible.png. Mode: built-in image generation, transparent background. Prompt: Create a premium 3D VIBEY backstage pass, thick translucent acid-lime acrylic ticket, navy inset, chrome edging and carabiner, iridescent vinyl medallion; embossed VIBEY and AFTER DARK, beveled edges, screws, etching, blue/violet reflections and small abstract stickers. Three-quarter perspective tilted clockwise, fully visible with transparent padding. Midnight navy, chrome, acid lime #b5ff00, cobalt. Studio lighting, no phone, hands, people, floor, other logos or UI mockup.

Validation: production build and TypeScript passed; 26 tests passed. Browser checks covered discovery/profile horizontal fit at 320, 390, 768 and 1440px, real date filtering, profile modal Escape dismissal/focus restoration, sliding tabs, and ticket QR reveal.

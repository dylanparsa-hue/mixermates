# The owner's 16 screenshot issues

All original files remain at their supplied Desktop paths. Numbers below follow the order in the owner's request. Each row was reproduced in the existing source/running preview and checked after correction at desktop and phone widths in both light and dark. Interaction claims also have browser tests; screenshots alone were not used as functional proof.

| Owner evidence | Cause / correction | Current evidence |
|---|---|---|
| 1 · Hero | Two explicit orbit elements; gradient mask ended after the visible photo box. Removed shapes, used correct intrinsic dimensions and bounded feathering, added restrained ambient gradients. | `after/hero-{dark,light}-{390,1440}.png` |
| 2 · Organizer campaign | Hardcoded dark campaign surface/text. Semantic campaign background/ink roles now resolve per theme. | `after/home-{dark,light}-{390,1440}.png` |
| 3 · Ticket reminder | Permanent plum/white panel on light page. Theme-aware feature surface, text and secondary controls. | homepage captures |
| 4 · Creator section | Permanent black/magenta ground and white text. Theme-aware editorial gradient and ink; photographic cards keep photo contrast. | homepage captures |
| 5 · Light hero transition | Incomplete feature-theme system. Hero deliberately stays dark; supporting surfaces and transitions resolve consistently. | light homepage captures |
| 6 · Categories | Center-aligned overflowing flex content and second-row offsets clipped first items. Start alignment, insets, edge masks, hidden scrollbar and keyboard reachability. | `after/categories-*`; browser rail tests |
| 7 · Event intro/title | Oversized display title, raw fictional timestamp suffixes and zero inner separation. Fluid wrapping, shared padding and readable isolated fixture titles; actual names/IDs preserved. | `after/event-*` |
| 8 · Light detail/booking | Nested backgrounds, inconsistent padding and cramped ticket layout. Quiet shared detail surface, aligned radio/name/price grid and mobile order. | event and checkout captures |
| 9 · Dark booking | Same structural faults affected dark mode. Shared structure repaired for both themes. | dark event captures |
| 10 · Account dropdown | Text theme controls exceeded width; no comprehensive dismissal lifecycle. Icon radios, viewport-bounded menu and outside/Escape/route/focus handling. | `after/profile-menu-*`; browser tests |
| 11 · Organizer primary menu | Every backend feature was a primary destination. Replaced with four task destinations and contextual tools. | `after/organizer-*` |
| 12 · Stuck notifications | Independent open state without outside/Escape cleanup or stale-request cancellation. Coordinated dismissal, focus restoration and request generation checks; no overlay/body lock. | browser tests; phone notification checks |
| 13 · Organizer inventory/overview | Raw overview records and too many primary options. Actual compact metrics, event rows and contextual edit/payment/scanner/guest actions. | organizer captures |
| 14 · Event operations | Shared panel spacing weak; selected-event links could leave the wrong panel active. Shared padding, URL-reactive organizer tabs, contextual advanced operations and staff event selection. | `after/settings-*`, `after/staff-*` |
| 15 · Registration/payment review | Cramped hierarchy and lost event context. Shared task spacing, explicit event label and persisted event selection; independent funds/registration rules retained. | `after/payments-*`; normal owner journey |
| 16 · Notifications list | Weak shared layout/long primary menu. Themed, padded secondary notification screen with existing read/unread actions. | `after/notifications-*` |

The local sign-in now opens the normal website. Workspace navigation shows Customer / Organizer / Admin; finance, registration and entrance reviewer contexts are secondary and truthfully identify their separate fictional actor. No production privilege is inferred from the selector.

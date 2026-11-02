import type { ImgHTMLAttributes } from "react";

// Public bundled photographs only. Authenticated uploads retain their original
// URL and credentials; no private image is sent through an optimization service.
const bundled = new Set(["neon", "live", "rooftop", "sunset", "festival", "halloween", "social", "profile-cover"]);
export function EventArtwork({ src, sizes = "(max-width: 767px) calc(100vw - 100px), (max-width: 1199px) 45vw, 40vw", ...props }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const name = /^\/images\/([a-z-]+)\.(?:jpg|png)$/.exec(src)?.[1];
  const responsive = name && bundled.has(name);
  return <img {...props} src={responsive ? `/images/optimized/${name}-960.webp` : src} srcSet={responsive ? [480, 960, 1440].map(width => `/images/optimized/${name}-${width}.webp ${width}w`).join(", ") : undefined} sizes={responsive ? sizes : undefined} decoding="async" />;
}

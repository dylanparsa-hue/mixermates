import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, LockKeyhole, Instagram } from "lucide-react";
import { BrandLogo } from "./brand";
import { ComingMotion } from "./coming-motion";
import { configuredSocialLinks } from "@/lib/site-config";
export function ComingSoon() {
  const social = configuredSocialLinks();
  return <main className="coming-shell" id="coming-soon">
    <div className="coming-ambient" aria-hidden="true"/>
    <header className="coming-header">
      <Link href="/coming-soon" aria-label="MixerMates coming soon"><BrandLogo theme="dark" decorative /></Link>
      <span className="coming-status"><i aria-hidden="true"/>COMING SOON</span>
    </header>
    <section className="coming-stage" aria-labelledby="coming-title">
      <div className="coming-copy">
        <h1 id="coming-title"><span>Your Next</span>{" "}<span>Night Starts</span>{" "}<span>Here.</span></h1>
        <p>Discover events. Meet your people.<br/>Make every night count.</p>
      </div>
      <ComingMotion><Image className="coming-brand-mark" src="/branding/processed/mixermates-symbol.png" width={1514} height={896} sizes="(max-width: 767px) 290px, (max-width: 1024px) 44vw, 560px" fetchPriority="high" alt="MixerMates" /></ComingMotion>
    </section>
    <footer className="coming-footer">
      <span>© 2026 <span translate="no">MixerMates</span></span>
      {social.length > 0 && <nav aria-label="MixerMates social accounts">{social.map(link=><a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer">{link.label === "Instagram" && <Instagram size={16} aria-hidden="true"/>}{link.label}<ArrowUpRight size={14} aria-hidden="true"/></a>)}</nav>}
      <Link href="/admin/login" className="coming-admin"><LockKeyhole size={13} aria-hidden="true"/>Admin access</Link>
    </footer>
  </main>;
}

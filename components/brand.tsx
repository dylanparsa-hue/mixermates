type BrandProps = { variant?: "full" | "symbol"; theme?: "light" | "dark" | "auto"; size?: "small" | "medium" | "large"; className?: string; decorative?: boolean };
const base = "/branding/processed/";
export function BrandLogo({ variant = "full", theme = "auto", size = "medium", className = "", decorative = false }: BrandProps) {
  if (variant === "symbol") return <BrandSymbol size={size} className={className} decorative={decorative} />;
  return <span className={`brand-logo brand-${size} brand-theme-${theme} ${className}`} translate="no">
    {(theme === "auto" ? ["dark", "light"] : [theme]).map(mode => <img key={mode} className={`brand-for-${mode}`} src={`${base}mixermates-logo-${mode}.png`} width={853} height={160} alt={decorative ? "" : "MixerMates"} />)}
  </span>;
}
export function BrandSymbol({ size = "medium", className = "", decorative = false }: Omit<BrandProps,"variant" | "theme">) {
  return <img className={`brand-symbol brand-${size} ${className}`} src={`${base}mixermates-symbol.png`} width={1514} height={896} alt={decorative ? "" : "MixerMates"} />;
}

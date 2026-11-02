import { BrandSymbol } from "@/components/brand";
export default function Loading() {
  return (
    <div className="page-width standard-page" aria-label="Loading MixerMates">
      <BrandSymbol className="brand-loading" />
      <div className="skeleton" style={{ height: 340, marginBottom: 30 }} />
      <div className="event-grid">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="skeleton" />
        ))}
      </div>
    </div>
  );
}

import { currencyMYR } from "@/lib/event-config";
import type { ticketPricing } from "@/lib/ticket-pricing";
export function FeeBreakdown({
  pricing: p,
  organizer = false,
}: {
  pricing: ReturnType<typeof ticketPricing>;
  organizer?: boolean;
}) {
  return (
    <dl className="fee-breakdown">
      {p.discount > 0 && (
        <>
          <div>
            <dt>Tickets before discount</dt>
            <dd>{currencyMYR(p.faceValue + p.discount)}</dd>
          </div>
          <div>
            <dt>Ticket discount</dt>
            <dd>−{currencyMYR(p.discount)}</dd>
          </div>
        </>
      )}
      <div>
        <dt>{organizer ? "Ticket price" : "Tickets"}</dt>
        <dd>{currencyMYR(p.faceValue)}</dd>
      </div>
      {(organizer || p.policy === "CUSTOMER") && p.platformFee > 0 && (
        <div>
          <dt>
            {organizer ? "MixerMates fee (5%)" : "MixerMates service fee (5%)"}
          </dt>
          <dd>{currencyMYR(p.platformFee)}</dd>
        </div>
      )}
      <div className="fee-total">
        <dt>Customer total</dt>
        <dd>{currencyMYR(p.customerTotal)}</dd>
      </div>
      {organizer && (
        <>
          <div>
            <dt>Organizer amount before gateway charges</dt>
            <dd>{currencyMYR(p.organizerBeforeGateway)}</dd>
          </div>
          <div>
            <dt>Gateway fee (organizer pays)</dt>
            <dd>Not yet known</dd>
          </div>
        </>
      )}
    </dl>
  );
}

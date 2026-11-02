/** MYR integer sen only. Half-up once on the discounted order face value. */
export const PLATFORM_RATE_BPS = 500;
export type FeePolicy = "ABSORB" | "CUSTOMER";
/** Comparison only, never used as payment authority. Recomputed under the reservation fence. */
export function pricingKey(
  policy: string,
  price: number,
  discount: number,
  quantity: number,
) {
  return `v1:${policy}:${price}:${discount}:${quantity}`;
}
function sen(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2_000_000_000)
    throw Error("400:Money must be a bounded integer number of sen.");
  return value;
}
export function ticketPricing(
  unitPrice: number,
  quantity: number,
  policy: string = "ABSORB",
  discount = 0,
) {
  sen(unitPrice);
  sen(discount);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10)
    throw Error("400:Choose between 1 and 10 tickets.");
  if (policy !== "ABSORB" && policy !== "CUSTOMER")
    throw Error("400:Choose who pays the platform fee.");
  const gross = sen(unitPrice * quantity);
  if (discount > gross) throw Error("400:Discount exceeds ticket face value.");
  const faceValue = gross - discount;
  const platformFee = Number(
    (BigInt(faceValue) * BigInt(PLATFORM_RATE_BPS) + 5000n) / 10000n,
  );
  return {
    modelVersion: 1,
    policy: policy as FeePolicy,
    rateBps: PLATFORM_RATE_BPS,
    faceValue,
    discount,
    platformFee,
    customerTotal: sen(faceValue + (policy === "CUSTOMER" ? platformFee : 0)),
    organizerBeforeGateway: faceValue - (policy === "ABSORB" ? platformFee : 0),
  };
}

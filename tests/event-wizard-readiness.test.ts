import test from "node:test";
import assert from "node:assert/strict";
import {
  eventWizardErrors,
  firstInvalidStep,
  paidEventErrors,
} from "../lib/event-wizard-validation";
import { localDateTime } from "../lib/event-config";
const ready = {
  verification: "VERIFIED",
  approvedDestinationIds: ["recipient-owned"],
  paidEventsEnabled: true,
};
const draft = () => ({
  title: "Fictional validation event",
  category: "House Party",
  shortDescription: "A fictional local event for validation checks.",
  timezone: "Asia/Kuala_Lumpur",
  startsLocal: localDateTime(new Date(Date.now() + 7 * 86400000)),
  endsLocal: localDateTime(new Date(Date.now() + 7 * 86400000 + 7200000)),
  city: "Test City",
  venue: "Test venue",
  access: "PUBLIC",
  capacity: 10,
  tiers: [
    {
      name: "Paid admission",
      price: 4500,
      pricingMode: "PAID",
      quantity: 10,
      minPerOrder: 1,
      maxPerOrder: 4,
    },
  ],
  fields: [],
  entryOptions: [],
  image: "/images/neon.jpg",
  policies: "",
  paymentDestinationId: null,
});
test("content review needs policies but no bank account, verification or real-sales activation", () => {
 const d=draft(),context={...ready,verification:"UNVERIFIED",approvedDestinationIds:[],paidEventsEnabled:false};
 assert.deepEqual(eventWizardErrors(d,0,new Date(),context),{});
 assert.deepEqual(Object.keys(paidEventErrors(d,context)),["policies"]);
 d.policies="Entry terms and fictional cancellation conditions.";
 assert.deepEqual(eventWizardErrors(d,1,new Date(),context),{});
 assert.deepEqual(eventWizardErrors(d,2,new Date(),context),{});
});
test("free creation stays available without organizer verification, recipient or cancellation conditions", () => {
  const d = draft();
  d.tiers[0].price = 0;
  d.tiers[0].pricingMode = "FREE";
  assert.deepEqual(
    eventWizardErrors(d, 1, new Date(), {
      ...ready,
      verification: "UNVERIFIED",
      approvedDestinationIds: [],
      paidEventsEnabled: false,
    }),
    {},
  );
  d.tiers.push({
    ...d.tiers[0],
    name: "Hidden paid ticket",
    quantity: 1,
    price: 100,
    pricingMode: "PAID",
  });
  d.capacity = 11;
  d.tiers[1].maxPerOrder = 1;
  assert(
    eventWizardErrors(d, 1, new Date(), {
      ...ready,
      verification: "UNVERIFIED",
    }).policies,
  );
});
test("unresolved advanced entry options and their malformed prices cannot advance to preview", () => {
  const d: any = {
    ...draft(),
    paymentDestinationId: "recipient-owned",
    policies: "Fictional cancellation conditions.",
    entryOptions: [
      {
        key: "standard",
        label: "Standard entry",
        relationship: "UNCONFIRMED",
        price: null,
      },
    ],
  };
  let errors = eventWizardErrors(d, 1, new Date(), ready);
  assert(errors["entry-0-relationship"]);
  assert(errors["entry-0-price"]);
  assert.equal(firstInvalidStep(errors), 0);
  d.entryOptions[0] = {
    ...d.entryOptions[0],
    relationship: "FEE",
    price: 1200,
    priceInput: "12.999",
  };
  assert(eventWizardErrors(d, 1, new Date(), ready)["entry-0-price"]);
  d.entryOptions[0] = { ...d.entryOptions[0], price: 0, priceInput: "0" };
  assert.deepEqual(eventWizardErrors(d, 1, new Date(), ready), {});
});

"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "./shared";
export function GuestManagement({ eventId }: { eventId: string }) {
  const [data, setData] = useState<any>(null),
    [query, setQuery] = useState({
      search: "",
      tier: "",
      registration: "ALL",
      payment: "ALL",
      arrival: "ALL",
      lifecycle: "ALL",
      sort: "NEWEST",
      page: "1",
    }),
    [error, setError] = useState("");
  const serial = useRef(0);
  useEffect(() => {
    const id = ++serial.current;
    const timer = setTimeout(
      () =>
        api(`customer/guests/${eventId}?${new URLSearchParams(query)}`)
          .then((d) => {
            if (id === serial.current) {
              setData(d);
              setError("");
            }
          })
          .catch((e: any) => {
            if (id === serial.current) setError(e.message);
          }),
      200,
    );
    return () => clearTimeout(timer);
  }, [eventId, query]);
  const change = (key: string, value: string) =>
    setQuery((q) => ({
      ...q,
      [key]: value,
      ...(key === "page" ? {} : { page: "1" }),
    }));
  const select = (
    label: string,
    key: keyof typeof query,
    options: string[],
  ) => (
    <label>
      {label}
      <select value={query[key]} onChange={(e) => change(key, e.target.value)}>
        {options.map((v) => (
          <option key={v} value={v}>
            {v === "ALL" ? "All" : v.toLowerCase().replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section
      className="guest-management"
      aria-label="Registration guest management"
    >
      <h3>All registrations</h3>
      <p>
        Search and filter registrations, including guests still waiting for
        approval or payment. Entrance staff only receive permitted guest
        information.
      </p>
      <div className="entrance-filters">
        <label>
          Search attendee or booking
          <input
            name="registrationSearch"
            type="search"
            value={query.search}
            maxLength={100}
            onChange={(e) => change("search", e.target.value)}
          />
        </label>
        <label>
          Ticket type
          <select
            value={query.tier}
            onChange={(e) => change("tier", e.target.value)}
          >
            <option value="">All tiers</option>
            {data?.tiers.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {select("Registration status", "registration", [
          "ALL",
          "PENDING",
          "APPROVED",
          "NOT_REQUIRED",
          "REJECTED",
          "CANCELLED",
        ])}
        {select("Booking status", "lifecycle", [
          "ALL",
          "RESERVED",
          "PENDING",
          "CONFIRMED",
          "CANCELLED",
          "EXPIRED",
          "REJECTED",
        ])}
        {select("Check-in status", "arrival", [
          "ALL",
          "CHECKED_IN",
          "NOT_ARRIVED",
        ])}
        {data?.finance &&
          select("Payment review status", "payment", [
            "ALL",
            "AWAITING_PAYMENT",
            "PROOF_SUBMITTED",
            "UNDER_REVIEW",
            "CONFIRMED",
            "REJECTED",
            "REFUND_PENDING",
            "REFUNDED",
            "NOT_REQUIRED",
          ])}
        {select("Sort registrations", "sort", [
          "NEWEST",
          "OLDEST",
          "NAME",
          "RECENT_ARRIVALS",
        ])}
      </div>
      {error && <p role="alert">{error}</p>}
      {!data ? (
        <p role="status">Loading permitted guests…</p>
      ) : (
        <>
          <p role="status">
            {data.total} matching{" "}
            {query.sort === "RECENT_ARRIVALS" ? "arrivals" : "registrations"} ·
            Page {data.page} of {data.pages}
          </p>
          <div className="entrance-guests">
            {data.guests.map((g: any) => (
              <article key={g.id}>
                <div>
                  <strong>{g.name}</strong>
                  <p>
                    {g.tier} × {g.quantity}
                  </p>
                  <small>Booking: {g.id}</small>
                </div>
                <div>
                  <p>
                    {g.lifecycle.toLowerCase()} ·{" "}
                    {g.registration.toLowerCase().replaceAll("_", " ")}
                  </p>
                  {g.payment && (
                    <p>
                      Payment: {g.payment.toLowerCase().replaceAll("_", " ")}
                    </p>
                  )}
                  <p>
                    {g.checkedIn} checked in · {g.issued} tickets
                  </p>
                </div>
              </article>
            ))}
          </div>
          {!data.guests.length && (
            <p>No matching guests. Try another search or filter.</p>
          )}
          <div className="setup-actions">
            <button
              className="button secondary"
              disabled={data.page <= 1}
              onClick={() => change("page", String(data.page - 1))}
            >
              Previous registrations
            </button>
            <button
              className="button secondary"
              disabled={data.page >= data.pages}
              onClick={() => change("page", String(data.page + 1))}
            >
              Next registrations
            </button>
          </div>
        </>
      )}
    </section>
  );
}

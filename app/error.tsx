"use client";
import Link from "next/link";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="page-shell mm-error">
      <div className="empty">
        <h1>A little pause in the night.</h1>
        <p>
          Something didn’t load as expected. Your saved bookings are still in
          your account.
        </p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
        <Link className="text-button" href="/explore">
          Back to exploring
        </Link>
      </div>
    </div>
  );
}

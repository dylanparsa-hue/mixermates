"use client";
import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./brand";
export function OrganizerLogin() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="coming-shell admin-login-shell">
      <header className="coming-header">
        <Link href="/coming-soon" aria-label="MixerMates coming soon">
          <BrandLogo theme="dark" decorative />
        </Link>
        <Link href="/coming-soon">Back</Link>
      </header>
      <section className="admin-login-form">
        <h1>Organizer studio</h1>
        <p>Sign in with your authorized organizer or staff account.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/preview/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: f.get("email"),
                  password: f.get("password"),
                }),
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              location.replace("/organizer");
            } catch (x: any) {
              setError(x.message);
              setBusy(false);
            }
          }}
        >
          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <small>Restricted access. Real ticket sales remain disabled.</small>
      </section>
    </main>
  );
}

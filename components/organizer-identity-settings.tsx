"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "./shared";
export function OrganizerIdentitySettings() {
  const [identity, setIdentity] = useState<any>(null),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    api("setup")
      .then((d) => {
        setIdentity(d.identity);
        setName(d.identity.name);
      })
      .catch((e) => setMessage(e.message));
  }, []);
  return (
    <section className="setup-panel">
      <h2>Your organizer profile</h2>
      <p>Your account, tickets and friends stay together.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            setIdentity(await api("organizer-identity", { name }));
            setMessage("Organizer name saved. Your link stays the same.");
          } catch (e: any) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="organizer-name">
          Organizer name
          <input
            id="organizer-name"
            name="organizer-name"
            value={name}
            minLength={2}
            maxLength={80}
            required
            onChange={(e) => setName(e.target.value)}
            disabled={!identity || busy}
          />
        </label>
        {identity && (
          <p>
            Your automatic link:{" "}
            <Link href={`/organizers/${identity.slug}`}>
              /organizers/{identity.slug}
            </Link>
          </p>
        )}
        <button className="button primary" disabled={!identity || busy}>
          {busy ? "Saving…" : "Save organizer name"}
        </button>
        <p role="status">{message}</p>
      </form>
      <div className="studio-advanced-links">
        <Link href="/profile">Account & privacy</Link>
        <Link href="/organizer?tab=Payment+methods">
          Payment recipients & verification
        </Link>
        <Link href="/organizer?tab=Notifications">Notifications</Link>
        <Link href="/organizer?tab=Support">Support</Link>
      </div>
    </section>
  );
}

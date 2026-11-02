"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "./shared";
import { eventDateLabel } from "@/lib/event-config";
export function OrganizerPublicProfile({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api(`organizers/${slug}`)
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, [slug]);
  return (
    <section className="page-width standard-page organizer-public-profile">
      <Link href="/explore">Explore events</Link>
      <h1>
        {profile?.name ||
          (error ? "Organizer unavailable" : "Loading organizer…")}
      </h1>
      {error && <p role="alert">{error}</p>}
      {profile && (
        <>
          <p>Public events by {profile.name}</p>
          {profile.events.length ? (
            <div className="organizer-public-events">
              {profile.events.map((e: any) => (
                <Link key={e.id} href={`/events/${e.slug}`}>
                  <img
                    src={e.image}
                    width={300}
                    height={400}
                    alt={`${e.title} poster`}
                  />
                  <h2>{e.title}</h2>
                  <p>{e.city}</p>
                  <p>{eventDateLabel(e.startsAt, e.timezone)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p>No public events to show yet.</p>
          )}
        </>
      )}
    </section>
  );
}

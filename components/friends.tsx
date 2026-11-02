"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Users, ShieldCheck } from "lucide-react";
import { api, Loading, Empty, Avatar } from "./shared";
import { SlidingTabs } from "./motion";
function Friends({ user, notify }: any) {
  const [data, setData] = useState<any>(null),
    [tab, setTab] = useState("Discover"),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const load = () =>
    api("people")
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
    const value = new URLSearchParams(location.search).get("tab");
    if (["Discover", "Friends", "Requests", "Sent"].includes(value || ""))
      setTab(value!);
  }, [user.id]);
  async function action(targetId: string, action: string) {
    if (busy) return;
    setBusy(targetId);
    try {
      await api("social", { targetId, action });
      await load();
      notify(
        action === "request" ? "Friend request sent." : "Connection updated.",
      );
    } catch (e: any) {
      notify(e.message);
    } finally {
      setBusy("");
    }
  }
  const key = user.username;
  const friendIds =
    data?.friends.map((f: any) => (f.userA === key ? f.userB : f.userA)) || [];
  const incoming = (id: string) =>
    data?.requests.some((r: any) => r.toId === key && r.fromId === id);
  const outgoing = (id: string) =>
    data?.requests.some((r: any) => r.fromId === key && r.toId === id);
  const people = (data?.people || []).filter(
    (p: any) =>
      (tab === "Friends"
        ? friendIds.includes(p.id)
        : tab === "Requests"
          ? incoming(p.id)
          : tab === "Sent"
            ? outgoing(p.id)
            : p.discoverable) &&
      `${p.name} ${p.username} ${p.publicId}`
        .toLowerCase()
        .includes(query.toLowerCase().replace(/^@/, "")),
  );
  return (
    <div className="page-width standard-page">
      <h1>Find people</h1>
      <p>
        Find discoverable profiles, manage friend requests and keep in touch at
        events.
      </p>
      <div className="mm-social-toolbar">
        <SlidingTabs
          options={["Discover", "Friends", "Requests", "Sent"]}
          value={tab}
          label="People views"
          onChange={(v) => {
            setTab(v);
            history.replaceState(null, "", "/friends?tab=" + v);
          }}
        />
        <label className="people-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Search people"
            placeholder="Name, username or public ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <p className="privacy-note">
        <ShieldCheck size={18} aria-hidden="true" />
        Only adults who opt into discovery appear in search. Attendance has its
        own privacy setting.
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <div className="people-grid">
            {people.map((p: any) => (
              <article className="mm-person" key={p.id}>
                <div className="mm-person-identity">
                  <Avatar photo={p.photo} name={p.name} size={64} />
                  <div>
                    <Link href={"/people/" + p.username}>
                      <h2>{p.name}</h2>
                    </Link>
                    <p>@{p.username}</p>
                    <small>{p.city}</small>
                  </div>
                </div>
                <p className="mm-person-bio">{p.bio}</p>
                <fieldset className="person-actions" disabled={!!busy}>
                  {incoming(p.id) ? (
                    <>
                      <button
                        className="button primary"
                        onClick={() => action(p.id, "accept")}
                      >
                        Accept request
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => action(p.id, "reject")}
                      >
                        Decline
                      </button>
                    </>
                  ) : outgoing(p.id) ? (
                    <>
                      <span>Request pending</span>
                      <button
                        className="button secondary"
                        onClick={() => action(p.id, "cancel")}
                      >
                        Cancel request
                      </button>
                    </>
                  ) : friendIds.includes(p.id) ? (
                    <button
                      className="button secondary"
                      onClick={() => {
                        if (confirm(`Remove ${p.name} as a friend?`))
                          void action(p.id, "remove");
                      }}
                    >
                      Remove friend
                    </button>
                  ) : (
                    <button
                      className="button primary"
                      onClick={() => action(p.id, "request")}
                    >
                      Add friend
                    </button>
                  )}
                  <button
                    className="button secondary"
                    onClick={() => {
                      if (
                        confirm(
                          `Block ${p.name}? Your friendship and pending requests will end.`,
                        )
                      )
                        void action(p.id, "block");
                    }}
                  >
                    Block
                  </button>
                </fieldset>
              </article>
            ))}
          </div>
          {!people.length && (
            <Empty
              icon={Users}
              title="No matching people"
              text={
                query
                  ? "Try a username or permitted display name."
                  : "Friend requests and discoverable profiles appear here."
              }
            />
          )}
        </>
      )}
    </div>
  );
}
export { Friends };

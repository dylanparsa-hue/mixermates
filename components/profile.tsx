"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ThemeControl } from "./theme";
import { SlidingTabs } from "./motion";
import { ProfileSheet } from "./profile-sheet";
import { GoogleLogin } from "./google-login";
import {
  ArrowUpRight,
  ArrowLeft,
  MapPin,
  Plus,
  Heart,
  Ticket,
  Users,
  Compass,
  Sparkles,
  Music2,
  LockKeyhole,
  Check,
  LayoutDashboard,
  Instagram,
  Settings,
  CheckCircle2,
  BadgeCheck,
  Award,
} from "lucide-react";
import {
  api,
  date,
  cities,
  Loading,
  Empty,
  Avatar,
  Modal,
  EventCard,
} from "./shared";

function Profile({ user, refresh, notify, save }: any) {
  const [data, setData] = useState<any>(null),
    [tab, setTab] = useState("Passport"),
    [blocked, setBlocked] = useState<any[]>([]),
    [edit, setEdit] = useState(false),
    [busy, setBusy] = useState(false),
    [photo, setPhoto] = useState(user.photo || ""),
    [cover, setCover] = useState(user.cover || "/images/hero.jpg");
  async function uploadProfile(file: File, kind: string) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      kind === "photo" ? setPhoto(d.path) : setCover(d.path);
      notify("Image attached. Save your profile to apply it.");
    } catch (x: any) {
      notify(x.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    api("blocked-accounts").then(setBlocked).catch((e:any)=>notify(e.message));
    api("profile")
      .then(setData)
      .catch((e: any) => notify(e.message));
  }, [user, notify]);
  async function update(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api("profile", {
        ...Object.fromEntries(fd),
        photo,
        cover,
        socialNotifications: fd.has("socialNotifications"),
        promotionalNotifications: fd.has("promotionalNotifications"),
        instagramPublic: fd.has("instagramPublic"),
        attendancePublic: fd.has("attendancePublic"),
        discoverable: fd.has("discoverable"),
        achievementsPublic: fd.has("achievementsPublic"),
      });
      await refresh();
      setEdit(false);
      notify("Profile and privacy preferences saved.");
    } catch (x: any) {
      notify(x.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="profile-page">
      <ProfileSheet
        user={user}
        connections={data?.connections}
        badges={data?.badges || []}
        own
        onEdit={() => setEdit(true)}
        notify={notify}
        reload={() => api("profile").then(setData)}
      />
      <div className="profile-content page-width" id="profile-activity">
        <section className="profile-appearance" aria-label="Account login methods"><div><h2>Your login methods</h2><p>Connect Google securely to your existing account.</p></div><GoogleLogin link/></section>
        <section className="profile-appearance" aria-label="Display settings">
          <div>
            <h2>Make it your scene.</h2>
            <p>Choose the appearance that feels right.</p>
          </div>
          <ThemeControl />
        </section>
        <SlidingTabs
          options={["Passport", "Saved events", "Privacy"]}
          value={tab}
          onChange={setTab}
          label="Profile sections"
        />
        {!data ? (
          <Loading />
        ) : tab === "Passport" ? (
          <>
            <div className="passport-heading">
              <div>
                <span className="eyebrow">
                  COLLECT MEMORIES, NOT JUST TICKETS
                </span>
                <h2>
                  Your Event Passport<span>✦</span>
                </h2>
                <p>Only real check-ins become real memories.</p>
              </div>
              <div className="passport-count">
                <strong>
                  {data.attendance.length.toString().padStart(2, "0")}
                </strong>
                <span>
                  VERIFIED
                  <br />
                  NIGHTS OUT
                </span>
              </div>
            </div>
            {data.attendance.length ? (
              <div className="passport-grid">
                {data.attendance.map((a: any) => (
                  <Link
                    className="passport-stamp"
                    key={a.id}
                    href={`/events/${a.event.slug}`}
                  >
                    <CheckCircle2 size={25} />
                    <span className="eyebrow">VERIFIED ATTENDANCE</span>
                    <h3>{a.event.title}</h3>
                    <span>
                      {date(a.event.startsAt)} · {a.event.city}
                    </span>
                    <small>
                      {a.public
                        ? "Public to opted-in discovery"
                        : "Private memory"}
                    </small>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                icon={Award}
                title="Your first stamp is waiting."
                text="Attend an event and have your ticket checked in. Your verified night will appear here."
              >
                <Link href="/explore" className="button primary">
                  Find your first night
                  <ArrowUpRight size={16} />
                </Link>
              </Empty>
            )}
            <div className="achievements">
              <h3>Little badges. Big memories.</h3>
              <div className="badge-grid">
                {[
                  { name: "First Night Out", icon: Sparkles },
                  { name: "Nightlife Explorer", icon: Compass },
                  { name: "10 Nights to Remember", icon: Award },
                ].map(({ name, icon: Icon }) => (
                  <div
                    className={
                      data.badges.some((b: any) => b.badge.name === name)
                        ? "earned"
                        : ""
                    }
                    key={name}
                  >
                    <span>
                      <Icon size={25} />
                    </span>
                    <strong>{name}</strong>
                    <small>
                      {data.badges.some((b: any) => b.badge.name === name)
                        ? "Unlocked"
                        : "Your story is just beginning"}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : tab === "Saved events" ? (
          data.saved.length ? (
            <div className="event-grid">
              {data.saved.map((e: any) => (
                <EventCard key={e.id} event={e} save={save} />
              ))}
            </div>
          ) : (
            <Empty
              icon={Heart}
              title="Keep a little something for later."
              text="Tap the heart on an event and you’ll find it here."
            />
          )
        ) : (
          <section><h2>Privacy</h2><p>Profile discovery and event-attendance sharing are separate choices. <button className="text-button" onClick={()=>setEdit(true)}>Edit privacy preferences</button></p><h3>Blocked accounts</h3>{blocked.length ? blocked.map(p=><div className="blocked-account-row" key={p.username}><span>{p.name} (@{p.username})</span><button className="button secondary" onClick={async()=>{try{await api("social",{targetId:p.username,action:"unblock"});setBlocked(await api("blocked-accounts"));notify("Account unblocked. Friendship has not been restored.");}catch(e:any){notify(e.message);}}}>Unblock</button></div>):<p>You have no blocked accounts.</p>}</section>
        )}
        {edit && (
          <Modal title="Make yourself at home." close={() => setEdit(false)}>
            <form className="form" onSubmit={update}>
              <div className="profile-image-edit">
                <Avatar name={user.name} photo={photo} size={70} />
                <label className="upload-label">
                  Profile photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      uploadProfile(e.target.files[0], "photo")
                    }
                  />
                </label>
              </div>
              <label className="upload-label">
                Cover image
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    uploadProfile(e.target.files[0], "cover")
                  }
                />
              </label>
              <div className="form-grid">
                <label>
                  Display name
                  <input name="name" defaultValue={user.name} required />
                </label>
                <label>
                  City
                  <select name="city" defaultValue={user.city}>
                    {cities.slice(1).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Username
                <input
                  aria-label="Username"
                  name="username"
                  defaultValue={user.username}
                  required
                  minLength={3}
                  maxLength={24}
                  pattern="[a-z0-9_]{3,24}"
                  autoComplete="username"
                  spellCheck={false}
                />
                <small>
                  Use 3–24 lowercase letters, numbers or underscores. Changing
                  this updates your profile link.
                </small>
              </label>
              <label>
                A little about you
                <textarea name="bio" defaultValue={user.bio} maxLength={400} />
              </label>
              <label>
                Your sounds (comma separated)
                <input
                  name="interests"
                  defaultValue={user.interests}
                  maxLength={200}
                />
              </label>
              <label>
                Your website
                <input
                  type="url"
                  name="website"
                  defaultValue={user.website || ""}
                  placeholder="https://yourwebsite.com"
                  maxLength={240}
                />
                <small>This link is visible on your profile.</small>
              </label>
              <label>
                Instagram username
                <input
                  name="instagram"
                  defaultValue={user.instagram}
                  maxLength={30}
                />
              </label>
              <h3>Your space. Your rules.</h3>
              <label>TikTok profile URL<input type="url" name="tiktok" defaultValue={user.tiktok || ""} placeholder="https://www.tiktok.com/@username"/></label>
              {[
                [
                  "socialNotifications",
                  "In-app friend request notifications",
                ],
                [
                  "promotionalNotifications",
                  "Allow optional promotional updates (off by default)",
                ],
                ["instagramPublic", "Show my Instagram publicly"],
                ["discoverable", "Let others find my profile"],
                [
                  "attendancePublic",
                  "Public profile attendance preference (event consent is still required)",
                ],
                ["achievementsPublic", "Show my earned badges publicly"],
              ].map(([key, label]) => (
                <label className="checkbox" key={key}>
                  <input
                    type="checkbox"
                    name={key}
                    defaultChecked={user[key]}
                  />
                  {label}
                </label>
              ))}
              <p className="muted small">
                Every event starts with private attendance. Opt in separately
                from My Tickets. Date of birth and registration details are
                never public.
              </p>
              <button className="button primary full" disabled={busy}>
                {busy ? "Saving…" : "Save my profile"}
                <Check size={17} />
              </button>
              <button
                type="button"
                className="text-button danger"
                onClick={async () => {
                  if (
                    confirm(
                      "Deactivate your account? Your profile will disappear and all sessions will end.",
                    )
                  ) {
                    await api("deactivate", {});
                    await refresh();
                    setEdit(false);
                    notify("Account deactivated.");
                  }
                }}
              >
                Deactivate account
              </button>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
function PublicProfile({ username, notify }: any) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api(`people/${username}`)
        .then(setData)
        .catch((e: any) => setError(e.message)),
    [username],
  );
  useEffect(() => {
    load();
  }, [load]);
  async function social(action: string) {
    try {
      await api("social", { targetId: data.user.id, action });
      notify(
        action === "request" ? "Friend request sent." : "Connection updated.",
      );
      load();
    } catch (e: any) {
      notify(e.message);
    }
  }
  if (error)
    return (
      <Empty icon={LockKeyhole} title="This space is private." text={error} />
    );
  if (!data) return <Loading />;
  const u = data.user;
  return (
    <div className="profile-page">
      <ProfileSheet
        user={u}
        connections={data.connections}
        badges={data.badges}
        friend={data.friend}
        following={data.following}
        request={data.request}
        requestIncoming={data.requestIncoming}
        onSocial={social}
        reload={load}
        notify={notify}
      />
      <div className="profile-content page-width">
        <section className="detail-section mt">
          <h3>Shared by {u.name.split(" ")[0]}</h3>
          <p className="muted">
            Only verified memories explicitly made public appear here.
          </p>
          {data.attendance.length ? (
            <div className="passport-grid">
              {data.attendance.map((a: any) => (
                <Link
                  key={a.id}
                  href={`/events/${a.event.slug}`}
                  className="passport-stamp"
                >
                  <CheckCircle2 size={24} />
                  <span className="eyebrow">VERIFIED ATTENDANCE</span>
                  <h3>{a.event.title}</h3>
                  <small>
                    {date(a.event.startsAt)} · {a.event.city}
                  </small>
                </Link>
              ))}
            </div>
          ) : (
            <div className="privacy-note">
              <LockKeyhole size={18} />
              Their event memories are personal. You can still share a sound and
              make a connection.
            </div>
          )}
          {data.badges.length > 0 && (
            <div className="interest-tags">
              {data.badges.map((b: any) => (
                <span key={b.badgeId}>
                  <Award size={15} />
                  {b.badge.name}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export { Profile };
export { PublicProfile };

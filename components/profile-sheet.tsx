"use client";
import Link from "next/link";
import {
  Globe2,
  Instagram,
  Music2,
  Share2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Avatar } from "./shared";
import { safeLink } from "@/lib/page-design";
export function ProfileSheet({
  user: u,
  connections: c = {},
  own = false,
  friend = false,
  request,
  requestIncoming,
  onEdit,
  onSocial,
  notify,
}: any) {
  return (
    <section className="profile-identity page-width">
      <div className="profile-cover">
        <img
          src={u.cover || "/images/profile-cover.png"}
          alt=""
          width={1200}
          height={280}
        />
      </div>
      <div className="profile-identity-body">
        <Avatar photo={u.photo} name={u.name} size={96} />
        <div>
          <h1>{u.name}</h1>
          <p>@{u.username}</p>
          <p>
            <MapPin size={16} aria-hidden="true" />
            {u.city}
          </p>
        </div>
        <div className="setup-actions">
          {own ? (
            <button className="button primary" onClick={onEdit}>
              Edit profile
            </button>
          ) : friend ? (
            <button
              className="button secondary"
              onClick={() => {
                if (confirm("Remove this friend?")) onSocial?.("remove");
              }}
            >
              Remove friend
            </button>
          ) : request === "PENDING" ? (
            requestIncoming ? (
              <>
                <button
                  className="button primary"
                  onClick={() => onSocial?.("accept")}
                >
                  Accept request
                </button>
                <button
                  className="button secondary"
                  onClick={() => onSocial?.("reject")}
                >
                  Decline
                </button>
              </>
            ) : (
              <button
                className="button secondary"
                onClick={() => onSocial?.("cancel")}
              >
                Cancel request
              </button>
            )
          ) : (
            <button
              className="button primary"
              onClick={() => onSocial?.("request")}
            >
              Add friend
            </button>
          )}
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  location.origin + "/people/" + u.username,
                );
                notify("Profile link copied.");
              } catch {
                notify(
                  "Your profile link: " +
                    location.origin +
                    "/people/" +
                    u.username,
                );
              }
            }}
          >
            <Share2 size={16} aria-hidden="true" />
            Share profile
          </button>
          {!own && (
            <button
              className="button secondary"
              onClick={() => {
                if (confirm("Block this profile?")) onSocial?.("block");
              }}
            >
              <ShieldCheck size={16} aria-hidden="true" />
              Block
            </button>
          )}
        </div>
        <p className="profile-bio">{u.bio || "No bio added yet."}</p>
        <div className="profile-social-links">
          {safeLink(u.website) && (
            <a
              href={safeLink(u.website)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Globe2 size={18} aria-hidden="true" />
              Website
            </a>
          )}
          {u.instagram && /^[a-zA-Z0-9_.]{1,30}$/.test(u.instagram) && (
            <a
              href={"https://instagram.com/" + u.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram size={18} aria-hidden="true" />
              Instagram
            </a>
          )}
          {/^https:\/\/(?:www\.)?tiktok\.com\/@[\w.]+\/?$/.test(
            u.tiktok || "",
          ) && (
            <a href={u.tiktok} target="_blank" rel="noopener noreferrer">
              <Music2 size={18} aria-hidden="true" />
              TikTok
            </a>
          )}
        </div>
        <p>
          {(c.friends || []).length} friends
          {!own && ` · ${(c.mutualFriends || []).length} mutual friends`}
        </p>
        {own && (
          <Link href="/friends?tab=Requests">Manage friend requests</Link>
        )}
      </div>
    </section>
  );
}

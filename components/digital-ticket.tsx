"use client";
import { EventArtwork } from "./event-artwork";
import { BrandSymbol } from "./brand";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Share2,
  Download,
  QrCode,
  ChevronsRight,
  CheckCircle2,
  ShieldCheck,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { api, date, time, Loading, Modal, ModalCloseButton } from "./shared";

type EntryTicket = {
  testOnly?: boolean;
  id: string;
  token: string;
  status: string;
  qr: string;
  holder: string;
  tier: string;
  event: {
    title: string;
    image: string;
    theme?: string;
    visualPreset?: string;
    startsAt: string;
    venue: string;
    city: string;
    organizer?: string | {name:string};
  };
};
export function DigitalTicket({
  id,
  close,
  notify,
  apiPrefix = "ticket/",
}: {
  id: string;
  apiPrefix?: string;
  close: () => void;
  notify: (message: string) => void;
}) {
  const [ticket, setTicket] = useState<EntryTicket | null>(null),
    [error, setError] = useState(""),
    [showQR, setShowQR] = useState(false),
    [saving, setSaving] = useState(false);
  const qrPanel = useRef<HTMLDialogElement>(null);
  async function load() {
    setError("");
    try {
      setTicket(await api(`${apiPrefix}${id}`));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, [id]);
  useEffect(() => {
    if (showQR) {
      qrPanel.current?.showModal();
      qrPanel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    } else document.querySelector<HTMLElement>(".entry-expand")?.focus();
  }, [showQR]);
  async function download(safe = false) {
    if (!ticket || saving) return;
    const link = document.createElement("a");
    link.href = `/api/${apiPrefix === "customer/ticket/" ? "customer/" : ""}ticket-export/${ticket.id}${safe ? "?share=1" : ""}`;
    link.download = "";
    link.click();
  }

  return (
    <Modal
      title="Your digital ticket"
      close={close}
      className="ticket-modal"
      hideHeader
    >
      <div className="entry-toolbar">
        <ModalCloseButton aria-label="Close ticket">
          <ArrowLeft size={22} />
        </ModalCloseButton>
        <h2>{ticket?.testOnly ? "TEST ticket" : "Ticket"}</h2>
        <button
          aria-label="Save safe share preview"
          disabled={saving || !ticket}
          onClick={() => download(true)}
        >
          <Share2 size={20} />
        </button>
      </div>
      {error ? (
        <div className="entry-error">
          <p>{error}</p>
          <button className="button secondary" onClick={load}>
            <RefreshCw size={17} />
            Try again
          </button>
        </div>
      ) : !ticket ? (
        <Loading />
      ) : (
        <>
          {ticket.testOnly && (
            <p className="setup-notice">
              Fictional ticket · no real-world admission.
            </p>
          )}
          <article
            className="entry-paper"
            data-ticket-theme={(
              ticket.event.visualPreset ||
              ticket.event.theme ||
              "Electric"
            ).toLowerCase()}
          >
            <div className="entry-art">
              <EventArtwork
                sizes="420px"
                src={ticket.event.image}
                alt=""
                width={800}
                height={600}
              />
              <h1 className="entry-event-title">{ticket.event.title}</h1>
              <span className="entry-brand">
                <BrandSymbol decorative />
                MixerMates
                <small>{ticket.testOnly ? "TEST ONLY" : "ADMIT ONE"}</small>
              </span>
            </div>
            <div className="entry-paper-content">
              {ticket.event.organizer && <p className="entry-organizer">Hosted by {typeof ticket.event.organizer==="string"?ticket.event.organizer:ticket.event.organizer.name}</p>}
              <div className="entry-details">
                <div>
                  <span>Date</span>
                  <strong>
                    {date(ticket.event.startsAt, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </div>
                <div className="right">
                  <span>Time</span>
                  <strong>{time(ticket.event.startsAt)} MYT</strong>
                </div>
                <div className="full">
                  <span>Location</span>
                  <strong>{ticket.event.venue}</strong>
                </div>
                <div>
                  <span>Ticket holder</span>
                  <strong>{ticket.holder}</strong>
                </div>
                <div className="right">
                  <span>Admission</span>
                  <strong>{ticket.tier}</strong>
                </div>
              </div>
              <div className="ticket-tear" />
              {ticket.qr && (
                <div className="entry-ticket-qr">
                  <img
                    src={ticket.qr}
                    width={280}
                    height={280}
                    alt="Private admission QR"
                  />
                  <p>Keep this code private. One ticket, one entry.</p>
                  <button
                    className="entry-expand"
                    onClick={() => setShowQR(true)}
                  >
                    Full-screen QR
                  </button>
                </div>
              )}
              {!ticket.qr && (
                <p className="entry-unavailable">
                  {ticket.status === "CHECKED_IN"
                    ? "Already checked in — see your Event Passport."
                    : "Not valid for entry. Contact the organizer if you need help."}
                </p>
              )}

              <div className="entry-reference"><span>Ticket reference · general admission</span><code>{ticket.id}</code></div>
              <div className={`entry-state ${ticket.status.toLowerCase()}`}>
                <span />
                {ticket.status.replaceAll("_", " ")}
                <ShieldCheck size={13} />
              </div>
            </div>
          </article>
          {showQR && (
            <dialog
              className="entry-qr-panel entry-qr-fullscreen"
              id="private-entry-code"
              role="dialog"
              aria-modal="true"
              aria-label="Full-screen private entry QR"
              tabIndex={-1}
              onCancel={(ev) => {
                ev.preventDefault();
                setShowQR(false);
              }}
              onKeyDownCapture={(ev) => {
                if (ev.key === "Escape") {
                  ev.preventDefault();
                  ev.stopPropagation();
                  setShowQR(false);
                }
                if (ev.key === "Tab") {
                  const items =
                    qrPanel.current?.querySelectorAll<HTMLElement>(
                      "button,summary",
                    );
                  if (items?.length) {
                    const first = items[0],
                      last = items[items.length - 1];
                    if (
                      ev.shiftKey &&
                      (document.activeElement === first ||
                        document.activeElement === qrPanel.current)
                    ) {
                      ev.preventDefault();
                      last.focus();
                    } else if (
                      !ev.shiftKey &&
                      document.activeElement === last
                    ) {
                      ev.preventDefault();
                      first.focus();
                    }
                  }
                }
              }}
              ref={qrPanel}
            >
              <div className="row between">
                <strong>Your entry QR</strong>
                <button
                  aria-label="Hide QR code"
                  onClick={() => setShowQR(false)}
                >
                  Close full-screen QR
                </button>
              </div>
              <div
                className={`entry-qr-image ${ticket.status === "CHECKED_IN" ? "used" : ""}`}
              >
                <img
                  src={ticket.qr}
                  width={420}
                  height={420}
                  alt="Private entry QR code"
                />
                {ticket.status === "CHECKED_IN" && (
                  <span>
                    <CheckCircle2 size={30} />
                    Already checked in
                  </span>
                )}
              </div>
              <p>
                {ticket.status === "CHECKED_IN"
                  ? "This ticket has been used. Your verified memory is in your Event Passport."
                  : "Present this code to authorized check-in staff. One ticket, one entry."}
              </p>
              <details>
                <summary>Manual entry code</summary>
                <code>{ticket.token}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ticket.token);
                    notify(
                      "Private entry code copied. Share only with authorized staff.",
                    );
                  }}
                >
                  Copy private code
                </button>
              </details>
            </dialog>
          )}
          <div className="entry-controls">
            <button
              className="entry-download"
              aria-label="Download private ticket"
              disabled={saving}
              onClick={() => download(false)}
            >
              {saving ? (
                <LoaderCircle className="spin" size={21} />
              ) : (
                <Download size={21} />
              )}
            </button>
            <button
              className="entry-reveal"
              disabled={!ticket.qr}
              aria-expanded={showQR}
              aria-controls="private-entry-code"
              onClick={() => setShowQR(!showQR)}
            >
              <span>
                <QrCode size={23} />
              </span>
              <strong>{showQR ? "Hide QR Code" : "Full-screen QR"}</strong>
              <ChevronsRight size={23} />
            </button>
          </div>
          <p className="entry-demo-note">
            {ticket.testOnly
              ? "TEST TICKET · NO REAL PAYMENT"
              : "PRIVATE ADMISSION TICKET"}
          </p>
        </>
      )}
    </Modal>
  );
}

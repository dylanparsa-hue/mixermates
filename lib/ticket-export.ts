import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { eventDateLabel } from "./event-config";
const xml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export async function ticketExport(
  ticket: any,
  event: any,
  holder: string,
  valid: boolean,
  safe: boolean,
  artwork: Buffer | null,
  artworkMime: string,
) {
  const logo = await readFile(
    path.join(process.cwd(), "public/branding/processed/mixermates-symbol.png"),
  );
  const title = event.title.match(/.{1,36}(?:\s|$)|.{1,36}/g)?.slice(0, 3) || [
    event.title,
  ];
  const qr =
    valid && !safe
      ? await QRCode.toDataURL(ticket.token, { width: 400, margin: 3 })
      : "";
  const image = (data: string, y: number, w: number, h: number, id = "", x = (800 - w) / 2) =>
    `<image ${id ? `id="${id}"` : ""} href="${xml(data)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`;
  const text = (value: unknown, y: number, size = 24) =>
    `<text x="64" y="${y}" fill="#101632" font-family="Arial,sans-serif" font-size="${size}">${xml(value)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1400" viewBox="0 0 800 1400"><rect width="800" height="1400" rx="32" fill="#f5f1ff"/><rect x="24" y="24" width="752" height="1352" rx="24" fill="white"/><rect x="24" y="24" width="752" height="105" rx="24" fill="#101632"/>${image("data:image/png;base64," + logo.toString("base64"), 42, 84, 50, "", 650)}<text x="64" y="96" fill="white" font-family="Arial,sans-serif" font-size="26">MixerMates · ${safe ? "SHARE PREVIEW" : ticket.testOnly ? "TEST TICKET" : "PRIVATE TICKET"}</text>${artwork && (!safe || event.access === "PUBLIC") ? image("data:" + artworkMime + ";base64," + artwork.toString("base64"), 150, 672, 320) : image("data:image/png;base64," + logo.toString("base64"), 165, 500, 296)}${title.map((line: string, i: number) => text(line.trim(), 520 + i * 40, 32)).join("")}${text(eventDateLabel(event.startsAt, event.timezone), 670)}${text(safe ? event.city : event.venue, 720)}${text("Admission: " + (ticket.booking?.tier?.name || ticket.tier || "Event ticket"), 755, 20)}${safe ? text("No admission credential or private holder details.", 790) : text("Ticket holder: " + holder, 790) + text("Reference: " + ticket.id, 835, 20)}${qr ? image(qr, 875, 360, 360, "entry-qr") : text(safe ? "NO ADMISSION — SHARE PREVIEW" : "ADMISSION UNAVAILABLE", 940, 26)}${text(ticket.testOnly ? "TEST ONLY — NOT VALID FOR THE ACTUAL EVENT" : safe ? "Keep your actual ticket private." : ticket.status, 1300, 22)}</svg>`;
}

import { z } from "zod";
/** Store a bounded, allowlisted document tree. No arbitrary HTML, CSS or scripts. */
export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  marks?: { type: string; attrs?: Record<string, any> }[];
  content?: RichNode[];
};
export const safeLink = (value: unknown) => {
  if (typeof value !== "string" || value.length > 500) return "";
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
};
export const safeImage = (value: unknown) =>
  typeof value === "string" &&
  /^(?:\/api\/media\/[a-z0-9]{1,191}|\/images\/[a-z0-9_-]+\.(?:jpg|png|webp))$/.test(
    value,
  )
    ? value
    : "";
const nodeTypes = new Set([
  "doc",
  "paragraph",
  "heading",
  "text",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "hardBreak",
  "horizontalRule",
  "image",
]);
export function cleanDocument(input: unknown): RichNode {
  let count = 0,
    characters = 0;
  const visit = (v: any, depth = 0): RichNode => {
    if (++count > 2000 || depth > 12 || !v || !nodeTypes.has(v.type))
      throw Error(
        "Use supported description formatting (maximum 2,000 blocks and 12 nesting levels).",
      );
    const n: RichNode = { type: v.type };
    if (v.type === "text") {
      n.text = String(v.text || "");
      characters += n.text.length;
      if (characters > 50000)
        throw Error("Description exceeds 50,000 characters.");
    }
    if (v.type === "heading")
      n.attrs = { level: [2, 3].includes(v.attrs?.level) ? v.attrs.level : 2 };
    if (
      ["paragraph", "heading"].includes(v.type) &&
      ["left", "center", "right"].includes(v.attrs?.textAlign)
    )
      n.attrs = { ...n.attrs, textAlign: v.attrs.textAlign };
    if (v.type === "image") {
      const src = safeImage(v.attrs?.src);
      if (!src)
        throw Error("Description images must be uploaded event artwork.");
      n.attrs = {
        src,
        alt: String(v.attrs?.alt || "Event photo").slice(0, 200),
      };
    }
    if (v.marks)
      n.marks = v.marks
        .filter((m: any) =>
          ["bold", "italic", "underline", "strike", "link"].includes(m.type),
        )
        .map((m: any) =>
          m.type === "link"
            ? { type: "link", attrs: { href: safeLink(m.attrs?.href) } }
            : { type: m.type },
        )
        .filter((m: any) => m.type !== "link" || m.attrs.href);
    if (Array.isArray(v.content))
      n.content = v.content.map((x: any) => visit(x, depth + 1));
    return n;
  };
  const doc = visit(input);
  if (doc.type !== "doc") throw Error("Description must be a document.");
  return doc;
}
const documentInput = z.unknown().transform((v, ctx) => {
  try {
    return cleanDocument(v);
  } catch (e: any) {
    ctx.addIssue({ code: "custom", message: e.message });
    return z.NEVER;
  }
});
const crop = z
  .object({
    x: z.number().min(0).max(100).default(50),
    y: z.number().min(0).max(100).default(50),
    zoom: z.number().min(1).max(3).default(1),
  })
  .strict();
export const designInput = z
  .object({
    version: z.literal(1).default(1),
    venueMode: z.enum(["PHYSICAL", "TBA", "PRIVATE"]).default("PHYSICAL"),
    directions: z.string().max(1000).default(""),
    tags: z.string().max(240).default(""),
    accent: z.enum(["rose", "violet", "ocean", "amber"]).default("rose"),
    background: z.enum(["plain", "soft"]).default("plain"),
    banner: crop.default(() => ({ x: 50, y: 50, zoom: 1 })),
    poster: crop.default(() => ({ x: 50, y: 50, zoom: 1 })),
    about: documentInput.optional(),
    sections: z
      .array(
        z
          .object({
            id: z.string().regex(/^[\w-]{1,60}$/),
            title: z.string().trim().max(80),
            content: documentInput,
          })
          .strict(),
      )
      .max(8)
      .default([]),
  })
  .strict();
export type PageDesign = z.infer<typeof designInput>;
export function readDesign(input: unknown): PageDesign {
  try {
    return designInput.parse(
      typeof input === "string" ? JSON.parse(input) : input || {},
    );
  } catch {
    return designInput.parse({});
  }
}
export function designAssets(d: PageDesign) {
  const assets: string[] = [];
  const walk = (n?: RichNode) => {
    if (n?.type === "image") assets.push(n.attrs!.src);
    n?.content?.forEach(walk);
  };
  walk(d.about);
  d.sections.forEach((s) => walk(s.content));
  if (assets.length > 50) throw Error("400:Use at most 50 description images.");
  return assets;
}
export function documentText(n?: RichNode): string {
  return n?.text || n?.content?.map(documentText).join(" ") || "";
}

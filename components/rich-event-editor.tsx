"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link,
  ImagePlus,
  Undo2,
  Redo2,
} from "lucide-react";
import { safeLink, type RichNode } from "@/lib/page-design";
export default function RichEventEditor({
  value,
  onChange,
  label,
  uploadImage,
}: {
  value?: RichNode;
  onChange: (v: RichNode) => void;
  label: string;
  uploadImage: (file: File) => Promise<string>;
}) {
  const latest = useRef(onChange);
  latest.current = onChange;
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: false },
      }),
      Image.configure({ allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    onUpdate: ({ editor }) => latest.current(editor.getJSON() as RichNode),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        class: "rich-editor-content",
      },
    },
  });
  useEffect(() => {
    if (
      editor &&
      value &&
      JSON.stringify(editor.getJSON()) !== JSON.stringify(value)
    )
      editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);
  if (!editor) return <p role="status">Opening description editor…</p>;
  const button = (name: string, Icon: any, run: () => void, active = false) => (
    <button
      type="button"
      aria-label={name}
      title={name}
      aria-pressed={active}
      onClick={run}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
  return (
    <div className="rich-editor">
      <div
        className="rich-toolbar"
        role="toolbar"
        aria-label={`${label} formatting`}
      >
        {button(
          "Bold",
          Bold,
          () => editor.chain().focus().toggleBold().run(),
          editor.isActive("bold"),
        )}
        {button(
          "Italic",
          Italic,
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive("italic"),
        )}
        <label>
          <span className="sr-only">Paragraph style</span>
          <select
            aria-label="Paragraph style"
            value={
              editor.isActive("heading", { level: 2 })
                ? "2"
                : editor.isActive("heading", { level: 3 })
                  ? "3"
                  : "0"
            }
            onChange={(e) => {
              const level = Number(e.target.value);
              level
                ? editor
                    .chain()
                    .focus()
                    .setHeading({ level: level as 2 | 3 })
                    .run()
                : editor.chain().focus().setParagraph().run();
            }}
          >
            <option value="0">Paragraph</option>
            <option value="2">Heading</option>
            <option value="3">Subheading</option>
          </select>
        </label>
        {button(
          "Bullet list",
          List,
          () => editor.chain().focus().toggleBulletList().run(),
          editor.isActive("bulletList"),
        )}
        {button(
          "Numbered list",
          ListOrdered,
          () => editor.chain().focus().toggleOrderedList().run(),
          editor.isActive("orderedList"),
        )}
        {button("Undo", Undo2, () => editor.chain().focus().undo().run())}
        {button("Redo", Redo2, () => editor.chain().focus().redo().run())}
        <label className="rich-image-button">
          <ImagePlus size={18} aria-hidden="true" />
          <span>{busy ? "Uploading…" : "Image"}</span>
          <input
            aria-label={`Insert image into ${label}`}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                const src = await uploadImage(file);
                editor
                  .chain()
                  .focus("end")
                  .setImage({ src, alt: file.name.replace(/\.[^.]+$/, "") })
                  .run();
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      </div>
      <EditorContent editor={editor} />
      <details className="rich-advanced">
        <summary>Links & alignment</summary>
        <label>
          Link URL
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://example.com"
          />
        </label>
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            const href = safeLink(link);
            if (!href) {
              setError("Enter a full http or https URL.");
              return;
            }
            editor.chain().focus().setLink({ href }).run();
            setError("");
          }}
        >
          Add link to selection
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          Remove link
        </button>
        <label>
          Text alignment
          <select
            aria-label="Text alignment"
            onChange={(e) =>
              editor.chain().focus().setTextAlign(e.target.value).run()
            }
            defaultValue="left"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
      </details>
      {error && (
        <p role="alert" className="creator-field-error">
          {error}
        </p>
      )}
    </div>
  );
}

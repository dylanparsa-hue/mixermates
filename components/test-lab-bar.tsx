"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
export function TestLabBar({ initial = null }: { initial?: any }) {
  const pathname = usePathname();
  const [state, setState] = useState<any>(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      fetch("/api/test-lab/state")
        .then((r) => (r.ok ? r.json() : null))
        .then(setState)
        .catch(() => {});
    };
    refresh();
    window.addEventListener("mm-lab-session", refresh);
    return () => window.removeEventListener("mm-lab-session", refresh);
  }, [pathname]);
  if (!state) return null;
  async function change(value: string) {
    setBusy(true);
    setError("");
    const main = ["Customer", "Organizer", "Admin"].includes(value);
    try {
      const r = await fetch(
        "/api/test-lab/" + (main ? "workspace" : "switch"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            main
              ? { workspace: value }
              : {
                  role:
                    value === "Registration Reviewer" ? "Administrator" : value,
                },
          ),
        },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      location.assign(
        value === "Customer"
          ? "/explore"
          : value === "Admin"
            ? "/admin"
            : ["Finance Reviewer", "Registration Reviewer"].includes(value)
              ? "/organizer?tab=Booking%20reviews"
              : value === "Entrance Staff"
                ? "/organizer?tab=Entrance"
                : "/organizer",
      );
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }
  const value = ["Customer", "Organizer", "Admin"].includes(state.workspace)
    ? state.workspace
    : "";
  return (
    <aside className="mm-lab-bar" aria-label="Local testing workspace">
      <Link href="/explore">
        <FlaskConical size={18} aria-hidden="true" />
        Local sandbox
      </Link>
      <span>Fictional data · no money</span>
      <label>
        Workspace{" "}
        <select
          aria-label="Workspace"
          value={value}
          disabled={busy}
          onChange={(e) => change(e.target.value)}
        >
          {!value && <option value="">Independent review</option>}
          <option>Customer</option>
          <option>Organizer</option>
          <option>Admin</option>
        </select>
      </label>
      <details className="lab-review-tools">
        <summary>Review tools</summary>
        <div>
          <button disabled={busy} onClick={() => change("Finance Reviewer")}>
            Independent payment reviewer
          </button>
          <button
            disabled={busy}
            onClick={() => change("Registration Reviewer")}
          >
            Independent registration reviewer
          </button>
          <button disabled={busy} onClick={() => change("Entrance Staff")}>
            Entrance staff
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await fetch("/api/test-lab/private-invitation", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: "{}",
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                location.assign(d.url);
              } catch (e: any) {
                setError(e.message);
                setBusy(false);
              }
            }}
          >
            Private TEST invitation
          </button>
          {state.simulatorEnabled && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const r = await fetch("/api/customer/simulator/scenarios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: "{}",
                  });
                  const d = await r.json();
                  if (!r.ok) throw Error(d.error);
                  location.assign("/explore?view=all");
                } catch (e: any) {
                  setError(e.message);
                  setBusy(false);
                }
              }}
            >
              Add fresh TEST events
            </button>
          )}
          <Link href="/test-lab">Developer tools</Link>
        </div>
      </details>
      <small>Acting as {state.identity?.name}</small>
      {error && <span role="alert">{error}</span>}
    </aside>
  );
}

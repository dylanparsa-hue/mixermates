"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
export function PreviewShell({userId,role,children}:{userId:string;role:string;children:ReactNode}) {
  const root=useRef<HTMLDivElement>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    const hide=()=>{if(root.current)root.current.hidden=true;};
    const restore=(event:PageTransitionEvent)=>{if(event.persisted)window.location.reload();};
    const verify=async()=>{
      if(document.visibilityState!=="visible")return;
      hide();
      try {
        const response=await fetch("/api/me",{cache:"no-store"});
        const data=await response.json();
        if(!response.ok || data.user?.id!==userId || data.user?.role!==role)window.location.replace("/explore");
        else if(root.current)root.current.hidden=false;
      } catch { window.location.replace("/explore"); }
    };
    window.addEventListener("pagehide",hide);window.addEventListener("pageshow",restore);document.addEventListener("visibilitychange",verify);
    return()=>{window.removeEventListener("pagehide",hide);window.removeEventListener("pageshow",restore);document.removeEventListener("visibilitychange",verify);};
  },[userId,role]);
  async function logout() {
    setBusy(true);setError("");
    try {
      const response=await fetch("/api/logout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      if(!response.ok)throw Error();
      if(root.current)root.current.hidden=true;
      window.location.replace("/explore");
    } catch {setError("Could not sign out. Try again.");setBusy(false);}
  }
  return <div ref={root} className="preview-shell">
    <aside className="preview-notice" aria-label="Restricted preview">
      <span>{role === "ADMIN" ? "ADMIN" : "ORGANIZER"} PREVIEW — NOT PUBLIC</span>
      <span>Sales disabled</span><Link href="/explore">Explore events</Link>
      <button onClick={logout} disabled={busy}><LogOut size={12} aria-hidden="true"/>{busy ? "Signing out…" : "Sign out"}</button>
      {error && <span role="alert">{error}</span>}
    </aside>
    {children}
  </div>;
}

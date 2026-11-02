"use client";
import { useEffect, useRef, useState } from "react";
import { Modal, cities } from "./shared";

async function googleRequest(action: string,data?: unknown) {
  const response = await fetch("/api/auth/google/" + action,{method:data ? "POST" : "GET",headers:data ? {"Content-Type":"application/json"} : {},body:data ? JSON.stringify(data) : undefined,cache:"no-store"});
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Google sign-in is unavailable.");
  return result;
}
export function GoogleLogin({link=false}:{link?:boolean}) {
  const [status,setStatus] = useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
  useEffect(()=>{googleRequest("status").then(setStatus).catch(()=>setStatus({configured:false}));},[]);
  async function start(password?: string) {
    setBusy(true);setError("");
    try {const result = await googleRequest("start",{purpose:link ? "LINK" : "LOGIN",...(password ? {password} : {})});window.location.assign(result.url);}
    catch(e:any){setError(e.message);setBusy(false);}
  }
  if (link && status?.linked) return <p className="muted">Google is linked to this account. Your existing permissions and password login are preserved.</p>;
  return <div className="google-login">
    <button type="button" className="button secondary full" disabled={!status?.configured || busy} onClick={()=>link ? setConfirm(true) : start()}>
      {busy ? "Connecting…" : link ? "Link Google to this account" : "Continue with Google"}
    </button>
    {status && !status.configured && <p className="muted">Google sign-in is awaiting connection. Use email and password for now.</p>}
    {error && <p role="alert">{error}</p>}
    {confirm && <Modal title="Link your Google account" close={()=>setConfirm(false)}><p>Use the Google account with the same email address. Confirm your current MixerMates password to preserve your existing profile and permissions.</p><form className="form" onSubmit={e=>{e.preventDefault();start(String(new FormData(e.currentTarget).get("password")));}}><label>Current password<input type="password" name="password" autoComplete="current-password" required maxLength={128}/></label><button className="button primary" disabled={busy}>Confirm and continue with Google</button></form></Modal>}
  </div>;
}
export function GoogleSignup({close,refresh}:{close:()=>void;refresh:()=>Promise<void>}) {
  const completed=useRef(false);
  const [pending,setPending]=useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{googleRequest("status").then(r=>r.pending ? setPending(r.pending) : setError("Google signup expired. Close this window and start again.")).catch(e=>setError(e.message));},[]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(!completed.current){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[]);
  return <Modal title="Complete your Google profile" close={()=>{if(confirm("Your profile is incomplete. Finish later? You can resume on your next visit."))close();}}><p>Your signup is pending until you finish this profile. Finish your MixerMates profile. Your date of birth stays private and helps enforce event age restrictions.</p>{pending && <><p>Continue as {pending.email}</p><form className="form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{await googleRequest("complete",Object.fromEntries(new FormData(e.currentTarget)));completed.current=true;await refresh();close();history.replaceState(null,"","/explore");location.assign("/explore");}catch(e:any){setError(e.message);setBusy(false);}}}><label>Full name<input name="name" required minLength={2} maxLength={80} defaultValue={pending.name} autoComplete="name"/></label><label>Username<input name="username" required pattern="[A-Za-z0-9_]{3,24}" maxLength={24} autoComplete="username" spellCheck={false}/></label><label>Date of birth<input name="dob" type="date" required max={new Date().toISOString().slice(0,10)}/></label><label>Your city<select name="city">{cities.slice(1).map(c=><option key={c}>{c}</option>)}</select></label><button className="button primary" disabled={busy}>{busy ? "Creating account…" : "Complete signup"}</button></form></>}<button type="button" className="button secondary" onClick={close}>Finish later</button>{error && <p role="alert">{error}</p>}</Modal>;
}

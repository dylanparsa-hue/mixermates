"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { BrandLogo } from "./brand";
export function AdminLogin() {
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(() => { if (error) document.getElementById("admin-login-error")?.focus(); }, [error]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");setBusy(true);
    const form=new FormData(event.currentTarget);
    try {
      const response=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.get("email"),password:form.get("password")})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error || "Sign-in failed. Try again.");
      window.location.replace("/");
    } catch(e) { setError(e instanceof Error ? e.message : "Connection failed. Try again.");setBusy(false); }
  }
  return <main className="access-shell admin-login-shell">
    <header className="access-header"><Link href="/explore" aria-label="MixerMates home"><BrandLogo theme="dark" decorative/></Link><Link href="/explore" className="access-back"><ArrowLeft size={15} aria-hidden="true"/>Back</Link></header>
    <section className="admin-login-form" aria-labelledby="admin-login-title">
      <LockKeyhole size={24} aria-hidden="true"/>
      <h1 id="admin-login-title">A little behind<br/>the scenes.</h1>
      <p>Sign in with your authorized administrator account.</p>
      <form onSubmit={submit}>
        <label htmlFor="admin-email">Email address</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" spellCheck={false} required placeholder="you@example.com" maxLength={254} disabled={busy}/>
        <label htmlFor="admin-password">Password</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required placeholder="Your password" maxLength={128} disabled={busy}/>
        {error && <p id="admin-login-error" className="admin-login-error" role="alert" tabIndex={-1}>{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<ArrowRight size={17} aria-hidden="true"/></button>
      </form>
      <small>Restricted preview. Access is checked on the server.</small>
    </section>
  </main>;
}

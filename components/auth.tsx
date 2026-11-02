"use client";
import { BrandLogo } from "./brand";
import { useState } from "react";
import { ArrowUpRight, CircleAlert, LoaderCircle } from "lucide-react";
import { api, date, cities, Modal } from "./shared";
import { GoogleLogin, GoogleSignup } from "./google-login";

function Auth({
  mode,
  setMode,
  close,
  refresh,
  notify,
  demo,
  switchAccount,
  localLab = false,
  initialResetToken = "",
}: any) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState("");
  const [resetToken, setResetToken] = useState(initialResetToken);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (mode === "reset") {
        if (resetToken) {
          await api("reset-password", {
            token: resetToken,
            password: form.password,
          });
          setMode("login");
          setResetToken("");
          setRecovery("");
          notify("Password updated. Sign in with your new password.");
        } else {
          const d = await api("reset-request", { email: form.email });
          setRecovery(d.message);
          if (d.demoToken) setResetToken(d.demoToken);
        }
      } else {
        await api(mode, form);
        await refresh();
        close();
        notify(
          mode === "register"
            ? "Welcome to your next great chapter."
            : "Welcome back. Your next night is waiting.",
        );
      }
    } catch (x: any) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  }
  if (mode === "google") return <GoogleSignup close={close} refresh={refresh}/>;
  return (
    <Modal
      title={
        mode === "register"
          ? "Find where you belong."
          : mode === "reset"
            ? "Let’s get you back in."
            : "Welcome to your next night."
      }
      close={close}
    >
      <BrandLogo className="auth-brand" size="large" />
      <p className="muted">
        {mode === "register"
          ? "Create your free MixerMates account. Good things happen when you show up."
          : "Your people. Your plans. All in one place."}
      </p>
      {(mode === "login" || mode === "register") && <GoogleLogin/>}
      <form onSubmit={submit} className="form">
        {mode === "register" && (
          <div className="form-grid">
            <label>
              Full name
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                placeholder="Alex Morgan"
              />
            </label>
            <label>
              Username
              <input
                name="username"
                required
                pattern="[A-Za-z0-9_]{3,24}"
                placeholder="yourname"
                autoComplete="username"
              />
            </label>
          </div>
        )}
        {!resetToken && (
          <label>
            Email address
            <input
              type="email"
              name="email"
              required
              placeholder={localLab ? "you@example.test" : "you@example.com"}
              autoComplete="email"
            />
          </label>
        )}
        {(mode !== "reset" || resetToken) && (
          <label>
            {resetToken ? "New password" : "Password"}
            <input
              name="password"
              type="password"
              required
              minLength={mode === "register" || resetToken ? 10 : 1}
              placeholder={
                mode === "register" ? "At least 10 characters" : "Your password"
              }
              autoComplete={
                mode === "register" || resetToken
                  ? "new-password"
                  : "current-password"
              }
            />
          </label>
        )}
        {mode === "register" && (
          <div className="form-grid">
            <label>
              Date of birth
              <input
                name="dob"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
              />
              <small>Always private. Used for age restrictions.</small>
            </label>
            <label>
              Your city
              <select name="city">
                {cities.slice(1).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        {error && (
          <div role="alert" className="alert error">
            <CircleAlert size={17} />
            {error}
          </div>
        )}
        {recovery && (
          <div className="alert">
            {recovery}
            {localLab && !resetToken && (
              <button
                type="button"
                className="button secondary"
                onClick={async () => {
                  try {
                    const email = (
                      document.querySelector(
                        'input[name="email"]',
                      ) as HTMLInputElement
                    )?.value;
                    const mail = await api("test-lab/mailbox", { email });
                    setResetToken(mail.token);
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
              >
                Open local recovery mailbox
              </button>
            )}
            {resetToken && (
              <small>
                Local demo: recovery token loaded securely into this form. Set
                your new password below.
              </small>
            )}
          </div>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : mode === "register" ? (
            "Create account"
          ) : mode === "reset" ? (
            resetToken ? (
              "Update password"
            ) : (
              "Request recovery"
            )
          ) : (
            "Sign in"
          )}
          <ArrowUpRight size={17} />
        </button>
      </form>
      <div className="auth-links">
        {mode === "login" ? (
          <>
            <button onClick={() => setMode("reset")}>Forgot password?</button>
            <span>
              New here?{" "}
              <button
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Join MixerMates
              </button>
            </span>
          </>
        ) : (
          <button
            onClick={() => {
              setMode("login");
              setError("");
              setResetToken("");
            }}
          >
            Back to sign in
          </button>
        )}
      </div>
      {demo && (
        <div className="demo-auth">
          <span className="eyebrow">JUST LOOKING AROUND? TRY A DEMO.</span>
          <div className="demo-buttons">
            {["attendee", "organizer", "staff", "admin"].map((id) => (
              <button
                key={id}
                onClick={async () => {
                  await switchAccount(id);
                  close();
                }}
              >
                {id}
                <ArrowUpRight size={12} />
              </button>
            ))}
          </div>
          <small>
            Fictional accounts · Simulated payments · Local development only
          </small>
        </div>
      )}
    </Modal>
  );
}

export { Auth };

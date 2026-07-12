"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@todo/shared";
import { WIcon, WheelMark, SpinPill, Headline } from "@/components/ui/kit";

type Mode = "login" | "signup";

interface AuthPageProps {
  onAuthenticated: () => void;
}

function Wordmark() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <WheelMark size={26} spin />
      <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>WheelToDo</span>
    </span>
  );
}

function SegToggle({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <div style={{ background: "var(--bg-sunk)", borderRadius: "var(--r-tag)", padding: 4, display: "flex" }}>
      {(["login", "signup"] as const).map((m) => (
        <button key={m} type="button" onClick={() => onChange(m)} style={{
          flex: 1, padding: "10px 0", borderRadius: "var(--r-tag)", border: "none", cursor: "pointer",
          background: value === m ? "var(--bg-card)" : "transparent",
          color: value === m ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: 14, fontWeight: value === m ? 600 : 400,
          boxShadow: value === m ? "var(--shadow-card)" : "none",
          transition: "all 140ms",
        }}>
          {m === "login" ? "Log in" : "Sign up"}
        </button>
      ))}
    </div>
  );
}

function Field({ label, icon, type = "text", value, onChange, placeholder, autoComplete }: {
  label: string; icon: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoComplete?: string;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card)", borderRadius: "var(--r-row)", padding: "0 16px", height: 56, boxShadow: "var(--shadow-card)" }}>
      <WIcon name={icon} size={18} color="var(--text-muted)" stroke={1.8} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</span>
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete}
          style={{ fontSize: 15, color: "var(--text-primary)", background: "transparent", border: "none", outline: "none", padding: 0, fontFamily: "inherit", width: "100%" }}
        />
      </span>
    </label>
  );
}

function LegalLine() {
  return (
    <p style={{ margin: "0 auto", maxWidth: 280, textAlign: "center", fontSize: 11.5, fontWeight: 300, lineHeight: 1.5, color: "var(--text-muted)" }}>
      By continuing you agree to our <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>Terms</span> and{" "}
      <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>Privacy&nbsp;Policy</span>.
    </p>
  );
}

const isEmail = (s: string) => /.+@.+\..+/.test(s.trim());

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [usePw, setUsePw] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setSent(false); setErr(""); }, [mode, usePw]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) { setErr("Enter a valid email address."); return; }
    if (usePw && pw.length < 6) { setErr("Password should be at least 6 characters."); return; }
    if (usePw && mode === "signup" && name.trim().length < 2) { setErr("Add your name so we can say hello."); return; }
    setErr("");
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!usePw) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
        });
        if (error) setErr(error.message);
        else setSent(true);
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) setErr(error.message);
        else onAuthenticated();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(), password: pw,
          options: { data: { display_name: name.trim() } },
        });
        if (error) setErr(error.message);
        else setSent(true);
      }
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const form = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SegToggle value={mode} onChange={setMode} />

      {sent ? (
        <div style={{ background: "var(--bg-card)", borderRadius: 20, padding: "22px 20px", boxShadow: "var(--shadow-card)", display: "flex", alignItems: "center", gap: 13 }}>
          <span style={{ width: 42, height: 42, borderRadius: 999, flexShrink: 0, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <WIcon name="mail" size={20} color="var(--accent)" />
          </span>
          <span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>Check your inbox.</span>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 300, color: "var(--text-secondary)", lineHeight: 1.4, marginTop: 2 }}>
              {usePw ? `A confirmation link is on its way to ${email}.` : `A sign-in link is on its way to ${email}.`}
            </span>
          </span>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {usePw && mode === "signup" && (
            <Field label="Your name" icon="user" value={name} onChange={setName} placeholder="Sam Rivera" autoComplete="name" />
          )}
          <Field label="Email" icon="mail" type="email" value={email} onChange={setEmail} placeholder="you@email.com" autoComplete="email" />
          {usePw && (
            <Field label="Password" icon="lock" type="password" value={pw} onChange={setPw}
              placeholder={mode === "signup" ? "Make it memorable" : "Your password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          )}
          {err && <p style={{ margin: "0 2px", fontSize: 13, fontWeight: 400, color: "var(--action-danger)", lineHeight: 1.4 }}>{err}</p>}
          <SpinPill full type="submit" disabled={loading}>
            {loading ? "One moment…" : usePw ? (mode === "login" ? "Log in" : "Create account") : (
              <>Send me a link<WIcon name="arrowR" size={18} /></>
            )}
          </SpinPill>
          {!usePw && (
            <p style={{ margin: "-2px 2px 0", textAlign: "center", fontSize: 13, fontWeight: 300, color: "var(--text-muted)", lineHeight: 1.45 }}>
              We&apos;ll email you a secure link — no password needed.
            </p>
          )}
        </form>
      )}

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button type="button" onClick={() => setUsePw((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", padding: 4 }}>
          {usePw ? "Use a magic link instead" : "Use a password instead"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg-screen)", display: "flex" }}>

      {/* ── Desktop left panel ── */}
      <div className="wt-desktop-only" style={{ flex: "0 0 50%", background: "var(--accent-soft)", position: "relative", padding: "44px 52px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Wordmark />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 26 }}>
          <Headline lead="Beat decision paralysis." script="Spin" size={96} />
          <p style={{ margin: 0, maxWidth: 360, fontSize: 17, fontWeight: 300, lineHeight: 1.55, color: "var(--ink-soft)" }}>
            Put your tasks on the wheel, let it choose, and drop straight into focus.
            Rest days count too — momentum never breaks.
          </p>
        </div>
        <div style={{ position: "absolute", right: -70, bottom: -70, opacity: 0.9 }}>
          <WheelMark size={300} spin />
        </div>
      </div>

      {/* ── Form column ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px" }}>
        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column" }}>
          <div className="wt-mobile-only" style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <Wordmark />
          </div>
          <Headline
            lead={mode === "login" ? (usePw ? "Good to see you again." : "No password to forget.") : "A few small things at a time."}
            script={mode === "login" ? (usePw ? "Welcome" : "Just you") : "Hello"}
            size={60}
          />
          <div style={{ height: 24 }} />
          {form}
          <div style={{ height: 26 }} />
          <LegalLine />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { WIcon, WheelMark, SectionLabel } from "@/components/ui/kit";

const BLOOM_FEATURES = [
  "Unlimited spins every day",
  "Unlimited tasks on the wheel",
  "Unlimited habits tracked",
  "Unlimited AI task breakdowns",
  "Unlimited AI voice-to-task",
  "Brain Starter every day",
  "AI pattern learning",
  "Cloud sync & backup",
  "Multi-device: phone, tablet, desktop",
  "All future AI features",
];

const COMPARE_ROWS = [
  { label: "Daily spins", seed: "5/day", bloom: "Unlimited" },
  { label: "Tasks on wheel", seed: "8", bloom: "Unlimited" },
  { label: "Habits", seed: "3", bloom: "Unlimited" },
  { label: "AI task breakdown", seed: "1/day", bloom: "Unlimited" },
  { label: "AI voice-to-task", seed: "1/month", bloom: "Unlimited" },
  { label: "Brain Starter game", seed: "1/week", bloom: "1/day" },
  { label: "AI pattern learning", seed: "—", bloom: "✓" },
  { label: "Cloud sync & backup", seed: "—", bloom: "✓" },
  { label: "Multi-device", seed: "—", bloom: "✓" },
];

function BillingToggle({ billing, setBilling }: { billing: string; setBilling: (b: "monthly" | "annual") => void }) {
  return (
    <div style={{ background: "var(--bg-sunk)", borderRadius: "var(--r-tag)", padding: 4, display: "flex", marginBottom: 14 }}>
      {(["monthly", "annual"] as const).map((opt) => (
        <button key={opt} onClick={() => setBilling(opt)} style={{
          flex: 1, padding: "9px 0", borderRadius: "var(--r-tag)",
          background: billing === opt ? "var(--bg-card)" : "transparent",
          border: "none", cursor: "pointer", fontSize: 14,
          fontWeight: billing === opt ? 600 : 400,
          color: billing === opt ? "var(--text-primary)" : "var(--text-muted)",
          boxShadow: billing === opt ? "var(--shadow-card)" : "none",
          transition: "all 140ms", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        }}>
          <span>{opt.charAt(0).toUpperCase() + opt.slice(1)}</span>
          {opt === "annual" && (
            <span style={{ fontSize: 9.5, background: "var(--c-sage)", color: "var(--text-on-ink)", borderRadius: "var(--r-tag)", padding: "2px 6px", fontWeight: 700, letterSpacing: "0.04em" }}>SAVE 33%</span>
          )}
        </button>
      ))}
    </div>
  );
}

function PriceCard({ isAnnual }: { isAnnual: boolean }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "var(--r-card)", padding: "18px 20px", boxShadow: "var(--shadow-card)", marginBottom: 14, position: "relative" }}>
      {isAnnual && (
        <div style={{ position: "absolute", top: -10, right: 16, background: "var(--c-sage)", borderRadius: "var(--r-tag)", padding: "4px 12px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-on-ink)", letterSpacing: "0.06em" }}>LAUNCH OFFER</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 38, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          {isAnnual ? "$33.99" : "$4.99"}
        </span>
        <span style={{ fontSize: 16, color: "var(--text-secondary)", fontWeight: 300 }}>
          {isAnnual ? "first year" : "/month"}
        </span>
      </div>
      {isAnnual ? (
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          <span style={{ textDecoration: "line-through", marginRight: 6, opacity: 0.6 }}>$39.99/year</span>
          $2.83/month · limited time launch offer
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>billed monthly · cancel any time</div>
      )}
    </div>
  );
}

export function UpgradeScreen({ onClose, onActivate }: { onClose: () => void; onActivate: (billing: "monthly" | "annual") => void }) {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const isAnnual = billing === "annual";

  const featureList = (
    <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 24 }}>
      {BLOOM_FEATURES.map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 26, height: 26, borderRadius: 999, background: "var(--c-lavender-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <WIcon name="check" size={12} stroke={2.5} color="var(--c-lavender)" />
          </span>
          <span style={{ fontSize: 15.5, color: "var(--text-primary)", lineHeight: 1.4 }}>{f}</span>
        </div>
      ))}
    </div>
  );

  const cta = (
    <>
      <button onClick={() => onActivate(billing)} className="wt-press" style={{
        width: "100%", height: 54, background: "var(--action-primary)", color: "var(--action-on-primary)",
        border: "none", borderRadius: "var(--r-tag)", fontSize: 16, fontWeight: 600, cursor: "pointer", marginBottom: 12,
      }}>
        Try Bloom · 7 days free
      </button>
      <div style={{ textAlign: "center" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--text-muted)", padding: 8 }}>
          Continue with Seed
        </button>
      </div>
    </>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "var(--bg-screen)", overflowY: "auto" }}>

      {/* ── Mobile layout ── */}
      <div className="wt-mobile-only" style={{ minHeight: "100%", display: "flex", flexDirection: "column", padding: "18px 22px 32px" }}>
        <button onClick={onClose} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, alignSelf: "flex-start" }}>
          <WIcon name="chevronL" size={20} stroke={2.5} color="var(--c-lavender)" />
          <span style={{ fontSize: 14, color: "var(--c-lavender)", fontWeight: 600 }}>Back</span>
        </button>
        <div className="script" style={{ fontFamily: "var(--font-display)", fontSize: 52, lineHeight: 0.88, color: "var(--text-primary)", marginTop: 16, marginBottom: 22 }}>
          More with<br /><span style={{ color: "var(--c-lavender)" }}>Bloom.</span>
        </div>
        {featureList}
        <BillingToggle billing={billing} setBilling={setBilling} />
        <PriceCard isAnnual={isAnnual} />
        {cta}
      </div>

      {/* ── Desktop split layout ── */}
      <div className="wt-desktop-only" style={{ display: "flex", minHeight: "100%" }}>
        <div style={{ width: 460, background: "var(--bg-card)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 52px 52px", borderRight: "1px solid var(--border-hairline)", flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 48 }}>
              <WheelMark size={30} />
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>WheelToDo</span>
            </div>
            <div className="script" style={{ fontFamily: "var(--font-display)", fontSize: 76, lineHeight: 0.88, color: "var(--text-primary)", marginBottom: 18 }}>
              More with<br /><span style={{ color: "var(--c-lavender)" }}>Bloom.</span>
            </div>
            <p style={{ margin: 0, fontSize: 16, color: "var(--text-secondary)", fontWeight: 300, lineHeight: 1.6 }}>
              Everything you need to build lasting habits — no limits, no caps, just focus.
            </p>
          </div>
          <div>
            <BillingToggle billing={billing} setBilling={setBilling} />
            <PriceCard isAnnual={isAnnual} />
            {cta}
          </div>
        </div>
        <div style={{ flex: 1, padding: "60px 52px", overflowY: "auto" }}>
          <SectionLabel style={{ marginBottom: 24 }}>What you unlock</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 36, maxWidth: 720 }}>
            {BLOOM_FEATURES.map((f, i) => (
              <div key={i} style={{ background: "var(--bg-card)", borderRadius: "var(--r-row)", padding: "13px 16px", boxShadow: "var(--shadow-card)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, background: "var(--c-lavender-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <WIcon name="check" size={10} stroke={2.5} color="var(--c-lavender)" />
                </span>
                <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{f}</span>
              </div>
            ))}
          </div>
          <SectionLabel style={{ marginBottom: 12 }}>Seed vs Bloom</SectionLabel>
          <div style={{ background: "var(--bg-card)", borderRadius: "var(--r-card)", overflow: "hidden", boxShadow: "var(--shadow-card)", maxWidth: 720 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px", padding: "10px 20px", background: "var(--bg-sunk)" }}>
              <div />
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>Seed</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--c-lavender)", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>Bloom</div>
            </div>
            {COMPARE_ROWS.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px", padding: "11px 20px", borderTop: "1px solid var(--border-hairline)" }}>
                <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{r.label}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>{r.seed}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>{r.bloom}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Inline nudge row used from Seed limit states */
export function BloomNudge({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="wt-press" style={{
      width: "100%", background: "var(--bg-sunk)", border: "none", borderRadius: "var(--r-card)",
      padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left",
    }}>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>$4.99/month · cancel any time</span>
      </span>
      <WIcon name="chevronR" size={16} stroke={2.5} color="var(--accent)" />
    </button>
  );
}

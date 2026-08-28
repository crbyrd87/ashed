import { useState, useEffect } from "react";
import { SANS, color } from "./theme";
import { supabase } from "./supabase";

const FOUNDING_MEMBER_SLOTS = 100;

const FEATURE_COPY = {
  band_scanner: {
    icon: "📷",
    title: "Band Scanner is Premium",
    description: "Point your camera at any cigar band and AI instantly identifies the brand, line, vitola, strength, and origin.",
    perks: [
      "Instant AI identification from any band photo",
      "Auto-fills check-in with cigar details",
      "Add directly to humidor or wishlist",
      "Works on cigars not yet in our database",
    ],
  },
  recommendations: {
    icon: "✨",
    title: "AI Recommendations is Premium",
    description: "Get personalized cigar picks based on everything you've smoked and rated — your own AI sommelier.",
    perks: [
      "Tailored to your exact taste profile",
      "Updates automatically as you log more smokes",
      "Explains why each cigar matches your palate",
      "Discovers cigars you'd never find on your own",
    ],
  },
  pairings: {
    icon: "🥃",
    title: "Drink Pairings is Premium",
    description: "AI-generated drink pairings for every cigar — spirits, beer, coffee, and non-alcoholic options.",
    perks: [
      "Spirits, beer, coffee & non-alcoholic pairings",
      "Seasonal suggestions based on time of year",
      "'I don't drink X' alternative suggestions",
      "Instant load — pairings cached after first use",
    ],
  },
  wishlist_cap: {
    icon: "🔖",
    title: "Wishlist Limit Reached",
    description: "Free accounts can save up to 20 cigars on their wishlist. Upgrade for unlimited everything.",
    perks: [
      "Unlimited wishlist — save every cigar you want",
      "Unlimited humidor — track your full collection",
      "AI Recommendations tailored to your taste",
      "Band Scanner, Drink Pairings & advanced stats",
    ],
  },
  advanced_stats: {
    icon: "📊",
    title: "Advanced Stats is Premium",
    description: "Deep insights into your entire smoking history — trends, flavors, brands, and more.",
    perks: [
      "Monthly check-in trends over time",
      "Flavor profile chart — what you actually like",
      "Brand and origin breakdown",
      "Strength progression as your palate develops",
    ],
  },
};

export default function UpgradePrompt({ feature, onClose }) {
  const [foundingCount, setFoundingCount] = useState(null);

  useEffect(() => {
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_founding_member", true)
      .then(({ count }) => setFoundingCount(count || 0));
  }, []);

  const slotsRemaining = foundingCount !== null ? Math.max(0, FOUNDING_MEMBER_SLOTS - foundingCount) : null;

  const copy = FEATURE_COPY[feature] || {
    icon: "⭐",
    title: "Premium Feature",
    description: "This feature is available to Premium members.",
    perks: [],
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 600, display: "flex", alignItems: "flex-end", fontFamily: SANS }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 420, margin: "0 auto", background: color.bg, borderRadius: "16px 16px 0 0", border: `1px solid ${color.line}`, borderBottom: "none", padding: "24px 24px 36px", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gold top accent */}
        <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 3, background: `linear-gradient(90deg, ${color.gold}, ${color.goldPale})`, borderRadius: "0 0 3px 3px" }} />

        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ width: 36, height: 4, background: color.line, borderRadius: 2 }} />
        </div>

        {/* Icon + title */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>{copy.icon}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: color.text, marginBottom: 8 }}>{copy.title}</div>
          <div style={{ fontSize: 14, color: color.muted, lineHeight: 1.6 }}>{copy.description}</div>
        </div>

        {/* Perks */}
        {copy.perks.length > 0 && (
          <div style={{ background: color.surface, border: `1px solid ${color.line}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
            {copy.perks.map((perk, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < copy.perks.length - 1 ? 10 : 0 }}>
                <span style={{ color: color.gold, fontSize: 14, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 13, color: color.cream }}>{perk}</span>
              </div>
            ))}
          </div>
        )}

        {/* Full premium features summary */}
        <div style={{ borderTop: `1px solid ${color.line}`, paddingTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: color.muted, letterSpacing: 1, marginBottom: 10 }}>EVERYTHING IN PREMIUM</div>
          {[
            "📷 Band Scanner — AI cigar identification",
            "✨ AI Recommendations — personalized picks",
            "🥃 Drink Pairings — spirits, beer, coffee & more",
            "📊 Advanced Stats — trends & flavor profile",
            "🔖 Unlimited wishlist & humidor",
            "🎯 Personal fit score on every cigar",
            "⭐ Premium badge on your profile",
          ].map((item, i) => (
            <div key={i} style={{ fontSize: 12, color: color.muted, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Founding Member Banner */}
        {slotsRemaining !== null && slotsRemaining > 0 && (
          <div style={{ background: `linear-gradient(135deg, ${color.surfaceRaised}, ${color.bg})`, border: `1px solid ${color.gold}55`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>🎖️</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: color.gold }}>Founding Member Offer</span>
              <span style={{ marginLeft: "auto", background: `${color.gold}22`, border: `1px solid ${color.gold}55`, borderRadius: 20, padding: "2px 10px", fontSize: 11, color: color.gold, fontWeight: 700 }}>
                {slotsRemaining} left
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, background: color.bg, border: `1px solid ${color.gold}33`, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: color.gold }}>$4.99</div>
                <div style={{ fontSize: 10, color: color.dim, marginTop: 2, letterSpacing: 1 }}>/ MONTH</div>
              </div>
              <div style={{ flex: 1, background: color.bg, border: `1px solid ${color.gold}55`, borderRadius: 8, padding: "10px 8px", textAlign: "center", position: "relative" }}>
                <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: color.gold, color: color.bg, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 8, letterSpacing: 1, whiteSpace: "nowrap" }}>BEST DEAL</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: color.gold }}>$39.99</div>
                <div style={{ fontSize: 10, color: color.dim, marginTop: 2, letterSpacing: 1 }}>/ YEAR</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: color.dim, lineHeight: 1.5 }}>
              First {FOUNDING_MEMBER_SLOTS} members lock this rate forever — as long as your subscription stays active.
            </div>
          </div>
        )}

        {/* Regular Pricing */}
        <div style={{ fontSize: 11, color: color.dim, letterSpacing: 1, marginBottom: 8 }}>
          {slotsRemaining !== null && slotsRemaining > 0 ? "REGULAR PRICING" : "PRICING"}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, background: color.surface, border: `1px solid ${color.line}`, borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: color.gold }}>$7.99</div>
            <div style={{ fontSize: 10, color: color.muted, marginTop: 3, letterSpacing: 1 }}>PER MONTH</div>
          </div>
          <div style={{ flex: 1, background: color.surface, border: `1px solid ${color.gold}55`, borderRadius: 10, padding: "12px 10px", textAlign: "center", position: "relative" }}>
            <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: color.gold, color: color.bg, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, letterSpacing: 1, whiteSpace: "nowrap" }}>BEST VALUE</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: color.gold }}>$59.99</div>
            <div style={{ fontSize: 10, color: color.muted, marginTop: 3, letterSpacing: 1 }}>PER YEAR</div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            alert("Premium subscriptions are coming soon! You'll be among the first to know when they launch.");
            onClose();
          }}
          style={{ width: "100%", background: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`, border: "none", borderRadius: 12, padding: 16, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 8 }}
        >
          ⭐ Start Free 7-Day Trial
        </button>

        <div style={{ fontSize: 11, color: color.faint, textAlign: "center", marginBottom: 12, lineHeight: 1.6 }}>
          Card required. No charge for 7 days. Cancel anytime in Settings — takes 10 seconds.
        </div>

        <button onClick={onClose}
          style={{ width: "100%", background: "none", border: "none", color: color.faint, fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
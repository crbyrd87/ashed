const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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
        style={{ width: "100%", maxWidth: 420, margin: "0 auto", background: "#1a0f08", borderRadius: "16px 16px 0 0", border: "1px solid #3a2510", borderBottom: "none", padding: "24px 24px 36px" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gold top accent */}
        <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 3, background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: "0 0 3px 3px" }} />

        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ width: 36, height: 4, background: "#3a2510", borderRadius: 2 }} />
        </div>

        {/* Icon + title */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>{copy.icon}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>{copy.title}</div>
          <div style={{ fontSize: 14, color: "#8a7055", lineHeight: 1.6 }}>{copy.description}</div>
        </div>

        {/* Perks */}
        {copy.perks.length > 0 && (
          <div style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
            {copy.perks.map((perk, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < copy.perks.length - 1 ? 10 : 0 }}>
                <span style={{ color: "#c9a84c", fontSize: 14, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 13, color: "#c8b89a" }}>{perk}</span>
              </div>
            ))}
          </div>
        )}

        {/* Full premium features summary */}
        <div style={{ borderTop: "1px solid #3a2510", paddingTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>EVERYTHING IN PREMIUM</div>
          {[
            "📷 Band Scanner — AI cigar identification",
            "✨ AI Recommendations — personalized picks",
            "🥃 Drink Pairings — spirits, beer, coffee & more",
            "📊 Advanced Stats — trends & flavor profile",
            "🔖 Unlimited wishlist & humidor",
            "🎯 Personal fit score on every cigar",
            "⭐ Premium badge on your profile",
          ].map((item, i) => (
            <div key={i} style={{ fontSize: 12, color: "#8a7055", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "#221508", border: "1px solid #3a2510", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#c9a84c" }}>$7.99</div>
            <div style={{ fontSize: 10, color: "#8a7055", marginTop: 3, letterSpacing: 1 }}>PER MONTH</div>
          </div>
          <div style={{ flex: 1, background: "#221508", border: "1px solid #c9a84c55", borderRadius: 10, padding: "12px 10px", textAlign: "center", position: "relative" }}>
            <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#c9a84c", color: "#1a0f08", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, letterSpacing: 1, whiteSpace: "nowrap" }}>BEST VALUE</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#c9a84c" }}>$59.99</div>
            <div style={{ fontSize: 10, color: "#8a7055", marginTop: 3, letterSpacing: 1 }}>PER YEAR</div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            alert("Premium subscriptions are coming soon! You'll be among the first to know when they launch.");
            onClose();
          }}
          style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 12, padding: 16, color: "#1a0f08", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 12 }}
        >
          ⭐ Upgrade to Premium
        </button>

        <button onClick={onClose}
          style={{ width: "100%", background: "none", border: "none", color: "#5a4535", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const FEATURE_COPY = {
  band_scanner: {
    icon: "📷",
    title: "Band Scanner is Premium",
    description: "Instantly identify any cigar by scanning its band with AI. Upgrade to unlock.",
    perks: ["Scan any band in seconds", "AI-powered identification", "Auto-add to humidor"],
  },
  recommendations: {
    icon: "✨",
    title: "AI Recommendations is Premium",
    description: "Get personalized cigar picks based on your taste profile. Upgrade to unlock.",
    perks: ["Tailored to your palate", "Updates as you smoke more", "Never smoke a bad cigar again"],
  },
  pairings: {
    icon: "🥃",
    title: "Drink Pairings is Premium",
    description: "AI-generated drink pairings for every cigar. Upgrade to unlock.",
    perks: ["Spirits, beer, coffee & more", "Seasonal suggestions", "Cached for instant load"],
  },
  wishlist_cap: {
    icon: "🔖",
    title: "Wishlist Limit Reached",
    description: "Free accounts can save up to 20 cigars. Upgrade for unlimited.",
    perks: ["Unlimited wishlist", "Unlimited humidor", "Never lose track of a cigar"],
  },
  advanced_stats: {
    icon: "📊",
    title: "Advanced Stats is Premium",
    description: "Deep insights into your smoking history. Upgrade to unlock.",
    perks: ["Monthly trends", "Flavor profile chart", "Brand & origin breakdown"],
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
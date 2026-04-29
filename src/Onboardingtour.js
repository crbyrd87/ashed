import { useState } from "react";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const SCREENS = [
  {
    icon: "📔",
    title: "Your Cigar Journal",
    description: "Log every smoke with a flame rating, tasting notes, and the venue where you enjoyed it. Your journal builds over time into a complete history of your palate.",
    features: ["Flame ratings from 1 to 5", "AI-suggested tasting notes", "Check in at your favorite lounges"],
    pro: false,
  },
  {
    icon: "📰",
    title: "The Feed",
    description: "See what your friends are smoking in real time. Fire check-ins you love, leave comments, and discover cigars through the people you trust.",
    features: ["Friends' check-ins first", "Fire button to show appreciation", "Community check-ins when feed is quiet"],
    pro: false,
  },
  {
    icon: "📷",
    title: "Band Scanner",
    description: "Point your camera at any cigar band and AI instantly identifies the brand, line, vitola, strength, and origin. No typing required.",
    features: ["AI-powered band identification", "Auto-fills your check-in", "Add directly to humidor or wishlist"],
    pro: true,
  },
  {
    icon: "🗄️",
    title: "My Humidor",
    description: "Keep a digital inventory of every cigar in your collection. Track quantities, scan bands to add cigars, and smoke directly from your humidor.",
    features: ["Track quantities per cigar", "Smoke One to start a check-in", "Scan bands to add cigars"],
    pro: false,
  },
  {
    icon: "🔖",
    title: "Wishlist",
    description: "Save cigars you want to try before you forget them. Your wishlist is always with you at the shop or lounge.",
    features: ["Save up to 20 cigars free", "Search and add from the app", "Unlimited with Premium"],
    pro: false,
  },
  {
    icon: "✨",
    title: "AI Recommendations",
    description: "After 5 check-ins, Ashed learns your palate and recommends cigars you'll actually love — with an explanation of why each one fits your taste.",
    features: ["Tailored to your exact taste profile", "Updates as you smoke more", "Explains why each cigar matches you"],
    pro: true,
  },
  {
    icon: "🥃",
    title: "Drink Pairings",
    description: "AI-generated drink pairings for every cigar — spirits, beer, coffee, and non-alcoholic options, with seasonal suggestions.",
    features: ["Spirits, beer, coffee & non-alcoholic", "Seasonal suggestions", "Instant load after first fetch"],
    pro: true,
  },
  {
    icon: "🏪",
    title: "Venue Finder",
    description: "Find cigar-friendly lounges and shops near you with hours, ratings, and directions. Check in directly from the venue.",
    features: ["GPS and city/zip search", "Smart hours — open/closing soon", "Map and list view"],
    pro: false,
  },
  {
    icon: "🏅",
    title: "Badges & Achievements",
    description: "Earn badges as you smoke, explore, and connect. From First Ash to Legend, there's always something to work toward.",
    features: ["Milestone badges for check-in counts", "Social badges for community activity", "Variety badges for exploring new cigars"],
    pro: false,
  },
  {
    icon: "🤝",
    title: "Refer Friends",
    description: "Share your personal referral link and earn exclusive badges as your friends join. The more you bring in, the higher you climb.",
    features: ["Unique referral link per user", "Ambassador → Recruiter → Legend Maker", "Badges auto-awarded when friends join"],
    pro: false,
  },
];

export default function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const screen = SCREENS[step];
  const isLast = step === SCREENS.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#1a0f08", zIndex: 700, display: "flex", flexDirection: "column", fontFamily: SANS }}>

      {/* Header */}
      <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "#a08060", letterSpacing: 2 }}>ASHED TOUR</div>
        <button onClick={onComplete}
          style={{ background: "none", border: "none", color: "#7a6048", fontSize: 12, cursor: "pointer", fontFamily: SANS, padding: "4px 8px" }}>
          Skip Tour
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "12px 20px" }}>
        {SCREENS.map((_, i) => (
          <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? "#d4b45a" : i < step ? "#7a6048" : "#3a2510", transition: "all 0.2s" }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{screen.icon}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f5ead8" }}>{screen.title}</div>
            {screen.pro && (
              <span style={{ fontSize: 10, background: "#d4b45a22", border: "1px solid #d4b45a55", borderRadius: 8, padding: "2px 8px", color: "#d4b45a", fontWeight: 700 }}>PRO</span>
            )}
          </div>
          <div style={{ fontSize: 14, color: "#a08060", lineHeight: 1.7 }}>{screen.description}</div>
        </div>

        <div style={{ background: "#221508", border: "1px solid #4a3520", borderRadius: 12, padding: "16px 18px", marginBottom: 28 }}>
          {screen.features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < screen.features.length - 1 ? 10 : 0 }}>
              <span style={{ color: "#d4b45a", fontSize: 14, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 13, color: "#ddc9a8" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer buttons */}
      <div style={{ padding: "12px 28px 36px", display: "flex", gap: 10 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            style={{ flex: 1, background: "none", border: "1px solid #4a3520", borderRadius: 12, padding: 14, color: "#7a6048", fontSize: 14, cursor: "pointer", fontFamily: SANS }}>
            Back
          </button>
        )}
        <button onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
          style={{ flex: 2, background: "linear-gradient(135deg, #d4b45a, #a07830)", border: "none", borderRadius: 12, padding: 14, color: "#1a0f08", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
          {isLast ? "Start Smoking 🔥" : "Next"}
        </button>
      </div>
    </div>
  );
}
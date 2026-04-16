import { useState, useEffect } from "react";
import { fetchUserBadges } from "./badgeEngine";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const CATEGORY_LABELS = {
  milestone: "Milestones",
  variety: "Variety",
  social: "Social",
  referral: "Referrals",
};

const CATEGORY_ORDER = ["milestone", "variety", "social", "referral"];

export default function Badges({ userId }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({ milestone: true, variety: true, social: true, referral: true });

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const data = await fetchUserBadges(userId);
      setBadges(data);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "20px 0", fontSize: 12, color: "#5a4535", fontFamily: SANS }}>
      Loading badges...
    </div>
  );

  const earned = badges.filter(b => b.earned).length;
  const total = badges.length;

  // Group by category
  const grouped = {};
  for (const b of badges) {
    if (!grouped[b.category]) grouped[b.category] = [];
    grouped[b.category].push(b);
  }

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div style={{ fontFamily: SANS }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#5a4535", letterSpacing: 1 }}>BADGES & ACHIEVEMENTS</div>
        <div style={{ fontSize: 11, color: "#c9a84c" }}>{earned}/{total} earned</div>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", height: 4, background: "#2a1a0e", borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ width: `${Math.round((earned / total) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 2, transition: "width 0.3s" }} />
      </div>

      {CATEGORY_ORDER.map(cat => {
        const catBadges = grouped[cat];
        if (!catBadges || catBadges.length === 0) return null;
        const catEarned = catBadges.filter(b => b.earned).length;
        const isOpen = expandedCategories[cat];

        return (
          <div key={cat} style={{ marginBottom: 12 }}>
            {/* Category header */}
            <div
              onClick={() => toggleCategory(cat)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", cursor: "pointer" }}
            >
              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1 }}>{CATEGORY_LABELS[cat].toUpperCase()}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: catEarned === catBadges.length ? "#c9a84c" : "#5a4535" }}>
                  {catEarned}/{catBadges.length}
                </span>
                <span style={{ color: "#5a4535", fontSize: 12 }}>{isOpen ? "−" : "+"}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {catBadges.map(badge => (
                  <div
                    key={badge.key}
                    style={{
                      background: badge.earned ? "linear-gradient(135deg, #2a1a0e, #1a0f08)" : "#1a0f08",
                      border: `1px solid ${badge.earned ? "#c9a84c55" : "#2a1a0e"}`,
                      borderRadius: 10,
                      padding: "12px 10px",
                      textAlign: "center",
                      opacity: badge.earned ? 1 : 0.7,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {badge.earned && (
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #c9a84c, #e8cc7a)" }} />
                    )}
                    <div style={{ fontSize: 28, marginBottom: 6, filter: badge.earned ? "none" : "grayscale(1)" }}>
                      {badge.icon}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: badge.earned ? "#e8d5b7" : "#5a4535", marginBottom: 3, lineHeight: 1.3 }}>
                      {badge.name}
                    </div>
                    <div style={{ fontSize: 10, color: badge.earned ? "#8a7055" : "#3a2510", lineHeight: 1.4 }}>
                      {badge.description}
                    </div>
                    {badge.earned && badge.awarded_at && (
                      <div style={{ fontSize: 9, color: "#c9a84c88", marginTop: 6 }}>
                        {new Date(badge.awarded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    )}
                    {!badge.earned && (
                      <div style={{ fontSize: 9, color: "#3a2510", marginTop: 6 }}>🔒 Locked</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
import { useState, useEffect } from "react";
import { color, font, type, weight } from "./theme";
import { EmptyState, Icon, Pressable, SectionLabel, SkeletonRow } from "./ui";
import { fetchUserBadges } from "./badgeEngine";

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
    <div style={{ fontFamily: font.sans }}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );

  const earned = badges.filter(b => b.earned).length;
  const total = badges.length;
  const percent = total > 0 ? Math.round((earned / total) * 100) : 0;

  if (total === 0) return (
    <EmptyState
      icon={<Icon.Check size={32} color={color.borderStrong} />}
      title="No badges yet"
      body="Log a check-in to start earning them."
    />
  );

  const grouped = {};
  for (const b of badges) {
    if (!grouped[b.category]) grouped[b.category] = [];
    grouped[b.category].push(b);
  }

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div style={{ fontFamily: font.sans }}>
      {/* Progress. A 2px gold rule on the border colour rather than a bar in a
          rounded track — the number already says how many, so the rule only
          has to show roughly how far. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <SectionLabel>Badges</SectionLabel>
        <span style={{ fontFamily: font.mono, fontSize: type.sm, color: color.textMuted }}>
          {earned}/{total}
        </span>
      </div>
      <div style={{ width: "100%", height: 2, background: color.border, marginBottom: 22 }}>
        <div style={{ width: `${percent}%`, height: "100%", background: color.gold, transition: "width 0.3s" }} />
      </div>

      {CATEGORY_ORDER.map(cat => {
        const catBadges = grouped[cat];
        if (!catBadges || catBadges.length === 0) return null;
        const catEarned = catBadges.filter(b => b.earned).length;
        const isOpen = expandedCategories[cat];

        return (
          <div key={cat} style={{ marginBottom: 22 }}>
            <Pressable
              onClick={() => toggleCategory(cat)}
              label={`${CATEGORY_LABELS[cat]}, ${catEarned} of ${catBadges.length} earned`}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <SectionLabel tone={color.textMuted}>{CATEGORY_LABELS[cat]}</SectionLabel>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontFamily: font.mono, fontSize: type.xs,
                  color: catEarned === catBadges.length ? color.gold : color.textFaint,
                }}>
                  {catEarned}/{catBadges.length}
                </span>
                <span style={{ display: "flex", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 160ms" }}>
                  <Icon.Chevron size={15} color={color.textFaint} />
                </span>
              </span>
            </Pressable>

            {/* Single-column rows rather than a 2x2 grid: a badge is a name and
                a requirement, which reads as a line, not a card. */}
            {isOpen && catBadges.map(badge => (
              <div
                key={badge.key}
                style={{
                  display: "flex", alignItems: "baseline", gap: 12,
                  padding: "14px 0",
                  borderBottom: `1px solid ${color.border}`,
                  opacity: badge.earned ? 1 : 0.45,
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: "block",
                    fontFamily: font.display, fontSize: type.md, fontWeight: weight.displayMed,
                    color: color.textPrimary,
                  }}>
                    {badge.name}
                  </span>
                  <span style={{ display: "block", fontSize: type.sm, color: color.textMuted, marginTop: 2, lineHeight: 1.4 }}>
                    {badge.description}
                  </span>
                </span>
                {badge.earned && badge.awarded_at && (
                  <span style={{ fontFamily: font.mono, fontSize: type.xs, color: color.textFaint, flexShrink: 0 }}>
                    {new Date(badge.awarded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

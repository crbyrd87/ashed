import { useState, useEffect } from "react";
import { SANS, color } from "./theme";
import { CloseButton, Screen } from "./ui";
import { authedFetch } from "./apiClient";
import { FLAVOR_TAG_NAMES } from "./flavors";

const strengthColor = s => ({ "Mild": "#a8c5a0", "Mild-Medium": "#b8d4a0", "Medium": "#d4b483", "Medium-Full": "#c4894a", "Full": color.danger }[s] || "#888");

const Badge = ({ label, tint = color.gold }) => (
  <span style={{ background: tint + "22", color: tint, border: `1px solid ${tint}55`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{label}</span>
);

// Flavour vocabulary is shared with the check-in screen — see src/flavors.js.
const MIN_CHECKINS_FOR_AUTO = 5;

export default function Recommendations({ user, checkins, onAddToWishlist, onClose }) {
  const [mode, setMode] = useState(null); // null | "survey" | "auto" | "loading" | "results"
  const [lastMode, setLastMode] = useState(null); // the mode the user is actually in: "survey" | "auto"
  const [prefStrength, setPrefStrength] = useState([]);
  const [prefFlavors, setPrefFlavors] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const [addedToWishlist, setAddedToWishlist] = useState({});

  const hasEnoughData = checkins.length >= MIN_CHECKINS_FOR_AUTO;

  useEffect(() => {
    setMode(prev => prev === null ? (hasEnoughData ? "auto" : "survey") : prev);
    setLastMode(prev => prev === null ? (hasEnoughData ? "auto" : "survey") : prev);
  }, [hasEnoughData]);

  // 7-D: this header used to key off hasEnoughData, so survey results were
  // labelled "BASED ON YOUR N LOGGED CIGARS" even though no history was used.
  // The recommendations were right and the label was lying about where they
  // came from, which is what made Refresh feel untrustworthy. Key it off the
  // mode actually used, and name the preferences the survey was given.
  const surveyBasis = [prefStrength.join(", "), prefFlavors.join(", ")]
    .filter(Boolean)
    .join(" · ");
  const resultsBasis = lastMode === "survey"
    ? (surveyBasis
        ? `BASED ON YOUR PREFERENCES: ${surveyBasis.toUpperCase()}`
        : "BASED ON YOUR STATED PREFERENCES")
    : `BASED ON YOUR ${checkins.length} LOGGED CIGARS`;

  const buildAutoPrompt = () => {
    const top = [...checkins].sort((a, b) => b.rating - a.rating).slice(0, 5);
    const bottom = [...checkins].sort((a, b) => a.rating - b.rating).slice(0, 3);
    const smokedNames = checkins.map(c => `${c.cigars?.brand || c.cigar_brand} ${c.cigars?.line || c.cigar_name}`).filter(Boolean);
    const avgRating = (checkins.reduce((a, c) => a + c.rating, 0) / checkins.length).toFixed(1);

    const topList = top.map(c => `- ${c.cigars?.brand || c.cigar_brand} ${c.cigars?.line || c.cigar_name} (${c.rating?.toFixed(1)}) - notes: ${c.tasting_notes || "none"}`).join("\n");
    const bottomList = bottom.map(c => `- ${c.cigars?.brand || c.cigar_brand} ${c.cigars?.line || c.cigar_name} (${c.rating?.toFixed(1)})`).join("\n");
    const strengthCounts = checkins.reduce((acc, c) => { const s = c.cigars?.strength; if (s) acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    const preferredStrength = Object.entries(strengthCounts).sort((a, b) => b[1] - a[1]).map(([s]) => s).join(", ");

    return `You are a cigar expert recommendation engine. Based on this user's smoking history, recommend 5 cigars they haven't tried yet.

SMOKING HISTORY (${checkins.length} cigars, avg rating ${avgRating} out of 10):

TOP RATED:
${topList}

LOWEST RATED:
${bottomList}

PREFERRED STRENGTH: ${preferredStrength || "unknown"}
ALREADY SMOKED (do NOT recommend these): ${smokedNames.join(", ")}

Return ONLY a raw JSON array, no markdown:
[{
  "brand": "Brand",
  "line": "Line name",
  "vitola": "Vitola",
  "strength": "Mild|Mild-Medium|Medium|Medium-Full|Full",
  "origin": "Country",
  "wrapper": "Wrapper type",
  "tasting_notes": "Expected flavor notes",
  "why": "One sentence written in the second person, addressed to the smoker as you and your — never they or their. Name the specific flavours or strengths from the history above."
}]

Recommendations should be similar in style to the top-rated cigars above but offer new experiences. Do NOT recommend anything from the already smoked list.`;
  };

  const buildSurveyPrompt = () => {
    return `You are a cigar expert recommendation engine. Based on the smoker's stated preferences, recommend 5 cigars they should try.

STATED PREFERENCES:
Body/Strength: ${prefStrength.join(", ") || "no preference"}
Flavor notes enjoyed: ${prefFlavors.join(", ") || "no preference"}

Return ONLY a raw JSON array, no markdown:
[{
  "brand": "Brand",
  "line": "Line name",
  "vitola": "Vitola",
  "strength": "Mild|Mild-Medium|Medium|Medium-Full|Full",
  "origin": "Country",
  "wrapper": "Wrapper type",
  "tasting_notes": "Expected flavor notes",
  "why": "One sentence written in the second person, addressed to the smoker as you and your — never they or their. Name the specific preferences stated above."
}]

Recommend a variety of well-known, widely available cigars that match the preferences above. Include options at different price points.`;
  };

  const fetchRecommendations = async (prompt) => {
    setMode("loading");
    setError(null);
    try {
      const response = await authedFetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          feature: "recommendations",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      if (response.status === 429) {
        setError(data.error || "You've reached the recommendations limit for this hour. Please try again later.");
        setMode(lastMode);
        return;
      }
      const raw = data.content?.[0]?.text || "[]";
      const match = raw.match(/\[[\s\S]*\]/);
      const results = match ? JSON.parse(match[0]) : [];
      if (results.length === 0) throw new Error("No recommendations returned");
      setRecommendations(results);
      setMode("results");
    } catch (err) {
      console.error("Recommendations error:", err);
      setError("Something went wrong. Please try again.");
      setMode(lastMode);
    }
  };

  const handleAutoRecommend = () => fetchRecommendations(buildAutoPrompt());
  const handleSurveySubmit = () => {
    if (prefStrength.length === 0 && prefFlavors.length === 0) {
      setError("Please select at least one preference.");
      return;
    }
    setError(null);
    fetchRecommendations(buildSurveyPrompt());
  };

  const handleAddToWishlist = (rec) => {
    onAddToWishlist(rec);
    setAddedToWishlist(prev => ({ ...prev, [`${rec.brand}|${rec.line}`]: true }));
  };

  const s = {
    header: { background: `linear-gradient(180deg, ${color.surfaceWarm} 0%, ${color.bg} 100%)`, padding: "16px 20px", borderBottom: `1px solid ${color.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" },
    section: { padding: "20px 20px", borderBottom: `1px solid ${color.line}33` },
    pill: active => ({ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? color.gold : color.line}`, background: active ? `${color.gold}22` : "transparent", color: active ? color.gold : color.muted, fontSize: 12, cursor: "pointer", fontFamily: SANS, fontWeight: active ? 700 : 400 }),
    strengthPill: (s, active) => ({ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? strengthColor(s) : color.line}`, background: active ? strengthColor(s) + "22" : "transparent", color: active ? strengthColor(s) : color.muted, fontSize: 12, cursor: "pointer", fontFamily: SANS, fontWeight: active ? 700 : 400 }),
  };

  return (
    <Screen>
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: color.text }}>
            {mode === "loading" ? "Finding Recommendations..." : "Recommended for You"}
          </div>
          <div style={{ fontSize: 11, color: color.muted, marginTop: 2 }}>AI POWERED · ASHED</div>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {/* AUTO MODE */}
      {mode === "auto" && (
        <div style={{ padding: 24 }}>
          <div style={{ background: color.surfaceRaised, border: `1px solid ${color.line}`, borderRadius: 12, padding: 20, marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: color.text, marginBottom: 8 }}>Personalized for You</div>
            <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.6 }}>
              Based on your {checkins.length} logged cigars and ratings, Ashed will recommend cigars you'll love.
            </div>
          </div>

          {/* Taste profile summary */}
          <div style={{ background: color.surfaceRaised, border: `1px solid ${color.line}`, borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: color.muted, letterSpacing: 1, marginBottom: 10 }}>YOUR TASTE PROFILE</div>
            {(() => {
              const rated = checkins.filter(c => c.rating != null);
              const avg = rated.length
                ? (rated.reduce((a, c) => a + c.rating, 0) / rated.length / 2).toFixed(2)
                : "—";
              const top = [...checkins].sort((a, b) => b.rating - a.rating)[0];
              const strengthCounts = checkins.reduce((acc, c) => { const s = c.cigars?.strength; if (s) acc[s] = (acc[s] || 0) + 1; return acc; }, {});
              const topStrength = Object.entries(strengthCounts).sort((a, b) => b[1] - a[1])[0];
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: color.muted }}>Avg rating</span>
                    <span style={{ fontSize: 12, color: color.gold, fontWeight: 700 }}>{avg}</span>
                  </div>
                  {topStrength && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: color.muted }}>Preferred body</span>
                    <span style={{ fontSize: 12, color: color.text }}>{topStrength[0]}</span>
                  </div>}
                  {top && <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: color.muted }}>Top rated</span>
                    <span style={{ fontSize: 12, color: color.text }}>{top.cigars?.brand || top.cigar_brand} {top.cigars?.line || top.cigar_name}</span>
                  </div>}
                </>
              );
            })()}
          </div>

          {error && <div style={{ color: color.dangerText, fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

          <button
            onClick={handleAutoRecommend}
            style={{ width: "100%", background: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`, border: "none", borderRadius: 10, padding: 16, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: SANS, marginBottom: 12 }}
          >
            ✨ Recommend for Me
          </button>
          <button
            onClick={() => { setMode("survey"); setLastMode("survey"); setError(null); }}
            style={{ width: "100%", background: "none", border: `1px solid ${color.line}`, borderRadius: 10, padding: 14, color: color.muted, fontSize: 13, cursor: "pointer", fontFamily: SANS }}
          >
            Set preferences manually instead
          </button>
        </div>
      )}

      {/* SURVEY MODE */}
      {mode === "survey" && (
        <div style={{ padding: 20 }}>
          {!hasEnoughData && (
            <div style={{ background: color.surfaceRaised, border: `1px solid ${color.line}`, borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.6 }}>
                Log {MIN_CHECKINS_FOR_AUTO - checkins.length} more {MIN_CHECKINS_FOR_AUTO - checkins.length === 1 ? "cigar" : "cigars"} to unlock personalized recommendations. For now, tell us your preferences:
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: color.muted, letterSpacing: 1, marginBottom: 10 }}>PREFERRED BODY</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"].map(str => (
                <button key={str} style={s.strengthPill(str, prefStrength.includes(str))}
                  onClick={() => setPrefStrength(prev => prev.includes(str) ? prev.filter(x => x !== str) : [...prev, str])}>
                  {str}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: color.muted, letterSpacing: 1, marginBottom: 10 }}>FLAVORS YOU ENJOY</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FLAVOR_TAG_NAMES.map(f => (
                <button key={f} style={s.pill(prefFlavors.includes(f))}
                  onClick={() => setPrefFlavors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ color: color.dangerText, fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

          <button
            onClick={handleSurveySubmit}
            style={{ width: "100%", background: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`, border: "none", borderRadius: 10, padding: 16, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: SANS, marginBottom: 12 }}
          >
            Find My Cigars
          </button>
          {hasEnoughData && (
            <button
              onClick={() => { setMode("auto"); setLastMode("auto"); setError(null); }}
              style={{ width: "100%", background: "none", border: `1px solid ${color.line}`, borderRadius: 10, padding: 14, color: color.muted, fontSize: 13, cursor: "pointer", fontFamily: SANS }}
            >
              ← Back to personalized recommendations
            </button>
          )}
        </div>
      )}

      {/* LOADING */}
      {mode === "loading" && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>✨</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: color.text, marginBottom: 8 }}>Finding your perfect cigars...</div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 24 }}>Ashed is analyzing your taste profile</div>
          <div style={{ width: "100%", height: 4, background: color.surfaceRaised, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: `linear-gradient(90deg, ${color.gold}, ${color.goldPale})`, borderRadius: 2, animation: "scan 1.5s ease-in-out infinite", width: "40%" }} />
          </div>
          <style>{`@keyframes scan { 0% { margin-left: -40% } 100% { margin-left: 100% } }`}</style>
        </div>
      )}

      {/* RESULTS */}
      {mode === "results" && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: color.muted, letterSpacing: 1, marginBottom: 14 }}>
            {resultsBasis}
          </div>

          {recommendations.map((rec, i) => {
            const key = `${rec.brand}|${rec.line}`;
            const added = addedToWishlist[key];
            return (
              <div key={i} style={{ background: `linear-gradient(135deg, ${color.surfaceRaised} 0%, ${color.surface} 100%)`, border: `1px solid ${color.line}`, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: color.muted, letterSpacing: 1 }}>{rec.brand?.toUpperCase()}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: color.text, margin: "2px 0 6px" }}>{rec.line}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {rec.vitola && <Badge label={rec.vitola} />}
                        {rec.strength && <Badge label={rec.strength} color={strengthColor(rec.strength)} />}
                        {rec.origin && <Badge label={rec.origin} color={color.green} />}
                      </div>
                    </div>
                    <div style={{ background: `${color.gold}22`, border: `1px solid ${color.gold}44`, borderRadius: 20, padding: "2px 10px", fontSize: 12, color: color.gold, fontWeight: 700, marginLeft: 8, whiteSpace: "nowrap" }}>
                      #{i + 1}
                    </div>
                  </div>

                  {rec.tasting_notes && (
                    <div style={{ fontSize: 12, color: color.muted, marginBottom: 8 }}>{rec.tasting_notes}</div>
                  )}

                  {/* Why this cigar */}
                  <div style={{ background: color.bg, borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: color.gold, letterSpacing: 1, marginBottom: 4 }}>WHY THIS CIGAR</div>
                    <div style={{ fontSize: 12, color: color.cream, lineHeight: 1.5, fontStyle: "italic" }}>{rec.why}</div>
                  </div>

                  <button
                    onClick={() => handleAddToWishlist(rec)}
                    disabled={added}
                    style={{ width: "100%", background: added ? `${color.gold}22` : "none", border: `1px solid ${added ? color.gold : color.line}`, borderRadius: 8, padding: "8px 0", color: added ? color.gold : color.muted, fontSize: 12, cursor: added ? "default" : "pointer", fontFamily: SANS }}
                  >
                    {added ? "✓ Added to Wishlist" : "+ Add to Wishlist"}
                  </button>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => fetchRecommendations(lastMode === "survey" ? buildSurveyPrompt() : buildAutoPrompt())}
            style={{ width: "100%", background: "none", border: `1px solid ${color.gold}55`, borderRadius: 10, padding: 14, color: color.gold, fontSize: 13, cursor: "pointer", fontFamily: SANS, marginTop: 4, marginBottom: 10 }}
          >
            ↻ Refresh Recommendations
          </button>
          <button
            onClick={() => setMode(lastMode)}
            style={{ width: "100%", background: "none", border: `1px solid ${color.line}`, borderRadius: 10, padding: 14, color: color.muted, fontSize: 13, cursor: "pointer", fontFamily: SANS }}
          >
            ← Back
          </button>
        </div>
      )}
    </Screen>
  );
}
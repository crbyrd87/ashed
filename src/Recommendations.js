import { useState, useEffect } from "react";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const KEY = process.env.REACT_APP_ANTHROPIC_KEY;

const strengthColor = s => ({ "Light": "#a8c5a0", "Medium": "#d4b483", "Medium-Full": "#c4894a", "Full": "#a0522d" }[s] || "#888");

const Badge = ({ label, color = "#c9a84c" }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{label}</span>
);

const FLAVOR_OPTIONS = ["Cedar", "Leather", "Earth", "Coffee", "Chocolate", "Pepper", "Cream", "Nuts", "Caramel", "Citrus", "Floral", "Spice", "Sweetness", "Tobacco"];
const MIN_CHECKINS_FOR_AUTO = 5;

export default function Recommendations({ user, checkins, onAddToWishlist, onClose }) {
  const [mode, setMode] = useState(null); // null | "survey" | "auto" | "loading" | "results"
  const [prefStrength, setPrefStrength] = useState([]);
  const [prefFlavors, setPrefFlavors] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const [addedToWishlist, setAddedToWishlist] = useState({});

  const hasEnoughData = checkins.length >= MIN_CHECKINS_FOR_AUTO;

  useEffect(() => {
    if (hasEnoughData) setMode("auto");
    else setMode("survey");
  }, [hasEnoughData]);

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

SMOKING HISTORY (${checkins.length} cigars, avg rating ${avgRating}):

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
  "strength": "Light|Medium|Medium-Full|Full",
  "origin": "Country",
  "wrapper": "Wrapper type",
  "tasting_notes": "Expected flavor notes",
  "why": "One sentence explaining why this matches their taste profile specifically"
}]

Recommendations should be similar in style to their top-rated cigars but offer new experiences. Do NOT recommend anything from the already smoked list.`;
  };

  const buildSurveyPrompt = () => {
    return `You are a cigar expert recommendation engine. Based on a new user's stated preferences, recommend 5 cigars they should try.

STATED PREFERENCES:
Body/Strength: ${prefStrength.join(", ") || "no preference"}
Flavor notes they enjoy: ${prefFlavors.join(", ") || "no preference"}

Return ONLY a raw JSON array, no markdown:
[{
  "brand": "Brand",
  "line": "Line name",
  "vitola": "Vitola",
  "strength": "Light|Medium|Medium-Full|Full",
  "origin": "Country",
  "wrapper": "Wrapper type",
  "tasting_notes": "Expected flavor notes",
  "why": "One sentence explaining why this matches their stated preferences"
}]

Recommend a variety of well-known, widely available cigars that match their preferences. Include options at different price points.`;
  };

  const fetchRecommendations = async (prompt) => {
    setMode("loading");
    setError(null);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      const raw = data.content?.[0]?.text || "[]";
      const match = raw.match(/\[[\s\S]*\]/);
      const results = match ? JSON.parse(match[0]) : [];
      if (results.length === 0) throw new Error("No recommendations returned");
      setRecommendations(results);
      setMode("results");
    } catch (err) {
      console.error("Recommendations error:", err);
      setError("Something went wrong. Please try again.");
      setMode(hasEnoughData ? "auto" : "survey");
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
    overlay: { position: "fixed", inset: 0, background: "#1a0f08", zIndex: 300, overflowY: "auto", fontFamily: SANS, color: "#e8d5b7", maxWidth: 420, margin: "0 auto" },
    header: { background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "16px 20px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center" },
    section: { padding: "20px 20px", borderBottom: "1px solid #3a251033" },
    pill: active => ({ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? "#c9a84c" : "#3a2510"}`, background: active ? "#c9a84c22" : "transparent", color: active ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS, fontWeight: active ? 700 : 400 }),
    strengthPill: (s, active) => ({ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? strengthColor(s) : "#3a2510"}`, background: active ? strengthColor(s) + "22" : "transparent", color: active ? strengthColor(s) : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS, fontWeight: active ? 700 : 400 }),
  };

  return (
    <div style={s.overlay}>
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e8d5b7" }}>
            {mode === "loading" ? "Finding Recommendations..." : "Recommended for You"}
          </div>
          <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>AI POWERED · ASHED</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 24, cursor: "pointer" }}>×</button>
      </div>

      {/* AUTO MODE */}
      {mode === "auto" && (
        <div style={{ padding: 24 }}>
          <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 12, padding: 20, marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>Personalized for You</div>
            <div style={{ fontSize: 13, color: "#8a7055", lineHeight: 1.6 }}>
              Based on your {checkins.length} logged cigars and ratings, Ashed will recommend cigars you'll love.
            </div>
          </div>

          {/* Taste profile summary */}
          <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>YOUR TASTE PROFILE</div>
            {(() => {
              const avg = (checkins.reduce((a, c) => a + c.rating, 0) / checkins.length).toFixed(1);
              const top = [...checkins].sort((a, b) => b.rating - a.rating)[0];
              const strengthCounts = checkins.reduce((acc, c) => { const s = c.cigars?.strength; if (s) acc[s] = (acc[s] || 0) + 1; return acc; }, {});
              const topStrength = Object.entries(strengthCounts).sort((a, b) => b[1] - a[1])[0];
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "#8a7055" }}>Avg rating</span>
                    <span style={{ fontSize: 12, color: "#c9a84c", fontWeight: 700 }}>{avg}</span>
                  </div>
                  {topStrength && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "#8a7055" }}>Preferred body</span>
                    <span style={{ fontSize: 12, color: "#e8d5b7" }}>{topStrength[0]}</span>
                  </div>}
                  {top && <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#8a7055" }}>Top rated</span>
                    <span style={{ fontSize: 12, color: "#e8d5b7" }}>{top.cigars?.brand || top.cigar_brand} {top.cigars?.line || top.cigar_name}</span>
                  </div>}
                </>
              );
            })()}
          </div>

          {error && <div style={{ color: "#e8a07a", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

          <button
            onClick={handleAutoRecommend}
            style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 16, color: "#1a0f08", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: SANS, marginBottom: 12 }}
          >
            ✨ Recommend for Me
          </button>
          <button
            onClick={() => { setMode("survey"); setError(null); }}
            style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 10, padding: 14, color: "#8a7055", fontSize: 13, cursor: "pointer", fontFamily: SANS }}
          >
            Set preferences manually instead
          </button>
        </div>
      )}

      {/* SURVEY MODE */}
      {mode === "survey" && (
        <div style={{ padding: 20 }}>
          {!hasEnoughData && (
            <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#8a7055", lineHeight: 1.6 }}>
                Log {MIN_CHECKINS_FOR_AUTO - checkins.length} more {MIN_CHECKINS_FOR_AUTO - checkins.length === 1 ? "cigar" : "cigars"} to unlock personalized recommendations. For now, tell us your preferences:
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>PREFERRED BODY</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Light", "Medium", "Medium-Full", "Full"].map(str => (
                <button key={str} style={s.strengthPill(str, prefStrength.includes(str))}
                  onClick={() => setPrefStrength(prev => prev.includes(str) ? prev.filter(x => x !== str) : [...prev, str])}>
                  {str}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>FLAVORS YOU ENJOY</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FLAVOR_OPTIONS.map(f => (
                <button key={f} style={s.pill(prefFlavors.includes(f))}
                  onClick={() => setPrefFlavors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ color: "#e8a07a", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

          <button
            onClick={handleSurveySubmit}
            style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 16, color: "#1a0f08", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: SANS, marginBottom: 12 }}
          >
            Find My Cigars
          </button>
          {hasEnoughData && (
            <button
              onClick={() => { setMode("auto"); setError(null); }}
              style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 10, padding: 14, color: "#8a7055", fontSize: 13, cursor: "pointer", fontFamily: SANS }}
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
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>Finding your perfect cigars...</div>
          <div style={{ fontSize: 13, color: "#8a7055", marginBottom: 24 }}>Ashed is analyzing your taste profile</div>
          <div style={{ width: "100%", height: 4, background: "#2a1a0e", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 2, animation: "scan 1.5s ease-in-out infinite", width: "40%" }} />
          </div>
          <style>{`@keyframes scan { 0% { margin-left: -40% } 100% { margin-left: 100% } }`}</style>
        </div>
      )}

      {/* RESULTS */}
      {mode === "results" && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 14 }}>
            {hasEnoughData ? `BASED ON YOUR ${checkins.length} LOGGED CIGARS` : "BASED ON YOUR PREFERENCES"}
          </div>

          {recommendations.map((rec, i) => {
            const key = `${rec.brand}|${rec.line}`;
            const added = addedToWishlist[key];
            return (
              <div key={i} style={{ background: "linear-gradient(135deg, #2a1a0e 0%, #221508 100%)", border: "1px solid #3a2510", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>{rec.brand?.toUpperCase()}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#e8d5b7", margin: "2px 0 6px" }}>{rec.line}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {rec.vitola && <Badge label={rec.vitola} />}
                        {rec.strength && <Badge label={rec.strength} color={strengthColor(rec.strength)} />}
                        {rec.origin && <Badge label={rec.origin} color="#7a9a7a" />}
                      </div>
                    </div>
                    <div style={{ background: "#c9a84c22", border: "1px solid #c9a84c44", borderRadius: 20, padding: "2px 10px", fontSize: 12, color: "#c9a84c", fontWeight: 700, marginLeft: 8, whiteSpace: "nowrap" }}>
                      #{i + 1}
                    </div>
                  </div>

                  {rec.tasting_notes && (
                    <div style={{ fontSize: 12, color: "#8a7055", marginBottom: 8 }}>{rec.tasting_notes}</div>
                  )}

                  {/* Why this cigar */}
                  <div style={{ background: "#1a0f08", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: "#c9a84c", letterSpacing: 1, marginBottom: 4 }}>WHY THIS CIGAR</div>
                    <div style={{ fontSize: 12, color: "#c8b89a", lineHeight: 1.5, fontStyle: "italic" }}>{rec.why}</div>
                  </div>

                  <button
                    onClick={() => handleAddToWishlist(rec)}
                    disabled={added}
                    style={{ width: "100%", background: added ? "#c9a84c22" : "none", border: `1px solid ${added ? "#c9a84c" : "#3a2510"}`, borderRadius: 8, padding: "8px 0", color: added ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: added ? "default" : "pointer", fontFamily: SANS }}
                  >
                    {added ? "✓ Added to Wishlist" : "+ Add to Wishlist"}
                  </button>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => fetchRecommendations(hasEnoughData ? buildAutoPrompt() : buildSurveyPrompt())}
            style={{ width: "100%", background: "none", border: "1px solid #c9a84c55", borderRadius: 10, padding: 14, color: "#c9a84c", fontSize: 13, cursor: "pointer", fontFamily: SANS, marginTop: 4, marginBottom: 10 }}
          >
            ↻ Refresh Recommendations
          </button>
          <button
            onClick={() => setMode(hasEnoughData ? "auto" : "survey")}
            style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 10, padding: 14, color: "#8a7055", fontSize: 13, cursor: "pointer", fontFamily: SANS }}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
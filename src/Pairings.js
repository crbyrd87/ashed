import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const SEASONS = ["Spring", "Summer", "Fall", "Winter"];

const getCurrentSeason = () => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
};

export default function Pairings({ cigar, onClose }) {
  const [pairings, setPairings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [season, setSeason] = useState(getCurrentSeason());
  const [seasonalNote, setSeasonalNote] = useState(null);
  const [loadingSeasonalNote, setLoadingSeasonalNote] = useState(false);

  useEffect(() => {
    const loadPairings = async () => {
      setLoading(true);
      setError(null);

      // Check DB first
      if (cigar.id) {
        const { data: existing } = await supabase
          .from("pairings")
          .select("*")
          .eq("cigar_id", cigar.id)
          .maybeSingle();

        if (existing) {
          setPairings(existing);
          setLoading(false);
          return;
        }
      }

      // Not in DB -- call Haiku
      try {
        const response = await fetch("/api/anthropic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 500,
            feature: "pairings",
            messages: [{
              role: "user",
              content: `You are a cigar and beverage pairing expert. Suggest drink pairings for this cigar.

Cigar: ${cigar.brand} ${cigar.line}
Strength: ${cigar.strength || "unknown"}
Wrapper: ${cigar.wrapper || "unknown"}
Origin: ${cigar.origin || "unknown"}
Tasting notes: ${cigar.tasting_notes || "unknown"}

Return ONLY a raw JSON object, no markdown:
{
  "spirits": "2-3 specific spirit suggestions with brief reason each",
  "beer": "2-3 specific beer style suggestions with brief reason each",
  "coffee": "2-3 specific coffee suggestions with brief reason each",
  "non_alcoholic": "2-3 non-alcoholic suggestions with brief reason each",
  "notes": "One sentence overall pairing philosophy for this cigar"
}`,
            }],
          }),
        });

        const data = await response.json();

        if (response.status === 429) {
          setError(data.error || "You've reached the pairings limit for this hour. Please try again later.");
          setLoading(false);
          return;
        }

        const raw = data.content?.[0]?.text || "{}";
        const match = raw.match(/\{[\s\S]*\}/);
        const result = match ? JSON.parse(match[0]) : null;

        if (!result) throw new Error("No pairings returned");

        if (cigar.id) {
          await supabase.from("pairings").insert({
            cigar_id: cigar.id,
            spirits: result.spirits,
            beer: result.beer,
            coffee: result.coffee,
            non_alcoholic: result.non_alcoholic,
            notes: result.notes,
          });
        }

        setPairings(result);
      } catch (err) {
        console.error("Pairings error:", err);
        setError("Could not load pairings. Please try again.");
      }
      setLoading(false);
    };

    loadPairings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cigar.id, retryCount]);

  const handleSeasonalNote = async () => {
    setLoadingSeasonalNote(true);
    try {
      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 150,
          feature: "pairings",
          messages: [{
            role: "user",
            content: `In 1-2 sentences, how does ${season} weather and atmosphere affect the experience of smoking a ${cigar.brand} ${cigar.line} (${cigar.strength || "medium"} strength)? What seasonal drink would you specifically recommend this time of year?`,
          }],
        }),
      });
      const data = await response.json();
      setSeasonalNote(data.content?.[0]?.text || "");
    } catch (err) {
      console.error("Seasonal note error:", err);
    }
    setLoadingSeasonalNote(false);
  };

  const PairingSection = ({ title, icon, content }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 6 }}>{icon} {title}</div>
      <div style={{ fontSize: 13, color: "#c8b89a", lineHeight: 1.6, background: "#1a0f08", borderRadius: 8, padding: "10px 12px" }}>{content}</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 400, display: "flex", alignItems: "flex-end", fontFamily: SANS }}>
      <div style={{ width: "100%", maxWidth: 420, margin: "0 auto", background: "#1a0f08", borderRadius: "16px 16px 0 0", maxHeight: "85vh", overflowY: "auto", border: "1px solid #3a2510" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#1a0f08", zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7" }}>🥃 Drink Pairings</div>
            <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>{cigar.brand} {cigar.line}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 30 }}>
              <div style={{ fontSize: 13, color: "#8a7055", marginBottom: 12 }}>Finding perfect pairings...</div>
              <div style={{ width: "100%", height: 4, background: "#2a1a0e", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 2, animation: "scan 1.5s ease-in-out infinite", width: "40%" }} />
              </div>
              <style>{`@keyframes scan { 0% { margin-left: -40% } 100% { margin-left: 100% } }`}</style>
            </div>
          )}

          {error && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 13, color: "#e8a07a", marginBottom: 16 }}>{error}</div>
              <button onClick={() => setRetryCount(c => c + 1)} style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "10px 20px", color: "#1a0f08", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>Try Again</button>
            </div>
          )}

          {pairings && !loading && (
            <>
              {pairings.notes && (
                <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 13, color: "#8a7055", fontStyle: "italic", lineHeight: 1.6 }}>
                  {pairings.notes}
                </div>
              )}

              <PairingSection title="Spirits" icon="🥃" content={pairings.spirits} />
              <PairingSection title="Beer" icon="🍺" content={pairings.beer} />
              <PairingSection title="Coffee" icon="☕" content={pairings.coffee} />
              <PairingSection title="Non-Alcoholic" icon="🥤" content={pairings.non_alcoholic} />

              {/* Seasonal pairings */}
              <div style={{ borderTop: "1px solid #3a251033", paddingTop: 16, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>SEASONAL PAIRING</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {SEASONS.map(s => (
                    <button key={s} onClick={() => { setSeason(s); setSeasonalNote(null); }}
                      style={{ flex: 1, padding: "6px 0", borderRadius: 20, border: `1px solid ${season === s ? "#c9a84c" : "#3a2510"}`, background: season === s ? "#c9a84c22" : "transparent", color: season === s ? "#c9a84c" : "#5a4535", fontSize: 10, cursor: "pointer", fontFamily: SANS }}>
                      {s}
                    </button>
                  ))}
                </div>
                {!seasonalNote ? (
                  <button onClick={handleSeasonalNote} disabled={loadingSeasonalNote}
                    style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 8, padding: 10, color: loadingSeasonalNote ? "#5a4535" : "#8a7055", fontSize: 12, cursor: loadingSeasonalNote ? "default" : "pointer", fontFamily: SANS }}>
                    {loadingSeasonalNote ? "Loading..." : `✨ Get ${season} pairing suggestion`}
                  </button>
                ) : (
                  <div style={{ background: "#2a1a0e", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#c8b89a", lineHeight: 1.6 }}>{seasonalNote}</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Close button */}
        <div style={{ padding: "0 20px 24px" }}>
          <button onClick={onClose} style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 14, color: "#1a0f08", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
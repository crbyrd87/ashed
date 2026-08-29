import { useState, useEffect } from "react";
import { SANS, color, font, type, weight } from "./theme";
import { CloseButton, SectionLabel, Sheet } from "./ui";
import { authedFetch } from "./apiClient";
import { supabase } from "./supabase";

const SEASONS = ["Spring", "Summer", "Fall", "Winter"];

const getCurrentSeason = () => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
};

export default function Pairings({ cigar, user, onClose }) {
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
        const response = await authedFetch("/api/anthropic", {
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
  "spirits": "Suggestion 1 name - reason; Suggestion 2 name - reason; Suggestion 3 name - reason",
  "beer": "Suggestion 1 name - reason; Suggestion 2 name - reason; Suggestion 3 name - reason",
  "cocktails": "Suggestion 1 name - reason; Suggestion 2 name - reason; Suggestion 3 name - reason",
  "coffee": "Suggestion 1 name - reason; Suggestion 2 name - reason; Suggestion 3 name - reason",
  "non_alcoholic": "Suggestion 1 name - reason; Suggestion 2 name - reason; Suggestion 3 name - reason",
  "notes": "One sentence overall pairing philosophy for this cigar"
}`,
            }],
          }),
        });

        const data = await response.json();
        const raw = data.content?.[0]?.text || "{}";
        const match = raw.match(/\{[\s\S]*\}/);
        const result = match ? JSON.parse(match[0]) : null;

        if (!result) throw new Error("No pairings returned");

        if (cigar.id) {
          await supabase.from("pairings").insert({
            cigar_id: cigar.id,
            spirits: result.spirits,
            beer: result.beer,
            cocktails: result.cocktails,
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
      const response = await authedFetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          user_id: user?.id,
          feature: "pairings",
          messages: [{
            role: "user",
            content: `For smoking a ${cigar.brand} ${cigar.line} in ${season}, suggest 2 drink pairings. Return ONLY this JSON, no markdown:
{"context":"One sentence on how ${season} affects this smoke.","pairings":[{"drink":"Drink name","reason":"Brief reason why it works"},{"drink":"Drink name","reason":"Brief reason why it works"}]}`,
          }],
        }),
      });
      const data = await response.json();
      const raw = data.content?.[0]?.text || "{}";
      const match = raw.match(/\{[\s\S]*\}/);
      const result = match ? JSON.parse(match[0]) : null;
      setSeasonalNote(result || raw);
    } catch (err) {
      console.error("Seasonal note error:", err);
      setSeasonalNote("Could not load seasonal pairing.");
    }
    setLoadingSeasonalNote(false);
  };

  const PairingSection = ({ title, content }) => {
    if (!content) return null;
    // Split on semicolons, newlines, or numbered list patterns
    const lines = content.split(/;\s*|\n+|\d+\.\s+/).map(l => l.trim()).filter(l => l.length > 5);
    return (
      <div style={{ marginBottom: 16 }}>
        <SectionLabel tone={color.gold} style={{ marginBottom: 8 }}>{title}</SectionLabel>
        <div style={{ background: color.bg, borderRadius: 8, padding: "10px 12px" }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: i < lines.length - 1 ? 8 : 0, alignItems: "flex-start" }}>
              <span style={{ color: color.gold, fontSize: type.xs, flexShrink: 0, marginTop: 2 }}>•</span>
              <span style={{ fontSize: 13, color: color.cream, lineHeight: 1.5 }}>{line}{!line.endsWith(".") ? "." : ""}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Sheet onClose={onClose} zIndex={400} padding={0}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${color.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: color.bg, zIndex: 1 }}>
          <div>
            <div style={{ fontFamily: font.display, fontSize: type.lg, fontWeight: weight.displayMed, color: color.textPrimary }}>Drink pairings</div>
            <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>{cigar.brand} {cigar.line}</div>
          </div>
          <CloseButton onClose={onClose} />
        </div>

        <div style={{ padding: 20 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 30 }}>
              <div style={{ fontSize: 13, color: color.muted, marginBottom: 12 }}>Finding perfect pairings...</div>
              <div style={{ width: "100%", height: 4, background: color.surfaceRaised, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: `linear-gradient(90deg, ${color.gold}, ${color.goldPale})`, borderRadius: 2, animation: "scan 1.5s ease-in-out infinite", width: "40%" }} />
              </div>
              <style>{`@keyframes scan { 0% { margin-left: -40% } 100% { margin-left: 100% } }`}</style>
            </div>
          )}

          {error && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 13, color: color.dangerText, marginBottom: 16 }}>{error}</div>
              <button onClick={() => setRetryCount(c => c + 1)} style={{ background: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`, border: "none", borderRadius: 8, padding: "10px 20px", color: color.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>Try Again</button>
            </div>
          )}

          {pairings && !loading && (
            <>
              {pairings.notes && (
                <div style={{ background: color.surfaceRaised, border: `1px solid ${color.line}`, borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 13, color: color.muted, fontStyle: "italic", lineHeight: 1.6 }}>
                  {pairings.notes}
                </div>
              )}

              <PairingSection title="Spirits" content={pairings.spirits} />
              <PairingSection title="Beer" content={pairings.beer} />
              <PairingSection title="Cocktails" content={pairings.cocktails} />
              <PairingSection title="Coffee" content={pairings.coffee} />
              <PairingSection title="Non-Alcoholic" content={pairings.non_alcoholic} />

              {/* Seasonal pairings */}
              <div style={{ borderTop: `1px solid ${color.line}33`, paddingTop: 16, marginTop: 4 }}>
                <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 10 }}>SEASONAL PAIRING</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {SEASONS.map(s => (
                    <button key={s} onClick={() => { setSeason(s); setSeasonalNote(null); }}
                      style={{ flex: 1, padding: "6px 0", borderRadius: 20, border: `1px solid ${season === s ? color.gold : color.line}`, background: season === s ? `${color.gold}22` : "transparent", color: season === s ? color.gold : color.faint, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                      {s}
                    </button>
                  ))}
                </div>
                {!seasonalNote ? (
                  <button onClick={handleSeasonalNote} disabled={loadingSeasonalNote}
                    style={{ width: "100%", background: "none", border: `1px solid ${color.line}`, borderRadius: 8, padding: 10, color: loadingSeasonalNote ? color.faint : color.muted, fontSize: type.xs, cursor: loadingSeasonalNote ? "default" : "pointer", fontFamily: SANS }}>
                    {loadingSeasonalNote ? "Loading..." : `Get ${season} pairing suggestion`}
                  </button>
                ) : (
                  <div style={{ background: color.surfaceRaised, borderRadius: 8, padding: "10px 12px" }}>
                    {typeof seasonalNote === "object" && seasonalNote.pairings ? (
                      <>
                        {seasonalNote.context && (
                          <div style={{ fontSize: type.xs, color: color.dim, fontStyle: "italic", marginBottom: 10, lineHeight: 1.5 }}>{seasonalNote.context}</div>
                        )}
                        {seasonalNote.pairings.map((p, i) => (
                          <div key={i} style={{ marginBottom: i < seasonalNote.pairings.length - 1 ? 8 : 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: color.gold }}>{p.drink}</span>
                            <span style={{ fontSize: 13, color: color.cream }}> — {p.reason}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: color.cream, lineHeight: 1.6 }}>{seasonalNote}</div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Close button */}
        <div style={{ padding: "0 20px 24px" }}>
          <button onClick={onClose} style={{ width: "100%", background: "none", border: `1px solid ${color.line}`, borderRadius: 10, padding: 12, color: color.dim, fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
            Done
          </button>
        </div>
    </Sheet>
  );
}
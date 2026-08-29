import { useState, useRef } from "react";
import { SANS, color, type } from "./theme";
import { Screen } from "./ui";
import { authedFetch } from "./apiClient";
import { supabase } from "./supabase";

export default function BandScanner({ user, onClose, onCheckIn, onAddToWishlist, onAddToHumidor, onSearchManually }) {
  const [stage, setStage] = useState("capture");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cigar, setCigar] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [flagging, setFlagging] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [toast, setToast] = useState(null);
  const [vitolas, setVitolas] = useState([]);
  const [violasLoading, setViolasLoading] = useState(false);
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);

  const cacheCigarToDB = async (result) => {
    try {
      const { data: existing } = await supabase
        .from("cigars")
        .select("id")
        .eq("brand", result.brand)
        .eq("line", result.line)
        .maybeSingle();
      if (!existing) {
        const { data: inserted } = await supabase.from("cigars").insert({
          brand: result.brand,
          line: result.line,
          wrapper: result.wrapper || null,
          origin: result.origin || null,
          strength: result.strength || null,
          tasting_notes: result.tasting_notes || null,
          description: result.description || null,
          ai_generated: true,
          verified: false,
          total_checkins: 0,
        }).select().single();
        return inserted;
      }
      return existing;
    } catch (e) {
      console.error("Cache to DB failed:", e);
      return null;
    }
  };

  const handleFlag = async () => {
    setFlagging(true);
    try {
      await supabase.from("cigars").update({ verified: false, ai_generated: true }).eq("brand", cigar.brand).eq("line", cigar.line).eq("vitola", cigar.vitola);
    } catch (e) { console.error(e); }
    setFlagged(true);
    setFlagging(false);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadVitolas = async (brand, line) => {
    setViolasLoading(true);
    const { data } = await supabase
      .from("cigars")
      .select("id, vitola, strength, wrapper, origin, tasting_notes")
      .eq("brand", brand)
      .eq("line", line)
      .not("vitola", "is", null)
      .order("vitola");
    setVitolas(data || []);
    setViolasLoading(false);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setStage("analyzing");

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    try {
      const response = await authedFetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 1024,
          feature: "band_scanner",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: file.type, data: base64 },
                },
                {
                  type: "text",
                  text: `You are a cigar expert. Analyze this cigar band image and identify the cigar.

First, check if there are multiple distinct cigar bands visible in the image. If there are, return:
{"confidence": "multiple", "confidence_reason": "Multiple cigar bands detected"}

Otherwise return ONLY a raw JSON object, no markdown, no explanation:
{
  "brand": "Brand name",
  "line": "Cigar line name",
  "strength": "Mild|Mild-Medium|Medium|Medium-Full|Full",
  "origin": "Country of origin",
  "wrapper": "Wrapper country/type",
  "tasting_notes": "Brief expected tasting notes",
  "description": "One sentence about this cigar",
  "confidence": "high|medium|low",
  "confidence_reason": "Brief reason for confidence level"
}

If you cannot identify the cigar with any confidence, return:
{"confidence": "none", "confidence_reason": "Reason why"}

Do not guess the vitola — it cannot be determined from the band alone.
Be as specific as possible with brand and line. If you can read text on the band, use it.`
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      const raw = data.content?.[0]?.text || "{}";
      const match = raw.match(/\{[\s\S]*\}/);
      const result = match ? JSON.parse(match[0]) : {};

      if (result.confidence === "multiple") {
        setErrorMsg("Multiple cigar bands detected — please scan one at a time for best results.");
        setStage("error");
        return;
      }

      if (result.confidence === "none") {
        setErrorMsg(result.confidence_reason || "Could not identify this cigar band. Please try a clearer photo.");
        setStage("error");
        return;
      }

      if (result.confidence === "low") {
        setErrorMsg(`Best guess: ${result.brand} ${result.line} — but confidence is too low to be reliable. Try a clearer photo or search manually.`);
        setStage("error");
        return;
      }

      const cached = await cacheCigarToDB(result);

      setConfidence(result.confidence);
      setCigar({
        id: cached?.id || null,
        brand: result.brand || "Unknown",
        line: result.line || "Unknown",
        strength: result.strength || "Medium",
        origin: result.origin || "Unknown",
        wrapper: result.wrapper || null,
        tasting_notes: result.tasting_notes || null,
        description: result.description || null,
        ai_band_identified: true,
      });

      // Load vitolas immediately and go to vitola picker stage
      await loadVitolas(result.brand, result.line);
      setStage("vitola");

    } catch (err) {
      console.error("Band scan error:", err);
      setErrorMsg("Something went wrong analyzing the photo. Please try again.");
      setStage("error");
    }
  };

  // Full-screen overlay. Without position:fixed this rendered inline in the
  // page flow, so opening the scanner appended a scrollable panel below
  // whatever was already on screen instead of covering it. Matches the
  // overlay CheckIn.js uses: same z-index, same 420 cap.
  return (
    <Screen>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px", borderBottom: `1px solid ${color.lineStrong}` }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", background: "linear-gradient(to right, #cc2200 0%, #ff6600 50%, #ffcc00 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Band Scanner</div>
          <div style={{ fontSize: type.xs, color: color.gold, letterSpacing: 2, marginTop: 2, fontWeight: 600, opacity: 0.8 }}>PREMIUM FEATURE</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: color.muted, fontSize: 22, cursor: "pointer", padding: "4px 8px", fontFamily: SANS }}>✕</button>
      </div>

      {/* CAPTURE STAGE */}
      {stage === "capture" && (
        <div style={{ padding: 20 }}>

          {/* Feature explanation */}
          <div style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: color.gold, letterSpacing: 1, fontWeight: 700, marginBottom: 12 }}>HOW IT WORKS</div>
            {[
              { icon: "📷", text: "Take a photo of any cigar band" },
              { icon: "🤖", text: "AI reads the label and identifies the cigar" },
              { icon: "📖", text: "Get the brand, vitola, strength, tasting notes and more" },
              { icon: "🚬", text: "Log it, add to your humidor, or save to your wishlist" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i < 3 ? 12 : 0 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: color.cream, lineHeight: 1.5 }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: color.gold, letterSpacing: 1, fontWeight: 700, marginBottom: 10 }}>TIPS FOR BEST RESULTS</div>
            {[
              "Hold steady in good lighting",
              "Fill the frame with the band",
              "Keep the label sharp and in focus",
              "Both ends of the band help",
            ].map((tip, i) => (
              <div key={i} style={{ fontSize: 13, color: color.cream, marginBottom: i < 3 ? 8 : 0, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: color.gold, flexShrink: 0 }}>→</span>{tip}
              </div>
            ))}
          </div>

          {/* Camera button */}
          <label style={{ display: "block", cursor: "pointer", marginBottom: 12 }}>
            <div style={{ width: "100%", background: `linear-gradient(135deg, ${color.greenBright}, #2e8b4a)`, borderRadius: 10, padding: 16, color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: 1, textAlign: "center", boxSizing: "border-box" }}>
              📷 Open Camera
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              capture="environment"
              onChange={handlePhotoChange}
              style={{ fontSize: type.md, display: "none" }}
            />
          </label>

          {/* Library button */}
          <label style={{ display: "block", cursor: "pointer" }}>
            <div style={{ width: "100%", background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, color: color.cream, fontSize: 14, textAlign: "center", boxSizing: "border-box" }}>
              Choose from Library
            </div>
            <input
              ref={libraryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handlePhotoChange}
              style={{ fontSize: type.md, display: "none" }}
            />
          </label>
        </div>
      )}

      {/* ANALYZING STAGE */}
      {stage === "analyzing" && (
        <div style={{ padding: 24, textAlign: "center" }}>
          {photoPreview && (
            <img src={photoPreview} alt="Band" style={{ width: "100%", borderRadius: 12, maxHeight: 240, objectFit: "cover", marginBottom: 24 }} />
          )}
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: color.text, marginBottom: 8 }}>Analyzing your cigar band...</div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 24 }}>Ashed is reading the band label</div>
          <div style={{ width: "100%", height: 4, background: color.surfaceRaised, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: `linear-gradient(90deg, ${color.gold}, ${color.goldPale})`, borderRadius: 2, animation: "scan 1.5s ease-in-out infinite", width: "40%" }} />
          </div>
          <style>{`@keyframes scan { 0% { margin-left: -40% } 100% { margin-left: 100% } }`}</style>
        </div>
      )}

      {/* VITOLA STAGE */}
      {stage === "vitola" && cigar && (
        <div style={{ padding: 20 }}>
          {/* Confidence indicator */}
          <div style={{ background: confidence === "high" ? `${color.green}22` : `${color.gold}22`, border: `1px solid ${confidence === "high" ? `${color.green}55` : `${color.gold}55`}`, borderRadius: 8, padding: "8px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>{confidence === "high" ? "✓" : "~"}</span>
            <span style={{ fontSize: type.xs, color: confidence === "high" ? color.green : color.gold }}>
              {confidence === "high" ? "High confidence identification" : "Medium confidence — please verify"}
            </span>
          </div>

          <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 2, marginBottom: 2 }}>{cigar.brand.toUpperCase()}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: color.text, marginBottom: 4 }}>{cigar.line}</div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 20 }}>Select your vitola to continue</div>

          {violasLoading && (
            <div style={{ textAlign: "center", padding: 24, fontSize: 13, color: color.muted }}>Loading sizes...</div>
          )}
          {!violasLoading && vitolas.length === 0 && (
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 13, color: color.muted, marginBottom: 16 }}>No vitolas found in the database for this cigar.</div>
              <button onClick={() => setStage("result")} style={{ width: "100%", background: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`, border: "none", borderRadius: 10, padding: 14, color: color.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
                Continue Anyway
              </button>
              <button onClick={() => { onClose(); if (onSearchManually) onSearchManually(); }} style={{ width: "100%", background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, color: color.muted, fontSize: 14, cursor: "pointer", fontFamily: SANS, boxSizing: "border-box" }}>
                Search Manually
              </button>
            </div>
          )}
          {!violasLoading && vitolas.length > 0 && (
            <>
              {/* Not Sure option — first */}
              <div
                onClick={() => {
                  // Compute strength range across all vitolas
                  const STRENGTH_ORDER = ["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"];
                  const strengths = [...new Set(vitolas.map(v => v.strength).filter(Boolean))].sort((a, b) => STRENGTH_ORDER.indexOf(a) - STRENGTH_ORDER.indexOf(b));
                  const strengthRange = strengths.length > 1 ? `${strengths[0]} – ${strengths[strengths.length - 1]}` : strengths[0] || null;
                  setCigar({ ...cigar, vitola: null, strength: strengthRange });
                  setStage("result");
                }}
                style={{ background: color.surfaceRaised, border: `1px solid ${color.gold}44`, borderRadius: 10, padding: "12px 14px", marginBottom: 12, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: color.gold }}>Not Sure</div>
                  <div style={{ fontSize: type.xs, color: color.muted, marginTop: 3 }}>Show general info for this line</div>
                </div>
                <span style={{ color: color.gold, fontSize: 18 }}>›</span>
              </div>
              {/* Divider */}
              <div style={{ fontSize: type.xs, color: color.faint, letterSpacing: 1, marginBottom: 10 }}>OR SELECT A SIZE</div>
              {vitolas.map((v, i) => (
                <div key={i}
                  onClick={() => {
                    const selected = { ...cigar, ...v, brand: cigar.brand, line: cigar.line };
                    setCigar(selected);
                    setStage("result");
                  }}
                  style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: color.text }}>{v.vitola}</div>
                    {v.strength && <div style={{ fontSize: type.xs, color: color.muted, marginTop: 3 }}>{v.strength}</div>}
                  </div>
                  <span style={{ color: color.gold, fontSize: 18 }}>›</span>
                </div>
              ))}
            </>
          )}

          <button onClick={() => { setStage("capture"); setPhotoPreview(null); setCigar(null); }} style={{ width: "100%", background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, color: color.muted, fontSize: 14, cursor: "pointer", fontFamily: SANS, marginTop: 8, boxSizing: "border-box" }}>
            Scan Again
          </button>
        </div>
      )}

      {/* RESULT STAGE */}
      {stage === "result" && cigar && (
        <div style={{ padding: 20 }}>
          {photoPreview && (
            <img src={photoPreview} alt="Band" style={{ width: "100%", borderRadius: 12, maxHeight: 180, objectFit: "cover", marginBottom: 16 }} />
          )}

          {/* Confidence indicator */}
          <div style={{ background: confidence === "high" ? `${color.green}22` : `${color.gold}22`, border: `1px solid ${confidence === "high" ? `${color.green}55` : `${color.gold}55`}`, borderRadius: 8, padding: "8px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>{confidence === "high" ? "✓" : "~"}</span>
            <span style={{ fontSize: type.xs, color: confidence === "high" ? color.green : color.gold }}>
              {confidence === "high" ? "High confidence identification" : "Medium confidence — please verify"}
            </span>
          </div>

          <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 2, textTransform: "uppercase" }}>{cigar.brand}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: color.text, margin: "4px 0 10px" }}>{cigar.line}</div>
          {cigar.vitola && <div style={{ fontSize: 14, color: color.gold, marginBottom: 12, fontWeight: 600 }}>{cigar.vitola}</div>}

          {/* Info boxes — text style, no colored badges */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["Wrapper", cigar.wrapper], ["Strength", cigar.strength], ["Origin", cigar.origin]].map(([k, v]) => v && (
              <div key={k} style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 14, color: color.text, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>

          {cigar.tasting_notes && (
            <div style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 2, marginBottom: 6 }}>TASTING NOTES</div>
              <div style={{ fontSize: 13, color: color.cream, lineHeight: 1.6 }}>{cigar.tasting_notes}</div>
            </div>
          )}

          {cigar.description && (
            <div style={{ fontSize: 13, color: color.muted, fontStyle: "italic", marginBottom: 20, lineHeight: 1.6 }}>{cigar.description}</div>
          )}

          <button onClick={() => onCheckIn(cigar)} style={{ width: "100%", background: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`, border: "none", borderRadius: 10, padding: 16, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
            🚬 Log This Smoke
          </button>
          <button onClick={() => { onAddToWishlist(cigar); showToast("Added to Wishlist ✓"); }} style={{ width: "100%", background: "none", border: `1px solid ${color.gold}55`, borderRadius: 10, padding: 14, color: color.gold, fontSize: 14, cursor: "pointer", fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
            ♡ Add to Wishlist
          </button>
          <button onClick={() => { onAddToHumidor(cigar); showToast("Added to Humidor ✓"); }} style={{ width: "100%", background: "none", border: `1px solid ${color.green}55`, borderRadius: 10, padding: 14, color: color.green, fontSize: 14, cursor: "pointer", fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
            + Add to Humidor
          </button>
          <button onClick={() => { setStage("capture"); setPhotoPreview(null); setCigar(null); setFlagged(false); setToast(null); setVitolas([]); }} style={{ width: "100%", background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, color: color.muted, fontSize: 14, cursor: "pointer", fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
            Scan Again
          </button>

          {!flagged ? (
            <button onClick={handleFlag} disabled={flagging} style={{ width: "100%", background: "none", border: `1px solid ${color.line}44`, borderRadius: 10, padding: 10, color: color.faint, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, boxSizing: "border-box" }}>
              {flagging ? "Flagging..." : "⚑ Flag incorrect info"}
            </button>
          ) : (
            <div style={{ textAlign: "center", fontSize: type.xs, color: color.green, padding: 10 }}>✓ Thanks — flagged for review</div>
          )}

          {toast && (
            <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: color.greenBright, color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px 28px", borderRadius: 30, zIndex: 500, fontFamily: SANS, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              {toast}
            </div>
          )}
        </div>
      )}

      {/* ERROR STAGE */}
      {stage === "error" && (
        <div style={{ padding: 24, textAlign: "center" }}>
          {photoPreview && (
            <img src={photoPreview} alt="Band" style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover", marginBottom: 20 }} />
          )}
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚫</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: color.text, marginBottom: 8 }}>Couldn't identify this band</div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 24, lineHeight: 1.6 }}>{errorMsg}</div>
          <button onClick={() => { setStage("capture"); setPhotoPreview(null); setErrorMsg(""); }} style={{ width: "100%", background: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`, border: "none", borderRadius: 10, padding: 16, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
            Try Again
          </button>
          <button onClick={() => { onClose(); if (onSearchManually) onSearchManually(); }} style={{ width: "100%", background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, color: color.muted, fontSize: 14, cursor: "pointer", fontFamily: SANS, boxSizing: "border-box" }}>
            Search Manually Instead
          </button>
        </div>
      )}

    </Screen>
  );
}
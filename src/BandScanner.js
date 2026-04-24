import { useState, useRef } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const strengthColor = s => ({ "Light": "#a8c5a0", "Medium": "#d4b483", "Medium-Full": "#c4894a", "Full": "#a0522d" }[s] || "#888");

const Badge = ({ label, color = "#c9a84c" }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{label}</span>
);

export default function BandScanner({ user, onClose, onCheckIn, onAddToWishlist, onAddToHumidor, onSearchManually }) {
  const [stage, setStage] = useState("capture"); // capture | analyzing | result | error | flagged
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cigar, setCigar] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [flagging, setFlagging] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const fileInputRef = useRef(null);

  const cacheCigarToDB = async (result) => {
    try {
      const { data: existing } = await supabase
        .from("cigars")
        .select("id")
        .eq("brand", result.brand)
        .eq("line", result.line)
        .eq("vitola", result.vitola)
        .maybeSingle();
      if (!existing) {
        const { data: inserted } = await supabase.from("cigars").insert({
          brand: result.brand,
          line: result.line,
          vitola: result.vitola,
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
      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 1024,
          user_id: user?.id,
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

Return ONLY a raw JSON object, no markdown, no explanation:
{
  "brand": "Brand name",
  "line": "Cigar line name",
  "vitola": "Size/shape name",
  "strength": "Light|Medium|Medium-Full|Full",
  "origin": "Country of origin",
  "wrapper": "Wrapper country/type",
  "tasting_notes": "Brief expected tasting notes",
  "description": "One sentence about this cigar",
  "confidence": "high|medium|low",
  "confidence_reason": "Brief reason for confidence level"
}

If you cannot identify the cigar with any confidence, return:
{"confidence": "none", "confidence_reason": "Reason why"}

Be as specific as possible. If you can read text on the band, use it.`
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

      if (result.confidence === "none") {
        setErrorMsg(result.confidence_reason || "Could not identify this cigar band. Please try a clearer photo.");
        setStage("error");
        return;
      }

      // Low confidence — go straight to error with manual search prompt
      if (result.confidence === "low") {
        setErrorMsg(`Best guess: ${result.brand} ${result.line} — but confidence is too low to be reliable. Try a clearer photo or search manually.`);
        setStage("error");
        return;
      }

      // Cache to DB for medium/high confidence
      const cached = await cacheCigarToDB(result);

      setConfidence(result.confidence);
      setCigar({
        id: cached?.id || null,
        brand: result.brand || "Unknown",
        line: result.line || "Unknown",
        vitola: result.vitola || "Unknown",
        strength: result.strength || "Medium",
        origin: result.origin || "Unknown",
        wrapper: result.wrapper || null,
        tasting_notes: result.tasting_notes || null,
        description: result.description || null,
        ai_band_identified: true,
      });
      setStage("result");

    } catch (err) {
      console.error("Band scan error:", err);
      setErrorMsg("Something went wrong analyzing the photo. Please try again.");
      setStage("error");
    }
  };

  const s = {
    overlay: { position: "fixed", inset: 0, background: "#1a0f08", zIndex: 300, overflowY: "auto", fontFamily: SANS, color: "#e8d5b7", maxWidth: 420, margin: "0 auto" },
    header: { background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "16px 20px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center" },
  };

  return (
    <div style={s.overlay}>
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e8d5b7" }}>
            {stage === "capture" && "Scan a Cigar Band"}
            {stage === "analyzing" && "Analyzing..."}
            {stage === "result" && "Cigar Identified"}
            {stage === "error" && "Scan Failed"}
          </div>
          <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>AI BAND IDENTIFICATION</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 24, cursor: "pointer" }}>×</button>
      </div>

      {/* CAPTURE STAGE */}
      {stage === "capture" && (
        <div style={{ padding: 24 }}>
          <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>Photo the cigar band</div>
            <div style={{ fontSize: 13, color: "#8a7055", lineHeight: 1.6 }}>
              Get as close as possible and make sure the band label is clearly visible and in focus.
            </div>
          </div>

          <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>TIPS FOR BEST RESULTS</div>
            {["Hold the cigar steady in good lighting", "Fill the frame with the band label", "Avoid blurry or dark photos", "Both ends of the band help if visible"].map((tip, i) => (
              <div key={i} style={{ fontSize: 13, color: "#c8b89a", marginBottom: 6, display: "flex", gap: 8 }}>
                <span style={{ color: "#c9a84c" }}>→</span>{tip}
              </div>
            ))}
          </div>

          <label style={{ display: "block", cursor: "pointer" }}>
            <div style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 16, color: "#1a0f08", fontSize: 15, fontWeight: 700, letterSpacing: 1, fontFamily: SANS, textAlign: "center" }}>
              📷 Open Camera
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              capture="environment"
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />
          </label>

          <label style={{ display: "block", cursor: "pointer", marginTop: 12 }}>
            <div style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 10, padding: 14, color: "#8a7055", fontSize: 14, fontFamily: SANS, textAlign: "center", boxSizing: "border-box" }}>
              Choose from Library
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />
          </label>
        </div>
      )}

      {/* ANALYZING STAGE */}
      {stage === "analyzing" && (
        <div style={{ padding: 24, textAlign: "center" }}>
          {photoPreview && (
            <img src={photoPreview} alt="Band" style={{ width: "100%", borderRadius: 12, maxHeight: 260, objectFit: "cover", marginBottom: 24 }} />
          )}
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>Analyzing your cigar band...</div>
          <div style={{ fontSize: 13, color: "#8a7055" }}>Ashed is reading the band label</div>
          <div style={{ width: "100%", height: 4, background: "#2a1a0e", borderRadius: 2, overflow: "hidden", marginTop: 24 }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 2, animation: "scan 1.5s ease-in-out infinite", width: "40%" }} />
          </div>
          <style>{`@keyframes scan { 0% { margin-left: -40% } 100% { margin-left: 100% } }`}</style>
        </div>
      )}

      {/* RESULT STAGE */}
      {stage === "result" && cigar && (
        <div style={{ padding: 20 }}>
          {photoPreview && (
            <img src={photoPreview} alt="Band" style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover", marginBottom: 16 }} />
          )}

          {/* Confidence indicator */}
          <div style={{ background: confidence === "high" ? "#7a9a7a22" : confidence === "medium" ? "#c9a84c22" : "#a0522d22", border: `1px solid ${confidence === "high" ? "#7a9a7a55" : confidence === "medium" ? "#c9a84c55" : "#a0522d55"}`, borderRadius: 8, padding: "8px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>{confidence === "high" ? "✓" : confidence === "medium" ? "~" : "?"}</span>
            <span style={{ fontSize: 12, color: confidence === "high" ? "#7a9a7a" : confidence === "medium" ? "#c9a84c" : "#a0522d" }}>
              {confidence === "high" ? "High confidence identification" : confidence === "medium" ? "Medium confidence — please verify" : "Low confidence — please verify carefully"}
            </span>
          </div>

          <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, textTransform: "uppercase" }}>{cigar.brand}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#e8d5b7", margin: "4px 0 10px" }}>{cigar.line}</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {cigar.vitola && <Badge label={cigar.vitola} />}
            {cigar.strength && <Badge label={cigar.strength} color={strengthColor(cigar.strength)} />}
            {cigar.origin && <Badge label={cigar.origin} color="#7a9a7a" />}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["Wrapper", cigar.wrapper], ["Strength", cigar.strength], ["Vitola", cigar.vitola], ["Origin", cigar.origin]].map(([k, v]) => v && (
              <div key={k} style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 14, color: "#e8d5b7", marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>

          {cigar.tasting_notes && (
            <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginBottom: 6 }}>TASTING NOTES</div>
              <div style={{ fontSize: 13, color: "#c8b89a", lineHeight: 1.6 }}>{cigar.tasting_notes}</div>
            </div>
          )}

          {cigar.description && (
            <div style={{ fontSize: 13, color: "#8a7055", fontStyle: "italic", marginBottom: 20, lineHeight: 1.6 }}>{cigar.description}</div>
          )}

          <button
            onClick={() => onCheckIn(cigar)}
            style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 16, color: "#1a0f08", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: SANS, marginBottom: 10 }}
          >
            + LOG THIS SMOKE
          </button>
          <button
            onClick={() => { onAddToWishlist(cigar); onClose(); }}
            style={{ width: "100%", background: "none", border: "1px solid #c9a84c55", borderRadius: 10, padding: 14, color: "#c9a84c", fontSize: 14, cursor: "pointer", fontFamily: SANS, marginBottom: 10 }}
          >
            + Add to Wishlist
          </button>
          <button
            onClick={() => { onAddToHumidor(cigar); onClose(); }}
            style={{ width: "100%", background: "none", border: "1px solid #7a9a7a55", borderRadius: 10, padding: 14, color: "#7a9a7a", fontSize: 14, cursor: "pointer", fontFamily: SANS, marginBottom: 10 }}
          >
            + Add to Humidor
          </button>
          <button
            onClick={() => { setStage("capture"); setPhotoPreview(null); setCigar(null); setFlagged(false); }}
            style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 10, padding: 14, color: "#8a7055", fontSize: 14, cursor: "pointer", fontFamily: SANS, marginBottom: 10 }}
          >
            Scan Again
          </button>

          {/* Flag incorrect info */}
          {!flagged ? (
            <button
              onClick={handleFlag}
              disabled={flagging}
              style={{ width: "100%", background: "none", border: "1px solid #3a251044", borderRadius: 10, padding: 10, color: "#5a4535", fontSize: 12, cursor: "pointer", fontFamily: SANS }}
            >
              {flagging ? "Flagging..." : "⚑ Flag incorrect info"}
            </button>
          ) : (
            <div style={{ textAlign: "center", fontSize: 12, color: "#7a9a7a", padding: 10 }}>
              ✓ Thanks — this has been flagged for review
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
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>Couldn't identify this band</div>
          <div style={{ fontSize: 13, color: "#8a7055", marginBottom: 24, lineHeight: 1.6 }}>{errorMsg}</div>
          <button
            onClick={() => { setStage("capture"); setPhotoPreview(null); setErrorMsg(""); }}
            style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 16, color: "#1a0f08", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 10 }}
          >
            Try Again
          </button>
          <button
            onClick={() => { onClose(); if (onSearchManually) onSearchManually(); }}
            style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 10, padding: 14, color: "#8a7055", fontSize: 14, cursor: "pointer", fontFamily: SANS }}
          >
            Search Manually Instead
          </button>
        </div>
      )}
    </div>
  );
}
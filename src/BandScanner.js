import { useState, useRef } from "react";
import { SANS, color, font, radius, type } from "./theme";
import { Icon, Notice, Pressable, Screen } from "./ui";
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
  const [flagError, setFlagError] = useState(null);
  const [toast, setToast] = useState(null);
  const [vitolas, setVitolas] = useState([]);
  const [vitolasLoading, setVitolasLoading] = useState(false);
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

  // A flag is a report, not an edit. This used to write
  // { verified: false, ai_generated: true } straight to the cigars table on a
  // brand + line + vitola match, so any user could unverify a hand-checked
  // record — and silently mark it AI-generated — with one tap and no review.
  // It now goes to the moderation queue the admin console already reads.
  const handleFlag = async () => {
    setFlagging(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const name = [cigar.brand, cigar.line, cigar.vitola].filter(Boolean).join(" ");
      // feedback, not reports: reports is comment-specific — it is read joined
      // to comments and grouped by comment_id, so a row with no comment_id
      // would show in moderation as "Comment not found". The admin console
      // already surfaces feedback, and this needs no migration.
      const { error } = await supabase.from("feedback").insert({
        user_id: auth?.user?.id || null,
        type: "bug",
        description: `Band scanner flagged incorrect info: ${name}${cigar.id ? ` (cigar id ${cigar.id})` : ""}`,
      });
      if (error) throw error;
      setFlagged(true);
    } catch (e) {
      console.error("Flag error:", e);
      // Do not claim it was recorded when it was not.
      setFlagError("Couldn't send that. Please try again.");
    }
    setFlagging(false);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadVitolas = async (brand, line) => {
    setVitolasLoading(true);
    const { data } = await supabase
      .from("cigars")
      .select("id, vitola, strength, wrapper, origin, tasting_notes")
      .eq("brand", brand)
      .eq("line", line)
      .not("vitola", "is", null)
      .order("vitola");
    setVitolas(data || []);
    setVitolasLoading(false);
  };

  const reset = () => {
    setStage("capture");
    setPhotoPreview(null);
    setCigar(null);
    setVitolas([]);
    setFlagged(false);
    setToast(null);
    setErrorMsg("");
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
    <Screen title="Scan a band" onBack={onClose}
      action={(stage === "vitola" || stage === "result") && (
        <Pressable onClick={reset} minHeight={0} style={{ padding: "0 12px", color: color.gold, fontSize: type.xs, whiteSpace: "nowrap" }}>
          Scan again
        </Pressable>
      )}
    >


      {/* CAPTURE STAGE */}
      {stage === "capture" && (
        <div style={{ padding: 20 }}>

          {/* The viewfinder is the screen. This used to open on two bordered
              cards — four "HOW IT WORKS" rows and four "TIPS" rows, eight
              lines of text before the button. A framing rectangle says the
              same thing in one glance. */}
          <div style={{
            position: "relative", width: "100%", aspectRatio: "4 / 5",
            background: color.surface, borderRadius: radius.md,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20, overflow: "hidden",
          }}>
            <div style={{ position: "relative", width: "84%", aspectRatio: "16 / 7" }}>
              {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h]) => (
                <span key={v + h} style={{
                  position: "absolute", [v]: 0, [h]: 0, width: 26, height: 26,
                  [`border${v === "top" ? "Top" : "Bottom"}`]: `2px solid ${color.gold}`,
                  [`border${h === "left" ? "Left" : "Right"}`]: `2px solid ${color.gold}`,
                }} />
              ))}
              <span style={{
                position: "absolute", left: 0, right: 0, bottom: -30,
                textAlign: "center", fontSize: type.xs, color: color.textFaint,
              }}>
                Fill the frame with the band
              </span>
            </div>
          </div>
          {/* Camera button */}
          <label style={{ display: "block", cursor: "pointer", marginBottom: 12 }}>
            <div style={{ width: "100%", height: 52, background: color.gold, borderRadius: radius.md, color: color.bg, fontSize: type.md, fontWeight: 600, fontFamily: font.sans, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxSizing: "border-box" }}>
              <Icon.Camera size={19} color={color.bg} /> Open camera
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
            <div style={{ width: "100%", height: 52, background: "none", border: `1px solid ${color.borderStrong}`, borderRadius: radius.md, color: color.textBody, fontSize: type.md, fontFamily: font.sans, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
              Choose a photo
            </div>
            <input
              ref={libraryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handlePhotoChange}
              style={{ fontSize: type.md, display: "none" }}
            />
          </label>

          {/* What the framing rectangle cannot say. Two lines, below the
              fold, replacing eight in two bordered cards. */}
          <div style={{ marginTop: 24, fontSize: type.xs, color: color.textFaint, lineHeight: 1.6 }}>
            <div>Good light, band in focus, one cigar at a time.</div>
            <div>Both ends of the band help.</div>
          </div>
        </div>
      )}

      {/* ANALYZING STAGE */}
      {stage === "analyzing" && (
        <div style={{ padding: 24, textAlign: "center" }}>
          {photoPreview && (
            <img src={photoPreview} alt="Band" style={{ width: "100%", borderRadius: 12, maxHeight: 240, objectFit: "cover", marginBottom: 24 }} />
          )}
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><Icon.Search size={32} color={color.borderStrong} /></div>
          <div style={{ fontSize: 16, fontWeight: 700, color: color.text, marginBottom: 8 }}>Analyzing your cigar band...</div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 24 }}>Ashed is reading the band label</div>
          <div style={{ width: "100%", height: 4, background: color.surfaceRaised, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: color.gold, borderRadius: 2, animation: "scan 1.5s ease-in-out infinite", width: "40%" }} />
          </div>
          <style>{`@keyframes scan { 0% { margin-left: -40% } 100% { margin-left: 100% } }`}</style>
        </div>
      )}

      {/* VITOLA STAGE */}
      {stage === "vitola" && cigar && (
        <div style={{ padding: 20 }}>
          {/* Confidence indicator */}
          <div style={{ background: confidence === "high" ? `${color.green}22` : `${color.gold}22`, border: `1px solid ${confidence === "high" ? `${color.green}55` : `${color.gold}55`}`, borderRadius: 8, padding: "8px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: type.xs }}>{confidence === "high" ? "High" : "Low"}</span>
            <span style={{ fontSize: type.xs, color: confidence === "high" ? color.green : color.gold }}>
              {confidence === "high" ? "High confidence identification" : "Medium confidence — please verify"}
            </span>
          </div>

          <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 2, marginBottom: 2 }}>{cigar.brand.toUpperCase()}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: color.text, marginBottom: 4 }}>{cigar.line}</div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 20 }}>Select your vitola to continue</div>

          {vitolasLoading && (
            <div style={{ textAlign: "center", padding: 24, fontSize: 13, color: color.muted }}>Loading sizes...</div>
          )}
          {!vitolasLoading && vitolas.length === 0 && (
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 13, color: color.muted, marginBottom: 16 }}>No vitolas found in the database for this cigar.</div>
              <button onClick={() => setStage("result")} style={{ width: "100%", background: color.gold, border: "none", borderRadius: 10, padding: 14, color: color.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
                Continue Anyway
              </button>
              <button onClick={() => { onClose(); if (onSearchManually) onSearchManually(); }} style={{ width: "100%", background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, color: color.muted, fontSize: 14, cursor: "pointer", fontFamily: SANS, boxSizing: "border-box" }}>
                Search Manually
              </button>
            </div>
          )}
          {!vitolasLoading && vitolas.length > 0 && (
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
            <span style={{ fontSize: type.xs }}>{confidence === "high" ? "High" : "Low"}</span>
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

          <button onClick={() => onCheckIn(cigar)} style={{ width: "100%", background: color.gold, border: "none", borderRadius: 10, padding: 16, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
            Log this smoke
          </button>
          <button onClick={() => { onAddToWishlist(cigar); showToast("Added to wishlist"); }} style={{ width: "100%", background: "none", border: `1px solid ${color.gold}55`, borderRadius: 10, padding: 14, color: color.gold, fontSize: 14, cursor: "pointer", fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
            Add to wishlist
          </button>
          <button onClick={() => { onAddToHumidor(cigar); showToast("Added to humidor"); }} style={{ width: "100%", background: "none", border: `1px solid ${color.green}55`, borderRadius: 10, padding: 14, color: color.green, fontSize: 14, cursor: "pointer", fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
            + Add to Humidor
          </button>

          {/* A quiet text link, not a fifth full-width button. */}
          {flagged ? (
            <div style={{ textAlign: "center", fontSize: type.xs, color: color.textMuted, padding: "12px 0" }}>
              Thanks — flagged for review
            </div>
          ) : (
            <>
              <Pressable onClick={handleFlag} disabled={flagging} label="Flag incorrect info"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: color.textFaint, fontSize: type.xs }}>
                {flagging ? "Sending…" : "Flag incorrect info"}
              </Pressable>
              {flagError && <Notice isError text={flagError} style={{ marginTop: 8 }} />}
            </>
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
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><Icon.Close size={32} color={color.borderStrong} /></div>
          <div style={{ fontSize: 16, fontWeight: 700, color: color.text, marginBottom: 8 }}>Couldn't identify this band</div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 24, lineHeight: 1.6 }}>{errorMsg}</div>
          <button onClick={() => { setStage("capture"); setPhotoPreview(null); setErrorMsg(""); }} style={{ width: "100%", background: color.gold, border: "none", borderRadius: 10, padding: 16, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
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
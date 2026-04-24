import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const KEY = process.env.REACT_APP_ANTHROPIC_KEY;
const strengthColor = s => ({ "Light": "#a8c5a0", "Medium": "#d4b483", "Medium-Full": "#c4894a", "Full": "#a0522d" }[s] || "#888");

const Badge = ({ label, color = "#c9a84c" }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{label}</span>
);

export default function Humidor({ user, onSmokeOne, onSearchToAdd, isPremium, onUpgrade }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStage, setScanStage] = useState("idle"); // idle | analyzing | confirm | error
  const [scanResult, setScanResult] = useState(null);
  const [vitolaOptions, setVitolaOptions] = useState({});
  const [editingVitola, setEditingVitola] = useState(null); // item id
  const [editVitolaOptions, setEditVitolaOptions] = useState([]);
  const [editVitolaValue, setEditVitolaValue] = useState("");
  const [scanError, setScanError] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [editingQty, setEditingQty] = useState(null);
  const fileInputRef = useRef(null);

  const fetchHumidor = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("humidor")
      .select("*, cigars(brand, line, vitola, strength, origin, wrapper, tasting_notes)")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const loadHumidor = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("humidor")
        .select("*, cigars(brand, line, vitola, strength, origin, wrapper, tasting_notes)")
        .eq("user_id", user.id)
        .order("added_at", { ascending: false });
      setItems(data || []);
      setLoading(false);
    };
    loadHumidor();
  }, [user.id]);

  const handleScanPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setScanStage("analyzing");

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

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
          model: "claude-opus-4-6",
          max_tokens: 2048,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
              { type: "text", text: `You are a cigar expert. Analyze this image. It may contain one cigar band or multiple cigar bands.

If it contains ONE cigar, return a single JSON object:
{"type":"single","brand":"Brand","line":"Line","vitola":"Vitola or Unknown","strength":"Light|Medium|Medium-Full|Full","origin":"Country","wrapper":"Wrapper type","confidence":"high|medium|low","confidence_reason":"Brief reason"}

If it contains MULTIPLE cigars or bands, return a JSON array — one entry per cigar you can see:
[{"brand":"Brand","line":"Line","vitola":"Vitola or Unknown","strength":"Light|Medium|Medium-Full|Full","origin":"Country","wrapper":"Wrapper type","confidence":"high|medium|low","confidence_reason":"Brief reason"},...]

If you cannot identify anything, return:
{"type":"none","reason":"Why"}

IMPORTANT RULES:
- Only return "high" confidence if you can clearly read the brand and line name on the band.
- Return "medium" if you can read the brand but are inferring the line.
- Return "low" if the band is blurry, angled, partially obscured, or you are guessing. Low confidence entries will be filtered out and the user will search manually.
- It is better to return "low" and let the user search manually than to return a wrong cigar with "high" or "medium" confidence.
- For multi-cigar photos, each cigar gets its own confidence rating independently.

Return ONLY raw JSON, no markdown, no explanation.` }
            ]
          }]
        }),
      });

      const data = await response.json();
      const raw = data.content?.[0]?.text || "{}";
      const match = raw.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      const result = match ? JSON.parse(match[0]) : {};

      if (result.type === "none") {
        setScanError(result.reason || "Could not identify any cigars in this photo.");
        setScanStage("error");
        return;
      }

      // Normalize to array for both single and multi
      const cigars = Array.isArray(result)
        ? result
        : result.type === "single"
          ? [result]
          : [result];

      if (cigars.length === 0 || cigars.every(c => !c.brand)) {
        setScanError("Could not identify any cigars in this photo.");
        setScanStage("error");
        return;
      }

      const mappedCigars = cigars.map(c => ({ ...c, qty: 1, notes: "" }));
      setScanResult(mappedCigars);
      setScanStage("confirm");

      // Fetch vitola options for each scanned cigar from DB
      const options = {};
      await Promise.all(mappedCigars.map(async (c, i) => {
        if (!c.brand || !c.line) return;
        const { data } = await supabase
          .from("cigars")
          .select("vitola")
          .eq("brand", c.brand)
          .eq("line", c.line)
          .order("vitola");
        options[i] = data ? data.map(r => r.vitola) : [];
      }));
      setVitolaOptions(options);

    } catch (err) {
      console.error("Humidor scan error:", err);
      setScanError("Something went wrong analyzing the photo. Please try again.");
      setScanStage("error");
    }
  };

  const handleConfirmScan = async () => {
    for (const cigar of scanResult) {
      // Try to find matching cigar in cigars table
      const { data: match } = await supabase
        .from("cigars")
        .select("id")
        .eq("brand", cigar.brand)
        .eq("line", cigar.line)
        .maybeSingle();

      let cigarId = match?.id || null;

      // If not found — report as missing for admin review, do NOT auto-insert
      if (!cigarId && cigar.brand && cigar.line) {
        // Check if already reported to avoid duplicates
        const { data: alreadyReported } = await supabase
          .from("missing_cigars")
          .select("id")
          .eq("brand", cigar.brand)
          .eq("line", cigar.line)
          .maybeSingle();
        if (!alreadyReported) {
          await supabase.from("missing_cigars").insert({
            brand: cigar.brand,
            line: cigar.line,
            vitola: cigar.vitola !== "Unknown" ? cigar.vitola : null,
            reported_by: user.id,
          });
        }
      }

      // Check if this cigar already exists in humidor
      const { data: existingHumidor } = await supabase
        .from("humidor")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("cigar_brand", cigar.brand)
        .eq("cigar_name", cigar.line)
        .maybeSingle();

      if (existingHumidor) {
        // Increment quantity instead of creating duplicate
        await supabase.from("humidor")
          .update({ quantity: existingHumidor.quantity + (cigar.qty || 1) })
          .eq("id", existingHumidor.id);
      } else {
        await supabase.from("humidor").insert({
          user_id: user.id,
          cigar_id: cigarId,
          cigar_brand: cigar.brand,
          cigar_name: cigar.line,
          cigar_vitola: cigar.vitola !== "Unknown" ? cigar.vitola : null,
          quantity: cigar.qty || 1,
          notes: cigar.notes || null,
        });
      }
    }

    setScanStage("idle");
    setScanResult(null);
    setPhotoPreview(null);
    setScanning(false);
    fetchHumidor();
  };

  const handleSmokeOne = async (item) => {
    const newQty = item.quantity - 1;
    if (newQty <= 0) {
      await supabase.from("humidor").delete().eq("id", item.id);
    } else {
      await supabase.from("humidor").update({ quantity: newQty }).eq("id", item.id);
    }
    // Pass cigar data up to App.js to open CheckIn
    const cigar = item.cigars || {
      id: item.cigar_id,
      brand: item.cigar_brand,
      line: item.cigar_name,
      vitola: item.cigar_vitola,
    };
    onSmokeOne(cigar);
    fetchHumidor();
  };

  const handleRemoveOne = async (item) => {
    const newQty = item.quantity - 1;
    if (newQty <= 0) {
      await supabase.from("humidor").delete().eq("id", item.id);
    } else {
      await supabase.from("humidor").update({ quantity: newQty }).eq("id", item.id);
    }
    fetchHumidor();
  };

  const handleRemoveAll = async (id) => {
    await supabase.from("humidor").delete().eq("id", id);
    fetchHumidor();
  };

  const handleUpdateQty = async (id, qty) => {
    if (qty < 1) return;
    await supabase.from("humidor").update({ quantity: qty }).eq("id", id);
    setEditingQty(null);
    fetchHumidor();
  };

  const handleStartEditVitola = async (item) => {
    const brand = item.cigars?.brand || item.cigar_brand;
    const line = item.cigars?.line || item.cigar_name;
    setEditingVitola(item.id);
    setEditVitolaValue("");
    if (brand && line) {
      const { data } = await supabase.from("cigars").select("vitola").eq("brand", brand).eq("line", line).order("vitola");
      setEditVitolaOptions(data ? data.map(r => r.vitola) : []);
    } else {
      setEditVitolaOptions([]);
    }
  };

  const handleSaveVitola = async (item) => {
    if (!editVitolaValue) return;
    await supabase.from("humidor").update({ cigar_vitola: editVitolaValue }).eq("id", item.id);
    setEditingVitola(null);
    setEditVitolaValue("");
    fetchHumidor();
  };

  const resetScan = () => {
    setScanStage("idle");
    setScanResult(null);
    setScanError("");
    setPhotoPreview(null);
    setScanning(false);
  };

  if (loading) return <div style={{ fontFamily: SANS, color: "#8a7055", textAlign: "center", padding: 40 }}>Loading...</div>;

  // SCAN FLOW
  if (scanning) return (
    <div style={{ fontFamily: SANS, color: "#e8d5b7", padding: 20 }}>

      {scanStage === "idle" && (
        <>
          <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 2, marginBottom: 16 }}>ADD TO HUMIDOR</div>
          <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 12, padding: 20, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📷</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 6 }}>Scan cigar band(s)</div>
            <div style={{ fontSize: 13, color: "#8a7055", lineHeight: 1.6 }}>Take one photo of a single band or multiple bands at once. Ashed will identify each cigar.</div>
          </div>
          <div style={{ background: "#2a1a0e", border: "1px solid #c9a84c33", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#c9a84c", letterSpacing: 1, marginBottom: 6 }}>TIPS FOR BEST RESULTS</div>
            {["Photograph 3 cigars at a time max for best accuracy", "Bands should face the camera directly, not at an angle", "Good lighting and a steady hand make a big difference", "You can always edit brand and line on the confirm screen"].map((tip, i) => (
              <div key={i} style={{ fontSize: 12, color: "#8a7055", marginBottom: 4, display: "flex", gap: 6 }}>
                <span style={{ color: "#c9a84c" }}>→</span>{tip}
              </div>
            ))}
          </div>
          <label style={{ display: "block", cursor: "pointer", marginBottom: 10 }}>
            <div style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 14, color: "#1a0f08", fontSize: 14, fontWeight: 700, fontFamily: SANS, textAlign: "center", boxSizing: "border-box" }}>
              📷 Open Camera
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleScanPhoto} style={{ display: "none" }} />
          </label>
          <label style={{ display: "block", cursor: "pointer", marginBottom: 10 }}>
            <div style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 10, padding: 14, color: "#8a7055", fontSize: 14, fontFamily: SANS, textAlign: "center", boxSizing: "border-box" }}>
              Choose from Library
            </div>
            <input type="file" accept="image/*" onChange={handleScanPhoto} style={{ display: "none" }} />
          </label>
          <button onClick={resetScan} style={{ width: "100%", background: "none", border: "none", color: "#5a4535", fontSize: 13, cursor: "pointer", fontFamily: SANS, padding: 10 }}>Cancel</button>
        </>
      )}

      {scanStage === "analyzing" && (
        <div style={{ textAlign: "center", padding: 40 }}>
          {photoPreview && <img src={photoPreview} alt="scan" style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover", marginBottom: 20 }} />}
          <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 6 }}>Analyzing your cigars...</div>
          <div style={{ fontSize: 12, color: "#8a7055" }}>Ashed is reading the band(s)</div>
          <div style={{ width: "100%", height: 4, background: "#2a1a0e", borderRadius: 2, overflow: "hidden", marginTop: 20 }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 2, animation: "scan 1.5s ease-in-out infinite", width: "40%" }} />
          </div>
          <style>{`@keyframes scan { 0% { margin-left: -40% } 100% { margin-left: 100% } }`}</style>
        </div>
      )}

      {scanStage === "confirm" && scanResult && (
        <>
          <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 2, marginBottom: 12 }}>
            {scanResult.length === 1 ? "CONFIRM CIGAR" : `CONFIRM ${scanResult.length} CIGARS`}
          </div>
          {photoPreview && <img src={photoPreview} alt="scan" style={{ width: "100%", borderRadius: 10, maxHeight: 160, objectFit: "cover", marginBottom: 14 }} />}

          {/* Warning banner if any low confidence */}
          {scanResult.some(c => c.confidence === "low") && (
            <div style={{ background: "#a0522d22", border: "1px solid #a0522d55", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#e8a07a", lineHeight: 1.5 }}>
                ⚠️ {scanResult.filter(c => c.confidence === "low").length} cigar{scanResult.filter(c => c.confidence === "low").length > 1 ? "s" : ""} could not be identified confidently. Please review and correct the highlighted {scanResult.filter(c => c.confidence === "low").length > 1 ? "entries" : "entry"} before saving.
              </div>
            </div>
          )}
          {scanResult.map((cigar, i) => (
            <div key={i} style={{ background: "#2a1a0e", border: `1px solid ${cigar.confidence === "high" ? "#7a9a7a44" : cigar.confidence === "medium" ? "#c9a84c44" : "#a0522d88"}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>

              {/* Confidence indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: cigar.confidence === "high" ? "#7a9a7a" : cigar.confidence === "medium" ? "#c9a84c" : "#a0522d" }} />
                <span style={{ fontSize: 10, color: cigar.confidence === "high" ? "#7a9a7a" : cigar.confidence === "medium" ? "#c9a84c" : "#e8a07a", letterSpacing: 1 }}>
                  {cigar.confidence === "high" && "CONFIDENCE LEVEL: HIGH"}
                  {cigar.confidence === "medium" && "CONFIDENCE LEVEL: MEDIUM -- PLEASE VERIFY"}
                  {cigar.confidence === "low" && "CONFIDENCE LEVEL: LOW -- AI COULD NOT IDENTIFY. PLEASE CORRECT BELOW."}
                </span>
              </div>

              {/* Editable brand */}
              <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, marginBottom: 4 }}>BRAND</div>
              <input
                value={cigar.brand || ""}
                onChange={e => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, brand: e.target.value } : c))}
                style={{ width: "100%", background: "#1a0f08", border: "1px solid #4a3020", borderRadius: 8, padding: "8px 12px", color: "#e8d5b7", fontSize: 13, fontFamily: SANS, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              />

              {/* Editable line */}
              <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, marginBottom: 4 }}>LINE</div>
              <input
                value={cigar.line || ""}
                onChange={e => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, line: e.target.value } : c))}
                style={{ width: "100%", background: "#1a0f08", border: "1px solid #4a3020", borderRadius: 8, padding: "8px 12px", color: "#e8d5b7", fontSize: 13, fontFamily: SANS, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              />

              {/* Vitola dropdown */}
              <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, marginBottom: 4 }}>VITOLA</div>
              <select
                value={cigar.vitola === "Unknown" ? "" : (cigar.vitola || "")}
                onChange={e => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, vitola: e.target.value } : c))}
                style={{ width: "100%", background: "#1a0f08", border: "1px solid #4a3020", borderRadius: 8, padding: "8px 12px", color: cigar.vitola && cigar.vitola !== "Unknown" ? "#e8d5b7" : "#8a7055", fontSize: 13, fontFamily: SANS, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              >
                <option value="">Select vitola...</option>
                {(vitolaOptions[i] || []).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
                {/* If AI returned a vitola not in DB, include it as an option */}
                {cigar.vitola && cigar.vitola !== "Unknown" && !(vitolaOptions[i] || []).includes(cigar.vitola) && (
                  <option value={cigar.vitola}>{cigar.vitola} (AI suggestion)</option>
                )}
              </select>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {cigar.strength && <Badge label={cigar.strength} color={strengthColor(cigar.strength)} />}
                {cigar.origin && <Badge label={cigar.origin} color="#7a9a7a" />}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#8a7055" }}>Quantity:</span>
                <button onClick={() => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, qty: Math.max(1, c.qty - 1) } : c))}
                  style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #3a2510", background: "none", color: "#c9a84c", fontSize: 16, cursor: "pointer", fontFamily: SANS }}>-</button>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#c9a84c", minWidth: 24, textAlign: "center" }}>{cigar.qty}</span>
                <button onClick={() => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, qty: c.qty + 1 } : c))}
                  style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #3a2510", background: "none", color: "#c9a84c", fontSize: 16, cursor: "pointer", fontFamily: SANS }}>+</button>
              </div>
              <input
                placeholder="Notes (optional, e.g. aging until Christmas)"
                style={{ width: "100%", background: "#1a0f08", border: "1px solid #4a3020", borderRadius: 8, padding: "8px 12px", color: "#e8d5b7", fontSize: 13, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
                onChange={e => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, notes: e.target.value } : c))}
              />
            </div>
          ))}
          <button onClick={handleConfirmScan}
            style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 14, color: "#1a0f08", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 10 }}>
            Add {scanResult.length === 1 ? "to Humidor" : `${scanResult.length} Cigars to Humidor`}
          </button>
          <button onClick={resetScan}
            style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 10, padding: 12, color: "#8a7055", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
            Cancel
          </button>
        </>
      )}

      {scanStage === "error" && (
        <div style={{ textAlign: "center", padding: 20 }}>
          {photoPreview && <img src={photoPreview} alt="scan" style={{ width: "100%", borderRadius: 10, maxHeight: 160, objectFit: "cover", marginBottom: 16 }} />}
          <div style={{ fontSize: 28, marginBottom: 10 }}>🚫</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 6 }}>Could not identify</div>
          <div style={{ fontSize: 13, color: "#8a7055", marginBottom: 20, lineHeight: 1.6 }}>{scanError}</div>
          <button onClick={() => setScanStage("idle")}
            style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 14, color: "#1a0f08", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 10 }}>
            Try Again
          </button>
          <button onClick={resetScan}
            style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 10, padding: 12, color: "#8a7055", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  // MAIN HUMIDOR VIEW
  return (
    <div style={{ padding: 16, fontFamily: SANS, color: "#e8d5b7" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 2 }}>MY HUMIDOR</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onSearchToAdd && onSearchToAdd()}
            style={{ background: "none", border: "1px solid #c9a84c55", borderRadius: 20, padding: "6px 14px", color: "#c9a84c", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
            🔍 Search
          </button>
          <button onClick={() => isPremium ? setScanning(true) : onUpgrade && onUpgrade()}
            style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 20, padding: "6px 14px", color: "#1a0f08", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", gap: 4 }}>
            📷 Scan {!isPremium && <span style={{ fontSize: 9, background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "1px 5px" }}>PRO</span>}
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚬</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>Your humidor is empty</div>
          <div style={{ fontSize: 13, color: "#5a4535", lineHeight: 1.6 }}>Search for a cigar or scan a band to add it to your humidor.</div>
        </div>
      )}

      {items.map(item => {
        const brand = item.cigars?.brand || item.cigar_brand || "Unknown";
        const line = item.cigars?.line || item.cigar_name || "Unknown";
        const vitola = item.cigars?.vitola || item.cigar_vitola || null;
        const strength = item.cigars?.strength || null;
        const isEditingQty = editingQty === item.id;

        return (
          <div key={item.id} style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>{brand.toUpperCase()}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", margin: "2px 0 6px" }}>{line}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                    {vitola ? <Badge label={vitola} /> : (
                      <span style={{ fontSize: 10, color: "#a0522d", background: "#a0522d22", border: "1px solid #a0522d44", borderRadius: 8, padding: "1px 8px", cursor: "pointer" }}
                        onClick={() => editingVitola === item.id ? setEditingVitola(null) : handleStartEditVitola(item)}>
                        ⚠️ No vitola — tap to set
                      </span>
                    )}
                    {strength && <Badge label={strength} color={strengthColor(strength)} />}
                  </div>

                  {/* Vitola editor */}
                  {editingVitola === item.id && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <select
                        value={editVitolaValue}
                        onChange={e => setEditVitolaValue(e.target.value)}
                        style={{ flex: 1, background: "#1a0f08", border: "1px solid #c9a84c", borderRadius: 8, padding: "6px 10px", color: editVitolaValue ? "#e8d5b7" : "#8a7055", fontSize: 12, fontFamily: SANS, outline: "none" }}
                      >
                        <option value="">Select vitola...</option>
                        {editVitolaOptions.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <button onClick={() => handleSaveVitola(item)} disabled={!editVitolaValue}
                        style={{ background: editVitolaValue ? "linear-gradient(135deg, #c9a84c, #a07830)" : "#2a1a0e", border: "none", borderRadius: 8, padding: "6px 12px", color: editVitolaValue ? "#1a0f08" : "#5a4535", fontSize: 12, fontWeight: 700, cursor: editVitolaValue ? "pointer" : "default", fontFamily: SANS }}>
                        Save
                      </button>
                    </div>
                  )}
                  {item.notes && (
                    <div style={{ fontSize: 12, color: "#5a4535", fontStyle: "italic", marginBottom: 4 }}>{item.notes}</div>
                  )}
                  <div style={{ fontSize: 10, color: "#4a3020", marginTop: 4 }}>
                    Added {new Date(item.added_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>

                {/* Quantity */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginLeft: 12 }}>
                  <div style={{ fontSize: 10, color: "#8a7055" }}>QTY</div>
                  {isEditingQty ? (
                    <input
                      type="number"
                      min="1"
                      defaultValue={item.quantity}
                      autoFocus
                      onBlur={e => handleUpdateQty(item.id, parseInt(e.target.value) || 1)}
                      onKeyDown={e => e.key === "Enter" && handleUpdateQty(item.id, parseInt(e.target.value) || 1)}
                      style={{ width: 44, textAlign: "center", background: "#2a1a0e", border: "1px solid #c9a84c", borderRadius: 6, padding: "4px 0", color: "#c9a84c", fontSize: 16, fontWeight: 700, fontFamily: SANS, outline: "none" }}
                    />
                  ) : (
                    <div onClick={() => setEditingQty(item.id)}
                      style={{ fontSize: 22, fontWeight: 700, color: "#c9a84c", cursor: "pointer", minWidth: 30, textAlign: "center" }}>
                      {item.quantity}
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: "#4a3020" }}>tap to edit</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => handleSmokeOne(item)}
                  style={{ flex: 2, background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "8px 0", color: "#1a0f08", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                  🚬 Smoke One
                </button>
                <button onClick={() => handleRemoveOne(item)}
                  style={{ flex: 1, background: "none", border: "1px solid #3a2510", borderRadius: 8, padding: "8px 0", color: "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                  - Remove One
                </button>
                <button onClick={() => handleRemoveAll(item.id)}
                  style={{ flex: 1, background: "none", border: "1px solid #a0522d44", borderRadius: 8, padding: "8px 0", color: "#a0522d", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                  Remove All
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
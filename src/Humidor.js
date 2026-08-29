import { useState, useEffect, useRef } from "react";
import { SANS, color, type } from "./theme";
import { Icon, Pressable } from "./ui";
import { authedFetch } from "./apiClient";
import { supabase } from "./supabase";

const strengthColor = s => ({ "Mild": "#a8c5a0", "Mild-Medium": "#b8d4a0", "Medium": "#d4b483", "Medium-Full": "#c4894a", "Full": color.danger }[s] || "#888");

const Badge = ({ label, tint = color.gold }) => (
  <span style={{ background: tint + "22", color: tint, border: `1px solid ${tint}55`, borderRadius: 20, padding: "2px 10px", fontSize: type.xs, fontWeight: 600 }}>{label}</span>
);

export default function Humidor({ user, onSmokeOne, onSearchToAdd }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStage, setScanStage] = useState("idle");
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [editingQty, setEditingQty] = useState(null);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [addSearchResults, setAddSearchResults] = useState([]);
  const [addSearching, setAddSearching] = useState(false);
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(null);
  const [filterStrength, setFilterStrength] = useState([]);
  const [vitolaPickerItem, setVitolaPickerItem] = useState(null);
  const [vitolaPickerOptions, setVitolaPickerOptions] = useState([]);
  const [vitolaPickerLoading, setVitolaPickerLoading] = useState(false);
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
    fetchHumidor();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const response = await authedFetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 2048,
          feature: "band_scanner",
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
              { type: "text", text: `You are a cigar expert. Analyze this image. It may contain one cigar band or multiple cigar bands.

If it contains ONE cigar, return a single JSON object:
{"type":"single","brand":"Brand","line":"Line","vitola":"Vitola or Unknown","strength": "Mild|Mild-Medium|Medium|Medium-Full|Full","origin":"Country","wrapper":"Wrapper type","confidence":"high|medium|low","confidence_reason":"Brief reason"}

If it contains MULTIPLE cigars or bands, return a JSON array — one entry per cigar you can see:
[{"brand":"Brand","line":"Line","vitola":"Vitola or Unknown","strength": "Mild|Mild-Medium|Medium|Medium-Full|Full","origin":"Country","wrapper":"Wrapper type","confidence":"high|medium|low","confidence_reason":"Brief reason"},...]

If you cannot identify anything, return:
{"type":"none","reason":"Why"}

IMPORTANT RULES:
- Only return "high" confidence if you can clearly read the brand and line name on the band.
- Return "medium" if you can read the brand but are inferring the line.
- Return "low" if the band is blurry, angled, partially obscured, or you are guessing.
- It is better to return "low" and let the user search manually than to return a wrong cigar.
- For multi-cigar photos, each cigar gets its own confidence rating independently.

Return ONLY raw JSON, no markdown, no explanation.` }
            ]
          }]
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setScanError(data.error || "You've reached the scan limit for this hour. Please try again later.");
        setScanStage("error");
        return;
      }

      const raw = data.content?.[0]?.text || "{}";
      const match = raw.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      const result = match ? JSON.parse(match[0]) : {};

      if (result.type === "none") {
        setScanError(result.reason || "Could not identify any cigars in this photo.");
        setScanStage("error");
        return;
      }

      const cigars = Array.isArray(result) ? result : result.type === "single" ? [result] : [result];

      if (cigars.length === 0 || cigars.every(c => !c.brand)) {
        setScanError("Could not identify any cigars in this photo.");
        setScanStage("error");
        return;
      }

      setScanResult(cigars.map(c => ({ ...c, qty: 1, notes: "" })));
      setScanStage("confirm");

    } catch (err) {
      console.error("Humidor scan error:", err);
      setScanError("Something went wrong analyzing the photo. Please try again.");
      setScanStage("error");
    }
  };

  const handleConfirmScan = async () => {
    for (const cigar of scanResult) {
      const { data: match } = await supabase
        .from("cigars")
        .select("id")
        .eq("brand", cigar.brand)
        .eq("line", cigar.line)
        .maybeSingle();

      let cigarId = match?.id || null;
      if (!cigarId) {
        const { data: inserted } = await supabase.from("cigars").insert({
          brand: cigar.brand,
          line: cigar.line,
          vitola: cigar.vitola !== "Unknown" ? cigar.vitola : null,
          strength: cigar.strength || null,
          origin: cigar.origin || null,
          wrapper: cigar.wrapper || null,
          ai_generated: true,
          verified: false,
          total_checkins: 0,
        }).select().single();
        cigarId = inserted?.id || null;
      }

      const { data: existingHumidor } = await supabase
        .from("humidor")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("cigar_brand", cigar.brand)
        .eq("cigar_name", cigar.line)
        .maybeSingle();

      if (existingHumidor) {
        await supabase.from("humidor").update({ quantity: existingHumidor.quantity + (cigar.qty || 1) }).eq("id", existingHumidor.id);
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
    const cigar = item.cigars || { id: item.cigar_id, brand: item.cigar_brand, line: item.cigar_name, vitola: item.cigar_vitola };
    onSmokeOne(cigar, item.id);
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
    setConfirmRemoveAll(null);
    fetchHumidor();
  };

  const handleUpdateQty = async (id, qty) => {
    if (qty < 1) return;
    await supabase.from("humidor").update({ quantity: qty }).eq("id", id);
    setEditingQty(null);
    fetchHumidor();
  };

  const openVitolaPicker = async (item) => {
    setVitolaPickerItem(item);
    setVitolaPickerLoading(true);
    const brand = item.cigars?.brand || item.cigar_brand;
    const line = item.cigars?.line || item.cigar_name;
    const { data } = await supabase
      .from("cigars")
      .select("id, vitola, strength")
      .eq("brand", brand)
      .eq("line", line)
      .not("vitola", "is", null)
      .order("vitola");
    setVitolaPickerOptions(data || []);
    setVitolaPickerLoading(false);
  };

  const handleUpdateVitola = async (item, vitola, strength, cigarId) => {
    const trimmed = vitola.trim();
    // Update the humidor row to point to the correct cigar_id and vitola
    await supabase.from("humidor").update({
      cigar_vitola: trimmed || null,
      cigar_id: cigarId || item.cigar_id || null,
    }).eq("id", item.id);
    setVitolaPickerItem(null);
    fetchHumidor();
  };

  const handleAddSearch = async (q) => {
    setAddSearchQuery(q);
    if (q.length < 2) { setAddSearchResults([]); return; }
    setAddSearching(true);
    const { data } = await supabase.from("cigars").select("id, brand, line, vitola, strength").or(`line.ilike.%${q}%,brand.ilike.%${q}%`).limit(10);
    setAddSearchResults(data || []);
    setAddSearching(false);
  };

  const handleAddFromSearch = async (cigar) => {
    const { data: existing } = await supabase.from("humidor").select("id, quantity").eq("user_id", user.id).eq("cigar_brand", cigar.brand).eq("cigar_name", cigar.line).maybeSingle();
    if (existing) {
      await supabase.from("humidor").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    } else {
      await supabase.from("humidor").insert({ user_id: user.id, cigar_id: cigar.id, cigar_brand: cigar.brand, cigar_name: cigar.line, cigar_vitola: cigar.vitola || null, quantity: 1 });
    }
    setShowAddOptions(false);
    setAddSearchQuery("");
    setAddSearchResults([]);
    fetchHumidor();
  };

  const resetScan = () => {
    setScanStage("idle");
    setScanResult(null);
    setScanError("");
    setPhotoPreview(null);
    setScanning(false);
  };

  if (loading) return <div style={{ fontFamily: SANS, color: color.muted, textAlign: "center", padding: 40 }}>Loading...</div>;

  // SCAN FLOW
  if (scanning) return (
    <div style={{ fontFamily: SANS, color: color.text, padding: 20 }}>

      {scanStage === "idle" && (
        <>
          <div style={{ fontSize: 13, color: color.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>ADD TO HUMIDOR</div>
          <div style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 12, padding: 20, textAlign: "center", marginBottom: 16 }}>
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}><Icon.Camera size={32} color={color.borderStrong} /></div>
            <div style={{ fontSize: 15, fontWeight: 700, color: color.text, marginBottom: 6 }}>Scan cigar band(s)</div>
            <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.6 }}>Take one photo of a single band or multiple bands at once.</div>
          </div>
          <div style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: type.xs, color: color.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>TIPS FOR BEST RESULTS</div>
            {["Photograph up to 3 cigars at a time", "Bands should face the camera directly", "Good lighting makes a big difference", "You can edit brand and line on the confirm screen"].map((tip, i) => (
              <div key={i} style={{ fontSize: type.xs, color: color.muted, marginBottom: 4, display: "flex", gap: 6 }}>
                <span style={{ color: color.gold }}>→</span>{tip}
              </div>
            ))}
          </div>
          <label style={{ display: "block", cursor: "pointer", marginBottom: 10 }}>
            <div style={{ width: "100%", background: color.positive, border: "none", borderRadius: 10, padding: 14, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: SANS, textAlign: "center", boxSizing: "border-box" }}>
              Open camera
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleScanPhoto} style={{ fontSize: type.md, display: "none" }} />
          </label>
          <label style={{ display: "block", cursor: "pointer", marginBottom: 10 }}>
            <div style={{ width: "100%", background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, color: color.cream, fontSize: 14, fontFamily: SANS, textAlign: "center", boxSizing: "border-box" }}>
              Choose from Library
            </div>
            <input type="file" accept="image/*" onChange={handleScanPhoto} style={{ fontSize: type.md, display: "none" }} />
          </label>
          <button onClick={resetScan} style={{ width: "100%", background: "none", border: "none", color: color.faint, fontSize: 13, cursor: "pointer", fontFamily: SANS, padding: 10 }}>Cancel</button>
        </>
      )}

      {scanStage === "analyzing" && (
        <div style={{ textAlign: "center", padding: 40 }}>
          {photoPreview && <img src={photoPreview} alt="scan" style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover", marginBottom: 20 }} />}
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><Icon.Search size={28} color={color.borderStrong} /></div>
          <div style={{ fontSize: 15, fontWeight: 700, color: color.text, marginBottom: 6 }}>Analyzing your cigars...</div>
          <div style={{ fontSize: type.xs, color: color.muted }}>Ashed is reading the band(s)</div>
          <div style={{ width: "100%", height: 4, background: color.surfaceRaised, borderRadius: 2, overflow: "hidden", marginTop: 20 }}>
            <div style={{ height: "100%", background: color.gold, borderRadius: 2, animation: "scan 1.5s ease-in-out infinite", width: "40%" }} />
          </div>
          <style>{`@keyframes scan { 0% { margin-left: -40% } 100% { margin-left: 100% } }`}</style>
        </div>
      )}

      {scanStage === "confirm" && scanResult && (
        <>
          <div style={{ fontSize: 13, color: color.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
            {scanResult.length === 1 ? "CONFIRM CIGAR" : `CONFIRM ${scanResult.length} CIGARS`}
          </div>
          {photoPreview && <img src={photoPreview} alt="scan" style={{ width: "100%", borderRadius: 10, maxHeight: 160, objectFit: "cover", marginBottom: 14 }} />}
          {scanResult.some(c => c.confidence === "low") && (
            <div style={{ background: `${color.danger}22`, border: `1px solid ${color.danger}55`, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
              <div style={{ fontSize: type.xs, color: color.dangerText, lineHeight: 1.5 }}>
                {scanResult.filter(c => c.confidence === "low").length} cigar{scanResult.filter(c => c.confidence === "low").length > 1 ? "s" : ""} could not be identified confidently. Please review before saving.
              </div>
            </div>
          )}
          {scanResult.map((cigar, i) => (
            <div key={i} style={{ background: color.surface, border: `1px solid ${cigar.confidence === "high" ? `${color.green}44` : cigar.confidence === "medium" ? `${color.gold}44` : `${color.danger}88`}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: cigar.confidence === "high" ? color.greenBright : cigar.confidence === "medium" ? color.gold : color.danger }} />
                <span style={{ fontSize: type.xs, color: cigar.confidence === "high" ? color.greenBright : cigar.confidence === "medium" ? color.gold : color.dangerText, letterSpacing: 1 }}>
                  {cigar.confidence === "high" && "HIGH CONFIDENCE"}
                  {cigar.confidence === "medium" && "MEDIUM — PLEASE VERIFY"}
                  {cigar.confidence === "low" && "LOW — PLEASE CORRECT BELOW"}
                </span>
              </div>
              <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 4 }}>BRAND</div>
              <input value={cigar.brand || ""} onChange={e => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, brand: e.target.value } : c))}
                style={{ width: "100%", background: color.bg, border: `1px solid ${color.lineInput}`, borderRadius: 8, padding: "8px 12px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
              <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 4 }}>LINE</div>
              <input value={cigar.line || ""} onChange={e => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, line: e.target.value } : c))}
                style={{ width: "100%", background: color.bg, border: `1px solid ${color.lineInput}`, borderRadius: 8, padding: "8px 12px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {cigar.vitola && cigar.vitola !== "Unknown" && <Badge label={cigar.vitola} />}
                {cigar.strength && <Badge label={cigar.strength} color={strengthColor(cigar.strength)} />}
                {cigar.origin && <Badge label={cigar.origin} color={color.greenBright} />}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: type.xs, color: color.muted }}>Quantity:</span>
                <button onClick={() => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, qty: Math.max(1, c.qty - 1) } : c))}
                  style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${color.lineStrong}`, background: "none", color: color.gold, fontSize: 16, cursor: "pointer", fontFamily: SANS }}>-</button>
                <span style={{ fontSize: 15, fontWeight: 700, color: color.gold, minWidth: 24, textAlign: "center" }}>{cigar.qty}</span>
                <button onClick={() => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, qty: c.qty + 1 } : c))}
                  style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${color.lineStrong}`, background: "none", color: color.gold, fontSize: 16, cursor: "pointer", fontFamily: SANS }}>+</button>
              </div>
              {cigar.vitola === "Unknown" && (
                <input placeholder="Size/vitola (optional)" onChange={e => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, vitola: e.target.value } : c))}
                  style={{ width: "100%", background: color.bg, border: `1px solid ${color.lineInput}`, borderRadius: 8, padding: "8px 12px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box", marginBottom: 6 }} />
              )}
              <input placeholder="Notes (optional)" onChange={e => setScanResult(prev => prev.map((c, j) => j === i ? { ...c, notes: e.target.value } : c))}
                style={{ width: "100%", background: color.bg, border: `1px solid ${color.lineInput}`, borderRadius: 8, padding: "8px 12px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <button onClick={handleConfirmScan}
            style={{ width: "100%", background: color.gold, border: "none", borderRadius: 10, padding: 14, color: color.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 10 }}>
            Add {scanResult.length === 1 ? "to Humidor" : `${scanResult.length} Cigars to Humidor`}
          </button>
          <button onClick={resetScan}
            style={{ width: "100%", background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 12, color: color.muted, fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
            Cancel
          </button>
        </>
      )}

      {scanStage === "error" && (
        <div style={{ textAlign: "center", padding: 20 }}>
          {photoPreview && <img src={photoPreview} alt="scan" style={{ width: "100%", borderRadius: 10, maxHeight: 160, objectFit: "cover", marginBottom: 16 }} />}
          <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}><Icon.Close size={28} color={color.borderStrong} /></div>
          <div style={{ fontSize: 15, fontWeight: 700, color: color.text, marginBottom: 6 }}>Could not identify</div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 20, lineHeight: 1.6 }}>{scanError}</div>
          <button onClick={() => setScanStage("idle")}
            style={{ width: "100%", background: color.gold, border: "none", borderRadius: 10, padding: 14, color: color.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 10 }}>
            Try Again
          </button>
          <button onClick={resetScan}
            style={{ width: "100%", background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 12, color: color.muted, fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  // MAIN HUMIDOR VIEW
  return (
    <div style={{ padding: 16, fontFamily: SANS, color: color.text }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: color.gold, fontWeight: 700, letterSpacing: 1 }}>WHAT'S IN MY HUMIDOR?</div>
          {items.length > 0 && <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>{items.reduce((a, i) => a + i.quantity, 0)} cigars · {items.length} {items.length === 1 ? "line" : "lines"}</div>}
        </div>
        <button onClick={() => setShowAddOptions(true)}
          style={{ background: color.gold, border: "none", borderRadius: 10, padding: "8px 16px", color: color.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
          + Add a Cigar
        </button>
      </div>

      {/* Add options sheet */}
      {showAddOptions && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => { setShowAddOptions(false); setAddSearchQuery(""); setAddSearchResults([]); }}>
          <div style={{ background: color.bg, border: `1px solid ${color.lineStrong}`, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 420, padding: "20px 20px 36px", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: color.lineStrong, borderRadius: 2, margin: "0 auto 16px", flexShrink: 0 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: color.heading, marginBottom: 12, textAlign: "center", flexShrink: 0 }}>Add a Cigar to Your Humidor</div>
            <input
              value={addSearchQuery}
              onChange={e => handleAddSearch(e.target.value)}
              placeholder="Search by cigar name or brand..."
              style={{ width: "100%", background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: "11px 14px", color: color.heading, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box", marginBottom: 10, flexShrink: 0 }}
            />
            <div style={{ overflowY: "auto", maxHeight: "30vh", flexShrink: 1 }}>
              {addSearching && <div style={{ fontSize: type.xs, color: color.faint, textAlign: "center", padding: 8 }}>Searching...</div>}
              {addSearchResults.map(c => (
                <Pressable key={c.id} onClick={() => handleAddFromSearch(c)}
                  style={{ width: "100%", background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                  <div style={{ fontSize: type.xs, color: color.tan }}>{c.brand}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: color.heading }}>{c.line}</div>
                  {c.vitola && <div style={{ fontSize: type.xs, color: color.dim, marginTop: 2 }}>{c.vitola}</div>}
                </Pressable>
              ))}
            </div>
            {addSearchQuery.length < 2 && (
              <button onClick={() => { setShowAddOptions(false); setAddSearchQuery(""); setScanning(true); }}
                style={{ width: "100%", background: color.surfaceRaised, border: `1px solid ${color.greenBright}55`, borderRadius: 12, padding: 14, color: color.greenBright, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
                Scan a band instead
              </button>
            )}
          </div>
        </div>
      )}

      {/* Strength filter */}
      {items.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"].map(s => {
            const active = filterStrength.includes(s);
            const swatch = { "Mild": "#a8c5a0", "Mild-Medium": "#b8d4a0", "Medium": "#d4b483", "Medium-Full": "#c4894a", "Full": color.danger }[s];
            return (
              <button key={s} onClick={() => setFilterStrength(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${active ? swatch : color.lineStrong}`, background: active ? swatch + "22" : "transparent", color: active ? swatch : color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, fontWeight: active ? 700 : 400 }}>
                {s}
              </button>
            );
          })}
          {filterStrength.length > 0 && (
            <button onClick={() => setFilterStrength([])}
              style={{ padding: "5px 10px", borderRadius: 20, border: `1px solid ${color.lineStrong}`, background: "transparent", color: color.faint, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
              Clear ×
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><Icon.Humidor size={36} color={color.borderStrong} /></div>
          <div style={{ fontSize: 15, fontWeight: 700, color: color.text, marginBottom: 8 }}>Your humidor is empty</div>
          <div style={{ fontSize: 13, color: color.faint, lineHeight: 1.6 }}>Search for a cigar or scan a band to add it.</div>
        </div>
      )}

      {/* Humidor items — grouped by brand, then line, then vitola */}
      {(() => {
        // Apply strength filter
        const filtered = filterStrength.length === 0 ? items : items.filter(item => {
          const s = item.cigars?.strength || null;
          return filterStrength.includes(s);
        });

        if (filtered.length === 0 && items.length > 0) return (
          <div style={{ textAlign: "center", padding: 30, fontSize: 13, color: color.dim }}>No cigars match your filter.</div>
        );

        // Group by brand
        const brands = {};
        for (const item of filtered) {
          const brand = item.cigars?.brand || item.cigar_brand || "Unknown";
          const line = item.cigars?.line || item.cigar_name || "Unknown";
          if (!brands[brand]) brands[brand] = {};
          if (!brands[brand][line]) brands[brand][line] = [];
          brands[brand][line].push(item);
        }

        return Object.entries(brands).sort(([a], [b]) => a.localeCompare(b)).map(([brand, lines]) => {
          const brandTotal = Object.values(lines).flat().reduce((a, i) => a + i.quantity, 0);

          return (
            <div key={brand} style={{ marginBottom: 16 }}>
              {/* Brand header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingLeft: 2 }}>
                <div style={{ fontSize: type.xs, color: color.gold, fontWeight: 700, letterSpacing: 2 }}>{brand.toUpperCase()}</div>
                <div style={{ fontSize: type.xs, color: color.muted }}>{brandTotal} cigars</div>
              </div>

              {/* Lines under this brand */}
              {Object.entries(lines).sort(([a], [b]) => a.localeCompare(b)).map(([line, lineItems]) => {
                const lineTotal = lineItems.reduce((a, i) => a + i.quantity, 0);

                return (
                  <div key={line} style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
                    <div style={{ padding: "12px 14px 12px" }}>

                      {/* Line name + total */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: color.text }}>{line}</div>
                        {lineItems.length > 1 && <div style={{ fontSize: type.xs, color: color.muted }}>{lineTotal} total</div>}
                      </div>

                      {/* Vitola rows */}
                      {lineItems.map((item, idx) => {
                        const vitola = item.cigars?.vitola || item.cigar_vitola || null;
                        const strength = item.cigars?.strength || null;
                        const swatch = { "Mild": "#a8c5a0", "Mild-Medium": "#b8d4a0", "Medium": "#d4b483", "Medium-Full": "#c4894a", "Full": color.danger }[strength] || "#888";
                        const isEditingQty = editingQty === item.id;
                        const isConfirmingRemove = confirmRemoveAll === item.id;

                        return (
                          <div key={item.id} style={{ borderTop: idx === 0 ? "none" : `1px solid ${color.lineStrong}44`, paddingTop: idx === 0 ? 0 : 10, marginTop: idx === 0 ? 0 : 10 }}>
                            {/* Badges + stepper */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                {vitola
                                  ? <span style={{ background: `${color.gold}22`, color: color.gold, border: `1px solid ${color.gold}55`, borderRadius: 20, padding: "2px 10px", fontSize: type.xs, fontWeight: 600 }}>{vitola}</span>
                                  : <span style={{ color: color.faint, fontSize: type.xs, fontStyle: "italic" }}>No vitola</span>
                                }
                                {strength && <span style={{ background: swatch + "22", color: swatch, border: `1px solid ${swatch}55`, borderRadius: 20, padding: "2px 10px", fontSize: type.xs, fontWeight: 600 }}>{strength}</span>}
                              </div>
                              {/* Qty stepper */}
                              {isEditingQty ? (
                                <input type="number" min="1" defaultValue={item.quantity} autoFocus
                                  onBlur={e => handleUpdateQty(item.id, parseInt(e.target.value) || 1)}
                                  onKeyDown={e => e.key === "Enter" && handleUpdateQty(item.id, parseInt(e.target.value) || 1)}
                                  style={{ width: 48, textAlign: "center", background: color.surfaceRaised, border: `1px solid ${color.gold}`, borderRadius: 6, padding: "4px 0", color: color.gold, fontSize: type.md, fontWeight: 700, fontFamily: SANS, outline: "none" }}
                                />
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <button onClick={() => handleRemoveOne(item)}
                                    style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${color.lineStrong}`, background: "none", color: color.muted, fontSize: 15, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                                  <div onClick={() => setEditingQty(item.id)}
                                    style={{ fontSize: 20, fontWeight: 700, color: color.gold, cursor: "pointer", minWidth: 28, textAlign: "center" }}>
                                    {item.quantity}
                                  </div>
                                  <button onClick={async () => { await supabase.from("humidor").update({ quantity: item.quantity + 1 }).eq("id", item.id); fetchHumidor(); }}
                                    style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${color.lineStrong}`, background: "none", color: color.muted, fontSize: 15, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => handleSmokeOne(item)}
                                style={{ flex: 2, background: color.gold, border: "none", borderRadius: 8, padding: "9px 0", color: color.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                                Smoke one
                              </button>
                              <button onClick={() => openVitolaPicker(item)}
                                style={{ flex: 1, background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "9px 0", color: color.muted, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                                Vitola
                              </button>
                              {isConfirmingRemove ? (
                                <>
                                  <button onClick={() => handleRemoveAll(item.id)}
                                    style={{ flex: 1, background: color.danger, border: "none", borderRadius: 8, padding: "9px 0", color: "#fff", fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                                    Confirm
                                  </button>
                                  <button onClick={() => setConfirmRemoveAll(null)}
                                    style={{ flex: 1, background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "9px 0", color: color.muted, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => setConfirmRemoveAll(item.id)}
                                  style={{ flex: 1, background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "9px 0", color: color.muted, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                                  Remove All
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        });
      })()}
      {/* Vitola picker bottom sheet */}
      {vitolaPickerItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setVitolaPickerItem(null)}>
          <div style={{ background: color.bg, border: `1px solid ${color.lineStrong}`, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 420, maxHeight: "70vh", display: "flex", flexDirection: "column", fontFamily: SANS }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 0 0", display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, background: color.lineStrong, borderRadius: 2 }} />
            </div>
            <div style={{ padding: "12px 18px 14px", borderBottom: `1px solid ${color.lineStrong}`, flexShrink: 0 }}>
              <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 2 }}>{(vitolaPickerItem.cigars?.brand || vitolaPickerItem.cigar_brand || "").toUpperCase()}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: color.text, margin: "3px 0 2px" }}>{vitolaPickerItem.cigars?.line || vitolaPickerItem.cigar_name}</div>
              <div style={{ fontSize: type.xs, color: color.muted }}>Select a vitola</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 18px 32px" }}>
              {vitolaPickerLoading && <div style={{ textAlign: "center", padding: 24, fontSize: 13, color: color.muted }}>Loading sizes...</div>}
              {!vitolaPickerLoading && vitolaPickerOptions.length === 0 && (
                <div style={{ textAlign: "center", padding: 24, fontSize: 13, color: color.muted }}>No vitolas found for this cigar.</div>
              )}
              {vitolaPickerOptions.map((v, i) => (
                <Pressable key={i} onClick={async () => {
                  await handleUpdateVitola(vitolaPickerItem, v.vitola, v.strength, v.id);
                  setVitolaPickerItem(null);
                }}
                  style={{ width: "100%", background: (vitolaPickerItem.cigars?.vitola || vitolaPickerItem.cigar_vitola) === v.vitola ? `${color.gold}22` : color.surface, border: `1px solid ${(vitolaPickerItem.cigars?.vitola || vitolaPickerItem.cigar_vitola) === v.vitola ? `${color.gold}55` : color.lineStrong}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: color.text }}>{v.vitola}</div>
                    {v.strength && <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>{v.strength}</div>}
                  </div>
                  {(vitolaPickerItem.cigars?.vitola || vitolaPickerItem.cigar_vitola) === v.vitola && (
                    <Icon.Check size={16} color={color.gold} />
                  )}
                </Pressable>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

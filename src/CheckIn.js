import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const FLAVOR_TAGS = [
  "Cedar", "Leather", "Earth", "Coffee", "Chocolate", "Pepper",
  "Cream", "Nuts", "Caramel", "Citrus", "Floral", "Spice",
  "Wood", "Hay", "Sweetness", "Tobacco", "Grass", "Mineral"
];

const VALUE_OPTIONS = ["Good value", "OK value", "Poor value"];

const SUB_SCORES = [
  { key: "aroma", label: "Aroma", tip: "How the cigar smells before and during smoking" },
  { key: "draw", label: "Draw", tip: "How easily smoke pulls through the cigar" },
  { key: "burn", label: "Burn", tip: "How evenly the cigar burns as you smoke it" },
  { key: "construction", label: "Construction", tip: "Firmness, consistency, and quality of the roll" },
  { key: "flavor", label: "Flavor", tip: "Overall taste and complexity" },
  { key: "finish", label: "Finish", tip: "The lingering taste after each puff" },
];

function RatingSlider({ value, onChange, min = 0, max = 10, step = 0.5 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: "#c9a84c" }}
      />
      <span style={{ color: "#c9a84c", fontWeight: 700, fontSize: 16, minWidth: 32, textAlign: "right" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default function CheckIn({ cigar, user, onClose, onSaved }) {
  const [score, setScore] = useState(7.5);
  const [overrideScore, setOverrideScore] = useState(false);
  const [subScores, setSubScores] = useState({ aroma: 7.5, draw: 7.5, burn: 7.5, construction: 7.5, flavor: 7.5, finish: 7.5 });

  const avgScore = parseFloat((Object.values(subScores).reduce((a, b) => a + b, 0) / 6).toFixed(1));
  const displayScore = overrideScore ? score : avgScore;
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [valueForPrice, setValueForPrice] = useState(null);
  const [smokeDate, setSmokeDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [showNewPlace, setShowNewPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [wouldSmokeAgain, setWouldSmokeAgain] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [listening, setListening] = useState(false);
  const [activeTip, setActiveTip] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      const { data } = await supabase
        .from("places")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
      setSavedPlaces(data || []);
    };
    fetchPlaces();
  }, [user.id]);

  const handleAddPlace = async () => {
    if (!newPlaceName.trim()) return;
    const { data } = await supabase
      .from("places")
      .insert({ user_id: user.id, name: newPlaceName.trim() })
      .select()
      .single();
    if (data) {
      setSavedPlaces(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setLocation(data.name);
      setNewPlaceName("");
      setShowNewPlace(false);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input is not supported in this browser. Try Chrome on Android or Safari on iPhone.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setNotes(prev => prev ? prev + " " + transcript : transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.start();
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const isRealCigar = cigar.id && !([1,2,3,4,5,6,7,8].includes(cigar.id));
    const checkinData = {
      user_id: user.id,
      cigar_id: isRealCigar ? cigar.id : null,
      cigar_name: cigar.line || null,
      cigar_brand: cigar.brand || null,
      cigar_vitola: cigar.vitola || null,
      rating: displayScore,
      tasting_notes: notes || null,
      smoke_date: smokeDate,
      smoke_location: location || null,
      is_private: isPrivate,
      ai_band_identified: false,
      voice_entry: false,
    };

    const { data: savedCheckin, error: checkinError } = await supabase
      .from("checkins")
      .insert(checkinData)
      .select()
      .single();

    if (checkinError) {
      console.error("Checkin error:", JSON.stringify(checkinError, null, 2));
      setError("Failed to save check-in. Please try again.");
      setSaving(false);
      return;
    }

    const ratingData = {
      checkin_id: savedCheckin.id,
      user_id: user.id,
      cigar_id: isRealCigar ? cigar.id : null,
      score: displayScore,
      aroma: subScores.aroma,
      draw: subScores.draw,
      burn: subScores.burn,
      construction: subScores.construction,
      flavor: subScores.flavor,
      finish: subScores.finish,
      overall_notes: notes || null,
      flavor_tags: selectedTags.length > 0 ? selectedTags.join(", ") : null,
      would_smoke_again: wouldSmokeAgain === "Yes" ? true : wouldSmokeAgain === "No" ? false : null,
      value_for_price: valueForPrice || null,
    };

    const { data: savedRating, error: ratingError } = await supabase
      .from("ratings")
      .insert(ratingData)
      .select()
      .single();

    if (ratingError) {
      setError("Check-in saved but rating failed. Please try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(true);

    // Recalculate avg_rating for this cigar
    if (isRealCigar && cigar.id) {
      const { data: allRatings } = await supabase
        .from("ratings")
        .select("score")
        .eq("cigar_id", cigar.id);
      if (allRatings && allRatings.length > 0) {
        const avg = allRatings.reduce((a, r) => a + r.score, 0) / allRatings.length;
        await supabase.from("cigars").update({ avg_rating: parseFloat(avg.toFixed(1)) }).eq("id", cigar.id);
      }
    }

    setTimeout(() => {
      if (onSaved) onSaved(savedRating);
      onClose();
    }, 1500);
  };

  const s = {
    overlay: { position: "fixed", inset: 0, background: "#1a0f08", zIndex: 300, overflowY: "auto", fontFamily: SANS, color: "#e8d5b7", maxWidth: 420, margin: "0 auto" },
    header: { background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "16px 20px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center" },
    section: { padding: "16px 20px", borderBottom: "1px solid #3a251033" },
    label: { fontSize: 11, color: "#8a7055", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 },
    tip: { width: 16, height: 16, borderRadius: "50%", background: "#3a2510", color: "#8a7055", fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
    tipBox: { background: "#2a1a0e", border: "1px solid #c9a84c44", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#c8b89a", marginTop: 6, marginBottom: 6 },
    input: { width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "10px 14px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box" },
    textarea: { width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "10px 14px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box", minHeight: 80, resize: "vertical" },
    tag: active => ({ padding: "5px 12px", borderRadius: 20, border: `1px solid ${active ? "#c9a84c" : "#3a2510"}`, background: active ? "#c9a84c22" : "transparent", color: active ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }),
    optBtn: active => ({ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${active ? "#c9a84c" : "#3a2510"}`, background: active ? "#c9a84c22" : "transparent", color: active ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }),
    saveBtn: { width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 16, color: "#1a0f08", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: SANS },
    micBtn: { background: listening ? "#c9a84c22" : "none", border: `1px solid ${listening ? "#c9a84c" : "#3a2510"}`, borderRadius: 8, padding: "8px 14px", color: listening ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" },
  };

  return (
    <div style={s.overlay}>
      {success && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "#7a9a7a", color: "#fff", padding: "12px 24px", borderRadius: 30, fontSize: 14, fontWeight: 600, zIndex: 999, fontFamily: SANS, whiteSpace: "nowrap" }}>
          ✓ Smoke logged successfully!
        </div>
      )}
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2 }}>{cigar.brand?.toUpperCase()}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e8d5b7" }}>{cigar.line} — {cigar.vitola}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 24, cursor: "pointer" }}>×</button>
      </div>

      <div style={s.section}>
        <div style={s.label}>Overall Score</div>
        <div style={{ fontSize: 48, fontWeight: 700, color: "#c9a84c", textAlign: "center", marginBottom: 8 }}>{displayScore.toFixed(1)}</div>
        {!overrideScore && <div style={{ fontSize: 11, color: "#5a4535", textAlign: "center", marginBottom: 10 }}>Average of detailed ratings</div>}
        {overrideScore && <RatingSlider value={score} onChange={setScore} />}
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button
            onClick={() => setOverrideScore(!overrideScore)}
            style={{ background: "none", border: "1px solid #3a2510", borderRadius: 20, padding: "4px 14px", color: overrideScore ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }}
          >
            {overrideScore ? "Use average instead" : "Override with custom score"}
          </button>
        </div>
      </div>

      {/* Sub Scores */}
      <div style={s.section}>
        <div style={s.label}>Detailed Ratings</div>
        {SUB_SCORES.map(({ key, label, tip }) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#c8b89a" }}>{label}</span>
                <span style={s.tip} onClick={() => setActiveTip(activeTip === key ? null : key)}>?</span>
              </div>
              <span style={{ fontSize: 13, color: "#c9a84c", fontWeight: 600 }}>{subScores[key].toFixed(1)}</span>
            </div>
            {activeTip === key && <div style={s.tipBox}>{tip}</div>}
            <RatingSlider value={subScores[key]} onChange={v => setSubScores(p => ({ ...p, [key]: v }))} />
          </div>
        ))}
      </div>

      {/* Tasting Notes */}
      <div style={s.section}>
        <div style={s.label}>Tasting Notes</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <textarea
            style={{ ...s.textarea, flex: 1 }}
            placeholder="Describe what you're tasting..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <button style={s.micBtn} onClick={handleVoice}>
          {listening ? "🎙️ Listening..." : "🎙️ Voice input"}
        </button>
      </div>

      {/* Flavor Tags */}
      <div style={s.section}>
        <div style={s.label}>Flavor Tags</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {FLAVOR_TAGS.map(tag => (
            <button key={tag} style={s.tag(selectedTags.includes(tag))} onClick={() => toggleTag(tag)}>{tag}</button>
          ))}
        </div>
      </div>

      {/* Would Smoke Again */}
      <div style={s.section}>
        <div style={s.label}>Would you smoke this again?</div>
        <div style={{ display: "flex", gap: 10 }}>
          {["Yes", "Maybe", "No"].map(opt => (
            <button key={opt} style={s.optBtn(wouldSmokeAgain === opt)} onClick={() => setWouldSmokeAgain(opt)}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Value for Price */}
      <div style={s.section}>
        <div style={s.label}>Value for Price</div>
        <div style={{ display: "flex", gap: 10 }}>
          {VALUE_OPTIONS.map(opt => (
            <button key={opt} style={s.optBtn(valueForPrice === opt)} onClick={() => setValueForPrice(opt)}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Date & Location */}
      <div style={s.section}>
        <div style={s.label}>Date</div>
        <input type="date" style={s.input} value={smokeDate} onChange={e => setSmokeDate(e.target.value)} />
        <div style={{ ...s.label, marginTop: 14 }}>Location <span style={{ color: "#5a4535", fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: 11 }}>(optional)</span></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {savedPlaces.map(p => (
            <button key={p.id} style={s.tag(location === p.name)} onClick={() => setLocation(location === p.name ? "" : p.name)}>{p.name}</button>
          ))}
          <button style={s.tag(false)} onClick={() => setShowNewPlace(!showNewPlace)}>+ Add place</button>
        </div>
        {showNewPlace && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...s.input, flex: 1 }}
              placeholder="e.g. Back porch, Lanai..."
              value={newPlaceName}
              onChange={e => setNewPlaceName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddPlace()}
            />
            <button onClick={handleAddPlace} style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "0 16px", color: "#1a0f08", fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>Save</button>
          </div>
        )}
      </div>

      {/* Privacy */}
      <div style={s.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, color: "#e8d5b7" }}>Private check-in</div>
            <div style={{ fontSize: 12, color: "#5a4535", marginTop: 2 }}>Only visible to you</div>
          </div>
          <div
            onClick={() => setIsPrivate(!isPrivate)}
            style={{ width: 44, height: 24, borderRadius: 12, background: isPrivate ? "#c9a84c" : "#3a2510", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
          >
            <div style={{ position: "absolute", top: 2, left: isPrivate ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#e8d5b7", transition: "left 0.2s" }} />
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ padding: 20 }}>
        {error && <div style={{ color: "#e8a07a", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}
        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Log This Smoke 🚬"}
        </button>
      </div>
    </div>
  );
}
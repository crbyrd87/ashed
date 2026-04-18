import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const KEY = process.env.REACT_APP_ANTHROPIC_KEY;

const fetchAISuggestions = async (cigar) => {
  const tagList = [
    "Cedar", "Oak", "Wood", "Charred Wood", "Toast", "Earth", "Mineral", "Barnyard", "Hay", "Grass", "Musty",
    "Pepper", "Black Pepper", "White Pepper", "Spice", "Cinnamon", "Licorice",
    "Chocolate", "Dark Chocolate", "Cocoa", "Coffee", "Espresso",
    "Caramel", "Vanilla", "Honey", "Molasses", "Sweetness", "Dried Fruit", "Raisin", "Fig", "Cherry", "Citrus",
    "Cream", "Bread", "Nuts", "Leather", "Tobacco", "Salt", "Floral",
  ];

  const prompt = `You are a cigar expert. Based on this cigar's profile, suggest 6-8 tasting note descriptors a smoker might experience.

Cigar: ${cigar.brand} ${cigar.line}
Strength: ${cigar.strength || "unknown"}
Wrapper: ${cigar.wrapper || "unknown"}
Origin: ${cigar.origin || "unknown"}
Known tasting notes: ${cigar.tasting_notes || "none"}

You MUST return ONLY tags from this exact list: ${tagList.join(", ")}

Return ONLY a raw JSON array of strings from that list, no markdown, no explanation, no tags outside the list.
Example: ["Dark Chocolate", "Cedar", "Black Pepper", "Espresso", "Leather"]`;

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
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  const raw = data.content?.[0]?.text || "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
};

const FLAVOR_TAG_GROUPS = [
  { label: "Earth & Wood",       tags: ["Barnyard", "Cedar", "Charred Wood", "Earth", "Grass", "Hay", "Mineral", "Musty", "Oak", "Toast", "Wood"] },
  { label: "Spice",              tags: ["Black Pepper", "Cinnamon", "Licorice", "Pepper", "Spice", "White Pepper"] },
  { label: "Chocolate & Coffee", tags: ["Chocolate", "Cocoa", "Coffee", "Dark Chocolate", "Espresso"] },
  { label: "Sweet & Fruit",      tags: ["Caramel", "Cherry", "Citrus", "Dried Fruit", "Fig", "Honey", "Molasses", "Raisin", "Sweetness", "Vanilla"] },
  { label: "Cream & Savory",     tags: ["Bread", "Cream", "Leather", "Nuts", "Salt", "Tobacco"] },
  { label: "Floral",             tags: ["Floral"] },
];

const FLAVOR_TAGS = FLAVOR_TAG_GROUPS.flatMap(g => g.tags);

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
  const [showVenueSearch, setShowVenueSearch] = useState(false);
  const [venueQuery, setVenueQuery] = useState("");
  const [venueResults, setVenueResults] = useState([]);
  const [venueSearching, setVenueSearching] = useState(false);
  const [wouldSmokeAgain, setWouldSmokeAgain] = useState(null);
  const [visibility, setVisibility] = useState("public");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [listening, setListening] = useState(false);
  const [activeTip, setActiveTip] = useState(null);
  const [error, setError] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsUsed, setSuggestionsUsed] = useState(false);

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

  const handleVenueSearch = async () => {
    if (!venueQuery.trim()) return;
    setVenueSearching(true);
    setVenueResults([]);
    try {
      // Geocode the query then search nearby
      const geoRes = await fetch(`/api/places?action=geocode&address=${encodeURIComponent(venueQuery.trim())}`);
      const geoData = await geoRes.json();
      if (geoData.status === "OK" && geoData.results?.[0]) {
        const { lat, lng } = geoData.results[0].geometry.location;
        const searchRes = await fetch(`/api/places?action=search&lat=${lat}&lng=${lng}`);
        const searchData = await searchRes.json();
        setVenueResults((searchData.results || []).slice(0, 8));
      }
    } catch (e) {
      console.error("Venue search error:", e);
    }
    setVenueSearching(false);
  };

  const handleSelectVenue = (venue) => {
    setLocation(venue.name);
    setShowVenueSearch(false);
    setVenueQuery("");
    setVenueResults([]);
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const suggestions = await fetchAISuggestions(cigar);
      setAiSuggestions(suggestions);
    } catch (e) {
      console.error("AI suggestions error:", e);
    }
    setLoadingSuggestions(false);
    setSuggestionsUsed(true);
  };

  const handleTapSuggestion = (suggestion) => {
    toggleTag(suggestion);
    setAiSuggestions(prev => prev.filter(s => s !== suggestion));
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
      visibility: visibility,
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
      would_smoke_again: wouldSmokeAgain || null,
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

      <div style={s.section}>
        <div style={s.label}>Comments</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <textarea
            style={{ ...s.textarea, flex: 1 }}
            placeholder="Describe your experience — the flavors, the occasion, how it paired with your drink..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: aiSuggestions.length > 0 ? 10 : 0 }}>
          <button style={s.micBtn} onClick={handleVoice}>
            {listening ? "🎙️ Listening..." : "🎙️ Voice input"}
          </button>
          {!suggestionsUsed && (
            <button
              onClick={handleGetSuggestions}
              disabled={loadingSuggestions}
              style={{ background: loadingSuggestions ? "#2a1a0e" : "none", border: "1px solid #7a9a7a55", borderRadius: 8, padding: "8px 14px", color: loadingSuggestions ? "#5a4535" : "#7a9a7a", fontSize: 12, cursor: loadingSuggestions ? "default" : "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}
            >
              {loadingSuggestions ? "Thinking..." : "✨ Suggest notes"}
            </button>
          )}
        </div>
        {aiSuggestions.filter(s => !selectedTags.includes(s)).length > 0 && (
          <div style={{ background: "#2a1a0e", border: "1px solid #7a9a7a33", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#7a9a7a", letterSpacing: 1, marginBottom: 8 }}>TAP TO SELECT FLAVOR TAGS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {aiSuggestions.filter(s => !selectedTags.includes(s)).map((s, i) => (
                <button key={i} onClick={() => handleTapSuggestion(s)}
                  style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid #7a9a7a55", background: "#7a9a7a22", color: "#7a9a7a", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={s.section}>
        <div style={s.label}>Flavor Tags</div>
        {FLAVOR_TAG_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#5a4535", letterSpacing: 1, marginBottom: 6 }}>{group.label.toUpperCase()}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {group.tags.map(tag => (
                <button key={tag} style={s.tag(selectedTags.includes(tag))} onClick={() => toggleTag(tag)}>{tag}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={s.section}>
        <div style={s.label}>Would you smoke this again?</div>
        <div style={{ display: "flex", gap: 10 }}>
          {["Yes", "Maybe", "No"].map(opt => (
            <button key={opt} style={s.optBtn(wouldSmokeAgain === opt)} onClick={() => setWouldSmokeAgain(opt)}>{opt}</button>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.label}>Value for Price</div>
        <div style={{ display: "flex", gap: 10 }}>
          {VALUE_OPTIONS.map(opt => (
            <button key={opt} style={s.optBtn(valueForPrice === opt)} onClick={() => setValueForPrice(opt)}>{opt}</button>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.label}>Date</div>
        <input type="date" style={s.input} value={smokeDate} onChange={e => setSmokeDate(e.target.value)} />
        <div style={{ ...s.label, marginTop: 14 }}>Location <span style={{ color: "#5a4535", fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: 11 }}>(optional)</span></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {savedPlaces.map(p => (
            <button key={p.id} style={s.tag(location === p.name)} onClick={() => setLocation(location === p.name ? "" : p.name)}>{p.name}</button>
          ))}
          <button style={s.tag(false)} onClick={() => setShowNewPlace(!showNewPlace)}>+ Add place</button>
          <button style={s.tag(false)} onClick={() => setShowVenueSearch(!showVenueSearch)}>🏪 Find venue</button>
        </div>
        {location !== "" && (
          <div style={{ fontSize: 12, color: "#c9a84c", marginBottom: 8 }}>📍 {location} <span onClick={() => setLocation("")} style={{ color: "#5a4535", cursor: "pointer", marginLeft: 6 }}>×</span></div>
        )}
        {showNewPlace && (
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
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
        {showVenueSearch && (
          <div style={{ background: "#1a0f08", border: "1px solid #3a2510", borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>FIND A VENUE</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder="Search by city or zip..."
                value={venueQuery}
                onChange={e => setVenueQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleVenueSearch()}
              />
              <button onClick={handleVenueSearch} disabled={venueSearching}
                style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "0 14px", color: "#1a0f08", fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}>
                {venueSearching ? "..." : "Search"}
              </button>
            </div>
            {venueResults.map((v, i) => (
              <div key={v.place_id || i} onClick={() => handleSelectVenue(v)}
                style={{ padding: "8px 10px", borderRadius: 6, marginBottom: 4, background: "#2a1a0e", cursor: "pointer", border: "1px solid #3a2510" }}>
                <div style={{ fontSize: 13, color: "#e8d5b7", fontWeight: 600 }}>{v.name}</div>
                <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>{v.vicinity || v.formatted_address}</div>
              </div>
            ))}
            {!venueSearching && venueResults.length === 0 && venueQuery && (
              <div style={{ fontSize: 12, color: "#5a4535", textAlign: "center", padding: "8px 0" }}>No venues found. Try a different search.</div>
            )}
            <button onClick={() => { setShowVenueSearch(false); setVenueResults([]); setVenueQuery(""); }}
              style={{ width: "100%", background: "none", border: "none", color: "#5a4535", fontSize: 12, cursor: "pointer", fontFamily: SANS, marginTop: 4 }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <div style={s.section}>
        <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>VISIBILITY</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { value: "public", label: "🌍 Public", desc: "Appears in community feed" },
            { value: "friends_only", label: "👥 Friends", desc: "Friends only" },
            { value: "private", label: "🔒 Private", desc: "Only you" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setVisibility(opt.value)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer", fontFamily: SANS,
                border: `1px solid ${visibility === opt.value ? "#c9a84c" : "#3a2510"}`,
                background: visibility === opt.value ? "#c9a84c22" : "transparent",
                color: visibility === opt.value ? "#c9a84c" : "#5a4535",
                fontSize: 11, fontWeight: visibility === opt.value ? 700 : 400,
                textAlign: "center", lineHeight: 1.5,
              }}
            >
              <div>{opt.label}</div>
              <div style={{ fontSize: 9, marginTop: 2, opacity: 0.8 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {error && <div style={{ color: "#e8a07a", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}
        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Log This Smoke 🚬"}
        </button>
      </div>
    </div>
  );
}
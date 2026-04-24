import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { checkAndAwardBadges } from "./badgeEngine";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const fetchAISuggestions = async (cigar, userId) => {
  const prompt = `You are a cigar expert. Based on this cigar's profile, suggest 6-8 short tasting note descriptors a smoker might experience.

Cigar: ${cigar.brand} ${cigar.line}
Strength: ${cigar.strength || "unknown"}
Wrapper: ${cigar.wrapper || "unknown"}
Origin: ${cigar.origin || "unknown"}
Known tasting notes: ${cigar.tasting_notes || "none"}

Return ONLY a raw JSON array of short descriptor strings, no markdown, no explanation. Each descriptor should be 1-3 words maximum.
Example: ["Dark chocolate", "Cedar", "Black pepper", "Espresso", "Leather", "Dried fruit"]`;

  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      feature: "tasting_notes",
      user_id: userId || null,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  if (response.status === 429) {
    throw new Error(data.error || "You've reached the tasting notes limit for this hour. Please try again later.");
  }
  const raw = data.content?.[0]?.text || "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
};

const FLAVOR_TAGS = [
  "Cedar", "Leather", "Earth", "Coffee", "Chocolate", "Pepper",
  "Cream", "Nuts", "Caramel", "Citrus", "Floral", "Spice",
  "Wood", "Hay", "Sweetness", "Tobacco", "Grass", "Mineral"
];

const VALUE_OPTIONS = ["Good value", "OK value", "Poor value"];

// Convert 1–5 (0.5 increments) to 0–10 score
const flamesToScore = (flames) => parseFloat((flames * 2).toFixed(1));

const FLAME_LABELS = {
  1: "Poor", 1.5: "Below Average", 2: "Fair", 2.5: "Decent",
  3: "Good", 3.5: "Very Good", 4: "Great", 4.5: "Excellent", 5: "Outstanding"
};

// SVG flame icon — full, half, or empty
function FlameIcon({ fill = "full", size = 38 }) {
  const id = `half-${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flexShrink: 0 }}>
      {fill === "half" && (
        <defs>
          <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
            <stop offset="50%" stopColor="#c9a84c" />
            <stop offset="50%" stopColor="#3a2510" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2C12 2 6 8 6 13a6 6 0 0012 0c0-3-2-5.5-2-5.5S14 10 12 10c0 0 1-3-0-8z"
        fill={
          fill === "full" ? "#c9a84c" :
          fill === "half" ? `url(#${id})` :
          "#3a2510"
        }
      />
    </svg>
  );
}

// Flame rating: 5 flames, 0.5 increments via tap position
function FlameRating({ value, onChange }) {
  const containerRef = useRef(null);

  const getValueFromEvent = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const flameWidth = rect.width / 5;
    const flameIndex = Math.floor(x / flameWidth); // 0-4
    const posWithinFlame = (x - flameIndex * flameWidth) / flameWidth;
    const raw = flameIndex + (posWithinFlame < 0.5 ? 0.5 : 1);
    return Math.min(5, Math.max(0.5, raw));
  };

  const handleClick = (e) => {
    onChange(getValueFromEvent(e));
  };

  const handleTouch = (e) => {
    e.preventDefault();
    onChange(getValueFromEvent(e));
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onTouchEnd={handleTouch}
      style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", cursor: "pointer", userSelect: "none", padding: "4px 0" }}
    >
      {[1, 2, 3, 4, 5].map(i => {
        const fill = value >= i ? "full" : value >= i - 0.5 ? "half" : "empty";
        return <FlameIcon key={i} fill={fill} size={38} />;
      })}
    </div>
  );
}

export default function CheckIn({ cigar, user, onClose, onSaved }) {
  // Core quick check-in state
  const [flames, setFlames] = useState(4);
  const [wouldSmokeAgain, setWouldSmokeAgain] = useState(null);

  // Details section state
  const [showDetails, setShowDetails] = useState(false);
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
  const [isPrivate, setIsPrivate] = useState(false);

  // AI state
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsUsed, setSuggestionsUsed] = useState(false);
  const [listening, setListening] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const displayScore = flamesToScore(flames);

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
      const suggestions = await fetchAISuggestions(cigar, user?.id);
      setAiSuggestions(suggestions);
    } catch (e) {
      console.error("AI suggestions error:", e);
      setError(e.message || "Could not load suggestions. Please try again.");
    }
    setLoadingSuggestions(false);
    setSuggestionsUsed(true);
  };

  const handleTapSuggestion = (suggestion) => {
    setNotes(prev => prev ? prev + ", " + suggestion : suggestion);
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
      visibility: isPrivate ? "private" : "public",
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
      aroma: null,
      draw: null,
      burn: null,
      construction: null,
      flavor: null,
      finish: null,
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

    // Check badges in background — never blocks UX
    checkAndAwardBadges(user.id, "checkin").catch(() => {});
  };

  const s = {
    overlay: { position: "fixed", inset: 0, background: "#1a0f08", zIndex: 300, overflowY: "auto", fontFamily: SANS, color: "#e8d5b7", maxWidth: 420, margin: "0 auto" },
    header: { background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "16px 20px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center" },
    section: { padding: "16px 20px", borderBottom: "1px solid #3a251033" },
    label: { fontSize: 11, color: "#8a7055", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 },
    input: { width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "10px 14px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box" },
    textarea: { width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "10px 14px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box", minHeight: 80, resize: "vertical" },
    tag: active => ({ padding: "5px 12px", borderRadius: 20, border: `1px solid ${active ? "#c9a84c" : "#3a2510"}`, background: active ? "#c9a84c22" : "transparent", color: active ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }),
    optBtn: active => ({ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${active ? "#c9a84c" : "#3a2510"}`, background: active ? "#c9a84c22" : "transparent", color: active ? "#c9a84c" : "#8a7055", fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: SANS }),
    saveBtn: { width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 16, color: "#1a0f08", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: SANS },
    micBtn: { background: listening ? "#c9a84c22" : "none", border: `1px solid ${listening ? "#c9a84c" : "#3a2510"}`, borderRadius: 8, padding: "8px 14px", color: listening ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" },
    detailsToggle: { width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 8, padding: "12px 16px", color: "#8a7055", fontSize: 13, cursor: "pointer", fontFamily: SANS, display: "flex", justifyContent: "space-between", alignItems: "center" },
  };

  return (
    <div style={s.overlay}>
      {success && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "#7a9a7a", color: "#fff", padding: "12px 24px", borderRadius: 30, fontSize: 14, fontWeight: 600, zIndex: 999, fontFamily: SANS, whiteSpace: "nowrap" }}>
          ✓ Smoke logged successfully!
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2 }}>{cigar.brand?.toUpperCase()}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e8d5b7" }}>{cigar.line} — {cigar.vitola}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 24, cursor: "pointer" }}>×</button>
      </div>

      {/* ── QUICK CHECK-IN ── */}

      {/* Flame Rating */}
      <div style={{ ...s.section, paddingTop: 24, paddingBottom: 24 }}>
        <div style={{ ...s.label, justifyContent: "center" }}>Your Rating</div>
        <FlameRating value={flames} onChange={setFlames} />
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: "#8a7055" }}>
          {FLAME_LABELS[flames] || ""}
          {" · "}
          <span style={{ color: "#c9a84c", fontWeight: 700 }}>{flames.toFixed(1)} / 5</span>
          <span style={{ color: "#5a4535", fontSize: 11, marginLeft: 6 }}>({displayScore.toFixed(1)}/10)</span>
        </div>
      </div>

      {/* Would Smoke Again */}
      <div style={s.section}>
        <div style={s.label}>Would you smoke this again?</div>
        <div style={{ display: "flex", gap: 10 }}>
          {["Yes", "Maybe", "No"].map(opt => (
            <button key={opt} style={s.optBtn(wouldSmokeAgain === opt)} onClick={() => setWouldSmokeAgain(wouldSmokeAgain === opt ? null : opt)}>
              {opt === "Yes" ? "👍 Yes" : opt === "Maybe" ? "🤔 Maybe" : "👎 No"}
            </button>
          ))}
        </div>
      </div>

      {/* ── ADD DETAILS TOGGLE ── */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #3a251033" }}>
        <button style={s.detailsToggle} onClick={() => setShowDetails(!showDetails)}>
          <span>Add details</span>
          <span style={{ fontSize: 16 }}>{showDetails ? "−" : "+"}</span>
        </button>
      </div>

      {/* ── DETAILS SECTION ── */}
      {showDetails && (
        <>
          {/* Notes */}
          <div style={s.section}>
            <div style={s.label}>Notes</div>
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
                {listening ? "🎙️ Listening..." : "🎙️ Voice"}
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
            {aiSuggestions.length > 0 && (
              <div style={{ background: "#2a1a0e", border: "1px solid #7a9a7a33", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#7a9a7a", letterSpacing: 1, marginBottom: 8 }}>TAP TO ADD TO YOUR NOTES</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {aiSuggestions.map((sg, i) => (
                    <button key={i} onClick={() => handleTapSuggestion(sg)}
                      style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid #7a9a7a55", background: "#7a9a7a22", color: "#7a9a7a", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                      + {sg}
                    </button>
                  ))}
                </div>
              </div>
            )}
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

          {/* Value for Price */}
          <div style={s.section}>
            <div style={s.label}>Value for Price</div>
            <div style={{ display: "flex", gap: 10 }}>
              {VALUE_OPTIONS.map(opt => (
                <button key={opt} style={s.optBtn(valueForPrice === opt)} onClick={() => setValueForPrice(valueForPrice === opt ? null : opt)}>{opt}</button>
              ))}
            </div>
          </div>

          {/* Date & Location */}
          <div style={s.section}>
            <div style={s.label}>Date</div>
            <input type="date" style={s.input} value={smokeDate} onChange={e => setSmokeDate(e.target.value)} />
            <div style={{ ...s.label, marginTop: 14 }}>
              Location <span style={{ color: "#5a4535", fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: 11 }}>(optional)</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {savedPlaces.map(p => (
                <button key={p.id} style={s.tag(location === p.name)} onClick={() => setLocation(location === p.name ? "" : p.name)}>{p.name}</button>
              ))}
              <button style={s.tag(false)} onClick={() => setShowNewPlace(!showNewPlace)}>+ Add place</button>
              <button style={s.tag(false)} onClick={() => setShowVenueSearch(!showVenueSearch)}>🏪 Find venue</button>
            </div>
            {location !== "" && (
              <div style={{ fontSize: 12, color: "#c9a84c", marginBottom: 8 }}>
                📍 {location} <span onClick={() => setLocation("")} style={{ color: "#5a4535", cursor: "pointer", marginLeft: 6 }}>×</span>
              </div>
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

          {/* Private Toggle */}
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
        </>
      )}

      {/* Save Button */}
      <div style={{ padding: 20 }}>
        {error && <div style={{ color: "#e8a07a", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}
        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Log This Smoke 🔥"}
        </button>
      </div>
    </div>
  );
}
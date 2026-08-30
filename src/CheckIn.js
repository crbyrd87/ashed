import React, { useState, useEffect } from "react";
import { SANS, color, font, radius, type, weight } from "./theme";
import { Button, ClickableRow, CloseButton, Icon, Notice, Pill, Pressable, Screen, SectionLabel, Sheet, Toggle } from "./ui";
import { authedFetch } from "./apiClient";
import { supabase } from "./supabase";
import { checkAndAwardBadges } from "./badgeEngine";
import { todayLocalISO } from "./dateUtils";
import { FLAVOR_TAG_NAMES } from "./flavors";

const fetchAISuggestions = async (cigar, userId) => {
  const prompt = `You are a cigar expert. Based on this cigar's profile, describe the tasting experience in one natural sentence, then list which of our flavor tags apply.

Cigar: ${cigar.brand} ${cigar.line}
Strength: ${cigar.strength || "unknown"}
Wrapper: ${cigar.wrapper || "unknown"}
Origin: ${cigar.origin || "unknown"}
Known tasting notes: ${cigar.tasting_notes || "none"}

Our flavor tags: ${FLAVOR_TAG_NAMES.join(", ")}

Return ONLY raw JSON, no markdown:
{"description":"One natural sentence describing what the smoker may taste.","tags":["Tag1","Tag2","Tag3"]}

Only include tags from our list that genuinely apply. Typically 3-6 tags.`;

  const response = await authedFetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      feature: "tasting_notes",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  const raw = data.content?.[0]?.text || "{}";
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : { description: "", tags: [] };
};

// Convert 1–5 (0.5 increments) to 0–10 score
const flamesToScore = (flames) => parseFloat((flames * 2).toFixed(1));

const FLAME_LABELS = {
  1: "Poor", 1.5: "Below Average", 2: "Fair", 2.5: "Decent",
  3: "Good", 3.5: "Very Good", 4: "Great", 4.5: "Excellent", 5: "Outstanding"
};

// SVG flame icon — full, half, or empty
// The rating is the app's signature interaction, so it earns real input
// handling: pointer events cover touch, mouse-drag and stylus alike, and
// arrow keys make it reachable without a pointer at all.
//
// The local FlameIcon that used to live here is gone. It called Math.random()
// inside the component body, minting new DOM ids for an identical gradient on
// every repaint, and it hardcoded the original #cc2200 to #ffcc00 ramp — which
// made check-in the one screen still showing the un-desaturated flame after
// the redesign. Icon.Flame draws the same path against the shared ember.
function FlameRating({ value, onChange }) {
  const trackRef = React.useRef(null);

  const valueFromX = (clientX) => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const raw = (x / rect.width) * 5;
    if (raw < 0.25) return null;
    return Math.min(5, Math.max(0.5, Math.round(raw * 2) / 2));
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(valueFromX(e.clientX));
  };

  const onPointerMove = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    onChange(valueFromX(e.clientX));
  };

  const onKeyDown = (e) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.5
      : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.5 : 0;
    if (!step) return;
    e.preventDefault();
    onChange(Math.min(5, Math.max(0.5, (value || 0) + step)));
  };

  const fillPct = value ? (value / 5) * 100 : 0;

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 18 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Icon.Flame key={i} size={44} filled={value !== null && value >= i - 0.5}
            color={value !== null && value >= i - 0.5 ? undefined : color.borderStrong} />
        ))}
      </div>

      <div style={{ padding: "0 12px" }}>
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Rating"
          aria-valuemin={0.5}
          aria-valuemax={5}
          aria-valuenow={value || 0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
          style={{ position: "relative", height: 28, display: "flex", alignItems: "center", cursor: "pointer", touchAction: "none", userSelect: "none" }}
        >
          <div style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2, background: color.border }} />
          {/* Flat fill: at 4px tall a three-stop gradient is invisible. */}
          {value && <div style={{ position: "absolute", left: 0, height: 4, width: `${fillPct}%`, borderRadius: 2, background: color.emberMid }} />}
          <div style={{
            position: "absolute",
            left: value ? `calc(${fillPct}% - 13px)` : "-13px",
            width: 26, height: 26, borderRadius: "50%",
            background: value ? color.emberMid : color.borderStrong,
            border: `3px solid ${color.bg}`,
            transition: "left 0.05s",
          }} />
        </div>
      </div>
    </div>
  );
}

// Three-up choice: outline only. A filled swatch behind a label was the most
// game-like treatment left in the app, and with the glyphs gone the border and
// label colour carry the state without shouting. Tapping the selected option
// clears it.
function ChoiceRow({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map(({ label, display, tone }) => {
        const active = value === label;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(active ? null : label)}
            style={{
              flex: 1, height: 48, borderRadius: radius.md,
              border: `1px solid ${active ? tone : color.borderStrong}`,
              background: "none",
              color: active ? tone : color.textMuted,
              fontSize: type.md, fontWeight: active ? weight.bodyMed : weight.body,
              fontFamily: font.sans, cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {display || label}
          </button>
        );
      })}
    </div>
  );
}

export default function CheckIn({ cigar, user, onClose, onSaved }) {
  // Core quick check-in state
  const [flames, setFlames] = useState(null);
  const [wouldSmokeAgain, setWouldSmokeAgain] = useState(null);

  // Details section state
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [valueForPrice, setValueForPrice] = useState(null);
  const [smokeDate, setSmokeDate] = useState(todayLocalISO());
  const [location, setLocation] = useState("");
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [showNewPlace, setShowNewPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [showVenueSearch, setShowVenueSearch] = useState(false);
  const [venueQuery, setVenueQuery] = useState("");
  const [venueResults, setVenueResults] = useState([]);
  const [venueSearching, setVenueSearching] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  // The default below is loaded from the user's settings. This ref records
  // whether they have since touched the toggle, so a slow fetch can never
  // overwrite a deliberate per-check-in choice.
  const privateTouched = React.useRef(false);

  // AI state
  const [aiDescription, setAiDescription] = useState("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsUsed, setSuggestionsUsed] = useState(false);
  const [suggestError, setSuggestError] = useState(null);
  const [showAllTags, setShowAllTags] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const displayScore = flames !== null ? flamesToScore(flames) : null;

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

    // 11-C: Settings writes users.default_private_checkins and promises
    // "New check-ins will be private". Nothing ever read it back, so the
    // promise was not kept. Seed the toggle from it; the user can still
    // override it for this check-in.
    const fetchPrivacyDefault = async () => {
      const { data } = await supabase
        .from("users")
        .select("default_private_checkins")
        .eq("id", user.id)
        .single();
      if (data && !privateTouched.current) {
        setIsPrivate(!!data.default_private_checkins);
      }
    };
    fetchPrivacyDefault();
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
      const geoRes = await authedFetch(`/api/places?action=geocode&address=${encodeURIComponent(venueQuery.trim())}`);
      const geoData = await geoRes.json();
      if (geoData.status === "OK" && geoData.results?.[0]) {
        const { lat, lng } = geoData.results[0].geometry.location;
        const searchRes = await authedFetch(`/api/places?action=search&lat=${lat}&lng=${lng}`);
        const searchData = await searchRes.json();
        // Sort by distance from search location
        const results = (searchData.results || []).map(p => {
          const pLat = p.geometry?.location?.lat;
          const pLng = p.geometry?.location?.lng;
          const dist = pLat && pLng
            ? Math.sqrt(Math.pow(pLat - lat, 2) + Math.pow(pLng - lng, 2))
            : 999;
          return { ...p, _dist: dist };
        }).sort((a, b) => a._dist - b._dist).slice(0, 8);
        setVenueResults(results);
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
      const result = await fetchAISuggestions(cigar, user?.id);
      setAiDescription(result.description || "");
      setSuggestionsUsed(true);
      setShowAllTags(true);
      setSuggestError(null);
    } catch (e) {
      console.error("AI suggestions error:", e);
      // Deliberately NOT marking it used: this flag hides the button, and
      // setting it here left a failed call with no way to try again.
      setSuggestError("Couldn't reach the suggester.");
    }
    setLoadingSuggestions(false);
  };

  const handleSave = async () => {
    if (flames === null) {
      setError("Please rate this cigar before saving.");
      return;
    }
    setSaving(true);
    setError(null);

    const isRealCigar = !!cigar.id;
    const checkinData = {
      user_id: user.id,
      cigar_id: isRealCigar ? cigar.id : null,
      cigar_name: cigar.line || null,
      cigar_brand: cigar.brand || null,
      cigar_vitola: cigar.vitola || null,
      rating: displayScore,
      tasting_notes: selectedTags.length > 0 ? selectedTags.join(", ") : null,
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
      overall_notes: notes.trim() || null,
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

    // Both the checkin and rating inserts succeeded, so the smoke is fully
    // recorded and the milestone/variety/venue counts are safe to evaluate.
    // Deliberately not awaited: badge checks are several queries and must
    // never block or delay the success screen.
    checkAndAwardBadges(user.id, "checkin").catch(() => {});

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
    header: { background: color.bg, padding: "16px 20px", borderBottom: `1px solid ${color.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" },
    section: { padding: "16px 20px", borderBottom: `1px solid ${color.line}33` },
    label: { fontSize: type.xs, color: color.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 },
    input: { width: "100%", background: color.surfaceRaised, border: `1px solid ${color.lineInput}`, borderRadius: 8, padding: "10px 14px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" },
    textarea: { width: "100%", background: color.surfaceRaised, border: `1px solid ${color.lineInput}`, borderRadius: 8, padding: "10px 14px", color: color.text, fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box", minHeight: 80, resize: "vertical" },
    tag: active => ({ padding: "7px 14px", borderRadius: 20, border: `1px solid ${active ? color.gold : color.line}`, background: active ? `${color.gold}14` : color.surface, color: active ? color.gold : color.dim, fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: SANS, boxShadow: active ? `0 0 8px ${color.gold}33` : "none" }),
    optBtn: active => ({ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${active ? color.gold : color.line}`, background: active ? `${color.gold}22` : "transparent", color: active ? color.gold : color.muted, fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: SANS }),
    saveBtn: { width: "100%", background: color.gold, border: "none", borderRadius: 10, padding: 16, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: SANS },
    detailsToggle: { width: "100%", background: showDetails ? color.surfaceRaised : "none", border: `1px solid ${showDetails ? `${color.gold}44` : color.line}`, borderRadius: 10, padding: "14px 16px", color: showDetails ? color.gold : color.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS, display: "flex", justifyContent: "space-between", alignItems: "center" },
  };

  return (
    <Screen>
      {success && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: color.green, color: "#fff", padding: "12px 24px", borderRadius: 30, fontSize: 14, fontWeight: 600, zIndex: 999, fontFamily: SANS, whiteSpace: "nowrap" }}>
          Smoke logged
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 2 }}>{cigar.brand?.toUpperCase()}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: color.text }}>{cigar.line} — {cigar.vitola}</div>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {/* ── QUICK CHECK-IN ── */}

      {/* Flame Rating */}
      <div style={{ ...s.section, paddingTop: 24, paddingBottom: 24 }}>
        <div style={{ ...s.label, justifyContent: "center" }}>Your Rating</div>
        <FlameRating value={flames} onChange={setFlames} />
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 13 }}>
          {/* One number. The 10-point score stays in checkins.rating and
              ratings.score as a storage detail — showing both asked the reader
              which of the two was theirs. Nothing has gone wrong before a
              rating exists, so the unrated hint is faint, not danger. */}
          {flames === null ? (
            <span style={{ color: color.textFaint }}>Slide to rate</span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: font.mono, fontSize: type.xxl, color: color.textPrimary }}>
                {flames.toFixed(1)}
              </span>
              <span style={{ fontFamily: font.display, fontSize: type.lg, color: color.textMuted }}>
                {FLAME_LABELS[flames] || ""}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Would Smoke Again */}
      <div style={s.section}>
        <div style={s.label}>Would you smoke this again?</div>
        <ChoiceRow
          value={wouldSmokeAgain}
          onChange={setWouldSmokeAgain}
          options={[
            { label: "Yes", tone: color.positive },
            { label: "Maybe", tone: color.gold },
            { label: "No", tone: color.danger },
          ]}
        />
      </div>

      {/* ── ADD DETAILS TOGGLE ── */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${color.line}33` }}>
        <button style={s.detailsToggle} onClick={() => setShowDetails(!showDetails)}>
          <span>{showDetails ? "Hide details" : "Add details"}</span>
          <span style={{ fontSize: 14, transition: "transform 0.2s", display: "inline-block", transform: showDetails ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
        </button>
      </div>

      {/* ── DETAILS SECTION ── */}
      {showDetails && (
        <>
          {/* Tasting notes. Suggest is a gold text action in the section
              label, not a green pill beside it — green is status only now. */}
          <div style={s.section}>
            <SectionLabel
              style={{ marginBottom: 12 }}
              action={!suggestionsUsed && (
                <Pressable onClick={handleGetSuggestions} disabled={loadingSuggestions} minHeight={0}
                  style={{ display: "flex", alignItems: "center", gap: 5, color: color.gold, fontSize: type.xs, whiteSpace: "nowrap" }}>
                  <Icon.Recommend size={15} color={color.gold} />
                  {loadingSuggestions ? "Thinking…" : "Suggest"}
                </Pressable>
              )}
            >
              Tasting notes
            </SectionLabel>

            {suggestError && (
              <Notice isError text={suggestError} style={{ marginBottom: 12 }}>
                <div style={{ marginTop: 8 }}>
                  <Button variant="secondary" full={false} style={{ height: 40 }} onClick={handleGetSuggestions}>
                    Try again
                  </Button>
                </div>
              </Notice>
            )}

            {/* The AI speaks as the app, not from inside a tinted card —
                matching the assistant turn in DRINK-PAIRING.md. */}
            {aiDescription ? (
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <span style={{ flexShrink: 0, display: "flex", paddingTop: 2 }}><Icon.Flame size={19} /></span>
                <span style={{ fontSize: type.sm, color: color.textMuted, lineHeight: 1.55 }}>{aiDescription}</span>
              </div>
            ) : (
              <div style={{ fontSize: type.sm, color: color.textFaint, marginBottom: 16, lineHeight: 1.5 }}>
                Pick what you tasted, or tap Suggest for ideas.
              </div>
            )}

            {/* Eight, not eighteen: eighteen chips is four wrapping rows
                before the date row comes into view. The full vocabulary is
                unchanged — More expands the rest in place. */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(showAllTags ? FLAVOR_TAG_NAMES : FLAVOR_TAG_NAMES.slice(0, 8)).map(tagName => (
                <Pill key={tagName} selected={selectedTags.includes(tagName)} onClick={() => toggleTag(tagName)}>
                  {tagName}
                </Pill>
              ))}
              {!showAllTags && (
                <Pill onClick={() => setShowAllTags(true)}>
                  More
                </Pill>
              )}
            </div>
          </div>

          {/* Value for Price */}
          <div style={s.section}>
            <div style={s.label}>Value for Price</div>
            {/* Displayed as Good / OK / Poor: "Good value" three-up wraps on a
                narrow phone and the section label already says value. The STORED
                strings are unchanged — changing them would need a column
                migration. */}
            <ChoiceRow
              value={valueForPrice}
              onChange={setValueForPrice}
              options={[
                { label: "Good value", display: "Good", tone: color.positive },
                { label: "OK value", display: "OK", tone: color.gold },
                { label: "Poor value", display: "Poor", tone: color.danger },
              ]}
            />
          </div>

          {/* Date & Location */}
          <div style={s.section}>
            <div style={s.label}>Date</div>
            <input type="date" style={{ ...s.input, maxWidth: "100%", fontSize: type.md }} value={smokeDate} onChange={e => setSmokeDate(e.target.value)} />
            <div style={{ ...s.label, marginTop: 14 }}>
              Location <span style={{ color: color.faint, fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: type.xs }}>(optional)</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {savedPlaces.map(p => (
                <button key={p.id} style={s.tag(location === p.name)} onClick={() => setLocation(location === p.name ? "" : p.name)}>{p.name}</button>
              ))}
              <button style={s.tag(false)} onClick={() => setShowNewPlace(!showNewPlace)}>+ Add place</button>
              <button style={s.tag(false)} onClick={() => setShowVenueSearch(!showVenueSearch)}>Find venue</button>
            </div>
            {location !== "" && (
              <div style={{ fontSize: type.xs, color: color.gold, marginBottom: 8 }}>
                {location} <span onClick={() => setLocation("")} style={{ color: color.faint, cursor: "pointer", marginLeft: 6 }}>×</span>
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
                <button onClick={handleAddPlace} style={{ background: color.gold, border: "none", borderRadius: 8, padding: "0 16px", color: color.bg, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>Save</button>
              </div>
            )}
            {showVenueSearch && (
              <div style={{ background: color.bg, border: `1px solid ${color.line}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 8 }}>FIND A VENUE</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    placeholder="Search by city or zip..."
                    value={venueQuery}
                    onChange={e => setVenueQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleVenueSearch()}
                  />
                  <button onClick={handleVenueSearch} disabled={venueSearching}
                    style={{ background: color.gold, border: "none", borderRadius: 8, padding: "0 14px", color: color.bg, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}>
                    {venueSearching ? "..." : "Search"}
                  </button>
                </div>
                {venueResults.map((v, i) => (
                  <Pressable key={v.place_id || i} onClick={() => handleSelectVenue(v)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, marginBottom: 4, background: color.surfaceRaised, border: `1px solid ${color.line}` }}>
                    <div style={{ fontSize: 13, color: color.text, fontWeight: 600 }}>{v.name}</div>
                    <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>{v.vicinity || v.formatted_address}</div>
                  </Pressable>
                ))}
                {!venueSearching && venueResults.length === 0 && venueQuery && (
                  <div style={{ fontSize: type.xs, color: color.faint, textAlign: "center", padding: "8px 0" }}>No venues found. Try a different search.</div>
                )}
                <button onClick={() => { setShowVenueSearch(false); setVenueResults([]); setVenueQuery(""); }}
                  style={{ width: "100%", background: "none", border: "none", color: color.faint, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, marginTop: 4 }}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Notes. A row and a sheet rather than an inline textarea, which
              would push Save further down a screen that is already long.
              ratings.overall_notes existed and was always written as null —
              a textarea style was defined in this file and never rendered. */}
          <div style={s.section}>
            <ClickableRow
              label="Notes"
              sublabel={notes ? undefined : "Anything worth remembering"}
              trailing={notes
                ? <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: type.sm, color: color.textPrimary }}>{notes}</span>
                : <Icon.Chevron size={15} color={color.textFaint} />}
              onClick={() => setShowNotes(true)}
            />
          </div>

          {showNotes && (
            <Sheet onClose={() => setShowNotes(false)} handle panelStyle={{ minHeight: "60vh" }}>
              <SectionLabel style={{ marginBottom: 12 }}>Notes</SectionLabel>
              <textarea
                autoFocus
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="How did it draw? What did it taste of? Where were you?"
                rows={8}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: color.surfaceRaised,
                  border: `1px solid ${color.borderStrong}`,
                  borderRadius: radius.md, padding: 14,
                  color: color.textPrimary, fontSize: type.md,
                  fontFamily: font.sans, lineHeight: 1.55,
                  outline: "none", resize: "vertical",
                }}
              />
              <Button style={{ marginTop: 16 }} onClick={() => setShowNotes(false)}>Done</Button>
            </Sheet>
          )}

          {/* Private Toggle */}
          <div style={s.section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, color: color.text }}>Private check-in</div>
                <div style={{ fontSize: type.xs, color: color.faint, marginTop: 2 }}>Only visible to you</div>
              </div>
              <Toggle
                checked={isPrivate}
                onChange={(v) => { privateTouched.current = true; setIsPrivate(v); }}
                label="Private check-in"
              />
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      <div style={{ padding: 20 }}>
        {error && <div style={{ color: color.dangerText, fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}
        <button
          style={{ ...s.saveBtn, opacity: flames === null ? 0.5 : 1 }}
          onClick={handleSave}
          disabled={saving || flames === null}
        >
          {saving ? "Saving..." : "Log this smoke"}
        </button>
      </div>
    </Screen>
  );
}
import React, { useState, useEffect, useRef } from "react";
import Auth from "./Auth";
import { supabase } from "./supabase";
import { searchCigarLines, getVitolas } from "./cigarAI";
import CheckIn from "./CheckIn";

const CIGARS = [
  { id: 1, brand: "Arturo Fuente", line: "Opus X", vitola: "Robusto", wrapper: "Dominican", strength: "Full", rating: 97, origin: "Dominican Republic", price: 32, smoked: true, smokedDate: "Feb 28, 2026", userRating: 94, notes: "Incredible complexity, leather and cedar up front.", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
  { id: 2, brand: "Padron", line: "1964 Anniversary", vitola: "Torpedo", wrapper: "Nicaragua", strength: "Full", rating: 96, origin: "Nicaragua", price: 24, smoked: true, smokedDate: "Feb 14, 2026", userRating: 96, notes: "Rich cocoa and espresso. One of the best I've had.", img: "https://images.unsplash.com/photo-1611048267451-e6ed903d4a38?w=400&q=80" },
  { id: 3, brand: "Cohiba", line: "Behike 54", vitola: "Toro", wrapper: "Cuba", strength: "Medium-Full", rating: 98, origin: "Cuba", price: 70, smoked: false, img: "https://images.unsplash.com/photo-1567446537708-ac4aa75c9c28?w=400&q=80" },
  { id: 4, brand: "My Father", line: "Le Bijou 1922", vitola: "Torpedo", wrapper: "Ecuador", strength: "Full", rating: 95, origin: "Nicaragua", price: 18, smoked: false, img: "https://images.unsplash.com/photo-1542601906897-ecd2f70b1a43?w=400&q=80" },
  { id: 5, brand: "Oliva", line: "Serie V", vitola: "Lancero", wrapper: "Nicaragua", strength: "Full", rating: 94, origin: "Nicaragua", price: 12, smoked: true, smokedDate: "Jan 30, 2026", userRating: 91, notes: "Spicy pepper with a smooth finish. Great value.", img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80" },
  { id: 6, brand: "Rocky Patel", line: "Vintage 1990", vitola: "Churchill", wrapper: "Ecuador", strength: "Medium", rating: 92, origin: "Honduras", price: 14, smoked: false, img: "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=400&q=80" },
  { id: 7, brand: "Liga Privada", line: "No. 9", vitola: "Robusto", wrapper: "Connecticut Broadleaf", strength: "Full", rating: 96, origin: "Nicaragua", price: 20, smoked: true, smokedDate: "Jan 15, 2026", userRating: 98, notes: "Dark chocolate and earth. My go-to special occasion cigar.", img: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400&q=80" },
  { id: 8, brand: "Davidoff", line: "Year of the Rabbit", vitola: "Robusto", wrapper: "Ecuador", strength: "Medium", rating: 93, origin: "Dominican Republic", price: 45, smoked: false, img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80" },
];

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const strengthColor = s => ({ "Light": "#a8c5a0", "Medium": "#d4b483", "Medium-Full": "#c4894a", "Full": "#a0522d" }[s] || "#888");

const Badge = ({ label, color = "#c9a84c" }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{label}</span>
);

const ScoreBar = ({ rating }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <div style={{ width: 60, height: 6, background: "#3a2a1a", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${rating}%`, height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 3 }} />
    </div>
    <span style={{ color: "#c9a84c", fontSize: 14, fontWeight: 700 }}>{rating}</span>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [imgErrors, setImgErrors] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [vitolas, setVitolas] = useState([]);
  const [violasLoading, setViolasLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [checkinRating, setCheckinRating] = useState(null);
  const [historySortBy, setHistorySortBy] = useState("date");
  const [historySortDir, setHistorySortDir] = useState("desc");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterNameOpen, setFilterNameOpen] = useState(false);
  const [filterBrand, setFilterBrand] = useState("");
  const [filterBrandOpen, setFilterBrandOpen] = useState(false);
  const [filterNoteTags, setFilterNoteTags] = useState([]);

  const FLAVOR_TAGS = ["Cedar", "Leather", "Earth", "Coffee", "Chocolate", "Pepper", "Cream", "Nuts", "Caramel", "Citrus", "Floral", "Spice", "Wood", "Hay", "Sweetness", "Tobacco", "Grass", "Mineral"];

  const uniqueNames = [...new Set(checkins.map(c => c.cigars?.line || c.cigar_name).filter(Boolean))].sort();
  const uniqueBrands = [...new Set(checkins.map(c => c.cigars?.brand || c.cigar_brand).filter(Boolean))].sort();

  const filteredNames = filterName ? uniqueNames.filter(n => n.toLowerCase().includes(filterName.toLowerCase())) : uniqueNames;
  const filteredBrands = filterBrand ? uniqueBrands.filter(b => b.toLowerCase().includes(filterBrand.toLowerCase())) : uniqueBrands;
  const [filterScoreMin, setFilterScoreMin] = useState(0);
  const [filterScoreMax, setFilterScoreMax] = useState(10);

  const activeFilterCount = [
    filterName, filterBrand,
    filterNoteTags.length > 0 ? "tags" : "",
    filterScoreMin > 0 || filterScoreMax < 10 ? "score" : ""
  ].filter(Boolean).length;
  const searchTimeout = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchCheckins = async () => {
      setProfileLoading(true);
      const { data } = await supabase
        .from("checkins")
        .select("*, cigars(brand, line, vitola, strength, origin, avg_rating)")
        .eq("user_id", user.id)
        .order("smoke_date", { ascending: false });
      setCheckins(data || []);
      setProfileLoading(false);
    };
    fetchCheckins();
  }, [user]);

  const refreshCheckins = async () => {
    const { data } = await supabase
      .from("checkins")
      .select("*, cigars(brand, line, vitola, strength, origin, avg_rating)")
      .eq("user_id", user.id)
      .order("smoke_date", { ascending: false });
    setCheckins(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleSelectCheckin = async (c) => {
    setSelectedCheckin(c);
    setCheckinRating(null);
    const { data } = await supabase
      .from("ratings")
      .select("*")
      .eq("checkin_id", c.id)
      .single();
    setCheckinRating(data || null);
  };

  const handleTogglePrivate = async (checkin) => {
    const { data } = await supabase
      .from("checkins")
      .update({ is_private: !checkin.is_private })
      .eq("id", checkin.id)
      .select()
      .single();
    if (data) {
      setSelectedCheckin(data);
      setCheckins(prev => prev.map(c => c.id === data.id ? { ...c, is_private: data.is_private } : c));
    }
  };

  const handleDeleteCheckin = async (checkin) => {
    if (!window.confirm("Delete this check-in? This cannot be undone.")) return;
    await supabase.from("ratings").delete().eq("checkin_id", checkin.id);
    await supabase.from("checkins").delete().eq("id", checkin.id);
    setSelectedCheckin(null);
    setCheckins(prev => prev.filter(c => c.id !== checkin.id));
  };

  const handleInputChange = (val) => {
    setQuery(val);
    setSelectedLine(null);
    setVitolas([]);
    setSearchResults([]);
    if (val.length < 2) { setShowDropdown(false); return; }
    setShowDropdown(true);
    setSearching(true);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const results = await searchCigarLines(val, (partial) => {
        setSearchResults(partial);
        setSearching(false);
      });
      setSearchResults(results);
      setSearching(false);
    }, 350);
  };

  const handleLineSelect = async (line) => {
    setShowDropdown(false);
    setQuery(`${line.brand} — ${line.line}`);
    setSelectedLine(line);
    setVitolas([]);
    setViolasLoading(true);
    const results = await getVitolas(line.brand, line.line, (partial) => {
      setVitolas(partial);
    });
    setVitolas(results);
    setViolasLoading(false);
  };

  const fallbackImg = () => `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80`;
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Profile";
  const username = user?.user_metadata?.username ? user.user_metadata.username.replace(/^@/, "") : null;

  const s = {
    app: { fontFamily: SANS, background: "#1a0f08", minHeight: "100vh", color: "#e8d5b7", maxWidth: 420, margin: "0 auto", paddingBottom: 70 },
    header: { background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "20px 20px 12px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center" },
    nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "#1a0f08", borderTop: "1px solid #3a2510", display: "flex", zIndex: 100 },
    navBtn: a => ({ flex: 1, padding: "12px 0", background: "none", border: "none", color: a ? "#c9a84c" : "#5a4535", fontSize: 11, letterSpacing: 1, cursor: "pointer", fontFamily: SANS, textTransform: "uppercase", fontWeight: a ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }),
    card: { background: "linear-gradient(135deg, #2a1a0e 0%, #221508 100%)", border: "1px solid #3a2510", borderRadius: 10, marginBottom: 10, cursor: "pointer", overflow: "hidden" },
    input: { width: "100%", background: "#2a1a0e", border: `1px solid ${searching ? "#7a9a7a" : "#4a3020"}`, borderRadius: showDropdown && searchResults.length > 0 ? "8px 8px 0 0" : "8px", padding: "10px 14px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" },
    statBox: { background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: "14px 18px", flex: 1, textAlign: "center" },
    logoutBtn: { background: "none", border: "1px solid #3a2510", borderRadius: 20, padding: "4px 12px", color: "#8a7055", fontSize: 11, cursor: "pointer", fontFamily: SANS },
    dropdown: { position: "absolute", top: "100%", left: 0, right: 0, background: "#2a1a0e", border: "1px solid #4a3020", borderTop: "none", borderRadius: "0 0 10px 10px", zIndex: 50, overflow: "hidden", maxHeight: 300, overflowY: "auto" },
    dropdownItem: { padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid #3a251033" },
    vitolaCard: { background: "#2a1a0e", border: "1px solid #7a9a7a44", borderRadius: 10, marginBottom: 10, cursor: "pointer", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    sortBtn: a => ({ padding: "4px 12px", borderRadius: 20, border: `1px solid ${a ? "#c9a84c" : "#3a2510"}`, background: a ? "#c9a84c22" : "transparent", color: a ? "#c9a84c" : "#8a7055", fontSize: 11, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }),
  };

  if (authLoading) return (
    <div style={{ background: "#1a0f08", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#c9a84c", fontFamily: SANS, fontSize: 16, letterSpacing: 2 }}>
      Loading...
    </div>
  );

  if (!user) return <Auth onLogin={() => supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user))} />;

  if (selected) {
    const c = selected;
    return (
      <div style={{ ...s.app, overflowY: "auto" }}>
        <div style={{ position: "relative", height: 220 }}>
          <img src={imgErrors[c.id] ? fallbackImg() : c.img || fallbackImg()} onError={() => setImgErrors(p => ({ ...p, [c.id]: true }))} alt={c.line} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, #1a0f0844 0%, #1a0f08 100%)" }} />
          <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 16, left: 16, background: "#1a0f08bb", border: "1px solid #3a2510", color: "#c9a84c", fontSize: 12, cursor: "pointer", padding: "6px 12px", borderRadius: 20, fontFamily: SANS }}>← Back</button>
          {c.smoked && <div style={{ position: "absolute", top: 16, right: 16, background: "#c9a84cdd", color: "#1a0f08", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>✓ SMOKED</div>}
        </div>
        <div style={{ padding: "0 20px 30px" }}>
          <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, textTransform: "uppercase", marginTop: 16 }}>{c.brand}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#e8d5b7", margin: "4px 0 8px" }}>{c.line}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Badge label={c.vitola} />
            <Badge label={c.strength} color={strengthColor(c.strength)} />
            <Badge label={c.origin} color="#7a9a7a" />
          </div>
          {c.rating && <><ScoreBar rating={c.rating} /><div style={{ fontSize: 11, color: "#8a7055", marginTop: 4, marginBottom: 20 }}>CRITIC SCORE</div></>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[["Wrapper", c.wrapper], ["Strength", c.strength], ["Vitola", c.vitola], ["Origin", c.origin]].map(([k, v]) => (
              <div key={k} style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 15, color: "#e8d5b7", marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
          {c.tasting_notes && (
            <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginBottom: 8 }}>TASTING NOTES</div>
              <div style={{ fontSize: 14, color: "#c8b89a", lineHeight: 1.6 }}>{c.tasting_notes}</div>
            </div>
          )}
          {c.smoked ? (
            <div style={{ background: "#2a1a0e", border: "1px solid #c9a84c44", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#c9a84c", letterSpacing: 2, marginBottom: 10 }}>YOUR REVIEW · {c.smokedDate}</div>
              <ScoreBar rating={c.userRating} />
              <div style={{ fontSize: 14, color: "#c8b89a", lineHeight: 1.6, fontStyle: "italic", marginTop: 10 }}>"{c.notes}"</div>
            </div>
          ) : (
            <button style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 14, color: "#1a0f08", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 2, fontFamily: SANS }} onClick={() => setCheckingIn(c)}>
              + LOG THIS SMOKE
            </button>
          )}
        </div>
        {checkingIn && <CheckIn cigar={checkingIn} user={user} onClose={() => setCheckingIn(null)} onSaved={() => { setCheckingIn(null); setSelected(null); refreshCheckins(); }} />}
      </div>
    );
  }

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, color: "#c9a84c", textTransform: "uppercase" }}>🚬 Ashed</div>
          <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginTop: 2 }}>CIGAR JOURNAL & COMMUNITY</div>
        </div>
        <button style={s.logoutBtn} onClick={handleLogout}>Log out</button>
      </div>

      {tab === "search" && (
        <div style={{ padding: 16 }}>
          <div style={{ position: "relative" }}>
            <input
              style={s.input}
              placeholder="Search cigars, brands, vitolas..."
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              onFocus={() => query.length >= 2 && searchResults.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />
            {showDropdown && (
              <div style={s.dropdown}>
                {searching && searchResults.length === 0 && (
                  <div style={{ padding: "12px 14px", fontSize: 12, color: "#7a9a7a" }}>Searching...</div>
                )}
                {!searching && searchResults.length === 0 && (
                  <div style={{ padding: "12px 14px", fontSize: 12, color: "#5a4535" }}>No results found</div>
                )}
                {searchResults.map((c, i) => (
                  <div key={i} style={s.dropdownItem} onMouseDown={() => handleLineSelect(c)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#e8d5b7" }}>{c.line}</div>
                        <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>{c.brand}</div>
                      </div>
                      {c.avg_rating && <span style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>{c.avg_rating}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedLine && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginBottom: 4 }}>{selectedLine.brand.toUpperCase()}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#e8d5b7", marginBottom: 4 }}>{selectedLine.line}</div>
              <div style={{ fontSize: 11, color: "#5a4535", marginBottom: 14 }}>Select a vitola to view details</div>
              {violasLoading && vitolas.length === 0 && (
                <div style={{ fontSize: 12, color: "#7a9a7a", marginBottom: 10 }}>Loading sizes...</div>
              )}
              {vitolas.map((c, i) => (
                <div key={i} style={s.vitolaCard} onClick={() => setSelected(c)}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#e8d5b7" }}>{c.vitola}</div>
                    <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>
                      {c.length_inches ? `${c.length_inches}" × ${c.ring_gauge}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {c.avg_rating && <span style={{ fontSize: 18, fontWeight: 700, color: "#c9a84c" }}>{c.avg_rating}</span>}
                    {c.strength && <Badge label={c.strength} color={strengthColor(c.strength)} />}
                  </div>
                </div>
              ))}
              {violasLoading && vitolas.length > 0 && (
                <div style={{ fontSize: 11, color: "#7a9a7a", textAlign: "center", padding: "8px 0" }}>Finding more sizes...</div>
              )}
            </div>
          )}

          {!selectedLine && !query && (
            <>
              <div style={{ fontSize: 11, color: "#5a4535", letterSpacing: 1, margin: "16px 0 10px" }}>FEATURED CIGARS</div>
              {CIGARS.map(c => (
                <div key={c.id} style={{ ...s.card, borderColor: c.smoked ? "#c9a84c33" : "#3a2510" }} onClick={() => setSelected(c)}>
                  <div style={{ display: "flex" }}>
                    <div style={{ width: 90, flexShrink: 0 }}>
                      <img src={imgErrors[c.id] ? fallbackImg() : c.img} onError={() => setImgErrors(p => ({ ...p, [c.id]: true }))} alt={c.line} style={{ width: 90, height: 90, objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>{c.brand.toUpperCase()}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7", margin: "2px 0 6px" }}>{c.line}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Badge label={c.strength} color={strengthColor(c.strength)} />
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 20, fontWeight: 700, color: "#c9a84c" }}>{c.rating}</span>
                          {c.smoked && <div style={{ fontSize: 9, color: "#c9a84c" }}>✓ SMOKED</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === "profile" && (
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: "16px 0", borderBottom: "1px solid #3a2510" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #c9a84c, #7a4a20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👤</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#e8d5b7" }}>{displayName}</div>
              <div style={{ fontSize: 12, color: "#8a7055" }}>{username ? `@${username} · ` : ""}Member since {new Date(user.created_at).getFullYear()}</div>
              <div style={{ marginTop: 6 }}><Badge label="🏅 Aficionado" color="#c9a84c" /></div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[
              ["Smoked", checkins.length],
              ["AVG RATING", checkins.length ? (checkins.reduce((a, c) => a + c.rating, 0) / checkins.length).toFixed(1) : "—"],
              ["This Year", checkins.filter(c => new Date(c.smoke_date).getFullYear() === new Date().getFullYear()).length]
            ].map(([k, v]) => (
              <div key={k} style={{ ...s.statBox, padding: "10px 8px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#c9a84c" }}>{v}</div>
                <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, marginTop: 1 }}>{k.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {checkins.length > 0 && (() => {
            // Top location
            const locCounts = checkins.reduce((acc, c) => { if (c.smoke_location) acc[c.smoke_location] = (acc[c.smoke_location] || 0) + 1; return acc; }, {});
            const topLoc = Object.entries(locCounts).sort((a, b) => b[1] - a[1])[0];

            // Top 3 cigars by rating
            const top3 = [...checkins].sort((a, b) => b.rating - a.rating).slice(0, 3);

            // Most smoked brand
            const brandCounts = checkins.reduce((acc, c) => { const b = c.cigars?.brand || c.cigar_brand; if (b) acc[b] = (acc[b] || 0) + 1; return acc; }, {});
            const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0];

            // Best rated vitola type
            const vitolaRatings = checkins.reduce((acc, c) => { const v = c.cigars?.vitola || c.cigar_vitola; if (v) { if (!acc[v]) acc[v] = []; acc[v].push(c.rating); } return acc; }, {});
            const bestVitola = Object.entries(vitolaRatings).map(([v, ratings]) => [v, ratings.reduce((a, b) => a + b, 0) / ratings.length]).sort((a, b) => b[1] - a[1])[0];

            return (
              <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                {topLoc && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #3a251033" }}>
                    <div style={{ fontSize: 11, color: "#8a7055" }}>📍 TOP LOCATION</div>
                    <div style={{ fontSize: 13, color: "#e8d5b7" }}>{topLoc[0]} <span style={{ color: "#c9a84c" }}>({topLoc[1]})</span></div>
                  </div>
                )}
                {topBrand && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #3a251033" }}>
                    <div style={{ fontSize: 11, color: "#8a7055" }}>🏆 MOST SMOKED BRAND</div>
                    <div style={{ fontSize: 13, color: "#e8d5b7" }}>{topBrand[0]} <span style={{ color: "#c9a84c" }}>({topBrand[1]})</span></div>
                  </div>
                )}
                {bestVitola && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #3a251033" }}>
                    <div style={{ fontSize: 11, color: "#8a7055" }}>🎯 FAVORITE VITOLA</div>
                    <div style={{ fontSize: 13, color: "#e8d5b7" }}>{bestVitola[0]} <span style={{ color: "#c9a84c" }}>({bestVitola[1].toFixed(1)})</span></div>
                  </div>
                )}
                {top3.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: "#8a7055", marginBottom: 8 }}>⭐ TOP RATED</div>
                    {top3.map((c, i) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: i < 2 ? 6 : 0 }}>
                        <div style={{ fontSize: 13, color: "#c8b89a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{ color: "#5a4535", marginRight: 6 }}>#{i + 1}</span>
                          {c.cigars?.brand || c.cigar_brand ? `${c.cigars?.brand || c.cigar_brand} — ` : ""}{c.cigars?.line || c.cigar_name || "Unknown"}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#c9a84c", marginLeft: 8 }}>{c.rating?.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 2, marginBottom: 10 }}>SMOKING HISTORY</div>

          {checkins.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <button
                  onClick={() => setShowFilterDrawer(true)}
                  style={{ background: activeFilterCount > 0 ? "#c9a84c22" : "none", border: `1px solid ${activeFilterCount > 0 ? "#c9a84c" : "#3a2510"}`, borderRadius: 20, padding: "6px 14px", color: activeFilterCount > 0 ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", gap: 6 }}
                >
                  🔧 Filter {activeFilterCount > 0 ? `(${activeFilterCount} active)` : ""}
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["date", "Date"], ["score", "Score"], ["name", "Name"]].map(([val, label]) => (
                    <button key={val} onClick={() => {
                      if (historySortBy === val) setHistorySortDir(d => d === "desc" ? "asc" : "desc");
                      else { setHistorySortBy(val); setHistorySortDir("desc"); }
                    }} style={s.sortBtn(historySortBy === val)}>
                      {label} {historySortBy === val ? (historySortDir === "desc" ? "↓" : "↑") : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active filter chips */}
              {activeFilterCount > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {filterName && <span style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => setFilterName("")}>Name: {filterName} ×</span>}
                  {filterBrand && <span style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => setFilterBrand("")}>Brand: {filterBrand} ×</span>}
                  {filterNoteTags.map(tag => <span key={tag} style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => setFilterNoteTags(prev => prev.filter(t => t !== tag))}>{tag} ×</span>)}
                  {(filterScoreMin > 0 || filterScoreMax < 10) && <span style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => { setFilterScoreMin(0); setFilterScoreMax(10); }}>Score: {filterScoreMin}–{filterScoreMax} ×</span>}
                  <span style={{ background: "#3a2510", color: "#8a7055", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => { setFilterName(""); setFilterBrand(""); setFilterNoteTags([]); setFilterScoreMin(0); setFilterScoreMax(10); }}>Clear all</span>
                </div>
              )}
            </div>
          )}

          {/* Filter Drawer */}
          {showFilterDrawer && (
            <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: 420, margin: "0 auto" }}>
              <div style={{ position: "absolute", inset: 0, background: "#00000088" }} onClick={() => setShowFilterDrawer(false)} />
              <div style={{ position: "relative", background: "#1a0f08", borderRadius: "20px 20px 0 0", border: "1px solid #3a2510", padding: 24, zIndex: 1, maxHeight: "80vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7" }}>Filter Smoke History</div>
                  <button onClick={() => setShowFilterDrawer(false)} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 22, cursor: "pointer" }}>×</button>
                </div>

                {/* Name */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 6 }}>CIGAR NAME</div>
                  <input
                    style={{ width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: filterNameOpen && filteredNames.length > 0 ? "8px 8px 0 0" : "8px", padding: "8px 12px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
                    placeholder="Search your smokes..."
                    value={filterName}
                    onChange={e => { setFilterName(e.target.value); setFilterNameOpen(true); }}
                    onFocus={() => setFilterNameOpen(true)}
                    onBlur={() => setTimeout(() => setFilterNameOpen(false), 150)}
                  />
                  {filterNameOpen && (
                    <div style={{ background: "#2a1a0e", border: "1px solid #4a3020", borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 150, overflowY: "auto" }}>
                      {filteredNames.length === 0 ? (
                        <div style={{ padding: "10px 12px", fontSize: 12, color: "#5a4535" }}>No logged smokes found</div>
                      ) : filteredNames.map(n => (
                        <div key={n} style={{ padding: "10px 12px", fontSize: 13, color: "#e8d5b7", cursor: "pointer", borderBottom: "1px solid #3a251033" }} onMouseDown={() => { setFilterName(n); setFilterNameOpen(false); }}>{n}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Brand */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 6 }}>BRAND</div>
                  <input
                    style={{ width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: filterBrandOpen && filteredBrands.length > 0 ? "8px 8px 0 0" : "8px", padding: "8px 12px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
                    placeholder="Search your brands..."
                    value={filterBrand}
                    onChange={e => { setFilterBrand(e.target.value); setFilterBrandOpen(true); }}
                    onFocus={() => setFilterBrandOpen(true)}
                    onBlur={() => setTimeout(() => setFilterBrandOpen(false), 150)}
                  />
                  {filterBrandOpen && (
                    <div style={{ background: "#2a1a0e", border: "1px solid #4a3020", borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 150, overflowY: "auto" }}>
                      {filteredBrands.length === 0 ? (
                        <div style={{ padding: "10px 12px", fontSize: 12, color: "#5a4535" }}>No logged smokes found</div>
                      ) : filteredBrands.map(b => (
                        <div key={b} style={{ padding: "10px 12px", fontSize: 13, color: "#e8d5b7", cursor: "pointer", borderBottom: "1px solid #3a251033" }} onMouseDown={() => { setFilterBrand(b); setFilterBrandOpen(false); }}>{b}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tasting Notes Tags */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>TASTING NOTES</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {FLAVOR_TAGS.map(tag => (
                      <button key={tag} onClick={() => setFilterNoteTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${filterNoteTags.includes(tag) ? "#c9a84c" : "#3a2510"}`, background: filterNoteTags.includes(tag) ? "#c9a84c22" : "transparent", color: filterNoteTags.includes(tag) ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>{tag}</button>
                    ))}
                  </div>
                </div>

                {/* Score Range */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 12 }}>SCORE RANGE</div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "#8a7055", marginBottom: 4 }}>MINIMUM: <span style={{ color: "#c9a84c", fontWeight: 700 }}>{filterScoreMin.toFixed(1)}</span></div>
                      <input type="range" min={0} max={10} step={0.5} value={filterScoreMin} onChange={e => setFilterScoreMin(Math.min(parseFloat(e.target.value), filterScoreMax - 0.5))} style={{ width: "100%", accentColor: "#c9a84c" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5a4535", marginTop: 2 }}>
                        <span>0</span><span>10</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "#8a7055", marginBottom: 4 }}>MAXIMUM: <span style={{ color: "#c9a84c", fontWeight: 700 }}>{filterScoreMax.toFixed(1)}</span></div>
                      <input type="range" min={0} max={10} step={0.5} value={filterScoreMax} onChange={e => setFilterScoreMax(Math.max(parseFloat(e.target.value), filterScoreMin + 0.5))} style={{ width: "100%", accentColor: "#c9a84c" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5a4535", marginTop: 2 }}>
                        <span>0</span><span>10</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowFilterDrawer(false)} style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 14, color: "#1a0f08", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {profileLoading && <div style={{ fontSize: 12, color: "#7a9a7a", textAlign: "center", padding: 20 }}>Loading...</div>}
          {!profileLoading && checkins.length === 0 && (
            <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: 30 }}>No smokes logged yet — find a cigar and tap Log This Smoke!</div>
          )}

          {(() => {
            const filtered = checkins.filter(c => {
              const brand = (c.cigars?.brand || c.cigar_brand || "").toLowerCase();
              const line = (c.cigars?.line || c.cigar_name || "").toLowerCase();
              const notes = (c.tasting_notes || "").toLowerCase();
              if (filterName && !line.includes(filterName.toLowerCase())) return false;
              if (filterBrand && !brand.includes(filterBrand.toLowerCase())) return false;
              if (filterNoteTags.length > 0 && !filterNoteTags.every(tag => notes.includes(tag.toLowerCase()))) return false;
              if (c.rating < filterScoreMin || c.rating > filterScoreMax) return false;
              return true;
            });
            const sorted = [...filtered].sort((a, b) => {
              let val = 0;
              if (historySortBy === "score") val = b.rating - a.rating;
              else if (historySortBy === "name") val = (a.cigars?.line || a.cigar_name || "").localeCompare(b.cigars?.line || b.cigar_name || "");
              else val = new Date(b.smoke_date) - new Date(a.smoke_date);
              return historySortDir === "asc" ? -val : val;
            });
            return sorted.map(c => {
              const brand = c.cigars?.brand || c.cigar_brand || "Unknown";
              const line = c.cigars?.line || c.cigar_name || "Unknown Cigar";
              const vitola = c.cigars?.vitola || c.cigar_vitola || "";
              return (
                <div key={c.id} style={{ ...s.card, borderColor: "#c9a84c33" }} onClick={() => handleSelectCheckin(c)}>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: "#8a7055" }}>{new Date(c.smoke_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", margin: "2px 0 2px" }}>{line}</div>
                        <div style={{ fontSize: 11, color: "#8a7055" }}>{brand}{vitola ? ` · ${vitola}` : ""}{c.smoke_location ? ` · ${c.smoke_location}` : ""}</div>
                        {c.tasting_notes && <div style={{ fontSize: 12, color: "#c8b89a", fontStyle: "italic", marginTop: 6 }}>"{c.tasting_notes}"</div>}
                      </div>
                      <div style={{ textAlign: "right", marginLeft: 12 }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: "#c9a84c" }}>{c.rating?.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}

          {selectedCheckin && (
            <div style={{ position: "fixed", inset: 0, background: "#1a0f08", zIndex: 300, overflowY: "auto", maxWidth: 420, margin: "0 auto", fontFamily: SANS, color: "#e8d5b7" }}>
              <div style={{ background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "16px 20px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2 }}>{selectedCheckin.cigars?.brand || selectedCheckin.cigar_brand || "Unknown"}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#e8d5b7" }}>{selectedCheckin.cigars?.line || selectedCheckin.cigar_name || "Unknown Cigar"}</div>
                  <div style={{ fontSize: 12, color: "#8a7055" }}>{selectedCheckin.cigars?.vitola || selectedCheckin.cigar_vitola || ""}</div>
                </div>
                <button onClick={() => setSelectedCheckin(null)} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 24, cursor: "pointer" }}>×</button>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#8a7055" }}>DATE</div>
                    <div style={{ fontSize: 14, color: "#e8d5b7" }}>{new Date(selectedCheckin.smoke_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                  </div>
                  {selectedCheckin.smoke_location && <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#8a7055" }}>LOCATION</div>
                    <div style={{ fontSize: 14, color: "#e8d5b7" }}>{selectedCheckin.smoke_location}</div>
                  </div>}
                </div>

                <div style={{ fontSize: 56, fontWeight: 700, color: "#c9a84c", textAlign: "center", marginBottom: 4 }}>{selectedCheckin.rating?.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: "#8a7055", textAlign: "center", marginBottom: 20 }}>OVERALL SCORE</div>

                {checkinRating && (
                  <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginBottom: 12 }}>DETAILED RATINGS</div>
                    {[["Aroma", checkinRating.aroma], ["Draw", checkinRating.draw], ["Burn", checkinRating.burn], ["Construction", checkinRating.construction], ["Flavor", checkinRating.flavor], ["Finish", checkinRating.finish]].map(([label, val]) => val != null && (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 13, color: "#c8b89a" }}>{label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 80, height: 5, background: "#3a2510", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${(val / 10) * 100}%`, height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 13, color: "#c9a84c", fontWeight: 700, minWidth: 28, textAlign: "right" }}>{val?.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                    {checkinRating.would_smoke_again != null && (
                      <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid #3a251033" }}>
                        <span style={{ fontSize: 12, color: "#8a7055" }}>Would smoke again: </span>
                        <span style={{ fontSize: 12, color: checkinRating.would_smoke_again ? "#7a9a7a" : "#a0522d" }}>{checkinRating.would_smoke_again ? "Yes" : "No"}</span>
                      </div>
                    )}
                    {checkinRating.value_for_price && (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontSize: 12, color: "#8a7055" }}>Value: </span>
                        <span style={{ fontSize: 12, color: "#e8d5b7" }}>{checkinRating.value_for_price}</span>
                      </div>
                    )}
                    {checkinRating.flavor_tags && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: "#8a7055", marginBottom: 6 }}>FLAVOR TAGS</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {checkinRating.flavor_tags.split(", ").map(tag => (
                            <span key={tag} style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11 }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedCheckin.tasting_notes && (
                  <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginBottom: 8 }}>TASTING NOTES</div>
                    <div style={{ fontSize: 14, color: "#c8b89a", fontStyle: "italic", lineHeight: 1.6 }}>"{selectedCheckin.tasting_notes}"</div>
                  </div>
                )}

                <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#e8d5b7" }}>Private check-in</div>
                      <div style={{ fontSize: 12, color: "#5a4535", marginTop: 2 }}>{selectedCheckin.is_private ? "Only visible to you" : "Visible to everyone"}</div>
                    </div>
                    <div onClick={() => handleTogglePrivate(selectedCheckin)} style={{ width: 44, height: 24, borderRadius: 12, background: selectedCheckin.is_private ? "#c9a84c" : "#3a2510", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", top: 2, left: selectedCheckin.is_private ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#e8d5b7", transition: "left 0.2s" }} />
                    </div>
                  </div>
                </div>

                <button onClick={() => handleDeleteCheckin(selectedCheckin)} style={{ width: "100%", background: "none", border: "1px solid #a0522d55", borderRadius: 10, padding: 14, color: "#a0522d", fontSize: 14, cursor: "pointer", fontFamily: SANS, marginTop: 12 }}>
                  Delete this check-in
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {checkingIn && <CheckIn cigar={checkingIn} user={user} onClose={() => setCheckingIn(null)} onSaved={() => { setCheckingIn(null); refreshCheckins(); }} />}
      <nav style={s.nav}>
        {[["search", "🔍", "Explore"], ["profile", "👤", displayName]].map(([id, icon, label]) => (
          <button key={id} style={s.navBtn(tab === id)} onClick={() => setTab(id)}>{icon} {label}</button>
        ))}
      </nav>
    </div>
  );
}
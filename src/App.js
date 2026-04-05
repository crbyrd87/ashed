import React, { useState, useEffect, useRef } from "react";
import Auth from "./Auth";
import { supabase } from "./supabase";
import { searchCigarLines, getVitolas } from "./cigarAI";
import CheckIn from "./CheckIn";
import BandScanner from "./BandScanner";

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

const CIGAR_ICONS = [
  // 1. Classic cigar with band and smoke
  (
    <svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" style={{ width: 90, height: 90, background: "#2a1a0e" }}>
      <rect x="8" y="38" width="62" height="14" rx="7" fill="#5a3520" />
      <rect x="8" y="40" width="57" height="10" rx="5" fill="#7a4a28" />
      <rect x="52" y="38" width="14" height="14" rx="2" fill="#c9a84c" opacity="0.9" />
      <rect x="54" y="40" width="10" height="10" rx="1" fill="#1a0f08" opacity="0.3" />
      <rect x="66" y="39" width="14" height="12" rx="6" fill="#a0522d" />
      <path d="M72 38 Q74 30 71 22 Q73 28 76 20 Q75 30 78 36" stroke="#ccc" strokeWidth="1" fill="none" opacity="0.3" />
    </svg>
  ),
  // 2. Cigar in ashtray view
  (
    <svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" style={{ width: 90, height: 90, background: "#2a1a0e" }}>
      <ellipse cx="45" cy="62" rx="32" ry="10" fill="#3a2510" />
      <ellipse cx="45" cy="60" rx="30" ry="8" fill="#2a1a0e" stroke="#5a3520" strokeWidth="1.5" />
      <rect x="20" y="42" width="50" height="12" rx="6" fill="#5a3520" transform="rotate(-8 45 48)" />
      <rect x="20" y="43" width="44" height="9" rx="5" fill="#7a4a28" transform="rotate(-8 45 48)" />
      <rect x="56" y="40" width="12" height="12" rx="2" fill="#c9a84c" opacity="0.9" transform="rotate(-8 45 48)" />
      <path d="M67 36 Q70 26 67 18" stroke="#ddd" strokeWidth="1.2" fill="none" opacity="0.25" />
    </svg>
  ),
  // 3. Cigar with ribbon/ring close-up
  (
    <svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" style={{ width: 90, height: 90, background: "#2a1a0e" }}>
      <rect x="6" y="36" width="66" height="18" rx="9" fill="#4a2a18" />
      <rect x="6" y="38" width="60" height="14" rx="7" fill="#6a3a22" />
      <rect x="6" y="40" width="55" height="10" rx="5" fill="#8a4a28" />
      <rect x="30" y="36" width="20" height="18" fill="#c9a84c" opacity="0.95" />
      <rect x="32" y="38" width="16" height="14" fill="#1a0f08" opacity="0.15" />
      <line x1="30" y1="36" x2="30" y2="54" stroke="#a07820" strokeWidth="0.5" />
      <line x1="50" y1="36" x2="50" y2="54" stroke="#a07820" strokeWidth="0.5" />
      <text x="40" y="48" textAnchor="middle" fontSize="5" fill="#c9a84c" fontWeight="bold" opacity="0.6">ASHED</text>
      <rect x="66" y="37" width="16" height="16" rx="8" fill="#7a4a28" />
    </svg>
  ),
  // 4. Two cigars crossed
  (
    <svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" style={{ width: 90, height: 90, background: "#2a1a0e" }}>
      <rect x="10" y="30" width="55" height="11" rx="5.5" fill="#5a3520" transform="rotate(15 37 35)" />
      <rect x="10" y="31" width="50" height="8" rx="4" fill="#7a4a28" transform="rotate(15 37 35)" />
      <rect x="56" y="29" width="12" height="11" rx="2" fill="#c9a84c" opacity="0.9" transform="rotate(15 37 35)" />
      <rect x="10" y="48" width="55" height="11" rx="5.5" fill="#4a2510" transform="rotate(-15 37 53)" />
      <rect x="10" y="49" width="50" height="8" rx="4" fill="#6a3820" transform="rotate(-15 37 53)" />
      <rect x="56" y="47" width="12" height="11" rx="2" fill="#a07830" opacity="0.9" transform="rotate(-15 37 53)" />
      <path d="M68 22 Q71 16 69 10" stroke="#ccc" strokeWidth="1" fill="none" opacity="0.2" />
    </svg>
  ),
  // 5. Lit cigar end glow
  (
    <svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" style={{ width: 90, height: 90, background: "#2a1a0e" }}>
      <rect x="8" y="38" width="58" height="14" rx="7" fill="#5a3520" />
      <rect x="8" y="40" width="53" height="10" rx="5" fill="#7a4a28" />
      <rect x="44" y="38" width="14" height="14" rx="2" fill="#c9a84c" opacity="0.9" />
      <circle cx="66" cy="45" r="10" fill="#c9a84c" opacity="0.08" />
      <circle cx="66" cy="45" r="7" fill="#c9a84c" opacity="0.1" />
      <rect x="60" y="39" width="14" height="12" rx="6" fill="#e8632a" />
      <rect x="61" y="40" width="12" height="10" rx="5" fill="#f08030" />
      <circle cx="66" cy="45" r="4" fill="#ffc060" opacity="0.8" />
      <path d="M67 36 Q72 26 68 16 Q71 24 75 18 Q73 28 76 36" stroke="#e8d5b7" strokeWidth="1" fill="none" opacity="0.2" />
    </svg>
  ),
];

const CigarIcon = ({ index }) => CIGAR_ICONS[index % CIGAR_ICONS.length];

const LoungeScene = () => (
  <svg viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
    {/* Background - warm dark lounge */}
    <rect width="420" height="220" fill="#1a0d06" />
    {/* Back wall wood paneling */}
    <rect x="0" y="0" width="420" height="140" fill="#2a1508" />
    <rect x="0" y="0" width="420" height="3" fill="#c9a84c" opacity="0.3" />
    {/* Wood panel lines */}
    {[60,120,180,240,300,360].map(x => (
      <line key={x} x1={x} y1="0" x2={x} y2="140" stroke="#1a0d06" strokeWidth="1.5" opacity="0.5" />
    ))}
    {/* Ambient ceiling light glow */}
    <ellipse cx="210" cy="0" rx="160" ry="60" fill="#c9a84c" opacity="0.06" />
    {/* Table */}
    <ellipse cx="210" cy="175" rx="100" ry="22" fill="#3a1e0a" />
    <ellipse cx="210" cy="172" rx="98" ry="20" fill="#4a2810" />
    <rect x="112" y="172" width="196" height="8" fill="#5a3418" />
    {/* Table leg */}
    <rect x="200" y="180" width="20" height="40" fill="#3a1e0a" />
    {/* Ashtray */}
    <ellipse cx="210" cy="170" rx="28" ry="8" fill="#2a1508" />
    <ellipse cx="210" cy="168" rx="25" ry="6" fill="#221006" stroke="#5a3510" strokeWidth="1" />
    {/* Resting cigar in ashtray */}
    <rect x="188" y="165" width="44" height="6" rx="3" fill="#5a3520" transform="rotate(-5 210 168)" />
    <rect x="188" y="166" width="39" height="4" rx="2" fill="#7a4a28" transform="rotate(-5 210 168)" />
    <rect x="224" y="164" width="8" height="6" rx="1" fill="#c9a84c" opacity="0.8" transform="rotate(-5 210 168)" />
    {/* Cigar smoke from ashtray */}
    <path d="M232 162 Q235 150 231 138 Q234 148 238 140 Q236 152 239 160" stroke="#e8d5b7" strokeWidth="1.2" fill="none" opacity="0.12" />
    {/* Woman - left side */}
    {/* Body/dress */}
    <ellipse cx="120" cy="200" rx="38" ry="50" fill="#1a0d06" />
    <path d="M85 155 Q90 120 120 115 Q150 120 155 155 Q145 160 120 162 Q95 160 85 155Z" fill="#3a1e2e" />
    {/* Woman head */}
    <circle cx="120" cy="100" r="22" fill="#c8a882" />
    {/* Hair */}
    <ellipse cx="120" cy="88" rx="22" ry="14" fill="#2a1508" />
    <path d="M98 100 Q94 120 96 135" stroke="#2a1508" strokeWidth="8" fill="none" strokeLinecap="round" />
    <path d="M142 100 Q146 120 144 135" stroke="#2a1508" strokeWidth="8" fill="none" strokeLinecap="round" />
    {/* Woman face */}
    <circle cx="113" cy="102" r="2.5" fill="#5a3020" />
    <circle cx="127" cy="102" r="2.5" fill="#5a3020" />
    <path d="M114 112 Q120 116 126 112" stroke="#c87060" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* Woman arm holding cigar */}
    <path d="M148 135 Q165 148 172 155" stroke="#c8a882" strokeWidth="8" fill="none" strokeLinecap="round" />
    {/* Woman's cigar */}
    <rect x="168" y="150" width="30" height="5" rx="2.5" fill="#7a4a28" transform="rotate(20 183 152)" />
    <rect x="194" y="149" width="6" height="5" rx="1" fill="#c9a84c" opacity="0.8" transform="rotate(20 183 152)" />
    {/* Woman cigar smoke */}
    <path d="M200 144 Q204 132 200 120 Q204 130 208 122 Q205 134 208 142" stroke="#e8d5b7" strokeWidth="1" fill="none" opacity="0.15" />
    {/* Man - right side */}
    {/* Body/suit */}
    <path d="M265 155 Q270 118 300 114 Q330 118 335 155 Q322 162 300 163 Q278 162 265 155Z" fill="#1a1a2a" />
    {/* Suit lapels */}
    <path d="M290 114 L282 145 L300 138Z" fill="#2a2a3a" />
    <path d="M310 114 L318 145 L300 138Z" fill="#2a2a3a" />
    {/* Tie */}
    <path d="M297 118 L300 140 L303 118Z" fill="#8a2020" />
    {/* Man head */}
    <circle cx="300" cy="98" r="24" fill="#b08060" />
    {/* Hair */}
    <ellipse cx="300" cy="82" rx="24" ry="12" fill="#1a1008" />
    {/* Man face */}
    <circle cx="292" cy="100" r="2.5" fill="#3a2010" />
    <circle cx="308" cy="100" r="2.5" fill="#3a2010" />
    <path d="M292 110 Q300 114 308 110" stroke="#8a5040" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* Man mustache */}
    <path d="M294 107 Q300 110 306 107" stroke="#2a1508" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Man arm */}
    <path d="M265 138 Q248 148 242 156" stroke="#b08060" strokeWidth="9" fill="none" strokeLinecap="round" />
    {/* Man's cigar */}
    <rect x="210" y="152" width="34" height="6" rx="3" fill="#6a3a20" transform="rotate(-15 227 155)" />
    <rect x="210" y="153" width="29" height="4" rx="2" fill="#8a4a28" transform="rotate(-15 227 155)" />
    <rect x="208" y="151" width="8" height="6" rx="1" fill="#c9a84c" opacity="0.8" transform="rotate(-15 227 155)" />
    {/* Lit end glow */}
    <circle cx="213" cy="157" r="5" fill="#e8632a" opacity="0.6" />
    <circle cx="213" cy="157" r="3" fill="#ffc060" opacity="0.5" />
    {/* Man cigar smoke */}
    <path d="M211 150 Q207 138 211 124 Q207 136 203 126 Q206 138 203 148" stroke="#e8d5b7" strokeWidth="1.2" fill="none" opacity="0.18" />
    {/* Whiskey glasses */}
    <rect x="165" y="152" width="16" height="18" rx="2" fill="#c9a84c" opacity="0.25" />
    <rect x="166" y="153" width="14" height="6" fill="#c9a84c" opacity="0.3" />
    <rect x="242" y="152" width="16" height="18" rx="2" fill="#c9a84c" opacity="0.25" />
    <rect x="243" y="153" width="14" height="6" fill="#c9a84c" opacity="0.3" />
    {/* Warm light overlay at bottom */}
    <rect x="0" y="140" width="420" height="80" fill="#3a1e0a" opacity="0.4" />
    {/* Gradient overlay for text readability */}
    <rect x="0" y="100" width="420" height="120" fill="url(#fadeDown)" opacity="0.5" />
    <defs>
      <linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1a0d06" stopOpacity="0" />
        <stop offset="100%" stopColor="#1a0d06" stopOpacity="1" />
      </linearGradient>
    </defs>
  </svg>
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
  const [showBandScanner, setShowBandScanner] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistFilterBrand, setWishlistFilterBrand] = useState("");
  const [wishlistFilterStrength, setWishlistFilterStrength] = useState([]);
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
  const [filterValue, setFilterValue] = useState([]);
  const [filterWouldSmoke, setFilterWouldSmoke] = useState([]);

  const activeFilterCount = [
    filterName, filterBrand,
    filterNoteTags.length > 0 ? "tags" : "",
    filterScoreMin > 0 || filterScoreMax < 10 ? "score" : "",
    filterValue.length > 0 ? "value" : "",
    filterWouldSmoke.length > 0 ? "smoke" : "",
  ].filter(Boolean).length;
  const [featuredCigars, setFeaturedCigars] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
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
    const loadFeatured = async () => {
      setFeaturedLoading(true);
      const { data: cached } = await supabase
        .from("cigars")
        .select("*")
        .order("total_checkins", { ascending: false })
        .limit(20);

      // Deduplicate by brand+line, keeping highest total_checkins entry
      const dedupe = (rows) => {
        const seen = new Map();
        for (const row of (rows || [])) {
          const key = `${row.brand}|${row.line}`;
          if (!seen.has(key)) seen.set(key, row);
        }
        return Array.from(seen.values()).slice(0, 5);
      };

      const deduped = dedupe(cached);
      if (deduped.length >= 5) {
        setFeaturedCigars(deduped);
        setFeaturedLoading(false);
        return;
      }
      const KEY = process.env.REACT_APP_ANTHROPIC_KEY;
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            messages: [{ role: "user", content: `List 5 world-famous premium cigars that every enthusiast should know. Return ONLY a raw JSON array:\n[{"brand":"","line":"","vitola":"","wrapper":"","origin":"","strength":"Light|Medium|Medium-Full|Full","tasting_notes":"","description":""}]` }]
          })
        });
        const d = await res.json();
        const raw = d.content?.[0]?.text || "[]";
        const match = raw.match(/\[[\s\S]*\]/);
        const cigars = match ? JSON.parse(match[0]) : [];
        for (const c of cigars) {
          const { data: existing } = await supabase.from("cigars").select("*").eq("brand", c.brand).eq("line", c.line).maybeSingle();
          if (!existing) await supabase.from("cigars").insert({ ...c, ai_generated: true, verified: false, total_checkins: 0 });
        }
        const { data: fresh } = await supabase.from("cigars").select("*").order("total_checkins", { ascending: false }).limit(20);
        setFeaturedCigars(dedupe(fresh) || cigars);
      } catch (e) { console.error(e); }
      setFeaturedLoading(false);
    };
    loadFeatured();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchCheckins = async () => {
      setProfileLoading(true);
      const { data } = await supabase
        .from("checkins")
        .select("*, cigars(brand, line, vitola, strength, origin, avg_rating), ratings(value_for_price, would_smoke_again)")
        .eq("user_id", user.id)
        .order("smoke_date", { ascending: false });
      setCheckins(data || []);
      setProfileLoading(false);
    };
    fetchCheckins();

    // Fetch wishlist inline to avoid dependency warning
    const loadWishlist = async () => {
      setWishlistLoading(true);
      const { data: wData } = await supabase
        .from("wishlist")
        .select("*, cigars(brand, line, vitola, strength, origin, avg_rating)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setWishlist(wData || []);
      setWishlistLoading(false);
    };
    loadWishlist();
  }, [user]);

  const refreshCheckins = async () => {
    const { data } = await supabase
      .from("checkins")
      .select("*, cigars(brand, line, vitola, strength, origin, avg_rating), ratings(value_for_price, would_smoke_again)")
      .eq("user_id", user.id)
      .order("smoke_date", { ascending: false });
    setCheckins(data || []);
  };

  const fetchWishlist = async () => {
    setWishlistLoading(true);
    const { data } = await supabase
      .from("wishlist")
      .select("*, cigars(brand, line, vitola, strength, origin, avg_rating)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setWishlist(data || []);
    setWishlistLoading(false);
  };

  const handleAddToWishlist = async (cigar) => {
    const isRealCigar = cigar.id && !([1,2,3,4,5,6,7,8].includes(cigar.id));
    const { data: existing } = await supabase
      .from("wishlist")
      .select("id")
      .eq("user_id", user.id)
      .eq(isRealCigar ? "cigar_id" : "cigar_name", isRealCigar ? cigar.id : (cigar.line || cigar.cigar_name))
      .maybeSingle();
    if (existing) return; // already on wishlist
    await supabase.from("wishlist").insert({
      user_id: user.id,
      cigar_id: isRealCigar ? cigar.id : null,
      cigar_name: cigar.line || cigar.cigar_name || null,
      cigar_brand: cigar.brand || cigar.cigar_brand || null,
      cigar_vitola: cigar.vitola || cigar.cigar_vitola || null,
    });
    fetchWishlist();
  };

  const handleRemoveFromWishlist = async (id) => {
    await supabase.from("wishlist").delete().eq("id", id);
    setWishlist(prev => prev.filter(w => w.id !== id));
  };

  const isOnWishlist = (cigar) => {
    const isRealCigar = cigar.id && !([1,2,3,4,5,6,7,8].includes(cigar.id));
    if (isRealCigar) return wishlist.some(w => w.cigar_id === cigar.id);
    return wishlist.some(w => w.cigar_name === (cigar.line || cigar.cigar_name));
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


  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Profile";
  const username = user?.user_metadata?.username ? user.user_metadata.username.replace(/^@/, "") : null;

  const s = {
    app: { fontFamily: SANS, background: "#1a0f08", minHeight: "100vh", color: "#e8d5b7", maxWidth: 420, margin: "0 auto", paddingBottom: 70 },
    header: { background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "20px 20px 12px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center" },
    nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "#1a0f08", borderTop: "1px solid #3a2510", display: "flex", justifyContent: "center", alignItems: "center", gap: 40, zIndex: 100 },
    navBtn: a => ({ padding: "12px 0", background: "none", border: "none", color: a ? "#c9a84c" : "#5a4535", fontSize: 11, letterSpacing: 1, cursor: "pointer", fontFamily: SANS, textTransform: "uppercase", fontWeight: a ? 700 : 400, whiteSpace: "nowrap" }),
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
          {c.img && !imgErrors[c.id]
            ? <img src={c.img} onError={() => setImgErrors(p => ({ ...p, [c.id]: true }))} alt={c.line} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%" }}><LoungeScene /></div>
          }
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
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 14, color: "#1a0f08", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 2, fontFamily: SANS }} onClick={() => setCheckingIn(c)}>
                + LOG THIS SMOKE
              </button>
              <button
                onClick={() => handleAddToWishlist(c)}
                style={{ width: "100%", background: isOnWishlist(c) ? "#c9a84c22" : "none", border: `1px solid ${isOnWishlist(c) ? "#c9a84c" : "#3a2510"}`, borderRadius: 10, padding: 14, color: isOnWishlist(c) ? "#c9a84c" : "#8a7055", fontSize: 14, cursor: isOnWishlist(c) ? "default" : "pointer", fontFamily: SANS }}
              >
                {isOnWishlist(c) ? "✓ On Your Wishlist" : "+ Add to Wishlist"}
              </button>
            </div>
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
              placeholder="Search by cigar name or brand..."
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

          {/* Scan Band button — shown when no search active */}
          {!query && !selectedLine && (
            <button
              onClick={() => setShowBandScanner(true)}
              style={{ width: "100%", background: "#2a1a0e", border: "1px solid #c9a84c55", borderRadius: 10, padding: 14, color: "#c9a84c", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: SANS, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              📷 Scan a Cigar Band
            </button>
          )}

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
              {featuredLoading && <div style={{ fontSize: 12, color: "#7a9a7a", textAlign: "center", padding: 20 }}>Loading featured cigars...</div>}
              {featuredCigars.map((c, i) => (
                <div key={c.id || i} style={{ ...s.card, borderColor: "#3a2510" }} onClick={() => setSelected(c)}>
                  <div style={{ display: "flex" }}>
                    <div style={{ width: 90, flexShrink: 0 }}><CigarIcon index={i} /></div>
                    <div style={{ flex: 1, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>{c.brand?.toUpperCase()}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7", margin: "2px 0 6px" }}>{c.line}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Badge label={c.strength} color={strengthColor(c.strength)} />
                        <div style={{ textAlign: "right" }}>
                          {c.avg_rating
                            ? <span style={{ fontSize: 20, fontWeight: 700, color: "#c9a84c" }}>{c.avg_rating}</span>
                            : <span style={{ fontSize: 11, color: "#5a4535" }}>Not Rated</span>}
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
            const locCounts = checkins.reduce((acc, c) => { if (c.smoke_location) acc[c.smoke_location] = (acc[c.smoke_location] || 0) + 1; return acc; }, {});
            const topLoc = Object.entries(locCounts).sort((a, b) => b[1] - a[1])[0];
            const top3 = [...checkins].sort((a, b) => b.rating - a.rating).slice(0, 3);
            const brandCounts = checkins.reduce((acc, c) => { const b = c.cigars?.brand || c.cigar_brand; if (b) acc[b] = (acc[b] || 0) + 1; return acc; }, {});
            const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0];
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

              {activeFilterCount > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {filterName && <span style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => setFilterName("")}>Name: {filterName} ×</span>}
                  {filterBrand && <span style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => setFilterBrand("")}>Brand: {filterBrand} ×</span>}
                  {filterNoteTags.map(tag => <span key={tag} style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => setFilterNoteTags(prev => prev.filter(t => t !== tag))}>{tag} ×</span>)}
                  {(filterScoreMin > 0 || filterScoreMax < 10) && <span style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => { setFilterScoreMin(0); setFilterScoreMax(10); }}>Score: {filterScoreMin}–{filterScoreMax} ×</span>}
                  {filterValue.length > 0 && <span style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => setFilterValue([])}>Value: {filterValue.join(", ")} ×</span>}
                  {filterWouldSmoke.length > 0 && <span style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => setFilterWouldSmoke([])}>Smoke Again: {filterWouldSmoke.join(", ")} ×</span>}
                  <span style={{ background: "#3a2510", color: "#8a7055", borderRadius: 20, padding: "2px 10px", fontSize: 11, cursor: "pointer" }} onClick={() => { setFilterName(""); setFilterBrand(""); setFilterNoteTags([]); setFilterScoreMin(0); setFilterScoreMax(10); setFilterValue([]); setFilterWouldSmoke([]); }}>Clear all</span>
                </div>
              )}
            </div>
          )}

          {showFilterDrawer && (
            <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: 420, margin: "0 auto" }}>
              <div style={{ position: "absolute", inset: 0, background: "#00000088" }} onClick={() => setShowFilterDrawer(false)} />
              <div style={{ position: "relative", background: "#1a0f08", borderRadius: "20px 20px 0 0", border: "1px solid #3a2510", padding: 24, zIndex: 1, maxHeight: "80vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7" }}>Filter Smoke History</div>
                  <button onClick={() => setShowFilterDrawer(false)} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 22, cursor: "pointer" }}>×</button>
                </div>

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

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>TASTING NOTES</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {FLAVOR_TAGS.map(tag => (
                      <button key={tag} onClick={() => setFilterNoteTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${filterNoteTags.includes(tag) ? "#c9a84c" : "#3a2510"}`, background: filterNoteTags.includes(tag) ? "#c9a84c22" : "transparent", color: filterNoteTags.includes(tag) ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>{tag}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 12 }}>SCORE RANGE</div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "#8a7055", marginBottom: 4 }}>MINIMUM: <span style={{ color: "#c9a84c", fontWeight: 700 }}>{filterScoreMin.toFixed(1)}</span></div>
                      <input type="range" min={0} max={10} step={0.5} value={filterScoreMin} onChange={e => setFilterScoreMin(Math.min(parseFloat(e.target.value), filterScoreMax - 0.5))} style={{ width: "100%", accentColor: "#c9a84c" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5a4535", marginTop: 2 }}><span>0</span><span>10</span></div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "#8a7055", marginBottom: 4 }}>MAXIMUM: <span style={{ color: "#c9a84c", fontWeight: 700 }}>{filterScoreMax.toFixed(1)}</span></div>
                      <input type="range" min={0} max={10} step={0.5} value={filterScoreMax} onChange={e => setFilterScoreMax(Math.max(parseFloat(e.target.value), filterScoreMin + 0.5))} style={{ width: "100%", accentColor: "#c9a84c" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5a4535", marginTop: 2 }}><span>0</span><span>10</span></div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>VALUE FOR PRICE</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["Good value", "OK value", "Poor value"].map(opt => (
                      <button key={opt} onClick={() => setFilterValue(prev => prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt])} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${filterValue.includes(opt) ? "#c9a84c" : "#3a2510"}`, background: filterValue.includes(opt) ? "#c9a84c22" : "transparent", color: filterValue.includes(opt) ? "#c9a84c" : "#8a7055", fontSize: 11, cursor: "pointer", fontFamily: SANS }}>{opt}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>WOULD SMOKE AGAIN</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["Yes", "Maybe", "No"].map(opt => (
                      <button key={opt} onClick={() => setFilterWouldSmoke(prev => prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt])} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${filterWouldSmoke.includes(opt) ? "#c9a84c" : "#3a2510"}`, background: filterWouldSmoke.includes(opt) ? "#c9a84c22" : "transparent", color: filterWouldSmoke.includes(opt) ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>{opt}</button>
                    ))}
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
              const rating = Array.isArray(c.ratings) ? c.ratings[0] : c.ratings;
              if (filterName && !line.includes(filterName.toLowerCase())) return false;
              if (filterBrand && !brand.includes(filterBrand.toLowerCase())) return false;
              if (filterNoteTags.length > 0 && !filterNoteTags.every(tag => notes.includes(tag.toLowerCase()))) return false;
              if (c.rating < filterScoreMin || c.rating > filterScoreMax) return false;
              if (filterValue.length > 0 && !filterValue.includes(rating?.value_for_price || "")) return false;
              if (filterWouldSmoke.length > 0 && !filterWouldSmoke.includes(rating?.would_smoke_again || "")) return false;
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
                        <span style={{ fontSize: 12, color: checkinRating.would_smoke_again === "Yes" ? "#7a9a7a" : checkinRating.would_smoke_again === "No" ? "#a0522d" : "#c9a84c" }}>
                          {checkinRating.would_smoke_again}
                        </span>
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
                    <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginBottom: 8 }}>COMMENTS</div>
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

      {tab === "wishlist" && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 2, marginBottom: 12 }}>YOUR WISHLIST</div>

          {/* Brand filter */}
          {wishlist.length > 0 && (() => {
            const uniqueWishlistBrands = [...new Set(wishlist.map(w => w.cigars?.brand || w.cigar_brand).filter(Boolean))].sort();
            return (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <select
                    value={wishlistFilterBrand}
                    onChange={e => setWishlistFilterBrand(e.target.value)}
                    style={{ flex: 1, background: "#2a1a0e", border: `1px solid ${wishlistFilterBrand ? "#c9a84c" : "#3a2510"}`, borderRadius: 8, padding: "8px 12px", color: wishlistFilterBrand ? "#c9a84c" : "#8a7055", fontSize: 12, fontFamily: SANS, outline: "none" }}
                  >
                    <option value="">All Brands</option>
                    {uniqueWishlistBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  {wishlistFilterBrand && (
                    <button onClick={() => setWishlistFilterBrand("")} style={{ background: "none", border: "1px solid #3a2510", borderRadius: 8, padding: "8px 12px", color: "#5a4535", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>Clear ×</button>
                  )}
                </div>
                {/* Strength filter */}
                <div style={{ display: "flex", gap: 6 }}>
                  {["Light", "Medium", "Medium-Full", "Full"].map(str => (
                    <button key={str} onClick={() => setWishlistFilterStrength(prev => prev.includes(str) ? prev.filter(x => x !== str) : [...prev, str])}
                      style={{ flex: 1, padding: "6px 0", borderRadius: 20, border: `1px solid ${wishlistFilterStrength.includes(str) ? strengthColor(str) : "#3a2510"}`, background: wishlistFilterStrength.includes(str) ? strengthColor(str) + "22" : "transparent", color: wishlistFilterStrength.includes(str) ? strengthColor(str) : "#5a4535", fontSize: 10, cursor: "pointer", fontFamily: SANS, fontWeight: wishlistFilterStrength.includes(str) ? 700 : 400 }}>
                      {str}
                    </button>
                  ))}
                </div>
                {(wishlistFilterBrand || wishlistFilterStrength.length > 0) && (
                  <div style={{ textAlign: "right", marginTop: 6 }}>
                    <span onClick={() => { setWishlistFilterBrand(""); setWishlistFilterStrength([]); }} style={{ fontSize: 11, color: "#5a4535", cursor: "pointer" }}>Clear all filters</span>
                  </div>
                )}
              </div>
            );
          })()}

          {wishlistLoading && <div style={{ fontSize: 12, color: "#7a9a7a", textAlign: "center", padding: 20 }}>Loading...</div>}
          {!wishlistLoading && wishlist.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔖</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>Your wishlist is empty</div>
              <div style={{ fontSize: 13, color: "#5a4535" }}>Search for a cigar or scan a band and tap "Add to Wishlist"</div>
            </div>
          )}
          {(() => {
            const filtered = wishlist.filter(w => {
              const brand = w.cigars?.brand || w.cigar_brand || "";
              const strength = w.cigars?.strength || "";
              if (wishlistFilterBrand && brand !== wishlistFilterBrand) return false;
              if (wishlistFilterStrength.length > 0 && !wishlistFilterStrength.includes(strength)) return false;
              return true;
            });
            if (filtered.length === 0 && wishlist.length > 0) return (
              <div style={{ textAlign: "center", padding: 30, fontSize: 13, color: "#5a4535" }}>No wishlist items match your filters.</div>
            );
            return filtered.map(w => {
              const brand = w.cigars?.brand || w.cigar_brand || "Unknown";
              const line = w.cigars?.line || w.cigar_name || "Unknown Cigar";
              const vitola = w.cigars?.vitola || w.cigar_vitola || "";
              const strength = w.cigars?.strength || "";
              return (
                <div key={w.id} style={{ ...s.card, borderColor: "#3a2510" }}>
                  <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }} onClick={() => w.cigars && setSelected(w.cigars)}>
                      <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>{brand.toUpperCase()}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", margin: "2px 0 4px" }}>{line}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {vitola && <Badge label={vitola} />}
                        {strength && <Badge label={strength} color={strengthColor(strength)} />}
                      </div>
                      <div style={{ fontSize: 10, color: "#5a4535", marginTop: 6 }}>
                        Added {new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 12 }}>
                      {w.cigars && (
                        <button
                          onClick={() => { setCheckingIn(w.cigars); }}
                          style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#1a0f08", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}
                        >
                          + Log
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFromWishlist(w.id)}
                        style={{ background: "none", border: "1px solid #3a2510", borderRadius: 8, padding: "6px 12px", color: "#5a4535", fontSize: 11, cursor: "pointer", fontFamily: SANS }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {checkingIn && <CheckIn cigar={checkingIn} user={user} onClose={() => setCheckingIn(null)} onSaved={() => { setCheckingIn(null); refreshCheckins(); }} />}
      {showBandScanner && (
        <BandScanner
          onClose={() => setShowBandScanner(false)}
          onCheckIn={(cigar) => { setShowBandScanner(false); setCheckingIn(cigar); }}
          onAddToWishlist={(cigar) => { handleAddToWishlist(cigar); }}
          onSearchManually={() => { setShowBandScanner(false); setTab("search"); }}
        />
      )}
      <nav style={s.nav}>
        {[["search", "🔍", "Cigar Search"], ["profile", "👤", "My Profile"], ["wishlist", "🔖", "Wishlist"]].map(([id, icon, label]) => (
          <button key={id} style={s.navBtn(tab === id)} onClick={() => setTab(id)}>{icon} {label}</button>
        ))}
      </nav>
    </div>
  );
}
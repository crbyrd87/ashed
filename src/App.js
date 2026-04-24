import React, { useState, useEffect, useRef } from "react";
import Auth from "./Auth";
import { supabase } from "./supabase";
import { searchCigarLines, getVitolas } from "./cigarAI";
import CheckIn from "./CheckIn";
import BandScanner from "./BandScanner";
import Recommendations from "./Recommendations";
import Humidor from "./Humidor";
import Pairings from "./Pairings";
import Friends from "./Friends";
import Feed from "./Feed";
import Badges from "./Badges";
import { checkAndAwardBadges } from "./badgeEngine";
import Venues from "./Venues";
import Notifications from "./Notifications";
import { fetchUnreadCount } from "./notificationHelpers";
import AdminConsole from "./AdminConsole";
import PartnerDashboard from "./PartnerDashboard";
import UpgradePrompt from "./UpgradePrompt";

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

function AdvancedStats({ checkins }) {
  const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  if (checkins.length === 0) return (
    <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#5a4535", fontFamily: SANS }}>
      Log some smokes to see your advanced stats!
    </div>
  );

  // Monthly check-ins — last 6 months
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleString("en-US", { month: "short" }), year: d.getFullYear(), month: d.getMonth(), count: 0 };
  });
  for (const c of checkins) {
    const d = new Date(c.smoke_date || c.created_at);
    const m = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
    if (m) m.count++;
  }
  const maxMonth = Math.max(...months.map(m => m.count), 1);

  // Brand breakdown — top 8
  const brandCounts = {};
  for (const c of checkins) {
    const b = c.cigars?.brand || c.cigar_brand;
    if (b) brandCounts[b] = (brandCounts[b] || 0) + 1;
  }
  const topBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxBrand = topBrands[0]?.[1] || 1;

  // Strength breakdown
  const strengthCounts = { Light: 0, Medium: 0, "Medium-Full": 0, Full: 0 };
  for (const c of checkins) {
    const s = c.cigars?.strength;
    if (s && strengthCounts[s] !== undefined) strengthCounts[s]++;
  }
  const strengthColors = { Light: "#a8c5a0", Medium: "#d4b483", "Medium-Full": "#c4894a", Full: "#a0522d" };
  const totalStrength = Object.values(strengthCounts).reduce((a, b) => a + b, 0) || 1;

  // Origin breakdown — top 6
  const originCounts = {};
  for (const c of checkins) {
    const o = c.cigars?.origin;
    if (o) originCounts[o] = (originCounts[o] || 0) + 1;
  }
  const topOrigins = Object.entries(originCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxOrigin = topOrigins[0]?.[1] || 1;

  // Average rating by month
  const monthlyRatings = months.map(m => {
    const monthCheckins = checkins.filter(c => {
      const d = new Date(c.smoke_date || c.created_at);
      return d.getMonth() === m.month && d.getFullYear() === m.year && c.rating != null;
    });
    return monthCheckins.length > 0
      ? parseFloat((monthCheckins.reduce((a, c) => a + c.rating, 0) / monthCheckins.length).toFixed(1))
      : null;
  });

  const cardStyle = { background: "#221508", border: "1px solid #3a2510", borderRadius: 12, padding: 16, marginBottom: 16 };
  const titleStyle = { fontSize: 12, color: "#c8b89a", fontWeight: 600, marginBottom: 16 };

  return (
    <div style={{ fontFamily: SANS }}>

      {/* Monthly check-ins */}
      <div style={cardStyle}>
        <div style={titleStyle}>Check-ins by Month</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
          {months.map((m, i) => {
            const pct = Math.round((m.count / maxMonth) * 100);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", gap: 4 }}>
                {m.count > 0 && <div style={{ fontSize: 10, color: "#c9a84c", fontWeight: 700 }}>{m.count}</div>}
                <div style={{ width: "100%", borderRadius: "3px 3px 0 0", height: m.count === 0 ? 2 : `${Math.max(pct, 4)}%`, background: m.count === 0 ? "#2a1a0e" : "linear-gradient(180deg, #c9a84cff 0%, #c9a84c99 100%)", opacity: m.count === 0 ? 0.3 : 1 }} />
                <div style={{ fontSize: 9, color: "#7a6050" }}>{m.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Avg rating by month */}
      {monthlyRatings.some(r => r !== null) && (
        <div style={cardStyle}>
          <div style={titleStyle}>Average Rating by Month</div>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {months.map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: monthlyRatings[i] ? "#c9a84c" : "#3a2510" }}>
                  {monthlyRatings[i] ?? "—"}
                </div>
                <div style={{ fontSize: 9, color: "#7a6050", marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strength breakdown */}
      <div style={cardStyle}>
        <div style={titleStyle}>Strength Profile</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {Object.entries(strengthCounts).map(([s, count]) => {
            const pct = Math.round((count / totalStrength) * 100);
            return (
              <div key={s} style={{ flex: count || 1, height: 28, background: count > 0 ? strengthColors[s] + "88" : "#2a1a0e", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", transition: "flex 0.3s" }}>
                {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: strengthColors[s] }}>{pct}%</span>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(strengthCounts).map(([s, count]) => (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: strengthColors[s], fontWeight: count > 0 ? 700 : 400 }}>{s.replace("Medium-Full", "Med-Full")}</div>
              <div style={{ fontSize: 11, color: "#5a4535" }}>{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top brands */}
      {topBrands.length > 0 && (
        <div style={cardStyle}>
          <div style={titleStyle}>Top Brands</div>
          {topBrands.map(([brand, count], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#5a4535", width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#e8d5b7", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brand}</div>
                <div style={{ height: 5, background: "#2a1a0e", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((count / maxBrand) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c9a84c", flexShrink: 0 }}>{count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Origin breakdown */}
      {topOrigins.length > 0 && (
        <div style={cardStyle}>
          <div style={titleStyle}>Origins</div>
          {topOrigins.map(([origin, count], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#e8d5b7", marginBottom: 4 }}>{origin}</div>
                <div style={{ height: 5, background: "#2a1a0e", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((count / maxOrigin) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #7a9a7a, #a0c4a0)", borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7a9a7a", flexShrink: 0 }}>{count}</div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [vitolas, setVitolas] = useState([]);
  const [violasLoading, setViolasLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(null);
  const [showBandScanner, setShowBandScanner] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showPairings, setShowPairings] = useState(false);
  const [pairingsCigar, setPairingsCigar] = useState(null);
  const [showFriends, setShowFriends] = useState(false);
  const [pendingFriendCount, setPendingFriendCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [partnerPlaceId, setPartnerPlaceId] = useState(null);
  const [showPartner, setShowPartner] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false); // which feature triggered the prompt
  const [communityRating, setCommunityRating] = useState(null);
  const [showVitolaBreakdown, setShowVitolaBreakdown] = useState(false);
  const [profileTab, setProfileTab] = useState("journal");
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistFilterBrand, setWishlistFilterBrand] = useState("");
  const [wishlistFilterStrength, setWishlistFilterStrength] = useState([]);
  const [wishlistSearchQuery, setWishlistSearchQuery] = useState("");
  const [wishlistSearchResults, setWishlistSearchResults] = useState([]);
  const [wishlistSearching, setWishlistSearching] = useState(false);
  const wishlistSearchTimeout = useRef(null);
  const [humidor, setHumidor] = useState([]);
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

  const refreshPendingFriendCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("friends")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("status", "pending");
    setPendingFriendCount(count || 0);
  };

  const refreshUnreadNotifCount = async () => {
    if (!user) return;
    const count = await fetchUnreadCount(user.id);
    setUnreadNotifCount(count);
  };

  const refreshIsAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("users")
      .select("is_admin, is_partner, partner_place_id, is_premium, disclaimer_accepted")
      .eq("id", user.id)
      .single();
    setIsAdmin(data?.is_admin || false);
    setIsPartner(data?.is_partner || false);
    setPartnerPlaceId(data?.partner_place_id || null);
    setIsPremium(data?.is_premium || false);
    if (data && !data.disclaimer_accepted) setShowDisclaimer(true);
  };

  useEffect(() => {
    if (!user) return;
    refreshPendingFriendCount();
    refreshUnreadNotifCount();
    refreshIsAdmin();
    processReferral(user);
    // Poll unread count every 60 seconds
    const interval = setInterval(refreshUnreadNotifCount, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch community average rating when a cigar detail is opened
  useEffect(() => {
    if (!selected) { setCommunityRating(null); setShowVitolaBreakdown(false); return; }
    const fetchCommunityRating = async () => {
      const brand = selected.brand;
      const line = selected.line;
      if (!brand || !line) { setCommunityRating(null); return; }
      // Get all cigar_ids for this brand+line (all vitolas)
      const { data: cigarsForLine } = await supabase
        .from("cigars")
        .select("id")
        .eq("brand", brand)
        .eq("line", line);
      if (!cigarsForLine || cigarsForLine.length === 0) { setCommunityRating({ avg: null, count: 0, ready: false }); return; }
      const ids = cigarsForLine.map(c => c.id);
      // Get all check-ins for any vitola of this line
      const { data } = await supabase
        .from("checkins")
        .select("rating, cigar_vitola, cigars(vitola)")
        .in("cigar_id", ids)
        .not("rating", "is", null);
      if (data && data.length > 0) {
        const avg = data.reduce((sum, c) => sum + c.rating, 0) / data.length;
        // Per-vitola breakdown
        const byVitola = {};
        for (const row of data) {
          const vit = row.cigar_vitola || row.cigars?.vitola || "Unknown";
          if (!byVitola[vit]) byVitola[vit] = [];
          byVitola[vit].push(row.rating);
        }
        const vitolaSummary = Object.entries(byVitola)
          .map(([vitola, ratings]) => ({
            vitola,
            avg: parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)),
            count: ratings.length,
          }))
          .sort((a, b) => b.avg - a.avg);
        setCommunityRating({ avg: parseFloat(avg.toFixed(1)), count: data.length, ready: true, vitolas: vitolaSummary });
      } else {
        setCommunityRating({ avg: null, count: 0, ready: false, vitolas: [] });
      }
    };
    fetchCommunityRating();
  }, [selected]);

  const processReferral = async (currentUser) => {
    const referralUsername = localStorage.getItem("ashed_referral");
    if (!referralUsername) return;

    // Check if this user has already been referred
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_id", currentUser.id)
      .maybeSingle();
    if (existingReferral) {
      localStorage.removeItem("ashed_referral");
      return;
    }

    // Look up referrer by username
    const { data: referrer } = await supabase
      .from("users")
      .select("id")
      .eq("username", referralUsername)
      .maybeSingle();
    if (!referrer || referrer.id === currentUser.id) {
      localStorage.removeItem("ashed_referral");
      return;
    }

    // Record the referral
    await supabase.from("referrals").insert({
      referrer_id: referrer.id,
      referred_id: currentUser.id,
    });

    // Update referred_by on the new user
    await supabase.from("users").update({ referred_by: referrer.id }).eq("id", currentUser.id);

    // Check referral badges for the referrer
    checkAndAwardBadges(referrer.id, "referral").catch(() => {});

    localStorage.removeItem("ashed_referral");
  };

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
    if (!isPremium && wishlist.length >= 20) {
      setUpgradeFeature("wishlist_cap");
      return;
    }
    const isRealCigar = !!cigar.id;
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
    fetchWishlist();
  };

  const isOnWishlist = (cigar) => {
    if (cigar.id) return wishlist.some(w => w.cigar_id === cigar.id);
    return wishlist.some(w => w.cigar_name === (cigar.line || cigar.cigar_name));
  };

  const handleAddToHumidor = async (cigar) => {
    const existing = humidor.find(h =>
      cigar.id ? h.cigar_id === cigar.id : h.cigar_name === (cigar.line || cigar.cigar_name)
    );
    if (existing) {
      await supabase.from("humidor").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    } else {
      await supabase.from("humidor").insert({
        user_id: user.id,
        cigar_id: cigar.id || null,
        cigar_brand: cigar.brand || null,
        cigar_name: cigar.line || null,
        cigar_vitola: cigar.vitola || null,
        quantity: 1,
      });
    }
    const { data } = await supabase.from("humidor").select("*").eq("user_id", user.id);
    setHumidor(data || []);
  };

  const isInHumidor = (cigar) => {
    if (cigar.id) return humidor.some(h => h.cigar_id === cigar.id);
    return humidor.some(h => h.cigar_name === (cigar.line || cigar.cigar_name));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleAcceptDisclaimer = async () => {
    setShowDisclaimer(false);
    await supabase.from("users").update({ disclaimer_accepted: true }).eq("id", user.id);
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

  const handleDeleteCheckin = async (checkin) => {
    if (!window.confirm("Delete this check-in? This cannot be undone.")) return;
    await supabase.from("ratings").delete().eq("checkin_id", checkin.id);
    await supabase.from("checkins").delete().eq("id", checkin.id);
    setSelectedCheckin(null);
    setCheckins(prev => prev.filter(c => c.id !== checkin.id));
  };

  const handleExportCSV = async () => {
    // Fetch full check-in data with ratings
    const { data } = await supabase
      .from("checkins")
      .select("*, cigars(brand, line, vitola, strength, origin), ratings(score, aroma, draw, burn, construction, flavor, finish, value_for_price, would_smoke_again, flavor_tags)")
      .eq("user_id", user.id)
      .order("smoke_date", { ascending: false });

    if (!data || data.length === 0) {
      alert("No check-ins to export yet.");
      return;
    }

    const headers = [
      "Date", "Brand", "Line", "Vitola", "Strength", "Origin",
      "Overall Score", "Aroma", "Draw", "Burn", "Construction", "Flavor", "Finish",
      "Value for Price", "Would Smoke Again", "Flavor Tags", "Notes", "Location", "Visibility"
    ];

    const rows = data.map(c => {
      const r = Array.isArray(c.ratings) ? c.ratings[0] : c.ratings;
      return [
        c.smoke_date || "",
        c.cigars?.brand || c.cigar_brand || "",
        c.cigars?.line || c.cigar_name || "",
        c.cigars?.vitola || c.cigar_vitola || "",
        c.cigars?.strength || "",
        c.cigars?.origin || "",
        c.rating ?? "",
        r?.aroma ?? "",
        r?.draw ?? "",
        r?.burn ?? "",
        r?.construction ?? "",
        r?.flavor ?? "",
        r?.finish ?? "",
        r?.value_for_price || "",
        r?.would_smoke_again || "",
        r?.flavor_tags || "",
        (c.tasting_notes || "").replace(/"/g, '""'),
        c.smoke_location || "",
        c.visibility || "public",
      ].map(v => `"${v}"`).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ashed-journal-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    // Open the line detail page immediately — vitolas load into it
    setSelected({ ...line, _isLine: true });
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
    nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "#1a0f08", borderTop: "1px solid #3a2510", display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100, padding: "0 4px" },
    navBtn: a => ({ flex: 1, padding: "10px 0", background: "none", border: "none", color: a ? "#c9a84c" : "#5a4535", fontSize: 10, cursor: "pointer", fontFamily: SANS, textTransform: "uppercase", fontWeight: a ? 700 : 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, letterSpacing: 0 }),
    card: { background: "linear-gradient(135deg, #2a1a0e 0%, #221508 100%)", border: "1px solid #3a2510", borderRadius: 10, marginBottom: 10, cursor: "pointer", overflow: "hidden" },
    input: { width: "100%", background: "#2a1a0e", border: `1px solid ${searching ? "#7a9a7a" : "#4a3020"}`, borderRadius: showDropdown && searchResults.length > 0 ? "8px 8px 0 0" : "8px", padding: "10px 14px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" },
    statBox: { background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: "14px 18px", flex: 1, textAlign: "center" },
    logoutBtn: { background: "none", border: "1px solid #3a2510", borderRadius: 20, padding: "4px 12px", color: "#8a7055", fontSize: 11, cursor: "pointer", fontFamily: SANS },
    dropdown: { position: "absolute", top: "100%", left: 0, right: 0, background: "#2a1a0e", border: "1px solid #4a3020", borderTop: "none", borderRadius: "0 0 10px 10px", zIndex: 50, overflow: "hidden", maxHeight: 300, overflowY: "auto" },
    dropdownItem: { padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid #3a251033" },
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
    const isLine = !!c._isLine;

    // Compute strength display for line mode
    const STRENGTH_ORDER = ["Light", "Medium", "Medium-Full", "Full"];
    const strengthValues = isLine
      ? [...new Set((vitolas || []).map(v => v.strength).filter(Boolean))]
          .sort((a, b) => STRENGTH_ORDER.indexOf(a) - STRENGTH_ORDER.indexOf(b))
      : [];
    const strengthDisplay = strengthValues.length > 1
      ? strengthValues.join(" / ")
      : strengthValues[0] || c.strength;

    // Use first vitola for line-level specs
    const firstVitola = isLine ? (vitolas?.[0] || c) : c;
    const origin = firstVitola.origin || c.origin;
    const wrapper = firstVitola.wrapper || c.wrapper;
    const tastingNotes = firstVitola.tasting_notes || c.tasting_notes;

    const handleBack = () => {
      setSelected(null);
      if (isLine) { setSelectedLine(null); setVitolas([]); setQuery(""); }
    };

    return (
      <div style={{ ...s.app, overflowY: "auto" }}>
        <div style={{ position: "relative", height: 220 }}>
          <div style={{ width: "100%", height: "100%" }}><LoungeScene /></div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, #1a0f0844 0%, #1a0f08 100%)" }} />
          <button onClick={handleBack} style={{ position: "absolute", top: 16, left: 16, background: "#1a0f08bb", border: "1px solid #3a2510", color: "#c9a84c", fontSize: 12, cursor: "pointer", padding: "6px 12px", borderRadius: 20, fontFamily: SANS }}>← Back</button>
          {!isLine && c.smoked && <div style={{ position: "absolute", top: 16, right: 16, background: "#c9a84cdd", color: "#1a0f08", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>✓ SMOKED</div>}
        </div>

        <div style={{ padding: "0 20px 30px" }}>
          {/* Brand + Line name */}
          <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, textTransform: "uppercase", marginTop: 16 }}>{c.brand}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#e8d5b7", margin: "4px 0 8px" }}>{c.line}</div>

          {/* Line-level badges — wrapper, strength, origin */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {wrapper && <Badge label={wrapper} color="#a07830" />}
            {strengthDisplay && <Badge label={strengthDisplay} color={strengthColor(strengthValues[0] || c.strength)} />}
            {origin && <Badge label={origin} color="#7a9a7a" />}
          </div>

          {/* Critic score */}
          {!isLine && c.rating && <><ScoreBar rating={c.rating} /><div style={{ fontSize: 11, color: "#8a7055", marginTop: 4, marginBottom: 20 }}>CRITIC SCORE</div></>}

          {/* Community rating */}
          {communityRating && (
            <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
              {/* Header row — always visible, tappable */}
              <div
                onClick={() => communityRating.ready && setShowVitolaBreakdown(p => !p)}
                style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: communityRating.ready ? "pointer" : "default" }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 4 }}>ASHED COMMUNITY</div>
                  {communityRating.ready ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: "#3a2a1a", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${communityRating.avg * 10}%`, height: "100%", background: "linear-gradient(90deg, #7a9a7a, #a0c4a0)", borderRadius: 3 }} />
                      </div>
                      <span style={{ color: "#7a9a7a", fontSize: 18, fontWeight: 700 }}>{communityRating.avg}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#4a3020", fontStyle: "italic" }}>No ratings yet</div>
                  )}
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ fontSize: 12, color: "#c8b89a" }}>{communityRating.count} {communityRating.count === 1 ? "rating" : "ratings"}</div>
                  {communityRating.ready && (
                    <span style={{ fontSize: 11, color: "#8a7055" }}>{showVitolaBreakdown ? "▲" : "▼"} by vitola</span>
                  )}
                </div>
              </div>

              {/* Vitola breakdown — expandable */}
              {showVitolaBreakdown && communityRating.vitolas?.length > 0 && (
                <div style={{ borderTop: "1px solid #3a251033", padding: "10px 16px 14px" }}>
                  {communityRating.vitolas.map((v, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < communityRating.vitolas.length - 1 ? 10 : 0 }}>
                      <div style={{ fontSize: 12, color: "#c8b89a", width: 110, flexShrink: 0 }}>{v.vitola}</div>
                      <div style={{ flex: 1, height: 5, background: "#3a2a1a", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${v.avg * 10}%`, height: "100%", background: "linear-gradient(90deg, #7a9a7a, #a0c4a0)", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#7a9a7a", width: 32, textAlign: "right" }}>{v.avg}</span>
                      <span style={{ fontSize: 10, color: "#4a3020", width: 24, textAlign: "right" }}>×{v.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tasting notes */}
          {tastingNotes && (
            <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginBottom: 8 }}>TASTING NOTES</div>
              <div style={{ fontSize: 14, color: "#c8b89a", lineHeight: 1.6 }}>{tastingNotes}</div>
            </div>
          )}

          {/* LINE MODE: vitola list with Log buttons */}
          {isLine && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>SELECT A VITOLA</div>
              {violasLoading && vitolas.length === 0 && (
                <div style={{ fontSize: 12, color: "#7a9a7a", marginBottom: 10 }}>Loading sizes...</div>
              )}
              {vitolas.map((v, i) => {
                const mixedStrengths = strengthValues.length > 1;
                return (
                  <div key={i} style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                    {/* Vitola name + size + strength */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#e8d5b7" }}>{v.vitola}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                          {v.length_inches && <span style={{ fontSize: 11, color: "#5a4535" }}>{v.length_inches}" × {v.ring_gauge}</span>}
                          {mixedStrengths && v.strength && <Badge label={v.strength} color={strengthColor(v.strength)} />}
                        </div>
                      </div>
                      <button
                        onClick={() => setCheckingIn(v)}
                        style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "8px 22px", color: "#1a0f08", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}
                      >
                        Log this Smoke 🚬
                      </button>
                    </div>
                    {/* Wishlist + Humidor per vitola */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => handleAddToWishlist(v)}
                        style={{ flex: 1, background: isOnWishlist(v) ? "#c9a84c22" : "none", border: `1px solid ${isOnWishlist(v) ? "#c9a84c" : "#8a7055"}`, borderRadius: 8, padding: "6px 0", color: isOnWishlist(v) ? "#c9a84c" : "#c8b89a", fontSize: 11, cursor: "pointer", fontFamily: SANS }}
                      >
                        {isOnWishlist(v) ? "✓ Wishlisted" : "+ Wishlist"}
                      </button>
                      <button
                        onClick={() => handleAddToHumidor(v)}
                        style={{ flex: 1, background: isInHumidor(v) ? "#7a9a7a22" : "none", border: `1px solid ${isInHumidor(v) ? "#7a9a7a" : "#8a7055"}`, borderRadius: 8, padding: "6px 0", color: isInHumidor(v) ? "#7a9a7a" : "#c8b89a", fontSize: 11, cursor: "pointer", fontFamily: SANS }}
                      >
                        {isInHumidor(v) ? "✓ In Humidor" : "+ Humidor"}
                      </button>
                    </div>
                  </div>
                );
              })}
              {violasLoading && vitolas.length > 0 && (
                <div style={{ fontSize: 11, color: "#7a9a7a", textAlign: "center", padding: "8px 0" }}>Finding more sizes...</div>
              )}
              {/* Pairings at line level */}
              <button
                onClick={() => { if (isPremium) { setPairingsCigar(firstVitola); setShowPairings(true); } else { setUpgradeFeature("pairings"); } }}
                style={{ width: "100%", background: "none", border: "1px solid #7a8a9a55", borderRadius: 10, padding: 12, color: "#7a8a9a", fontSize: 13, cursor: "pointer", fontFamily: SANS, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                🥃 Drink Pairings {!isPremium && <span style={{ fontSize: 10, background: "#7a8a9a22", border: "1px solid #7a8a9a55", borderRadius: 8, padding: "1px 6px" }}>PRO</span>}
              </button>
            </div>
          )}

          {/* SINGLE VITOLA MODE: original buttons */}
          {!isLine && (
            c.smoked ? (
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
                  onClick={() => { if (isPremium) { setPairingsCigar(c); setShowPairings(true); } else { setUpgradeFeature("pairings"); } }}
                  style={{ width: "100%", background: "none", border: "1px solid #7a8a9a55", borderRadius: 10, padding: 12, color: "#7a8a9a", fontSize: 13, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  🥃 Drink Pairings {!isPremium && <span style={{ fontSize: 10, background: "#7a8a9a22", border: "1px solid #7a8a9a55", borderRadius: 8, padding: "1px 6px" }}>PRO</span>}
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleAddToWishlist(c)}
                    style={{ flex: 1, background: isOnWishlist(c) ? "#c9a84c22" : "none", border: `1px solid ${isOnWishlist(c) ? "#c9a84c" : "#3a2510"}`, borderRadius: 10, padding: 12, color: isOnWishlist(c) ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: isOnWishlist(c) ? "default" : "pointer", fontFamily: SANS }}
                  >
                    {isOnWishlist(c) ? "✓ Wishlisted" : "+ Wishlist"}
                  </button>
                  <button
                    onClick={() => handleAddToHumidor(c)}
                    style={{ flex: 1, background: isInHumidor(c) ? "#7a9a7a22" : "none", border: `1px solid ${isInHumidor(c) ? "#7a9a7a" : "#3a2510"}`, borderRadius: 10, padding: 12, color: isInHumidor(c) ? "#7a9a7a" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }}
                  >
                    {isInHumidor(c) ? "✓ In Humidor" : "+ Humidor"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {checkingIn && <CheckIn cigar={checkingIn} user={user} onClose={() => setCheckingIn(null)} onSaved={() => { setCheckingIn(null); setSelected(null); refreshCheckins(); }} />}
        {showPairings && pairingsCigar && (
          <Pairings
            cigar={pairingsCigar}
            onClose={() => { setShowPairings(false); setPairingsCigar(null); }}
          />
        )}
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

          {/* Scan Band and Recommendations buttons — shown when no search active */}
          {!query && !selectedLine && (
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                onClick={() => isPremium ? setShowBandScanner(true) : setUpgradeFeature("band_scanner")}
                style={{ flex: 1, background: "#2a1a0e", border: "1px solid #c9a84c55", borderRadius: 10, padding: 14, color: "#c9a84c", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                📷 Scan a Band {!isPremium && <span style={{ fontSize: 10, background: "#c9a84c22", border: "1px solid #c9a84c55", borderRadius: 8, padding: "1px 6px", marginLeft: 4 }}>PRO</span>}
              </button>
              <button
                onClick={() => isPremium ? setShowRecommendations(true) : setUpgradeFeature("recommendations")}
                style={{ flex: 1, background: "#2a1a0e", border: "1px solid #7a9a7a55", borderRadius: 10, padding: 14, color: "#7a9a7a", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                ✨ For Me {!isPremium && <span style={{ fontSize: 10, background: "#7a9a7a22", border: "1px solid #7a9a7a55", borderRadius: 8, padding: "1px 6px", marginLeft: 4 }}>PRO</span>}
              </button>
            </div>
          )}

          {!selectedLine && !query && (
            <Feed user={user} />
          )}
        </div>
      )}

      {tab === "profile" && (
        <div style={{ padding: 16 }}>
          {/* User header - always visible */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: "16px 0", borderBottom: "1px solid #3a2510" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #c9a84c, #7a4a20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#e8d5b7" }}>{displayName}</div>
              <div style={{ fontSize: 12, color: "#8a7055" }}>{username ? `@${username} · ` : ""}Member since {new Date(user.created_at).getFullYear()}</div>
              <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge label="🏅 Aficionado" color="#c9a84c" />
                {isPremium && <Badge label="⭐ Premium" color="#e8cc7a" />}
              </div>
            </div>
            <button
              onClick={() => { setShowFriends(true); setPendingFriendCount(0); }}
              style={{ background: "none", border: `1px solid ${pendingFriendCount > 0 ? "#c9a84c" : "#3a2510"}`, borderRadius: 20, padding: "6px 14px", color: pendingFriendCount > 0 ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap", position: "relative" }}
            >
              👥 Friends
              {pendingFriendCount > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6, background: "#e8632a", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS }}>
                  {pendingFriendCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setShowNotifications(true); setUnreadNotifCount(0); }}
              style={{ background: "none", border: `1px solid ${unreadNotifCount > 0 ? "#c9a84c" : "#3a2510"}`, borderRadius: 20, padding: "6px 12px", color: unreadNotifCount > 0 ? "#c9a84c" : "#8a7055", fontSize: 16, cursor: "pointer", fontFamily: SANS, position: "relative", lineHeight: 1 }}
            >
              🔔
              {unreadNotifCount > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6, background: "#e8632a", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS }}>
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </button>
          </div>

          {/* Admin button — only visible to admins */}
          {isAdmin && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowAdmin(true)}
                style={{ width: "100%", background: "#2a1a0e", border: "1px solid #c9a84c44", borderRadius: 10, padding: "10px 16px", color: "#c9a84c", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", gap: 8 }}
              >
                ⚙️ Admin Console
              </button>
            </div>
          )}

          {/* Partner Dashboard button — only visible to partners */}
          {isPartner && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowPartner(true)}
                style={{ width: "100%", background: "#2a1a0e", border: "1px solid #7a8a9a44", borderRadius: 10, padding: "10px 16px", color: "#7a8a9a", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", gap: 8 }}
              >
                🏪 Partner Dashboard
              </button>
            </div>
          )}

          {/* Stat boxes - always visible */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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

          {/* Sub-tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #3a2510", marginBottom: 16 }}>
            {[["journal", "Journal"], ["stats", "Stats"], ["badges", "Badges"], ["advanced", isPremium ? "Advanced" : "⭐ Advanced"]].map(([id, label]) => (
              <button key={id} onClick={() => setProfileTab(id)}
                style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: `2px solid ${profileTab === id ? "#c9a84c" : "transparent"}`, color: profileTab === id ? "#c9a84c" : "#5a4535", fontSize: 12, cursor: "pointer", fontFamily: SANS, letterSpacing: 1, fontWeight: profileTab === id ? 700 : 400 }}>
                {label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* JOURNAL SUB-TAB */}
          {profileTab === "journal" && (
            <>
              {checkins.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <button onClick={() => setShowFilterDrawer(true)}
                      style={{ background: activeFilterCount > 0 ? "#c9a84c22" : "none", border: `1px solid ${activeFilterCount > 0 ? "#c9a84c" : "#3a2510"}`, borderRadius: 20, padding: "6px 14px", color: activeFilterCount > 0 ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", gap: 6 }}>
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
                </div>
              )}

              {showFilterDrawer && (
                <div style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 2, marginBottom: 16 }}>FILTER SMOKES</div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 6 }}>CIGAR NAME</div>
                    <input style={{ width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: filterNameOpen && filteredNames.length > 0 ? "8px 8px 0 0" : "8px", padding: "8px 12px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
                      placeholder="Search your smokes..." value={filterName}
                      onChange={e => { setFilterName(e.target.value); setFilterNameOpen(true); }}
                      onFocus={() => setFilterNameOpen(true)} onBlur={() => setTimeout(() => setFilterNameOpen(false), 150)} />
                    {filterNameOpen && (
                      <div style={{ background: "#2a1a0e", border: "1px solid #4a3020", borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 150, overflowY: "auto" }}>
                        {filteredNames.length === 0 ? <div style={{ padding: "10px 12px", fontSize: 12, color: "#5a4535" }}>No logged smokes found</div>
                          : filteredNames.map(n => <div key={n} style={{ padding: "10px 12px", fontSize: 13, color: "#e8d5b7", cursor: "pointer", borderBottom: "1px solid #3a251033" }} onMouseDown={() => { setFilterName(n); setFilterNameOpen(false); }}>{n}</div>)}
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 6 }}>BRAND</div>
                    <input style={{ width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: filterBrandOpen && filteredBrands.length > 0 ? "8px 8px 0 0" : "8px", padding: "8px 12px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
                      placeholder="Search your brands..." value={filterBrand}
                      onChange={e => { setFilterBrand(e.target.value); setFilterBrandOpen(true); }}
                      onFocus={() => setFilterBrandOpen(true)} onBlur={() => setTimeout(() => setFilterBrandOpen(false), 150)} />
                    {filterBrandOpen && (
                      <div style={{ background: "#2a1a0e", border: "1px solid #4a3020", borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 150, overflowY: "auto" }}>
                        {filteredBrands.length === 0 ? <div style={{ padding: "10px 12px", fontSize: 12, color: "#5a4535" }}>No logged smokes found</div>
                          : filteredBrands.map(b => <div key={b} style={{ padding: "10px 12px", fontSize: 13, color: "#e8d5b7", cursor: "pointer", borderBottom: "1px solid #3a251033" }} onMouseDown={() => { setFilterBrand(b); setFilterBrandOpen(false); }}>{b}</div>)}
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>TASTING NOTES</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {FLAVOR_TAGS.map(tag => (
                        <button key={tag} onClick={() => setFilterNoteTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                          style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${filterNoteTags.includes(tag) ? "#c9a84c" : "#3a2510"}`, background: filterNoteTags.includes(tag) ? "#c9a84c22" : "transparent", color: filterNoteTags.includes(tag) ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>{tag}</button>
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
                        <button key={opt} onClick={() => setFilterValue(prev => prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt])}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${filterValue.includes(opt) ? "#c9a84c" : "#3a2510"}`, background: filterValue.includes(opt) ? "#c9a84c22" : "transparent", color: filterValue.includes(opt) ? "#c9a84c" : "#8a7055", fontSize: 11, cursor: "pointer", fontFamily: SANS }}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>WOULD SMOKE AGAIN</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["Yes", "Maybe", "No"].map(opt => (
                        <button key={opt} onClick={() => setFilterWouldSmoke(prev => prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt])}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${filterWouldSmoke.includes(opt) ? "#c9a84c" : "#3a2510"}`, background: filterWouldSmoke.includes(opt) ? "#c9a84c22" : "transparent", color: filterWouldSmoke.includes(opt) ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setShowFilterDrawer(false)} style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 14, color: "#1a0f08", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                    Apply Filters
                  </button>
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
                if (sorted.length === 0 && checkins.length > 0) return (
                  <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: 30 }}>No smokes match your filters.</div>
                );
                return sorted.map(c => {
                  const brand = c.cigars?.brand || c.cigar_brand || "Unknown";
                  const line = c.cigars?.line || c.cigar_name || "Unknown";
                  const vitola = c.cigars?.vitola || c.cigar_vitola || null;
                  const strength = c.cigars?.strength || null;
                  const isSelected = selectedCheckin?.id === c.id;
                  return (
                    <div key={c.id} style={{ ...s.card, borderColor: isSelected ? "#c9a84c55" : "#3a2510" }} onClick={() => isSelected ? setSelectedCheckin(null) : handleSelectCheckin(c)}>
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>{brand.toUpperCase()}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", margin: "2px 0 6px" }}>{line}</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {vitola && <Badge label={vitola} />}
                              {strength && <Badge label={strength} color={strengthColor(strength)} />}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: "#c9a84c" }}>{c.rating?.toFixed(1)}</div>
                            <div style={{ fontSize: 11, color: "#5a4535" }}>{new Date(c.smoke_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                            {c.visibility === "private" && <div style={{ fontSize: 10, color: "#5a4535", marginTop: 2 }}>🔒 Private</div>}
                            {c.visibility === "friends_only" && <div style={{ fontSize: 10, color: "#7a9a7a", marginTop: 2 }}>👥 Friends</div>}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{ borderTop: "1px solid #3a2510", padding: "12px 14px" }}>
                          {checkinRating && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>DETAILED RATINGS</div>
                              {[["Aroma", checkinRating.aroma], ["Draw", checkinRating.draw], ["Burn", checkinRating.burn], ["Construction", checkinRating.construction], ["Flavor", checkinRating.flavor], ["Finish", checkinRating.finish]].filter(([, v]) => v != null).map(([label, val]) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                  <div style={{ fontSize: 11, color: "#8a7055", width: 80 }}>{label}</div>
                                  <div style={{ flex: 1, height: 4, background: "#3a2510", borderRadius: 2, overflow: "hidden" }}>
                                    <div style={{ width: `${val * 10}%`, height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 2 }} />
                                  </div>
                                  <div style={{ fontSize: 12, color: "#c9a84c", fontWeight: 700, width: 28 }}>{val?.toFixed(1)}</div>
                                </div>
                              ))}
                              {checkinRating.value_for_price && <div style={{ fontSize: 12, color: "#8a7055", marginTop: 8 }}>Value: <span style={{ color: "#e8d5b7" }}>{checkinRating.value_for_price}</span></div>}
                              {checkinRating.would_smoke_again && <div style={{ fontSize: 12, color: "#8a7055", marginTop: 4 }}>Smoke again: <span style={{ color: "#e8d5b7" }}>{checkinRating.would_smoke_again}</span></div>}
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
                          {c.tasting_notes && (
                            <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginBottom: 8 }}>COMMENTS</div>
                              <div style={{ fontSize: 14, color: "#c8b89a", fontStyle: "italic", lineHeight: 1.6 }}>"{c.tasting_notes}"</div>
                            </div>
                          )}
                          <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 16 }}>
                            <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>VISIBILITY</div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {[
                                { value: "public", label: "🌍 Public" },
                                { value: "friends_only", label: "👥 Friends" },
                                { value: "private", label: "🔒 Private" },
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (c.visibility === opt.value) return;
                                    const { data } = await supabase.from("checkins").update({ visibility: opt.value }).eq("id", c.id).select().single();
                                    if (data) {
                                      setSelectedCheckin(data);
                                      setCheckins(prev => prev.map(x => x.id === data.id ? { ...x, visibility: data.visibility } : x));
                                    }
                                  }}
                                  style={{
                                    flex: 1, padding: "7px 4px", borderRadius: 8, cursor: "pointer", fontFamily: SANS,
                                    border: `1px solid ${c.visibility === opt.value ? "#c9a84c" : "#3a2510"}`,
                                    background: c.visibility === opt.value ? "#c9a84c22" : "transparent",
                                    color: c.visibility === opt.value ? "#c9a84c" : "#5a4535",
                                    fontSize: 11, fontWeight: c.visibility === opt.value ? 700 : 400,
                                  }}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteCheckin(c); }} style={{ width: "100%", background: "none", border: "1px solid #a0522d55", borderRadius: 10, padding: 14, color: "#a0522d", fontSize: 14, cursor: "pointer", fontFamily: SANS, marginTop: 12 }}>
                            Delete this check-in
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </>
          )}

          {profileTab === "journal" && checkins.length > 0 && (
            <button
              onClick={handleExportCSV}
              style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 10, padding: 14, color: "#8a7055", fontSize: 13, cursor: "pointer", fontFamily: SANS, marginTop: 8, marginBottom: 8 }}
            >
              ⬇️ Export My Journal (CSV)
            </button>
          )}

          {/* STATS SUB-TAB */}
          {profileTab === "stats" && (
            <>
              {checkins.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#5a4535" }}>Log some smokes to see your stats!</div>
              ) : (() => {
                const locCounts = checkins.reduce((acc, c) => { if (c.smoke_location) acc[c.smoke_location] = (acc[c.smoke_location] || 0) + 1; return acc; }, {});
                const topLoc = Object.entries(locCounts).sort((a, b) => b[1] - a[1])[0];
                const top3 = [...checkins].sort((a, b) => b.rating - a.rating).slice(0, 3);
                const brandCounts = checkins.reduce((acc, c) => { const b = c.cigars?.brand || c.cigar_brand; if (b) acc[b] = (acc[b] || 0) + 1; return acc; }, {});
                const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0];
                const vitolaRatings = checkins.reduce((acc, c) => { const v = c.cigars?.vitola || c.cigar_vitola; if (v) { if (!acc[v]) acc[v] = []; acc[v].push(c.rating); } return acc; }, {});
                const bestVitola = Object.entries(vitolaRatings).map(([v, ratings]) => [v, ratings.reduce((a, b) => a + b, 0) / ratings.length]).sort((a, b) => b[1] - a[1])[0];
                return (
                  <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 14 }}>
                    {topLoc && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #3a251033" }}><div style={{ fontSize: 11, color: "#8a7055" }}>📍 TOP LOCATION</div><div style={{ fontSize: 13, color: "#e8d5b7" }}>{topLoc[0]} <span style={{ color: "#c9a84c" }}>({topLoc[1]})</span></div></div>}
                    {topBrand && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #3a251033" }}><div style={{ fontSize: 11, color: "#8a7055" }}>🏆 MOST SMOKED BRAND</div><div style={{ fontSize: 13, color: "#e8d5b7" }}>{topBrand[0]} <span style={{ color: "#c9a84c" }}>({topBrand[1]})</span></div></div>}
                    {bestVitola && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #3a251033" }}><div style={{ fontSize: 11, color: "#8a7055" }}>🎯 FAVORITE VITOLA</div><div style={{ fontSize: 13, color: "#e8d5b7" }}>{bestVitola[0]} <span style={{ color: "#c9a84c" }}>({bestVitola[1].toFixed(1)})</span></div></div>}
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
            </>
          )}

          {/* BADGES SUB-TAB */}
          {profileTab === "badges" && (
            <Badges userId={user.id} />
          )}

          {/* ADVANCED STATS SUB-TAB */}
          {profileTab === "advanced" && (
            isPremium ? (
              <AdvancedStats checkins={checkins} />
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>📊</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>Advanced Stats is Premium</div>
                <div style={{ fontSize: 13, color: "#5a4535", lineHeight: 1.6, marginBottom: 20 }}>Monthly trends, flavor profile, brand breakdown and more.</div>
                <button onClick={() => setUpgradeFeature("advanced_stats")}
                  style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 12, padding: "12px 28px", color: "#1a0f08", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                  ⭐ Upgrade to Premium
                </button>
              </div>
            )
          )}
        </div>
      )}

      {tab === "wishlist" && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 2, marginBottom: 12 }}>YOUR WISHLIST</div>

          {/* Search to add */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <input
              value={wishlistSearchQuery}
              onChange={e => {
                const val = e.target.value;
                setWishlistSearchQuery(val);
                setWishlistSearchResults([]);
                if (val.length < 2) return;
                setWishlistSearching(true);
                clearTimeout(wishlistSearchTimeout.current);
                wishlistSearchTimeout.current = setTimeout(async () => {
                  const results = await searchCigarLines(val);
                  setWishlistSearchResults(results);
                  setWishlistSearching(false);
                }, 350);
              }}
              placeholder="Search cigars to add to wishlist..."
              style={{ width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: wishlistSearchResults.length > 0 ? "8px 8px 0 0" : "8px", padding: "10px 14px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
            />
            {wishlistSearching && (
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#7a9a7a" }}>Searching...</div>
            )}
            {wishlistSearchResults.length > 0 && (
              <div style={{ position: "absolute", left: 0, right: 0, background: "#2a1a0e", border: "1px solid #4a3020", borderTop: "none", borderRadius: "0 0 8px 8px", zIndex: 50, maxHeight: 200, overflowY: "auto" }}>
                {wishlistSearchResults.map((r, i) => (
                  <div key={i}
                    onClick={() => {
                      handleAddToWishlist({ id: r.id, brand: r.brand, line: r.line });
                      setWishlistSearchQuery("");
                      setWishlistSearchResults([]);
                    }}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #3a251033", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: "#e8d5b7" }}>{r.line}</div>
                      <div style={{ fontSize: 11, color: "#8a7055" }}>{r.brand}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#c9a84c" }}>+ Add</span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                        onClick={() => { handleAddToHumidor(w.cigars || { id: w.cigar_id, brand: w.cigar_brand, line: w.cigar_name, vitola: w.cigar_vitola }); handleRemoveFromWishlist(w.id); }}
                        style={{ background: "none", border: "1px solid #7a9a7a55", borderRadius: 8, padding: "6px 12px", color: "#7a9a7a", fontSize: 11, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}
                      >
                        Purchased
                      </button>
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
          user={user}
          onClose={() => setShowBandScanner(false)}
          onCheckIn={(cigar) => { setShowBandScanner(false); setCheckingIn(cigar); }}
          onAddToWishlist={(cigar) => { handleAddToWishlist(cigar); }}
          onAddToHumidor={(cigar) => { handleAddToHumidor(cigar); }}
          onSearchManually={() => { setShowBandScanner(false); setTab("search"); }}
        />
      )}
      {showRecommendations && (
        <Recommendations
          user={user}
          checkins={checkins}
          onAddToWishlist={(cigar) => handleAddToWishlist(cigar)}
          onClose={() => setShowRecommendations(false)}
        />
      )}
      {showPairings && pairingsCigar && (
        <Pairings
          cigar={pairingsCigar}
          onClose={() => { setShowPairings(false); setPairingsCigar(null); }}
        />
      )}
      {showFriends && (
        <Friends
          user={user}
          onClose={() => setShowFriends(false)}
          onRequestHandled={() => refreshPendingFriendCount()}
        />
      )}
      {showNotifications && (
        <Notifications
          user={user}
          onClose={() => { setShowNotifications(false); setUnreadNotifCount(0); }}
        />
      )}
      {upgradeFeature && (
        <UpgradePrompt
          feature={upgradeFeature}
          onClose={() => setUpgradeFeature(null)}
        />
      )}

      {/* Health disclaimer — shown once on first login */}
      {showDisclaimer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: SANS }}>
          <div style={{ background: "#1a0f08", border: "1px solid #3a2510", borderRadius: 16, padding: 28, maxWidth: 380, width: "100%" }}>
            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginBottom: 12 }}>HEALTH DISCLAIMER</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e8d5b7", marginBottom: 16 }}>Before you get started</div>
            <div style={{ fontSize: 13, color: "#c8b89a", lineHeight: 1.7, marginBottom: 16 }}>
              Ashed is a <strong style={{ color: "#e8d5b7" }}>journal and community tool</strong> for adult cigar enthusiasts. It is not intended to encourage tobacco use.
            </div>
            <div style={{ fontSize: 13, color: "#c8b89a", lineHeight: 1.7, marginBottom: 16 }}>
              Tobacco products contain nicotine and other chemicals known to cause <strong style={{ color: "#e8d5b7" }}>cancer, heart disease, and other serious health conditions</strong>. There is no safe level of tobacco use.
            </div>
            <div style={{ fontSize: 13, color: "#c8b89a", lineHeight: 1.7, marginBottom: 24 }}>
              By continuing, you confirm you are a legal adult and understand the health risks associated with tobacco use.
            </div>
            <button
              onClick={handleAcceptDisclaimer}
              style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 12, padding: 14, color: "#1a0f08", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}
            >
              I Understand, Let's Go
            </button>
          </div>
        </div>
      )}
      {showAdmin && (
        <AdminConsole
          user={user}
          onClose={() => setShowAdmin(false)}
        />
      )}
      {showPartner && (
        <PartnerDashboard
          user={user}
          placeId={partnerPlaceId}
          onClose={() => setShowPartner(false)}
        />
      )}
      {tab === "humidor" && (
        <Humidor
          user={user}
          onSmokeOne={(cigar) => { setCheckingIn(cigar); }}
          onSearchToAdd={() => { setTab("search"); }}
          isPremium={isPremium}
          onUpgrade={() => setUpgradeFeature("band_scanner")}
        />
      )}
      {tab === "venues" && <Venues />}
      <nav style={s.nav}>
        {[["search", "🔍", "Search"], ["profile", "👤", "Me"], ["wishlist", "🔖", "Wishlist"], ["humidor", "🚬", "Humidor"]].map(([id, icon, label]) => (
          <button key={id} style={s.navBtn(tab === id)} onClick={() => setTab(id)}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
        <button style={s.navBtn(tab === "venues")} onClick={() => setTab("venues")}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="9" width="18" height="13" rx="1" fill={tab === "venues" ? "#c9a84c" : "#5a4535"}/>
              <polygon points="1,9 23,9 21,5 3,5" fill={tab === "venues" ? "#c9a84c" : "#5a4535"}/>
              <line x1="7" y1="5" x2="6" y2="9" stroke="#a07830" strokeWidth="0.8"/>
              <line x1="11" y1="5" x2="10" y2="9" stroke="#a07830" strokeWidth="0.8"/>
              <line x1="15" y1="5" x2="14" y2="9" stroke="#a07830" strokeWidth="0.8"/>
              <line x1="19" y1="5" x2="18" y2="9" stroke="#a07830" strokeWidth="0.8"/>
              <rect x="9" y="15" width="6" height="7" rx="0.5" fill="#1a0f08"/>
              <rect x="3" y="11" width="4" height="3" rx="0.5" fill="#1a0f08"/>
              <rect x="17" y="11" width="4" height="3" rx="0.5" fill="#1a0f08"/>
            </svg>
          </span>
          <span>Venues</span>
        </button>
      </nav>
    </div>
  );
}
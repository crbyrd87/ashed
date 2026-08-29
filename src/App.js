import React, { useState, useEffect, useRef } from "react";
import { SANS, color, type } from "./theme";
import { Icon } from "./ui";
import Auth from "./Auth";
import { supabase } from "./supabase";
import { FLAVOR_TAG_NAMES } from "./flavors";
import { useBackDismiss } from "./useBackDismiss";
import { searchCigarLines, getVitolas } from "./cigarAI";
import CheckIn from "./CheckIn";
import BandScanner from "./BandScanner";
import Recommendations from "./Recommendations";
import Humidor from "./Humidor";
import Pairings from "./Pairings";
import Friends from "./Friends";
import Feed from "./Feed";
import Badges from "./Badges";
import { checkAndAwardBadges, fetchUserBadges, sortByDisplayPriority } from "./badgeEngine";
import { parseLocalDate, formatSmokeDate, checkinDate } from "./dateUtils";
import Venues from "./Venues";
import Notifications from "./Notifications";
import { fetchUnreadCount } from "./notificationHelpers";
import AdminConsole from "./AdminConsole";
import PartnerDashboard from "./PartnerDashboard";
import UpgradePrompt from "./UpgradePrompt";
import OnboardingTour from "./OnboardingTour";
import Settings from "./Settings";
import CigarSubmitModal from "./CigarSubmitModal";

const strengthColor = s => ({ "Mild": "#a8c5a0", "Mild-Medium": "#b8d4a0", "Medium": "#d4b483", "Medium-Full": "#c4894a", "Full": color.danger }[s] || "#888");

// checkins.rating stores a 0-10 score; the UI is a 5-flame scale, so halve it.
// Returns a 2-decimal string, or null when nothing has been rated yet.
// Check-ins with no rating are excluded rather than counted as zero.
const avgFlames = (checkins) => {
  const rated = (checkins || []).filter(c => c.rating != null);
  if (!rated.length) return null;
  return (rated.reduce((a, c) => a + c.rating, 0) / rated.length / 2).toFixed(2);
};

const Badge = ({ label, tint = color.goldLegacy }) => (
  <span style={{ background: tint + "22", color: tint, border: `1px solid ${tint}55`, borderRadius: 20, padding: "2px 10px", fontSize: type.xs, fontWeight: 600 }}>{label}</span>
);

const ScoreBar = ({ rating }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <div style={{ width: 60, height: 6, background: "#3a2a1a", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${rating}%`, height: "100%", background: `linear-gradient(90deg, ${color.goldLegacy}, ${color.goldPale})`, borderRadius: 3 }} />
    </div>
    <span style={{ color: color.goldLegacy, fontSize: 14, fontWeight: 700 }}>{rating}</span>
  </div>
);

const LoungeScene = () => (
  <svg viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%" }}>
    {/* Background - warm dark lounge */}
    <rect width="420" height="220" fill={color.surfaceDeep} />
    {/* Back wall wood paneling */}
    <rect x="0" y="0" width="420" height="140" fill={color.surfaceAlt} />
    <rect x="0" y="0" width="420" height="3" fill={color.goldLegacy} opacity="0.3" />
    {/* Wood panel lines */}
    {[60,120,180,240,300,360].map(x => (
      <line key={x} x1={x} y1="0" x2={x} y2="140" stroke={color.surfaceDeep} strokeWidth="1.5" opacity="0.5" />
    ))}
    {/* Ambient ceiling light glow */}
    <ellipse cx="210" cy="0" rx="160" ry="60" fill={color.goldLegacy} opacity="0.06" />
    {/* Table */}
    <ellipse cx="210" cy="175" rx="100" ry="22" fill="#3a1e0a" />
    <ellipse cx="210" cy="172" rx="98" ry="20" fill="#4a2810" />
    <rect x="112" y="172" width="196" height="8" fill="#5a3418" />
    {/* Table leg */}
    <rect x="200" y="180" width="20" height="40" fill="#3a1e0a" />
    {/* Ashtray */}
    <ellipse cx="210" cy="170" rx="28" ry="8" fill={color.surfaceAlt} />
    <ellipse cx="210" cy="168" rx="25" ry="6" fill="#221006" stroke="#5a3510" strokeWidth="1" />
    {/* Resting cigar in ashtray */}
    <rect x="188" y="165" width="44" height="6" rx="3" fill="#5a3520" transform="rotate(-5 210 168)" />
    <rect x="188" y="166" width="39" height="4" rx="2" fill="#7a4a28" transform="rotate(-5 210 168)" />
    <rect x="224" y="164" width="8" height="6" rx="1" fill={color.goldLegacy} opacity="0.8" transform="rotate(-5 210 168)" />
    {/* Cigar smoke from ashtray */}
    <path d="M232 162 Q235 150 231 138 Q234 148 238 140 Q236 152 239 160" stroke={color.heading} strokeWidth="1.2" fill="none" opacity="0.12" />
    {/* Woman - left side */}
    {/* Body/dress */}
    <ellipse cx="120" cy="200" rx="38" ry="50" fill={color.surfaceDeep} />
    <path d="M85 155 Q90 120 120 115 Q150 120 155 155 Q145 160 120 162 Q95 160 85 155Z" fill="#3a1e2e" />
    {/* Woman head */}
    <circle cx="120" cy="100" r="22" fill="#c8a882" />
    {/* Hair */}
    <ellipse cx="120" cy="88" rx="22" ry="14" fill={color.surfaceAlt} />
    <path d="M98 100 Q94 120 96 135" stroke={color.surfaceAlt} strokeWidth="8" fill="none" strokeLinecap="round" />
    <path d="M142 100 Q146 120 144 135" stroke={color.surfaceAlt} strokeWidth="8" fill="none" strokeLinecap="round" />
    {/* Woman face */}
    <circle cx="113" cy="102" r="2.5" fill="#5a3020" />
    <circle cx="127" cy="102" r="2.5" fill="#5a3020" />
    <path d="M114 112 Q120 116 126 112" stroke="#c87060" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* Woman arm holding cigar */}
    <path d="M148 135 Q165 148 172 155" stroke="#c8a882" strokeWidth="8" fill="none" strokeLinecap="round" />
    {/* Woman's cigar */}
    <rect x="168" y="150" width="30" height="5" rx="2.5" fill="#7a4a28" transform="rotate(20 183 152)" />
    <rect x="194" y="149" width="6" height="5" rx="1" fill={color.goldLegacy} opacity="0.8" transform="rotate(20 183 152)" />
    {/* Woman cigar smoke */}
    <path d="M200 144 Q204 132 200 120 Q204 130 208 122 Q205 134 208 142" stroke={color.heading} strokeWidth="1" fill="none" opacity="0.15" />
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
    <path d="M294 107 Q300 110 306 107" stroke={color.surfaceAlt} strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Man arm */}
    <path d="M265 138 Q248 148 242 156" stroke="#b08060" strokeWidth="9" fill="none" strokeLinecap="round" />
    {/* Man's cigar */}
    <rect x="210" y="152" width="34" height="6" rx="3" fill="#6a3a20" transform="rotate(-15 227 155)" />
    <rect x="210" y="153" width="29" height="4" rx="2" fill="#8a4a28" transform="rotate(-15 227 155)" />
    <rect x="208" y="151" width="8" height="6" rx="1" fill={color.goldLegacy} opacity="0.8" transform="rotate(-15 227 155)" />
    {/* Lit end glow */}
    <circle cx="213" cy="157" r="5" fill={color.alert} opacity="0.6" />
    <circle cx="213" cy="157" r="3" fill="#ffc060" opacity="0.5" />
    {/* Man cigar smoke */}
    <path d="M211 150 Q207 138 211 124 Q207 136 203 126 Q206 138 203 148" stroke={color.heading} strokeWidth="1.2" fill="none" opacity="0.18" />
    {/* Whiskey glasses */}
    <rect x="165" y="152" width="16" height="18" rx="2" fill={color.goldLegacy} opacity="0.25" />
    <rect x="166" y="153" width="14" height="6" fill={color.goldLegacy} opacity="0.3" />
    <rect x="242" y="152" width="16" height="18" rx="2" fill={color.goldLegacy} opacity="0.25" />
    <rect x="243" y="153" width="14" height="6" fill={color.goldLegacy} opacity="0.3" />
    {/* Warm light overlay at bottom */}
    <rect x="0" y="140" width="420" height="80" fill="#3a1e0a" opacity="0.4" />
    {/* Gradient overlay for text readability */}
    <rect x="0" y="100" width="420" height="120" fill="url(#fadeDown)" opacity="0.5" />
    <defs>
      <linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color.surfaceDeep} stopOpacity="0" />
        <stop offset="100%" stopColor={color.surfaceDeep} stopOpacity="1" />
      </linearGradient>
    </defs>
  </svg>
);

function AdvancedStats({ checkins }) {

  if (checkins.length === 0) return (
    <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: color.dim, fontFamily: SANS }}>
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
    const d = checkinDate(c);
    if (!d) continue;
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
  const strengthCounts = { Mild: 0, "Mild-Medium": 0, Medium: 0, "Medium-Full": 0, Full: 0 };
  for (const c of checkins) {
    const s = c.cigars?.strength;
    if (s && strengthCounts[s] !== undefined) strengthCounts[s]++;
  }
  const strengthColors = { Mild: "#a8c5a0", "Mild-Medium": "#b8d4a0", Medium: "#d4b483", "Medium-Full": "#c4894a", Full: color.danger };
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
      const d = checkinDate(c);
      return d && d.getMonth() === m.month && d.getFullYear() === m.year && c.rating != null;
    });
    return avgFlames(monthCheckins);
  });

  const cardStyle = { background: color.surfaceCard, border: `1px solid ${color.lineStrong}`, borderRadius: 12, padding: 16, marginBottom: 16 };
  const titleStyle = { fontSize: type.xs, color: color.soft, fontWeight: 600, marginBottom: 16 };

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
                {m.count > 0 && <div style={{ fontSize: type.xs, color: color.goldLegacy, fontWeight: 700 }}>{m.count}</div>}
                <div style={{ width: "100%", borderRadius: "3px 3px 0 0", height: m.count === 0 ? 2 : `${Math.max(pct, 4)}%`, background: m.count === 0 ? color.surfaceRaised : `linear-gradient(180deg, ${color.goldLegacy}ff 0%, ${color.goldLegacy}99 100%)`, opacity: m.count === 0 ? 0.3 : 1 }} />
                <div style={{ fontSize: type.xs, color: color.dimAlt }}>{m.label}</div>
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
                <div style={{ fontSize: 14, fontWeight: 700, color: monthlyRatings[i] ? color.goldLegacy : color.lineStrong }}>
                  {monthlyRatings[i] ?? "—"}
                </div>
                <div style={{ fontSize: type.xs, color: color.dimAlt, marginTop: 4 }}>{m.label}</div>
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
              <div key={s} style={{ flex: count || 1, height: 28, background: count > 0 ? strengthColors[s] + "88" : color.surfaceRaised, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", transition: "flex 0.3s" }}>
                {count > 0 && <span style={{ fontSize: type.xs, fontWeight: 700, color: strengthColors[s] }}>{pct}%</span>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(strengthCounts).map(([s, count]) => (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: type.xs, color: strengthColors[s], fontWeight: count > 0 ? 700 : 400 }}>{s.replace("Medium-Full", "Med-Full")}</div>
              <div style={{ fontSize: type.xs, color: color.dim }}>{count}</div>
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
              <div style={{ fontSize: type.xs, color: color.dim, width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: color.heading, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brand}</div>
                <div style={{ height: 5, background: color.surfaceRaised, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((count / maxBrand) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${color.goldLegacy}, ${color.goldPale})`, borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ fontSize: type.xs, fontWeight: 700, color: color.goldLegacy, flexShrink: 0 }}>{count}</div>
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
                <div style={{ fontSize: 13, color: color.heading, marginBottom: 4 }}>{origin}</div>
                <div style={{ height: 5, background: color.surfaceRaised, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((count / maxOrigin) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${color.green}, ${color.greenPale})`, borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ fontSize: type.xs, fontWeight: 700, color: color.green, flexShrink: 0 }}>{count}</div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

const APP_VERSION = "0.9.2";

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
  const [humidorItemId, setHumidorItemId] = useState(null);
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [partnerPlaceId, setPartnerPlaceId] = useState(null);
  const [showPartner, setShowPartner] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [upgradeFeature, setUpgradeFeature] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showCigarSubmit, setShowCigarSubmit] = useState(false); // which feature triggered the prompt
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


  const uniqueNames = [...new Set(checkins.map(c => c.cigars?.line || c.cigar_name).filter(Boolean))].sort();
  const uniqueBrands = [...new Set(checkins.map(c => c.cigars?.brand || c.cigar_brand).filter(Boolean))].sort();

  const filteredNames = filterName ? uniqueNames.filter(n => n.toLowerCase().includes(filterName.toLowerCase())) : uniqueNames;
  const filteredBrands = filterBrand ? uniqueBrands.filter(b => b.toLowerCase().includes(filterBrand.toLowerCase())) : uniqueBrands;
  const [filterScoreMin, setFilterScoreMin] = useState(0);
  const [filterScoreMax, setFilterScoreMax] = useState(10);
  const [filterValue, setFilterValue] = useState([]);
  const [filterWouldSmoke, setFilterWouldSmoke] = useState([]);
  const [toast, setToast] = useState(null);
  const [purchasedItem, setPurchasedItem] = useState(null);
  const [purchasedQty, setPurchasedQty] = useState(1);
  const [purchasedVitola, setPurchasedVitola] = useState("");
  const [wishlistVitolaPicker, setWishlistVitolaPicker] = useState(null);
  const [wishlistVitolaOptions, setWishlistVitolaOptions] = useState([]);
  const [wishlistVitolaLoading, setWishlistVitolaLoading] = useState(false);

  // Back closes whatever is on top rather than leaving the app. Registered
  // here, at the component's top level, because hooks cannot be called from
  // inside the conditional blocks that render these overlays.
  //
  // Deliberately excluded: the disclaimer, the welcome screen and the tour,
  // which are gates the user is meant to complete rather than escape; and the
  // filter drawer, which expands inline rather than covering the screen.
  useBackDismiss(showBandScanner, () => setShowBandScanner(false));
  useBackDismiss(showRecommendations, () => setShowRecommendations(false));
  useBackDismiss(showPairings, () => { setShowPairings(false); setPairingsCigar(null); });
  useBackDismiss(showFriends, () => setShowFriends(false));
  useBackDismiss(showNotifications, () => setShowNotifications(false));
  useBackDismiss(showAdmin, () => setShowAdmin(false));
  useBackDismiss(showPartner, () => setShowPartner(false));
  useBackDismiss(showSettings, () => setShowSettings(false));
  useBackDismiss(showWhatsNew, () => setShowWhatsNew(false));
  useBackDismiss(showCigarSubmit, () => setShowCigarSubmit(false));
  useBackDismiss(!!upgradeFeature, () => setUpgradeFeature(null));
  useBackDismiss(!!purchasedItem, () => setPurchasedItem(null));
  useBackDismiss(!!wishlistVitolaPicker, () => setWishlistVitolaPicker(null));
  useBackDismiss(!!checkingIn, () => setCheckingIn(null));

  // The cigar detail view. selectedLine is set at the same moment as selected
  // in handleLineSelect, so this is one navigation step rather than two — the
  // line is bookkeeping for which detail is open, not a level above it. This
  // mirrors the detail view's own handleBack exactly.
  useBackDismiss(!!selected, () => {
    setSelected(null);
    if (selected?._isLine) { setSelectedLine(null); setVitolas([]); setQuery(""); }
  });

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

  // Badge pips in the Me header come from real awards, never a hardcoded label.
  // Ordered by BADGE_DISPLAY_ORDER so the hardest-won badge is worn; the header
  // shows only the first. The name column is ~130px wide because Friends and the
  // bell share the row, so a second pip wraps and grows the header past the avatar.
  const refreshEarnedBadges = async () => {
    if (!user) return;
    const all = await fetchUserBadges(user.id);
    setEarnedBadges(sortByDisplayPriority((all || []).filter(b => b.earned)));
  };

  const refreshIsAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("users")
      .select("is_admin, is_partner, partner_place_id, is_premium, disclaimer_accepted, is_super_admin, is_moderator, first_login_complete, tour_completed, last_seen_version")
      .eq("id", user.id)
      .single();
    setIsAdmin(data?.is_admin || false);
    setIsSuperAdmin(data?.is_super_admin || false);
    setIsModerator(data?.is_moderator || false);
    setIsPartner(data?.is_partner || false);
    setPartnerPlaceId(data?.partner_place_id || null);
    setIsPremium(data?.is_premium || false);
    if (data && !data.disclaimer_accepted) setShowDisclaimer(true);
    else if (data && !data.first_login_complete) setShowWelcome(true);
    else if (data && !data.tour_completed) setShowTour(true);
    else if (data && data.last_seen_version && data.last_seen_version !== APP_VERSION) setShowWhatsNew(true);
  };

  useEffect(() => {
    if (!user) return;
    refreshPendingFriendCount();
    refreshUnreadNotifCount();
    refreshIsAdmin();
    refreshEarnedBadges();
    processReferral(user);
    // Poll unread count every 60 seconds
    const interval = setInterval(refreshUnreadNotifCount, 30000);
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
        .select("*, cigars(brand, line, vitola, strength, origin, avg_rating, verified, rejection_reason), ratings(value_for_price, would_smoke_again)")
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

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleAcceptDisclaimer = async () => {
    setShowDisclaimer(false);
    await supabase.from("users").update({ disclaimer_accepted: true }).eq("id", user.id);
    setShowWelcome(true);
  };

  const handleAcceptWelcome = async () => {
    setShowWelcome(false);
    setShowTour(true);
    await supabase.from("users").update({ first_login_complete: true }).eq("id", user.id);
  };

  const handleCompleteTour = async () => {
    setShowTour(false);
    setTab("profile");
    await supabase.from("users").update({ tour_completed: true, last_seen_version: APP_VERSION }).eq("id", user.id);
  };

  const handleDismissWhatsNew = async () => {
    setShowWhatsNew(false);
    await supabase.from("users").update({ last_seen_version: APP_VERSION }).eq("id", user.id);
  };

  const handleReplayTour = () => {
    setShowSettings(false);
    setShowTour(true);
  };

  const handleCigarSubmitted = (cigar) => {
    setShowCigarSubmit(false);
    setCheckingIn(cigar);
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
    app: { fontFamily: SANS, background: color.bg, minHeight: "100vh", color: color.heading, maxWidth: 420, margin: "0 auto", paddingBottom: 70 },
    header: { background: `linear-gradient(180deg, ${color.surfaceWarm} 0%, ${color.bg} 100%)`, padding: "20px 20px 12px", borderBottom: `1px solid ${color.lineStrong}`, display: "flex", justifyContent: "space-between", alignItems: "center" },
    nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: color.bg, borderTop: `1px solid ${color.lineStrong}`, display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100, padding: "0 4px" },
    navBtn: a => ({ flex: 1, padding: "8px 0", background: "none", border: "none", borderTop: a ? `2px solid ${color.gold}` : "2px solid transparent", color: color.gold, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, textTransform: "uppercase", fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, letterSpacing: 0 }),
    card: { background: `linear-gradient(135deg, ${color.surfaceRaised} 0%, ${color.surfaceCard} 100%)`, border: `1px solid ${color.lineStrong}`, borderRadius: 10, marginBottom: 10, cursor: "pointer", overflow: "hidden" },
    input: { width: "100%", background: color.surfaceRaised, border: `1px solid ${searching ? color.green : color.faintAlt}`, borderRadius: showDropdown && searchResults.length > 0 ? "8px 8px 0 0" : "8px", padding: "10px 14px", color: color.heading, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" },
    statBox: { background: color.surfaceRaised, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: "14px 18px", flex: 1, textAlign: "center" },
    logoutBtn: { background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 20, padding: "4px 12px", color: color.tan, fontSize: type.xs, cursor: "pointer", fontFamily: SANS },
    dropdown: { position: "absolute", top: "100%", left: 0, right: 0, background: color.surfaceRaised, border: `1px solid ${color.faintAlt}`, borderTop: "none", borderRadius: "0 0 10px 10px", zIndex: 50, overflow: "hidden", maxHeight: 300, overflowY: "auto" },
    dropdownItem: { padding: "12px 14px", cursor: "pointer", borderBottom: `1px solid ${color.lineStrong}33` },
    sortBtn: a => ({ padding: "4px 12px", borderRadius: 20, border: `1px solid ${a ? color.goldLegacy : color.lineStrong}`, background: a ? `${color.goldLegacy}22` : "transparent", color: a ? color.goldLegacy : color.tan, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }),
  };

  if (authLoading) return (
    <div style={{ background: color.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: color.goldLegacy, fontFamily: SANS, fontSize: 16, letterSpacing: 2 }}>
      Loading...
    </div>
  );

  if (!user) return <Auth onLogin={() => supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user))} />;

  if (selected) {
    const c = selected;
    const isLine = !!c._isLine;

    // Compute strength display for line mode
    const STRENGTH_ORDER = ["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"];
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
        <div style={{ position: "relative", height: 140 }}>
          <div style={{ width: "100%", height: "100%" }}><LoungeScene /></div>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${color.bg}44 0%, ${color.bg} 100%)` }} />
          <button onClick={handleBack} style={{ position: "absolute", top: 16, left: 16, background: `${color.bg}bb`, border: `1px solid ${color.lineStrong}`, color: color.goldLegacy, fontSize: type.xs, cursor: "pointer", padding: "6px 12px", borderRadius: 20, fontFamily: SANS }}>← Back</button>
          {!isLine && c.smoked && <div style={{ position: "absolute", top: 16, right: 16, background: `${color.goldLegacy}dd`, color: color.bg, fontSize: type.xs, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>SMOKED</div>}
          {/* Brand + Line overlapping image at bottom */}
          <div style={{ position: "absolute", bottom: 12, left: 20, right: 20 }}>
            <div style={{ fontSize: type.xs, color: `${color.soft}99`, letterSpacing: 2, textTransform: "uppercase" }}>{c.brand}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: color.heading, margin: "2px 0 0", textShadow: `0 1px 4px ${color.bg}` }}>{c.line}</div>
          </div>
        </div>

        <div style={{ padding: "0 20px 30px" }}>
          {/* Line-level badges — wrapper, strength, origin */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, marginTop: 12 }}>
            {wrapper && <Badge label={wrapper} color={color.goldDeep} />}
            {strengthDisplay && <Badge label={strengthDisplay} color={strengthColor(strengthValues[0] || c.strength)} />}
            {origin && <Badge label={origin} color={color.green} />}
          </div>

          {/* Critic score */}
          {!isLine && c.rating && <><ScoreBar rating={c.rating} /><div style={{ fontSize: type.xs, color: color.tan, marginTop: 4, marginBottom: 20 }}>CRITIC SCORE</div></>}

          {/* Community rating */}
          {communityRating && (
            <div style={{ background: color.surfaceRaised, border: `1px solid ${color.lineStrong}`, borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
              {/* Header row — always visible, tappable */}
              <div
                onClick={() => communityRating.ready && setShowVitolaBreakdown(p => !p)}
                style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: communityRating.ready ? "pointer" : "default" }}
              >
                <div>
                  <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 4 }}>ASHED COMMUNITY</div>
                  {communityRating.ready ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: "#3a2a1a", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${communityRating.avg * 10}%`, height: "100%", background: `linear-gradient(90deg, ${color.green}, ${color.greenPale})`, borderRadius: 3 }} />
                      </div>
                      <span style={{ color: color.green, fontSize: 18, fontWeight: 700 }}>{communityRating.avg}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: type.xs, color: color.faintAlt, fontStyle: "italic" }}>No ratings yet</div>
                  )}
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ fontSize: type.xs, color: color.soft }}>{communityRating.count} {communityRating.count === 1 ? "rating" : "ratings"}</div>
                  {communityRating.ready && (
                    <span style={{ fontSize: type.xs, color: color.tan }}>{showVitolaBreakdown ? "▲" : "▼"} by vitola</span>
                  )}
                </div>
              </div>

              {/* Vitola breakdown — expandable */}
              {showVitolaBreakdown && communityRating.vitolas?.length > 0 && (
                <div style={{ borderTop: `1px solid ${color.lineStrong}33`, padding: "10px 16px 14px" }}>
                  {communityRating.vitolas.map((v, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < communityRating.vitolas.length - 1 ? 10 : 0 }}>
                      <div style={{ fontSize: type.xs, color: color.soft, width: 110, flexShrink: 0 }}>{v.vitola}</div>
                      <div style={{ flex: 1, height: 5, background: "#3a2a1a", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${v.avg * 10}%`, height: "100%", background: `linear-gradient(90deg, ${color.green}, ${color.greenPale})`, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: color.green, width: 32, textAlign: "right" }}>{v.avg}</span>
                      <span style={{ fontSize: type.xs, color: color.faintAlt, width: 24, textAlign: "right" }}>×{v.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tasting notes */}
          {tastingNotes && (
            <div style={{ background: color.surfaceRaised, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 2, marginBottom: 8 }}>TASTING NOTES</div>
              <div style={{ fontSize: 14, color: color.soft, lineHeight: 1.6 }}>{tastingNotes}</div>
            </div>
          )}

          {/* LINE MODE: vitola list with Log buttons */}
          {isLine && (
            <div style={{ marginBottom: 16 }}>

              {/* Drink Pairings strip — above vitola list */}
              <button
                onClick={() => { if (isPremium) { setPairingsCigar(firstVitola); setShowPairings(true); } else { setUpgradeFeature("pairings"); } }}
                style={{ width: "100%", background: color.surfaceRaised, border: `1px solid ${color.partner}44`, borderRadius: 10, padding: "10px 16px", color: color.partner, fontSize: 13, cursor: "pointer", fontFamily: SANS, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon.Drink size={16} color={color.textMuted} />
                  <span style={{ fontWeight: 600 }}>Drink Pairings</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {!isPremium && <span style={{ fontSize: type.xs, background: `${color.partner}22`, border: `1px solid ${color.partner}55`, borderRadius: 8, padding: "1px 6px" }}>PRO</span>}
                  <span style={{ fontSize: 16, color: color.dim }}>›</span>
                </span>
              </button>

              <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 10 }}>SELECT A VITOLA</div>
              {violasLoading && vitolas.length === 0 && (
                <div style={{ fontSize: type.xs, color: color.green, marginBottom: 10 }}>Loading sizes...</div>
              )}
              {vitolas.map((v, i) => {
                const mixedStrengths = strengthValues.length > 1;
                return (
                  <div key={i} style={{ background: color.surfaceRaised, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                    {/* Vitola name + size + strength */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: color.heading }}>{v.vitola}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                          
                          {mixedStrengths && v.strength && <Badge label={v.strength} color={strengthColor(v.strength)} />}
                        </div>
                      </div>
                      <button
                        onClick={() => setCheckingIn(v)}
                        style={{ background: `linear-gradient(135deg, ${color.goldLegacy}, ${color.goldDeep})`, border: "none", borderRadius: 8, padding: "8px 22px", color: color.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}
                      >
                        Log this smoke
                      </button>
                    </div>
                    {/* Wishlist + Humidor per vitola */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => handleAddToWishlist(v)}
                        style={{ flex: 1, background: isOnWishlist(v) ? `${color.goldLegacy}22` : "none", border: `1px solid ${isOnWishlist(v) ? color.goldLegacy : color.tan}`, borderRadius: 8, padding: "6px 0", color: isOnWishlist(v) ? color.goldLegacy : color.soft, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}
                      >
                        {isOnWishlist(v) ? "Wishlisted" : "+ Wishlist"}
                      </button>
                      <button
                        onClick={() => handleAddToHumidor(v)}
                        style={{ flex: 1, background: isInHumidor(v) ? `${color.green}22` : "none", border: `1px solid ${isInHumidor(v) ? color.green : color.tan}`, borderRadius: 8, padding: "6px 0", color: isInHumidor(v) ? color.green : color.soft, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}
                      >
                        {isInHumidor(v) ? "In humidor" : "+ Humidor"}
                      </button>
                    </div>
                  </div>
                );
              })}
              {violasLoading && vitolas.length > 0 && (
                <div style={{ fontSize: type.xs, color: color.green, textAlign: "center", padding: "8px 0" }}>Finding more sizes...</div>
              )}
            </div>
          )}

          {/* SINGLE VITOLA MODE: original buttons */}
          {!isLine && (
            c.smoked ? (
              <div style={{ background: color.surfaceRaised, border: `1px solid ${color.goldLegacy}44`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: type.xs, color: color.goldLegacy, letterSpacing: 2, marginBottom: 10 }}>YOUR REVIEW · {c.smokedDate}</div>
                <ScoreBar rating={c.userRating} />
                <div style={{ fontSize: 14, color: color.soft, lineHeight: 1.6, fontStyle: "italic", marginTop: 10 }}>"{c.notes}"</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button style={{ width: "100%", background: `linear-gradient(135deg, ${color.goldLegacy}, ${color.goldDeep})`, border: "none", borderRadius: 10, padding: 14, color: color.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 2, fontFamily: SANS }} onClick={() => setCheckingIn(c)}>
                  + LOG THIS SMOKE
                </button>
                <button
                  onClick={() => { if (isPremium) { setPairingsCigar(c); setShowPairings(true); } else { setUpgradeFeature("pairings"); } }}
                  style={{ width: "100%", background: "none", border: `1px solid ${color.partner}55`, borderRadius: 10, padding: 12, color: color.partner, fontSize: 13, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  Drink pairings {!isPremium && <span style={{ fontSize: type.xs, background: `${color.partner}22`, border: `1px solid ${color.partner}55`, borderRadius: 8, padding: "1px 6px" }}>PRO</span>}
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleAddToWishlist(c)}
                    style={{ flex: 1, background: isOnWishlist(c) ? `${color.goldLegacy}22` : "none", border: `1px solid ${isOnWishlist(c) ? color.goldLegacy : color.lineStrong}`, borderRadius: 10, padding: 12, color: isOnWishlist(c) ? color.goldLegacy : color.tan, fontSize: type.xs, cursor: isOnWishlist(c) ? "default" : "pointer", fontFamily: SANS }}
                  >
                    {isOnWishlist(c) ? "Wishlisted" : "+ Wishlist"}
                  </button>
                  <button
                    onClick={() => handleAddToHumidor(c)}
                    style={{ flex: 1, background: isInHumidor(c) ? `${color.green}22` : "none", border: `1px solid ${isInHumidor(c) ? color.green : color.lineStrong}`, borderRadius: 10, padding: 12, color: isInHumidor(c) ? color.green : color.tan, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}
                  >
                    {isInHumidor(c) ? "In humidor" : "+ Humidor"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {checkingIn && <CheckIn cigar={checkingIn} user={user} onClose={() => { setCheckingIn(null); setHumidorItemId(null); }} onSaved={async () => {
          if (humidorItemId) {
            const { data: hItem } = await supabase.from("humidor").select("id, quantity").eq("id", humidorItemId).single();
            if (hItem) {
              if (hItem.quantity <= 1) await supabase.from("humidor").delete().eq("id", humidorItemId);
              else await supabase.from("humidor").update({ quantity: hItem.quantity - 1 }).eq("id", humidorItemId);
            }
            setHumidorItemId(null);
          }
          setCheckingIn(null); setSelected(null); setQuery(""); setSelectedLine(null); setVitolas([]); refreshCheckins();
        }} />}
        {showPairings && pairingsCigar && (
          <Pairings
            cigar={pairingsCigar}
            user={user}
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon.Flame size={22} />
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", background: "linear-gradient(to right, #cc2200 0%, #ff6600 50%, #ffcc00 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Ashed</span>
          </div>
          <div style={{ fontSize: type.xs, color: color.gold, letterSpacing: 3, marginTop: 2, fontWeight: 600, opacity: 0.8 }}>CIGAR JOURNAL & COMMUNITY</div>
        </div>
        <button onClick={() => setShowSettings(true)}
          style={{ background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 20, padding: "6px 12px", color: color.tan, fontSize: 20, cursor: "pointer", fontFamily: SANS }}>
          <Icon.Settings size={17} color={color.textMuted} />
        </button>
      </div>

      {tab === "search" && (
        <div style={{ padding: 16, position: "sticky", top: 0, background: color.bg, zIndex: 20 }}>
          {!query && !selectedLine && (
            <div style={{ fontSize: type.xs, color: color.dim, letterSpacing: 1, marginBottom: 8, textAlign: "center" }}>
              Search below to find a cigar or log a smoke
            </div>
          )}
          <div style={{ position: "relative" }}>
            <input
              id="cigar-search-input"
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
                  <div style={{ padding: "12px 14px", fontSize: type.xs, color: color.green }}>Searching...</div>
                )}
                {!searching && searchResults.length === 0 && query.length >= 2 && (
                  <div style={{ padding: "10px 14px" }}>
                    <div style={{ fontSize: type.xs, color: color.dim, marginBottom: 8 }}>No results found</div>
                    <button
                      onMouseDown={() => { setShowDropdown(false); setShowCigarSubmit(true); }}
                      style={{ width: "100%", background: `${color.goldLegacy}22`, border: `1px solid ${color.goldLegacy}55`, borderRadius: 8, padding: "8px 12px", color: color.goldLegacy, fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS, textAlign: "left" }}>
                      + Can't find your cigar? Submit it →
                    </button>
                  </div>
                )}
                {searchResults.map((c, i) => (
                  <div key={i} style={s.dropdownItem} onMouseDown={() => handleLineSelect(c)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: color.heading }}>{c.line}</div>
                        <div style={{ fontSize: type.xs, color: color.tan, marginTop: 2 }}>{c.brand}</div>
                      </div>
                      {c.avg_rating && <span style={{ fontSize: 14, fontWeight: 700, color: color.goldLegacy }}>{c.avg_rating}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scan Band and Recommendations buttons — shown when no search active */}
          {!query && !selectedLine && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => isPremium ? setShowBandScanner(true) : setUpgradeFeature("band_scanner")}
                  style={{ flex: 1, background: color.surfaceRaised, border: `1px solid ${color.greenBright}55`, borderRadius: 10, padding: 14, color: color.greenBright, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  Scan a band {!isPremium && <span style={{ fontSize: type.xs, background: `${color.greenBright}22`, border: `1px solid ${color.greenBright}55`, borderRadius: 8, padding: "1px 6px", marginLeft: 4 }}>PRO</span>}
                </button>
                <button
                  onClick={() => isPremium ? setShowRecommendations(true) : setUpgradeFeature("recommendations")}
                  style={{ flex: 1, background: color.surfaceRaised, border: `1px solid ${color.greenBright}55`, borderRadius: 10, padding: 14, color: color.greenBright, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  Recommendation {!isPremium && <span style={{ fontSize: type.xs, background: `${color.greenBright}22`, border: `1px solid ${color.greenBright}55`, borderRadius: 8, padding: "1px 6px", marginLeft: 4 }}>PRO</span>}
                </button>
              </div>
            </div>
          )}

          {!selectedLine && !query && (
            <Feed user={user} />
          )}
        </div>
      )}

      {tab === "profile" && (
        <div style={{ padding: 16 }}>
          {/* User header, two rows.
              Row 1 is identity only. With the avatar, both buttons and three
              gaps sharing one row, the name column was down to ~130px on a
              420px screen — narrower than the handle line needs, so anything
              in it wrapped. Nothing competes with the name here now.
              Row 2 carries the badges and the two quick actions. */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0 12px" }}>
            <div style={{ width: 64, height: 64, flex: "0 0 64px", borderRadius: "50%", background: `linear-gradient(135deg, ${color.goldLegacy}, ${color.cedar})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}><Icon.Friends size={28} color={color.bg} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: color.heading }}>{displayName}</div>
              <div style={{ fontSize: type.xs, color: color.tan }}>{username ? `@${username} · ` : ""}Member since {new Date(user.created_at).getFullYear()}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${color.lineStrong}` }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {earnedBadges.slice(0, 1).map(b => (
                <Badge key={b.key} label={b.name} color={color.goldLegacy} />
              ))}
              {isPremium && <Badge label="Premium" color={color.goldPale} />}
            </div>
            <button
              onClick={() => { setShowFriends(true); setPendingFriendCount(0); }}
              style={{ background: "none", border: `1px solid ${pendingFriendCount > 0 ? color.goldLegacy : color.lineStrong}`, borderRadius: 20, padding: "6px 14px", color: pendingFriendCount > 0 ? color.goldLegacy : color.tan, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap", position: "relative", flex: "0 0 auto" }}
            >
              Friends
              {pendingFriendCount > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6, background: color.alert, color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: type.xs, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS }}>
                  {pendingFriendCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setShowNotifications(true); setUnreadNotifCount(0); }}
              style={{ background: "none", border: `1px solid ${unreadNotifCount > 0 ? color.goldLegacy : color.lineStrong}`, borderRadius: 20, padding: "6px 12px", color: unreadNotifCount > 0 ? color.goldLegacy : color.tan, fontSize: 16, cursor: "pointer", fontFamily: SANS, position: "relative", lineHeight: 1, flex: "0 0 auto" }}
            >
              <Icon.Bell size={17} color={color.textMuted} />
              {unreadNotifCount > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6, background: color.alert, color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: type.xs, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS }}>
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </button>
          </div>

          {/* Admin/Moderator console button */}
          {(isAdmin || isModerator) && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowAdmin(true)}
                style={{ width: "100%", background: color.surfaceRaised, border: `1px solid ${color.goldLegacy}44`, borderRadius: 10, padding: "10px 16px", color: color.goldLegacy, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", gap: 8 }}
              >
                {isAdmin ? "Admin console" : "Moderation console"}
              </button>
            </div>
          )}

          {/* Partner Dashboard button — only visible to partners */}
          {isPartner && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowPartner(true)}
                style={{ width: "100%", background: color.surfaceRaised, border: `1px solid ${color.partner}44`, borderRadius: 10, padding: "10px 16px", color: color.partner, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", gap: 8 }}
              >
                Partner dashboard
              </button>
            </div>
          )}

          {/* Stat boxes - always visible */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              ["Smoked", checkins.length],
              ["AVG RATING", avgFlames(checkins) ?? "—"],
              ["This Year", checkins.filter(c => parseLocalDate(c.smoke_date)?.getFullYear() === new Date().getFullYear()).length]
            ].map(([k, v]) => (
              <div key={k} style={{ ...s.statBox, padding: "10px 8px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: color.goldLegacy }}>{v}</div>
                <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginTop: 1 }}>{k.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Sub-tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${color.lineStrong}`, marginBottom: 16 }}>
            {[["journal", "Journal"], ["stats", "Stats"], ["badges", "Badges"], ["advanced", "Advanced"]].map(([id, label]) => (
              <button key={id} onClick={() => setProfileTab(id)}
                style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: `2px solid ${profileTab === id ? color.goldLegacy : "transparent"}`, color: profileTab === id ? color.goldLegacy : color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, letterSpacing: 1, fontWeight: profileTab === id ? 700 : 400 }}>
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
                      style={{ background: activeFilterCount > 0 ? `${color.goldLegacy}22` : "none", border: `1px solid ${activeFilterCount > 0 ? color.goldLegacy : color.lineStrong}`, borderRadius: 20, padding: "6px 14px", color: activeFilterCount > 0 ? color.goldLegacy : color.tan, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", gap: 6 }}>
                      Filter {activeFilterCount > 0 ? `(${activeFilterCount} active)` : ""}
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
                <div style={{ background: color.surfaceCard, border: `1px solid ${color.lineStrong}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 2, marginBottom: 16 }}>FILTER SMOKES</div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 6 }}>CIGAR NAME</div>
                    <input style={{ width: "100%", background: color.surfaceRaised, border: `1px solid ${color.faintAlt}`, borderRadius: filterNameOpen && filteredNames.length > 0 ? "8px 8px 0 0" : "8px", padding: "8px 12px", color: color.heading, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
                      placeholder="Search your smokes..." value={filterName}
                      onChange={e => { setFilterName(e.target.value); setFilterNameOpen(true); }}
                      onFocus={() => setFilterNameOpen(true)} onBlur={() => setTimeout(() => setFilterNameOpen(false), 150)} />
                    {filterNameOpen && (
                      <div style={{ background: color.surfaceRaised, border: `1px solid ${color.faintAlt}`, borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 150, overflowY: "auto" }}>
                        {filteredNames.length === 0 ? <div style={{ padding: "10px 12px", fontSize: type.xs, color: color.dim }}>No logged smokes found</div>
                          : filteredNames.map(n => <div key={n} style={{ padding: "10px 12px", fontSize: 13, color: color.heading, cursor: "pointer", borderBottom: `1px solid ${color.lineStrong}33` }} onMouseDown={() => { setFilterName(n); setFilterNameOpen(false); }}>{n}</div>)}
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 6 }}>BRAND</div>
                    <input style={{ width: "100%", background: color.surfaceRaised, border: `1px solid ${color.faintAlt}`, borderRadius: filterBrandOpen && filteredBrands.length > 0 ? "8px 8px 0 0" : "8px", padding: "8px 12px", color: color.heading, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
                      placeholder="Search your brands..." value={filterBrand}
                      onChange={e => { setFilterBrand(e.target.value); setFilterBrandOpen(true); }}
                      onFocus={() => setFilterBrandOpen(true)} onBlur={() => setTimeout(() => setFilterBrandOpen(false), 150)} />
                    {filterBrandOpen && (
                      <div style={{ background: color.surfaceRaised, border: `1px solid ${color.faintAlt}`, borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 150, overflowY: "auto" }}>
                        {filteredBrands.length === 0 ? <div style={{ padding: "10px 12px", fontSize: type.xs, color: color.dim }}>No logged smokes found</div>
                          : filteredBrands.map(b => <div key={b} style={{ padding: "10px 12px", fontSize: 13, color: color.heading, cursor: "pointer", borderBottom: `1px solid ${color.lineStrong}33` }} onMouseDown={() => { setFilterBrand(b); setFilterBrandOpen(false); }}>{b}</div>)}
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 8 }}>TASTING NOTES</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {FLAVOR_TAG_NAMES.map(tag => (
                        <button key={tag} onClick={() => setFilterNoteTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                          style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${filterNoteTags.includes(tag) ? color.goldLegacy : color.lineStrong}`, background: filterNoteTags.includes(tag) ? `${color.goldLegacy}22` : "transparent", color: filterNoteTags.includes(tag) ? color.goldLegacy : color.tan, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>{tag}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 12 }}>SCORE RANGE</div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: type.xs, color: color.tan, marginBottom: 4 }}>MINIMUM: <span style={{ color: color.goldLegacy, fontWeight: 700 }}>{filterScoreMin.toFixed(1)}</span></div>
                        <input type="range" min={0} max={10} step={0.5} value={filterScoreMin} onChange={e => setFilterScoreMin(Math.min(parseFloat(e.target.value), filterScoreMax - 0.5))} style={{ fontSize: type.md, width: "100%", accentColor: color.goldLegacy }} />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: type.xs, color: color.dim, marginTop: 2 }}><span>0</span><span>10</span></div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: type.xs, color: color.tan, marginBottom: 4 }}>MAXIMUM: <span style={{ color: color.goldLegacy, fontWeight: 700 }}>{filterScoreMax.toFixed(1)}</span></div>
                        <input type="range" min={0} max={10} step={0.5} value={filterScoreMax} onChange={e => setFilterScoreMax(Math.max(parseFloat(e.target.value), filterScoreMin + 0.5))} style={{ fontSize: type.md, width: "100%", accentColor: color.goldLegacy }} />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: type.xs, color: color.dim, marginTop: 2 }}><span>0</span><span>10</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 8 }}>VALUE FOR PRICE</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["Good value", "OK value", "Poor value"].map(opt => (
                        <button key={opt} onClick={() => setFilterValue(prev => prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt])}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${filterValue.includes(opt) ? color.goldLegacy : color.lineStrong}`, background: filterValue.includes(opt) ? `${color.goldLegacy}22` : "transparent", color: filterValue.includes(opt) ? color.goldLegacy : color.tan, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 8 }}>WOULD SMOKE AGAIN</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["Yes", "Maybe", "No"].map(opt => (
                        <button key={opt} onClick={() => setFilterWouldSmoke(prev => prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt])}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${filterWouldSmoke.includes(opt) ? color.goldLegacy : color.lineStrong}`, background: filterWouldSmoke.includes(opt) ? `${color.goldLegacy}22` : "transparent", color: filterWouldSmoke.includes(opt) ? color.goldLegacy : color.tan, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setShowFilterDrawer(false)} style={{ width: "100%", background: `linear-gradient(135deg, ${color.goldLegacy}, ${color.goldDeep})`, border: "none", borderRadius: 10, padding: 14, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                    Apply Filters
                  </button>
                </div>
              )}

              {profileLoading && <div style={{ fontSize: type.xs, color: color.green, textAlign: "center", padding: 20 }}>Loading...</div>}
              {!profileLoading && checkins.length === 0 && (
                <div style={{ fontSize: 13, color: color.dim, textAlign: "center", padding: 30 }}>No smokes logged yet — find a cigar and tap Log This Smoke!</div>
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
                  else val = (parseLocalDate(b.smoke_date)?.getTime() || 0) - (parseLocalDate(a.smoke_date)?.getTime() || 0);
                  return historySortDir === "asc" ? -val : val;
                });
                if (sorted.length === 0 && checkins.length > 0) return (
                  <div style={{ fontSize: 13, color: color.dim, textAlign: "center", padding: 30 }}>No smokes match your filters.</div>
                );
                return sorted.map(c => {
                  const brand = c.cigars?.brand || c.cigar_brand || "Unknown";
                  const line = c.cigars?.line || c.cigar_name || "Unknown";
                  const vitola = c.cigars?.vitola || c.cigar_vitola || null;
                  const strength = c.cigars?.strength || null;
                  const isSelected = selectedCheckin?.id === c.id;
                  return (
                    <div key={c.id} style={{ ...s.card, borderColor: isSelected ? `${color.gold}44` : color.lineStrong, overflow: "hidden" }} onClick={() => isSelected ? setSelectedCheckin(null) : handleSelectCheckin(c)}>

                      {/* Dark header */}
                      <div style={{ background: `linear-gradient(135deg, ${color.surfaceRaised} 0%, ${color.bg} 100%)`, padding: "14px 14px" }}>

                        {/* Brand + date + visibility */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: color.tan, letterSpacing: 1 }}>{brand.toUpperCase()}</div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                            <span style={{ fontSize: type.xs, color: color.dim }}>{formatSmokeDate(c.smoke_date)}</span>
                            <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                              {[
                                { value: "public", label: "Public" },
                                { value: "friends_only", label: "Friends" },
                                { value: "private", label: "Private" },
                              ].map(opt => {
                                const isActive = c.visibility === opt.value;
                                return (
                                  <button key={opt.value} onClick={async (e) => {
                                    e.stopPropagation();
                                    if (isActive) return;
                                    const { data } = await supabase.from("checkins").update({ visibility: opt.value }).eq("id", c.id).select().single();
                                    if (data) { setSelectedCheckin(data); setCheckins(prev => prev.map(x => x.id === data.id ? { ...x, visibility: data.visibility } : x)); }
                                  }} style={{ fontSize: type.xs, color: isActive ? color.gold : color.faint, background: isActive ? `${color.gold}22` : color.line, border: `0.5px solid ${isActive ? `${color.gold}55` : "transparent"}`, borderRadius: 20, padding: "2px 7px", cursor: "pointer", fontFamily: SANS, fontWeight: isActive ? 700 : 400 }}>
                                    {opt.icon} {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Cigar name + vitola/strength */}
                        <div style={{ fontSize: 16, fontWeight: 700, color: color.heading, marginBottom: 10 }}>
                          {line}
                          {(vitola || strength) && <span style={{ fontSize: type.xs, color: color.dim, fontWeight: 400 }}> · {[vitola, strength].filter(Boolean).join(" · ")}</span>}
                        </div>

                        {/* Flames + rating */}
                        {c.rating && (() => {
                          const flames = c.rating / 2;
                          return (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ display: "flex", gap: 3 }}>
                                {[1, 2, 3, 4, 5].map(i => {
                                  const fill = flames >= i ? "full" : flames >= i - 0.5 ? "half" : "empty";
                                  const id = `fc-${c.id}-${i}`;
                                  return (
                                    <svg key={i} width="18" height="18" viewBox="0 0 24 24">
                                      {fill === "full" && <defs><linearGradient id={id} x1="0" x2="0" y1="1" y2="0"><stop offset="0%" stopColor="#cc2200"/><stop offset="40%" stopColor="#ff6600"/><stop offset="100%" stopColor="#ffcc00"/></linearGradient></defs>}
                                      {fill === "half" && <defs><linearGradient id={id} x1="0" x2="1" y1="0" y2="0"><stop offset="50%" stopColor="#ff6600"/><stop offset="50%" stopColor={color.line}/></linearGradient></defs>}
                                      <path d="M12 2C12 2 6 8 6 13a6 6 0 0012 0c0-3-2-5.5-2-5.5S14 10 12 10c0 0 1-3-0-8z" fill={fill === "empty" ? color.line : `url(#${id})`} />
                                    </svg>
                                  );
                                })}
                              </div>
                              <span style={{ fontSize: 15, fontWeight: 700, color: color.gold }}>{flames % 1 === 0 ? flames.toFixed(0) : flames.toFixed(1)}</span>
                            </div>
                          );
                        })()}

                        {/* Verification badges */}
                        {c.cigars && !c.cigars.verified && !c.cigars.rejection_reason && (
                          <span style={{ fontSize: type.xs, background: `${color.gold}22`, border: `1px solid ${color.gold}55`, borderRadius: 6, padding: "1px 6px", color: color.gold, marginTop: 8, display: "inline-block" }}>⏳ Pending verification</span>
                        )}
                        {c.cigars?.rejection_reason && (
                          <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: type.xs, background: `${color.danger}22`, border: `1px solid ${color.danger}55`, borderRadius: 6, padding: "1px 6px", color: color.dangerText }}>Not verified</span>
                            <div style={{ fontSize: type.xs, color: color.dangerText, marginTop: 4, lineHeight: 1.5 }}>{c.cigars.rejection_reason}</div>
                          </div>
                        )}
                      </div>

                      {/* Smoke again + value badges */}
                      {isSelected && checkinRating && (checkinRating.would_smoke_again || checkinRating.value_for_price) && (
                        <div style={{ padding: "10px 14px", display: "flex", gap: 7, flexWrap: "wrap", borderBottom: `1px solid ${color.lineStrong}33` }}>
                          {checkinRating.would_smoke_again && (
                            <span style={{ fontSize: type.xs, padding: "3px 10px", borderRadius: 20, fontWeight: 700, color: color.heading,
                              background: checkinRating.would_smoke_again === "Yes" ? `linear-gradient(135deg, ${color.greenDeep}, #2a5a2a)` : checkinRating.would_smoke_again === "Maybe" ? `linear-gradient(135deg, ${color.goldMuted}, #6a5a2a)` : `linear-gradient(135deg, ${color.ember}, ${color.emberDeep})` }}>
                              {checkinRating.would_smoke_again}
                            </span>
                          )}
                          {checkinRating.value_for_price && (
                            <span style={{ fontSize: type.xs, padding: "3px 10px", borderRadius: 20, fontWeight: 700, color: color.heading,
                              background: checkinRating.value_for_price === "Good value" ? `linear-gradient(135deg, ${color.greenDeep}, #2a5a2a)` : checkinRating.value_for_price === "OK value" ? `linear-gradient(135deg, ${color.goldMuted}, #6a5a2a)` : `linear-gradient(135deg, ${color.ember}, ${color.emberDeep})` }}>
                              {checkinRating.value_for_price}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tasting tags */}
                      {isSelected && checkinRating?.flavor_tags && (
                        <div style={{ padding: "10px 14px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: `1px solid ${color.lineStrong}33` }}>
                          {checkinRating.flavor_tags.split(", ").map(tag => (
                            <span key={tag} style={{ background: `${color.gold}22`, color: color.gold, border: `1px solid ${color.gold}55`, borderRadius: 20, padding: "3px 10px", fontSize: type.xs, fontWeight: 600 }}>{tag}</span>
                          ))}
                        </div>
                      )}

                      {/* Tasting notes text fallback */}
                      {isSelected && checkinRating !== null && c.tasting_notes && !checkinRating?.flavor_tags && (
                        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${color.lineStrong}33` }}>
                          <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 6 }}>TASTING NOTES</div>
                          <div style={{ fontSize: 13, color: color.soft, fontStyle: "italic", lineHeight: 1.6 }}>"{c.tasting_notes}"</div>
                        </div>
                      )}

                      {/* Delete */}
                      {isSelected && (
                        <div style={{ padding: "12px 14px" }}>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteCheckin(c); }}
                            style={{ width: "100%", background: "linear-gradient(135deg, #8a2a1a, #6a1a0a)", border: `1px solid ${color.danger}`, borderRadius: 10, padding: 12, color: color.heading, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
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
              style={{ width: "100%", background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, color: color.tan, fontSize: 13, cursor: "pointer", fontFamily: SANS, marginTop: 8, marginBottom: 8 }}
            >
              Export my journal (CSV)
            </button>
          )}

          {/* STATS SUB-TAB */}
          {profileTab === "stats" && (
            <>
              {checkins.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: color.dim }}>Log some smokes to see your stats!</div>
              ) : (() => {
                const locCounts = checkins.reduce((acc, c) => { if (c.smoke_location) acc[c.smoke_location] = (acc[c.smoke_location] || 0) + 1; return acc; }, {});
                const topLoc = Object.entries(locCounts).sort((a, b) => b[1] - a[1])[0];
                const top3 = [...checkins].sort((a, b) => b.rating - a.rating).slice(0, 3);
                const brandCounts = checkins.reduce((acc, c) => { const b = c.cigars?.brand || c.cigar_brand; if (b) acc[b] = (acc[b] || 0) + 1; return acc; }, {});
                const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0];
                const vitolaRatings = checkins.reduce((acc, c) => { const v = c.cigars?.vitola || c.cigar_vitola; if (v) { if (!acc[v]) acc[v] = []; acc[v].push(c.rating); } return acc; }, {});
                const bestVitola = Object.entries(vitolaRatings).map(([v, ratings]) => [v, ratings.reduce((a, b) => a + b, 0) / ratings.length]).sort((a, b) => b[1] - a[1])[0];
                return (
                  <div style={{ background: color.surfaceRaised, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14 }}>
                    {topLoc && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${color.lineStrong}33` }}><div style={{ fontSize: type.xs, color: color.tan }}>TOP LOCATION</div><div style={{ fontSize: 13, color: color.heading }}>{topLoc[0]} <span style={{ color: color.goldLegacy }}>({topLoc[1]})</span></div></div>}
                    {topBrand && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${color.lineStrong}33` }}><div style={{ fontSize: type.xs, color: color.tan }}>MOST SMOKED BRAND</div><div style={{ fontSize: 13, color: color.heading }}>{topBrand[0]} <span style={{ color: color.goldLegacy }}>({topBrand[1]})</span></div></div>}
                    {bestVitola && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${color.lineStrong}33` }}><div style={{ fontSize: type.xs, color: color.tan }}>FAVORITE VITOLA</div><div style={{ fontSize: 13, color: color.heading }}>{bestVitola[0]} <span style={{ color: color.goldLegacy }}>({bestVitola[1].toFixed(1)})</span></div></div>}
                    {top3.length > 0 && (
                      <div>
                        <div style={{ fontSize: type.xs, color: color.tan, marginBottom: 8 }}>TOP RATED</div>
                        {top3.map((c, i) => (
                          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: i < 2 ? 6 : 0 }}>
                            <div style={{ fontSize: 13, color: color.soft, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <span style={{ color: color.dim, marginRight: 6 }}>#{i + 1}</span>
                              {c.cigars?.brand || c.cigar_brand ? `${c.cigars?.brand || c.cigar_brand} — ` : ""}{c.cigars?.line || c.cigar_name || "Unknown"}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: color.goldLegacy, marginLeft: 8 }}>{c.rating?.toFixed(1)}</span>
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
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><Icon.Feed size={36} color={color.borderStrong} /></div>
                <div style={{ fontSize: 15, fontWeight: 700, color: color.heading, marginBottom: 8 }}>Advanced Stats is Premium</div>
                <div style={{ fontSize: 13, color: color.dim, lineHeight: 1.6, marginBottom: 20 }}>Monthly trends, flavor profile, brand breakdown and more.</div>
                <button onClick={() => setUpgradeFeature("advanced_stats")}
                  style={{ background: `linear-gradient(135deg, ${color.goldLegacy}, ${color.goldDeep})`, border: "none", borderRadius: 12, padding: "12px 28px", color: color.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                  Upgrade to Premium
                </button>
              </div>
            )
          )}
        </div>
      )}

      {tab === "wishlist" && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 13, color: color.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>MY WISHLIST</div>

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
              onBlur={() => setTimeout(() => { setWishlistSearchResults([]); setWishlistSearchQuery(""); }, 150)}
              placeholder="Search cigars to add to wishlist..."
              style={{ width: "100%", background: color.surfaceRaised, border: `1px solid ${color.lineStrong}`, borderRadius: wishlistSearchResults.length > 0 ? "8px 8px 0 0" : "8px", padding: "10px 14px", color: color.heading, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
            />
            {wishlistSearching && (
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: type.xs, color: color.green }}>Searching...</div>
            )}
            {wishlistSearchResults.length > 0 && (
              <div style={{ position: "absolute", left: 0, right: 0, background: color.surface, border: `1px solid ${color.lineStrong}`, borderTop: "none", borderRadius: "0 0 10px 10px", zIndex: 50, maxHeight: 220, overflowY: "auto" }}>
                {wishlistSearchResults.map((r, i) => (
                  <div key={i}
                    onMouseDown={async () => {
                      setWishlistSearchQuery("");
                      setWishlistSearchResults([]);
                      // Load vitolas for this line
                      setWishlistVitolaLoading(true);
                      setWishlistVitolaPicker({ id: r.id, brand: r.brand, line: r.line });
                      const { data } = await supabase.from("cigars").select("id, vitola, strength").eq("brand", r.brand).eq("line", r.line).not("vitola", "is", null).order("vitola");
                      setWishlistVitolaOptions(data || []);
                      setWishlistVitolaLoading(false);
                    }}
                    style={{ padding: "12px 14px", cursor: "pointer", borderBottom: `1px solid ${color.lineStrong}33`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: color.text }}>{r.line}</div>
                      <div style={{ fontSize: type.xs, color: color.gold, marginTop: 2 }}>{r.brand}</div>
                    </div>
                    <span style={{ fontSize: type.xs, color: color.greenBright, fontWeight: 600 }}>+ Add</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Brand + strength filters */}
          {wishlist.length > 0 && (() => {
            const uniqueWishlistBrands = [...new Set(wishlist.map(w => w.cigars?.brand || w.cigar_brand).filter(Boolean))].sort();
            return (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <select
                    value={wishlistFilterBrand}
                    onChange={e => setWishlistFilterBrand(e.target.value)}
                    style={{ flex: 1, background: color.surfaceRaised, border: `1px solid ${wishlistFilterBrand ? color.gold : color.lineStrong}`, borderRadius: 8, padding: "8px 12px", color: wishlistFilterBrand ? color.gold : color.muted, fontSize: type.md, fontFamily: SANS, outline: "none" }}
                  >
                    <option value="">Filter by Brand</option>
                    {uniqueWishlistBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  {wishlistFilterBrand && (
                    <button onClick={() => setWishlistFilterBrand("")} style={{ background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "8px 12px", color: color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>Clear ×</button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"].map(str => (
                    <button key={str} onClick={() => setWishlistFilterStrength(prev => prev.includes(str) ? prev.filter(x => x !== str) : [...prev, str])}
                      style={{ flex: 1, padding: "7px 0", borderRadius: 20, border: `1px solid ${wishlistFilterStrength.includes(str) ? strengthColor(str) : color.faintDim}`, background: wishlistFilterStrength.includes(str) ? strengthColor(str) + "33" : color.surfaceRaised, color: wishlistFilterStrength.includes(str) ? strengthColor(str) : color.tan, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, fontWeight: wishlistFilterStrength.includes(str) ? 700 : 500 }}>
                      {str}
                    </button>
                  ))}
                </div>
                {(wishlistFilterBrand || wishlistFilterStrength.length > 0) && (
                  <div style={{ textAlign: "right", marginTop: 6 }}>
                    <span onClick={() => { setWishlistFilterBrand(""); setWishlistFilterStrength([]); }} style={{ fontSize: type.xs, color: color.dim, cursor: "pointer" }}>Clear all filters</span>
                  </div>
                )}
              </div>
            );
          })()}

          {wishlistLoading && <div style={{ fontSize: type.xs, color: color.green, textAlign: "center", padding: 20 }}>Loading...</div>}
          {!wishlistLoading && wishlist.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><Icon.Wishlist size={32} color={color.borderStrong} /></div>
              <div style={{ fontSize: 15, fontWeight: 700, color: color.heading, marginBottom: 8 }}>Your wishlist is empty</div>
              <div style={{ fontSize: 13, color: color.dim }}>Search for a cigar or scan a band and tap "Add to Wishlist"</div>
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
              <div style={{ textAlign: "center", padding: 30, fontSize: 13, color: color.dim }}>No wishlist items match your filters.</div>
            );

            // Group by brand then line
            const brands = {};
            for (const w of filtered) {
              const brand = w.cigars?.brand || w.cigar_brand || "Unknown";
              const line = w.cigars?.line || w.cigar_name || "Unknown Cigar";
              if (!brands[brand]) brands[brand] = {};
              if (!brands[brand][line]) brands[brand][line] = [];
              brands[brand][line].push(w);
            }

            return Object.entries(brands).sort(([a], [b]) => a.localeCompare(b)).map(([brand, lines]) => (
              <div key={brand} style={{ marginBottom: 16 }}>
                {/* Brand header */}
                <div style={{ fontSize: type.xs, color: color.gold, fontWeight: 700, letterSpacing: 2, marginBottom: 8, paddingLeft: 2 }}>
                  {brand.toUpperCase()}
                </div>

                {/* Lines under brand */}
                {Object.entries(lines).sort(([a], [b]) => a.localeCompare(b)).map(([line, items]) => (
                  <div key={line} style={{ background: `linear-gradient(135deg, ${color.surfaceRaised} 0%, ${color.surface} 100%)`, border: `1px solid ${color.lineStrong}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
                    <div style={{ padding: "14px 14px 12px" }}>
                      {/* Line name */}
                      <div style={{ fontSize: 16, fontWeight: 700, color: color.text, marginBottom: 8, cursor: items[0].cigars ? "pointer" : "default" }}
                        onClick={() => items[0].cigars && setSelected(items[0].cigars)}>
                        {line}
                      </div>

                      {/* Each vitola as a row */}
                      {items.map((w, idx) => {
                        const vitola = w.cigars?.vitola || w.cigar_vitola || "";
                        const strength = w.cigars?.strength || "";
                        return (
                          <div key={w.id} style={{ borderTop: idx === 0 ? "none" : `1px solid ${color.lineStrong}44`, paddingTop: idx === 0 ? 0 : 10, marginTop: idx === 0 ? 0 : 10 }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                              {vitola && <Badge label={vitola} />}
                              {strength && <Badge label={strength} color={strengthColor(strength)} />}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={async () => {
                                  setPurchasedItem(w);
                                  setPurchasedQty(1);
                                  setPurchasedVitola(w.cigars?.vitola || w.cigar_vitola || "");
                                  setWishlistVitolaLoading(true);
                                  const { data } = await supabase.from("cigars").select("id, vitola, strength").eq("brand", w.cigars?.brand || w.cigar_brand || "").eq("line", w.cigars?.line || w.cigar_name || "").not("vitola", "is", null).order("vitola");
                                  setWishlistVitolaOptions(data || []);
                                  setWishlistVitolaLoading(false);
                                }}
                                style={{ flex: 1, background: `${color.green}22`, border: `1px solid ${color.green}88`, borderRadius: 8, padding: "9px 0", color: color.green, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}>
                                Purchased
                              </button>
                              <button
                                onClick={() => handleRemoveFromWishlist(w.id)}
                                style={{ flex: 1, background: color.surfaceRaised, border: `1px solid ${color.faintDim}`, borderRadius: 8, padding: "9px 0", color: color.tan, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}>
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>
      )}

      {checkingIn && <CheckIn cigar={checkingIn} user={user} onClose={() => { setCheckingIn(null); setHumidorItemId(null); }} onSaved={async () => {
        if (humidorItemId) {
          const { data: hItem } = await supabase.from("humidor").select("id, quantity").eq("id", humidorItemId).single();
          if (hItem) {
            if (hItem.quantity <= 1) await supabase.from("humidor").delete().eq("id", humidorItemId);
            else await supabase.from("humidor").update({ quantity: hItem.quantity - 1 }).eq("id", humidorItemId);
          }
          setHumidorItemId(null);
        }
        setCheckingIn(null); setQuery(""); setSelectedLine(null); setVitolas([]); refreshCheckins();
      }} />}
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
          onOpenBadges={() => { setTab("profile"); setProfileTab("badges"); }}
          onOpenFriends={() => { setShowFriends(true); setPendingFriendCount(0); }}
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
          <div style={{ background: color.bg, border: `1px solid ${color.lineStrong}`, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%" }}>
            <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 2, marginBottom: 12 }}>HEALTH DISCLAIMER</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: color.heading, marginBottom: 16 }}>Before you get started</div>
            <div style={{ fontSize: 13, color: color.soft, lineHeight: 1.7, marginBottom: 16 }}>
              Ashed is a <strong style={{ color: color.heading }}>journal and community tool</strong> for adult cigar enthusiasts. It is not intended to encourage tobacco use.
            </div>
            <div style={{ fontSize: 13, color: color.soft, lineHeight: 1.7, marginBottom: 16 }}>
              Tobacco products contain nicotine and other chemicals known to cause <strong style={{ color: color.heading }}>cancer, heart disease, and other serious health conditions</strong>. There is no safe level of tobacco use.
            </div>
            <div style={{ fontSize: 13, color: color.soft, lineHeight: 1.7, marginBottom: 24 }}>
              By continuing, you confirm you are a legal adult and understand the health risks associated with tobacco use.
            </div>
            <button
              onClick={handleAcceptDisclaimer}
              style={{ width: "100%", background: `linear-gradient(135deg, ${color.goldLegacy}, ${color.goldDeep})`, border: "none", borderRadius: 12, padding: 14, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}
            >
              I Understand, Let's Go
            </button>
          </div>
        </div>
      )}

      {/* Welcome modal — shown once after disclaimer on first login */}
      {showWelcome && !showDisclaimer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: SANS }}>
          <div style={{ background: color.bg, border: `1px solid ${color.lineStrong}`, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><Icon.Flame size={36} /></div>
            <div style={{ fontSize: 22, fontWeight: 700, color: color.goldLegacy, textAlign: "center", letterSpacing: 1, marginBottom: 4 }}>Welcome to Ashed</div>
            <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 2, textAlign: "center", marginBottom: 24 }}>CIGAR JOURNAL & COMMUNITY</div>
            <div style={{ fontSize: 14, color: color.soft, lineHeight: 1.7, marginBottom: 12 }}>
              Ashed is your personal cigar journal — log every smoke, track your favorites, and discover new cigars tailored to your taste.
            </div>
            <div style={{ fontSize: 14, color: color.soft, lineHeight: 1.7, marginBottom: 24 }}>
              Connect with fellow enthusiasts, find nearby lounges, and let AI help you find your next perfect smoke.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {[
                { svg: <svg width="20" height="20" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="24" width="40" height="8" rx="4" fill={color.goldDeep}/><rect x="4" y="25" width="40" height="3" rx="2" fill={color.gold} opacity="0.5"/><rect x="40" y="22" width="10" height="12" rx="2" fill={color.goldLegacy}/><path d="M44 22 Q46 16 48 14" stroke="#8a8a8a" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>, text: "Log smokes with ratings and tasting notes" },
                { Glyph: Icon.Recommend, text: "AI recommendations based on your palate" },
                { Glyph: Icon.Camera, text: "Scan any cigar band to identify it instantly" },
                { svg: <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="9" width="18" height="13" rx="1" fill={color.goldLegacy}/><polygon points="1,9 23,9 21,5 3,5" fill={color.goldLegacy}/><rect x="9" y="15" width="6" height="7" rx="0.5" fill={color.bg}/><rect x="3" y="11" width="4" height="3" rx="0.5" fill={color.bg}/><rect x="17" y="11" width="4" height="3" rx="0.5" fill={color.bg}/></svg>, text: "Find cigar lounges near you" },
                { Glyph: Icon.Friends, text: "Share check-ins with the community" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ flexShrink: 0, width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.svg || (item.Glyph ? <item.Glyph size={18} color={color.textMuted} /> : null)}
                  </span>
                  <span style={{ fontSize: 13, color: color.tan }}>{item.text}</span>
                </div>
              ))}
            </div>
            <button onClick={handleAcceptWelcome}
              style={{ width: "100%", background: `linear-gradient(135deg, ${color.goldLegacy}, ${color.goldDeep})`, border: "none", borderRadius: 12, padding: 14, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
              Let's Get Started
            </button>
          </div>
        </div>
      )}

      {/* Onboarding tour */}
      {showTour && (
        <OnboardingTour onComplete={handleCompleteTour} />
      )}

      {showWhatsNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: SANS }}>
          <div style={{ background: color.bg, border: `1px solid ${color.lineStrong}`, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: color.heading }}>What's New</div>
                <div style={{ fontSize: type.xs, color: color.dim, marginTop: 2 }}>Version {APP_VERSION}</div>
              </div>
              
            </div>

            {[
              { title: "Settings screen", desc: "Edit your display name, email, and password. Manage privacy settings." },
              { title: "Cigar guide", desc: "New guide covering vitola sizes, strength levels, wrapper types, origins, and tasting terms. Find it in Settings → Guide." },
              { title: "Bug reports & feedback", desc: "Tap Help in Settings to send us bug reports or suggestions directly from the app." },
              { title: "Onboarding tour", desc: "New users now get a full walkthrough of every feature. Replay it anytime from Settings → Help." },
              { title: "Comment counts", desc: "Feed cards now show how many comments a check-in has." },
              { title: "Analytics", desc: "We've added anonymous usage analytics to help us improve the app." },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
                
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: color.heading, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: type.xs, color: color.tan, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}

            <button onClick={handleDismissWhatsNew}
              style={{ width: "100%", background: `linear-gradient(135deg, ${color.goldLegacy}, ${color.goldDeep})`, border: "none", borderRadius: 12, padding: 14, color: color.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginTop: 8 }}>
              Got It
            </button>
          </div>
        </div>
      )}

      {showCigarSubmit && (
        <CigarSubmitModal
          user={user}
          onClose={() => setShowCigarSubmit(false)}
          onSubmitted={handleCigarSubmitted}
        />
      )}

      {showSettings && (
        <Settings
          user={user}
          onClose={() => setShowSettings(false)}
          onSignOut={handleLogout}
          onReplayTour={handleReplayTour}
        />
      )}

      {showAdmin && (
        <AdminConsole
          user={user}
          isSuperAdmin={isSuperAdmin}
          isModerator={isModerator && !isAdmin}
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
          onSmokeOne={(cigar, itemId) => { setCheckingIn(cigar); setHumidorItemId(itemId); }}
          onSearchToAdd={() => { setTab("search"); }}
          isPremium={isPremium}
          onUpgrade={() => setUpgradeFeature("band_scanner")}
        />
      )}
      {tab === "venues" && <Venues />}
      <nav style={s.nav}>
        {[["search", "🔍", "Feed"], ["profile", "👤", "Me"], ["wishlist", "🔖", "Wishlist"]].map(([id, icon, label]) => (
          <button key={id} style={s.navBtn(tab === id)} onClick={() => setTab(id)}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
        <button style={s.navBtn(tab === "humidor")} onClick={() => setTab("humidor")}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="10" width="20" height="11" rx="1.5" stroke={tab === "humidor" ? "#d4844a" : color.faintDim} strokeWidth="1.5"/>
              <path d="M2 10 L4 6 L20 6 L22 10 Z" stroke={tab === "humidor" ? "#d4844a" : color.faintDim} strokeWidth="1.5" fill={tab === "humidor" ? "#d4844a22" : `${color.faintDim}11`} strokeLinejoin="round"/>
              <line x1="7" y1="6" x2="7" y2="10" stroke={tab === "humidor" ? color.gold : color.faintDim} strokeWidth="1.5"/>
              <line x1="12" y1="6" x2="12" y2="10" stroke={tab === "humidor" ? color.gold : color.faintDim} strokeWidth="1.5"/>
              <line x1="17" y1="6" x2="17" y2="10" stroke={tab === "humidor" ? color.gold : color.faintDim} strokeWidth="1.5"/>
              <rect x="10" y="14" width="4" height="2" rx="1" fill={tab === "humidor" ? color.gold : color.faintDim}/>
            </svg>
          </span>
          <span>Humidor</span>
        </button>
        <button style={s.navBtn(tab === "venues")} onClick={() => setTab("venues")}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="9" width="18" height="13" rx="1" fill={tab === "venues" ? color.goldLegacy : color.dim}/>
              <polygon points="1,9 23,9 21,5 3,5" fill={tab === "venues" ? color.goldLegacy : color.dim}/>
              <line x1="7" y1="5" x2="6" y2="9" stroke={color.goldDeep} strokeWidth="0.8"/>
              <line x1="11" y1="5" x2="10" y2="9" stroke={color.goldDeep} strokeWidth="0.8"/>
              <line x1="15" y1="5" x2="14" y2="9" stroke={color.goldDeep} strokeWidth="0.8"/>
              <line x1="19" y1="5" x2="18" y2="9" stroke={color.goldDeep} strokeWidth="0.8"/>
              <rect x="9" y="15" width="6" height="7" rx="0.5" fill={color.bg}/>
              <rect x="3" y="11" width="4" height="3" rx="0.5" fill={color.bg}/>
              <rect x="17" y="11" width="4" height="3" rx="0.5" fill={color.bg}/>
            </svg>
          </span>
          <span>Venues</span>
        </button>
      </nav>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: color.greenBright, color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px 28px", borderRadius: 30, zIndex: 500, fontFamily: SANS, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
          {toast}
        </div>
      )}

      {/* Wishlist vitola picker — shown after adding from search */}
      {wishlistVitolaPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => { handleAddToWishlist(wishlistVitolaPicker); setWishlistVitolaPicker(null); }}>
          <div style={{ background: color.bg, border: `1px solid ${color.lineStrong}`, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 420, maxHeight: "70vh", display: "flex", flexDirection: "column", fontFamily: SANS }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 0 0", display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, background: color.lineStrong, borderRadius: 2 }} />
            </div>
            <div style={{ padding: "12px 18px 14px", borderBottom: `1px solid ${color.lineStrong}`, flexShrink: 0 }}>
              <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 2 }}>{wishlistVitolaPicker.brand.toUpperCase()}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: color.text, margin: "3px 0 2px" }}>{wishlistVitolaPicker.line}</div>
              <div style={{ fontSize: type.xs, color: color.muted }}>Select a vitola to add to your wishlist — or skip to add the line</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 18px 32px" }}>
              {wishlistVitolaLoading && <div style={{ textAlign: "center", padding: 24, fontSize: 13, color: color.muted }}>Loading sizes...</div>}

              {/* Skip option — add without vitola */}
              {!wishlistVitolaLoading && (
                <div onClick={() => { handleAddToWishlist(wishlistVitolaPicker); setWishlistVitolaPicker(null); }}
                  style={{ background: color.surfaceRaised, border: `1px solid ${color.gold}44`, borderRadius: 10, padding: "12px 14px", marginBottom: 12, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: color.gold }}>Not Sure Yet</div>
                    <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>Add the line without a specific vitola</div>
                  </div>
                  <span style={{ color: color.gold, fontSize: 18 }}>›</span>
                </div>
              )}

              {!wishlistVitolaLoading && wishlistVitolaOptions.length > 0 && (
                <div style={{ fontSize: type.xs, color: color.faint, letterSpacing: 1, marginBottom: 10 }}>OR SELECT A SIZE</div>
              )}

              {wishlistVitolaOptions.map((v, i) => (
                <div key={i} onClick={() => {
                  handleAddToWishlist({ ...wishlistVitolaPicker, id: v.id, vitola: v.vitola });
                  setWishlistVitolaPicker(null);
                }}
                  style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: color.text }}>{v.vitola}</div>
                    {v.strength && <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>{v.strength}</div>}
                  </div>
                  <span style={{ color: color.gold, fontSize: 18 }}>›</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Purchased confirmation sheet */}
      {purchasedItem && (() => {
        const w = purchasedItem;
        const brand = w.cigars?.brand || w.cigar_brand || "";
        const line = w.cigars?.line || w.cigar_name || "";
        const strength = purchasedVitola && wishlistVitolaOptions.length > 0
          ? wishlistVitolaOptions.find(v => v.vitola === purchasedVitola)?.strength || w.cigars?.strength || ""
          : w.cigars?.strength || "";
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={() => setPurchasedItem(null)}>
            <div style={{ background: color.bg, border: `1px solid ${color.lineStrong}`, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 420, padding: "20px 20px 40px", fontFamily: SANS }}
              onClick={e => e.stopPropagation()}>
              <div style={{ width: 40, height: 4, background: color.lineStrong, borderRadius: 2, margin: "0 auto 16px" }} />
              <div style={{ fontSize: type.xs, color: color.gold, fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>ADD TO HUMIDOR</div>
              <div style={{ fontSize: type.xs, color: color.muted, marginBottom: 4 }}>{brand.toUpperCase()}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: color.text, marginBottom: 16 }}>{line}</div>

              {/* Vitola */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 6 }}>VITOLA</div>
                {wishlistVitolaOptions.length > 0 ? (
                  <select value={purchasedVitola} onChange={e => setPurchasedVitola(e.target.value)}
                    style={{ width: "100%", background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "10px 14px", color: purchasedVitola ? color.text : color.muted, fontSize: type.md, fontFamily: SANS, outline: "none" }}>
                    <option value="">Select a vitola...</option>
                    {wishlistVitolaOptions.map((v, i) => <option key={i} value={v.vitola}>{v.vitola}{v.strength ? ` — ${v.strength}` : ""}</option>)}
                  </select>
                ) : (
                  <input value={purchasedVitola} onChange={e => setPurchasedVitola(e.target.value)}
                    placeholder="e.g. Robusto, Toro, Churchill..."
                    style={{ width: "100%", background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "10px 14px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" }} />
                )}
              </div>

              {/* Strength display */}
              {strength && (
                <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1 }}>STRENGTH</div>
                  <span style={{ background: strengthColor(strength) + "22", color: strengthColor(strength), border: `1px solid ${strengthColor(strength)}55`, borderRadius: 20, padding: "2px 10px", fontSize: type.xs, fontWeight: 600 }}>{strength}</span>
                </div>
              )}

              {/* Quantity */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 10 }}>HOW MANY DID YOU BUY?</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
                  <button onClick={() => setPurchasedQty(q => Math.max(1, q - 1))}
                    style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${color.lineStrong}`, background: color.surface, color: color.gold, fontSize: 24, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <div style={{ fontSize: 36, fontWeight: 700, color: color.gold, minWidth: 48, textAlign: "center" }}>{purchasedQty}</div>
                  <button onClick={() => setPurchasedQty(q => q + 1)}
                    style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${color.lineStrong}`, background: color.surface, color: color.gold, fontSize: 24, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
              </div>

              <button onClick={async () => {
                const { data: existing } = await supabase.from("humidor").select("id, quantity").eq("user_id", user.id).eq("cigar_brand", brand).eq("cigar_name", line).maybeSingle();
                if (existing) {
                  await supabase.from("humidor").update({ quantity: existing.quantity + purchasedQty }).eq("id", existing.id);
                } else {
                  await supabase.from("humidor").insert({ user_id: user.id, cigar_id: w.cigars?.id || w.cigar_id || null, cigar_brand: brand, cigar_name: line, cigar_vitola: purchasedVitola || null, quantity: purchasedQty });
                }
                handleRemoveFromWishlist(w.id);
                setPurchasedItem(null);
                showToast(`${purchasedQty} × ${line} added to humidor`);
              }}
                style={{ width: "100%", background: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`, border: "none", borderRadius: 10, padding: 14, color: color.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 10 }}>
                Add {purchasedQty} to Humidor
              </button>
              <button onClick={() => setPurchasedItem(null)}
                style={{ width: "100%", background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 12, color: color.muted, fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
                Cancel
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
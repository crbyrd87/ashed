import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import FeedModal from "./FeedModal";
import { checkAndAwardBadges } from "./badgeEngine";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const COMMUNITY_LIMIT = 10;
const FRIEND_LIMIT = 20;

const strengthColor = s => ({ "Light": "#7a9a7a", "Medium": "#c9a84c", "Medium-Full": "#cc7a2a", "Full": "#cc4400" }[s] || "#8a7055");

const avatarColor = (str) => {
  const colors = [
    ["#4a7a9a", "#2a4a6a"], ["#7a4a8a", "#4a2a6a"], ["#4a8a6a", "#2a6a4a"],
    ["#8a6a4a", "#6a4a2a"], ["#8a4a4a", "#6a2a2a"], ["#4a6a8a", "#2a4a6a"],
  ];
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffff;
  return colors[hash % colors.length];
};

const ratingBarColor = (flames) => {
  if (!flames) return "#3a2510";
  if (flames >= 4.5) return "linear-gradient(to bottom, #ffcc00, #ff6600)";
  if (flames >= 3.5) return "linear-gradient(to bottom, #ffaa00, #cc4400)";
  if (flames >= 2.5) return "linear-gradient(to bottom, #cc7a2a, #8a4a1a)";
  return "linear-gradient(to bottom, #8a5a3a, #5a3a2a)";
};

function FlameIcon({ fill, size = 13 }) {
  const id = `ff-${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {fill === "full" && <defs><linearGradient id={id} x1="0" x2="0" y1="1" y2="0"><stop offset="0%" stopColor="#cc2200"/><stop offset="40%" stopColor="#ff6600"/><stop offset="100%" stopColor="#ffcc00"/></linearGradient></defs>}
      {fill === "half" && <defs><linearGradient id={id} x1="0" x2="1" y1="0" y2="0"><stop offset="50%" stopColor="#ff6600"/><stop offset="50%" stopColor="#3a2510"/></linearGradient></defs>}
      <path d="M12 2C12 2 6 8 6 13a6 6 0 0012 0c0-3-2-5.5-2-5.5S14 10 12 10c0 0 1-3-0-8z"
        fill={fill === "empty" ? "#3a2510" : `url(#${id})`} />
    </svg>
  );
}

export default function Feed({ user }) {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fireCounts, setFireCounts] = useState({});
  const [firedIds, setFiredIds] = useState(new Set());
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [refreshCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, refreshCount]);

  const loadFeed = async () => {
    setLoading(true);
    const [{ data: sentFriends }, { data: recvFriends }] = await Promise.all([
      supabase.from("friends").select("recipient_id").eq("requester_id", user.id).eq("status", "accepted"),
      supabase.from("friends").select("requester_id").eq("recipient_id", user.id).eq("status", "accepted"),
    ]);
    const friendIds = [
      ...((sentFriends || []).map(f => f.recipient_id)),
      ...((recvFriends || []).map(f => f.requester_id)),
    ];

    let friendCheckins = [];
    if (friendIds.length > 0) {
      const { data } = await supabase
        .from("checkins")
        .select("*, cigars(brand, line, vitola, strength), users(username, display_name), ratings(flavor_tags, would_smoke_again)")
        .in("user_id", friendIds)
        .or("visibility.eq.public,visibility.is.null")
        .order("created_at", { ascending: false })
        .limit(FRIEND_LIMIT);
      friendCheckins = (data || []).map(c => ({ ...c, _feedType: "friend" }));
    }

    const excludeIds = [user.id, ...friendIds];
    const { data: globalData } = await supabase
      .from("checkins")
      .select("*, cigars(brand, line, vitola, strength), users(username, display_name), ratings(flavor_tags, would_smoke_again)")
      .not("user_id", "in", `(${excludeIds.join(",")})`)
      .or("visibility.eq.public,visibility.is.null")
      .order("created_at", { ascending: false })
      .limit(COMMUNITY_LIMIT);
    const communityCheckins = (globalData || []).map(c => ({ ...c, _feedType: "community" }));

    // Also fetch own recent check-ins
    const { data: ownData } = await supabase
      .from("checkins")
      .select("*, cigars(brand, line, vitola, strength), users(username, display_name), ratings(flavor_tags, would_smoke_again)")
      .eq("user_id", user.id)
      .or("visibility.eq.public,visibility.is.null")
      .order("created_at", { ascending: false })
      .limit(5);
    const ownCheckins = (ownData || []).map(c => ({ ...c, _feedType: "own" }));

    const allIds = new Set();
    const merged = [...ownCheckins, ...friendCheckins, ...communityCheckins].filter(c => {
      if (allIds.has(c.id)) return false;
      allIds.add(c.id);
      return true;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFeedItems(merged);
    if (merged.length > 0) await loadFireData(merged.map(c => c.id));
    setLoading(false);
  };

  const loadFireData = async (ids) => {
    const { data: allFires } = await supabase.from("fires").select("checkin_id, user_id").in("checkin_id", ids);
    const counts = {};
    const myFires = new Set();
    for (const f of (allFires || [])) {
      counts[f.checkin_id] = (counts[f.checkin_id] || 0) + 1;
      if (f.user_id === user.id) myFires.add(f.checkin_id);
    }
    setFireCounts(counts);
    setFiredIds(myFires);
  };

  const handleFireToggle = async (checkinId) => {
    const checkin = feedItems.find(c => c.id === checkinId);
    if (checkin?.user_id === user.id) return;
    const alreadyFired = firedIds.has(checkinId);
    if (alreadyFired) {
      await supabase.from("fires").delete().eq("checkin_id", checkinId).eq("user_id", user.id);
      setFiredIds(prev => { const s = new Set(prev); s.delete(checkinId); return s; });
      setFireCounts(prev => ({ ...prev, [checkinId]: Math.max(0, (prev[checkinId] || 1) - 1) }));
    } else {
      await supabase.from("fires").insert({ checkin_id: checkinId, user_id: user.id });
      setFiredIds(prev => new Set([...prev, checkinId]));
      setFireCounts(prev => ({ ...prev, [checkinId]: (prev[checkinId] || 0) + 1 }));
      checkAndAwardBadges(user.id, "fire").catch(() => {});
      if (checkin?.user_id) checkAndAwardBadges(checkin.user_id, "fire_received").catch(() => {});
    }
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: "#5a4535", fontFamily: SANS }}>Loading feed...</div>
  );

  if (feedItems.length === 0) return (
    <div style={{ textAlign: "center", padding: "40px 20px", fontFamily: SANS }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔥</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>Your feed is empty</div>
      <div style={{ fontSize: 13, color: "#5a4535", lineHeight: 1.6 }}>Add friends to see their smokes here. Community activity will show up too as people check in.</div>
    </div>
  );

  return (
    <>
      <div style={{ fontSize: 11, color: "#5a4535", letterSpacing: 1, margin: "16px 0 10px", fontFamily: SANS }}>RECENT ACTIVITY</div>

      {feedItems.map(item => {
        const cigarName = item.cigars?.line || item.cigar_name || "Unknown Cigar";
        const cigarBrand = item.cigars?.brand || item.cigar_brand || "";
        const vitola = item.cigars?.vitola || item.cigar_vitola || "";
        const strength = item.cigars?.strength || "";
        const handle = item.users?.username ? `@${item.users.username}` : "Someone";
        const isCommunity = item._feedType === "community";
        const isOwn = item.user_id === user.id;
        const fired = firedIds.has(item.id);
        const fireCount = fireCounts[item.id] || 0;
        const timeAgo = getTimeAgo(item.created_at);
        const flames = item.rating ? item.rating / 2 : null;
        const [avatarFrom, avatarTo] = avatarColor(item.users?.username || "");

        return (
          <div
            key={item.id}
            style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 10, marginBottom: 10, overflow: "hidden", cursor: "pointer", fontFamily: SANS, display: "flex" }}
            onClick={() => setSelectedCheckin(item)}
          >
            {/* Rating-based left accent bar */}
            <div style={{ width: 4, background: ratingBarColor(flames), flexShrink: 0 }} />

            <div style={{ flex: 1, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>

                {/* Left: cigar info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* User row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: `linear-gradient(135deg, ${avatarFrom}, ${avatarTo})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#f5ead8", fontWeight: 700, flexShrink: 0 }}>
                      {((item.users?.display_name || item.users?.username || "?")[0]).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isCommunity ? "#7a9a7a" : "#c9a84c" }}>{handle}</span>
                    {isCommunity && <span style={{ fontSize: 9, background: "#7a9a7a18", color: "#7a9a7a", border: "1px solid #7a9a7a33", borderRadius: 8, padding: "1px 5px" }}>Community</span>}
                    <span style={{ fontSize: 10, color: "#5a4535" }}>· {timeAgo}</span>
                  </div>

                  {/* Brand — Cigar Name */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f5ead8", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ color: "#8a6040" }}>{cigarBrand}</span>
                    {cigarBrand && cigarName && <span style={{ color: "#5a4535" }}> — </span>}
                    {cigarName}
                  </div>

                  {/* Vitola + strength — larger */}
                  {(vitola || strength) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {vitola && <span style={{ fontSize: 14, fontWeight: 600, color: "#c9a84c" }}>{vitola}</span>}
                      {vitola && strength && <span style={{ fontSize: 11, color: "#4a3020" }}>·</span>}
                      {strength && <span style={{ fontSize: 14, fontWeight: 700, color: strengthColor(strength) }}>{strength}</span>}
                    </div>
                  )}
                </div>

                {/* Right: rating + like stacked */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {flames && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#c9a84c", lineHeight: 1 }}>{flames.toFixed(1)}</div>
                      <div style={{ display: "flex", gap: 2, marginTop: 3, justifyContent: "center" }}>
                        {[1, 2, 3, 4, 5].map(i => {
                          const fill = flames >= i ? "full" : flames >= i - 0.5 ? "half" : "empty";
                          return <FlameIcon key={i} fill={fill} size={18} />;
                        })}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleFireToggle(item.id); }}
                    disabled={isOwn}
                    style={{ background: fired ? "#4a7a4a22" : "none", border: `1px solid ${fired ? "#4a7a4a66" : "#3a2510"}`, borderRadius: 20, padding: "3px 10px", color: fired ? "#7a9a7a" : isOwn ? "#3a2510" : "#8a7055", fontSize: 11, cursor: isOwn ? "default" : "pointer", fontFamily: SANS }}
                  >
                    👍 {fireCount}
                  </button>
                </div>

              </div>
            </div>
          </div>
        );
      })}

      {selectedCheckin && (
        <FeedModal
          checkin={selectedCheckin}
          user={user}
          onClose={() => setSelectedCheckin(null)}
          onFireToggle={(id) => handleFireToggle(id)}
        />
      )}
    </>
  );
}

function getTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
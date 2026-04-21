import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import FeedModal from "./FeedModal";
import { checkAndAwardBadges } from "./badgeEngine";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const COMMUNITY_LIMIT = 10;
const FRIEND_LIMIT = 20;

// Badge display priority for feed cards
// Slot 1: founding_member (if earned)
// Slot 2: highest milestone
// Slot 3: fan_favorite or well_loved (social proof)
const MILESTONE_ORDER = ["legend", "centurion", "connoisseur", "smoker", "aficionado", "first_ash"];
const SOCIAL_PRIORITY = ["fan_favorite", "well_loved", "smoke_circle", "regular", "legend_maker", "recruiter", "ambassador"];

const BADGE_ICONS = {
  legend: "🏆", centurion: "💯", connoisseur: "🎩", smoker: "🚬",
  aficionado: "⭐", first_ash: "✨", founding_member: "🏅",
  fan_favorite: "🌟", well_loved: "❤️", smoke_circle: "🤝",
  regular: "🪑", legend_maker: "🌠", recruiter: "📣", ambassador: "🤝",
  world_tour: "🌍", strength_seeker: "💪", brand_hopper: "🎯", vitola_variety: "📐",
};

const BADGE_NAMES = {
  legend: "Legend", centurion: "Centurion", connoisseur: "Connoisseur",
  smoker: "Smoker", aficionado: "Aficionado", first_ash: "First Ash",
  founding_member: "Founding Member", fan_favorite: "Fan Favorite",
  well_loved: "Well Loved", smoke_circle: "Smoke Circle", regular: "Regular",
  legend_maker: "Legend Maker", recruiter: "Recruiter", ambassador: "Ambassador",
  world_tour: "World Tour", strength_seeker: "Strength Seeker",
  brand_hopper: "Brand Hopper", vitola_variety: "Vitola Variety",
};

function getTopBadgesForUser(badgeKeys) {
  const set = new Set(badgeKeys);
  const result = [];
  // Slot 1: Founding Member
  if (set.has("founding_member")) result.push("founding_member");
  // Slot 2: Highest milestone
  const milestone = MILESTONE_ORDER.find(k => set.has(k));
  if (milestone && milestone !== "founding_member") result.push(milestone);
  // Slot 3: Best social badge
  const social = SOCIAL_PRIORITY.find(k => set.has(k));
  if (social) result.push(social);
  return [...new Set(result)].slice(0, 3);
}

export default function Feed({ user }) {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fireCounts, setFireCounts] = useState({});
  const [firedIds, setFiredIds] = useState(new Set());
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [refreshCount] = useState(0);
  const [userTopBadges, setUserTopBadges] = useState({});

  useEffect(() => {
    if (!user) return;
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, refreshCount]);

  const loadFeed = async () => {
    setLoading(true);

    // 1. Get friend IDs (both directions)
    const [{ data: sentFriends }, { data: recvFriends }] = await Promise.all([
      supabase.from("friends").select("recipient_id").eq("requester_id", user.id).eq("status", "accepted"),
      supabase.from("friends").select("requester_id").eq("recipient_id", user.id).eq("status", "accepted"),
    ]);
    const friendIds = [
      user.id, // include own check-ins in the feed
      ...((sentFriends || []).map(f => f.recipient_id)),
      ...((recvFriends || []).map(f => f.requester_id)),
    ];

    // 2. Fetch own + friends' public check-ins
    let friendCheckins = [];
    if (friendIds.length > 0) {
      const { data } = await supabase
        .from("checkins")
        .select("*, cigars(brand, line, vitola, strength), users(username, display_name)")
        .in("user_id", friendIds)
        .neq("visibility", "private")
        .order("created_at", { ascending: false })
        .limit(FRIEND_LIMIT);
      friendCheckins = (data || []).map(c => ({ ...c, _feedType: "friend" }));
    }

    // 3. Fetch recent global public check-ins (exclude self + friends)
    const excludeIds = [...friendIds];
    const { data: globalData } = await supabase
      .from("checkins")
      .select("*, cigars(brand, line, vitola, strength), users(username, display_name)")
      .not("user_id", "in", `(${excludeIds.join(",")})`)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(COMMUNITY_LIMIT);
    const communityCheckins = (globalData || []).map(c => ({ ...c, _feedType: "community" }));

    // 4. Merge, dedupe by id, sort by created_at desc
    const allIds = new Set();
    const merged = [...friendCheckins, ...communityCheckins].filter(c => {
      if (allIds.has(c.id)) return false;
      allIds.add(c.id);
      return true;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFeedItems(merged);

    // 5. Load fire counts + user's fires for all checkin ids
    if (merged.length > 0) {
      const ids = merged.map(c => c.id);
      await loadFireData(ids);
    }

    // 6. Fetch badges for each unique user in the feed
    const uniqueUserIds = [...new Set(merged.map(c => c.user_id).filter(Boolean))];
    if (uniqueUserIds.length > 0) {
      const { data: allUserBadges } = await supabase
        .from("user_badges")
        .select("user_id, badge_key")
        .in("user_id", uniqueUserIds);
      if (allUserBadges) {
        const byUser = {};
        for (const { user_id, badge_key } of allUserBadges) {
          if (!byUser[user_id]) byUser[user_id] = [];
          byUser[user_id].push(badge_key);
        }
        const topMap = {};
        for (const [uid, keys] of Object.entries(byUser)) {
          topMap[uid] = getTopBadgesForUser(keys);
        }
        setUserTopBadges(topMap);
      }
    }

    setLoading(false);
  };

  const loadFireData = async (ids) => {
    // Fire counts per checkin
    const { data: allFires } = await supabase
      .from("fires")
      .select("checkin_id, user_id")
      .in("checkin_id", ids);

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
    const isOwnCheckin = checkin?.user_id === user.id;
    if (isOwnCheckin) return;

    const alreadyFired = firedIds.has(checkinId);
    if (alreadyFired) {
      await supabase.from("fires").delete().eq("checkin_id", checkinId).eq("user_id", user.id);
      setFiredIds(prev => { const s = new Set(prev); s.delete(checkinId); return s; });
      setFireCounts(prev => ({ ...prev, [checkinId]: Math.max(0, (prev[checkinId] || 1) - 1) }));
    } else {
      await supabase.from("fires").insert({ checkin_id: checkinId, user_id: user.id });
      setFiredIds(prev => new Set([...prev, checkinId]));
      setFireCounts(prev => ({ ...prev, [checkinId]: (prev[checkinId] || 0) + 1 }));
      // Check fire_starter for the person giving the fire
      checkAndAwardBadges(user.id, "fire").catch(() => {});
      // Check well_loved for the check-in owner
      if (checkin?.user_id) checkAndAwardBadges(checkin.user_id, "fire_received").catch(() => {});
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: "#5a4535", fontFamily: SANS }}>
        Loading feed...
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", fontFamily: SANS }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔥</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>Your feed is empty</div>
        <div style={{ fontSize: 13, color: "#5a4535", lineHeight: 1.6 }}>
          Add friends to see their smokes here. Community activity will show up too as people check in.
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: 11, color: "#5a4535", letterSpacing: 1, margin: "16px 0 10px", fontFamily: SANS }}>
        RECENT ACTIVITY
      </div>

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

        return (
          <div
            key={item.id}
            style={{ background: "linear-gradient(135deg,#2a1a0e 0%,#221508 100%)", border: "1px solid #3a2510", borderRadius: 10, marginBottom: 10, overflow: "hidden", cursor: "pointer", fontFamily: SANS }}
            onClick={() => setSelectedCheckin(item)}
          >
            <div style={{ padding: "10px 14px 8px" }}>
              {/* User row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: isCommunity ? "linear-gradient(135deg,#3a5a3a,#1a2a1a)" : "linear-gradient(135deg,#c9a84c,#7a4a20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: isCommunity ? "#7a9a7a" : "#1a0f08", fontWeight: 700, flexShrink: 0 }}>
                  {((item.users?.display_name || item.users?.username || "?")[0]).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isCommunity ? "#7a9a7a" : "#c9a84c" }}>{handle}</span>
                  {(userTopBadges[item.user_id] || []).map(key => (
                    <span key={key} title={BADGE_NAMES[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} style={{ marginLeft: 4, fontSize: 11 }}>
                      {BADGE_ICONS[key]}
                    </span>
                  ))}
                  {isCommunity && (
                    <span style={{ marginLeft: 6, fontSize: 9, background: "#7a9a7a18", color: "#7a9a7a", border: "1px solid #7a9a7a33", borderRadius: 8, padding: "1px 6px" }}>Community</span>
                  )}
                </div>
                <span style={{ fontSize: 10, color: "#5a4535" }}>{timeAgo}</span>
              </div>

              {/* Cigar info */}
              <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>{cigarBrand.toUpperCase()}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", margin: "2px 0 4px" }}>
                {cigarName}{vitola ? ` · ${vitola}` : ""}
              </div>

              {/* Strength badge */}
              {strength && (
                <span style={{ fontSize: 10, background: "#3a2510", color: "#8a7055", borderRadius: 8, padding: "2px 8px" }}>{strength}</span>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px 10px", borderTop: "1px solid #3a251022" }}>
              {item.rating != null && (
                <span style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>{item.rating}</span>
              )}
              <button
                onClick={e => { e.stopPropagation(); handleFireToggle(item.id); }}
                disabled={isOwn}
                style={{ background: fired ? "#e8632a18" : "none", border: `1px solid ${fired ? "#e8632a66" : "#3a2510"}`, borderRadius: 20, padding: "3px 10px", color: fired ? "#e8632a" : isOwn ? "#3a2510" : "#8a7055", fontSize: 11, cursor: isOwn ? "default" : "pointer", fontFamily: SANS, display: "flex", alignItems: "center", gap: 4 }}
              >
                🔥 {fireCount}
              </button>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#5a4535" }}>💬 tap to comment</span>
            </div>
          </div>
        );
      })}

      {selectedCheckin && (
        <FeedModal
          checkin={selectedCheckin}
          user={user}
          onClose={() => setSelectedCheckin(null)}
          onFireToggle={(id) => {
            handleFireToggle(id);
          }}
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
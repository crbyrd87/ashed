import { supabase } from "./supabase";
import { createNotification } from "./notificationHelpers";

const BADGE_NAMES = {
  first_ash:        "First Ash",
  aficionado:       "Aficionado",
  smoker:           "Smoker",
  connoisseur:      "Connoisseur",
  centurion:        "Centurion",
  legend:           "Legend",
  brand_hopper:     "Brand Hopper",
  vitola_variety:   "Vitola Variety",
  world_tour:       "World Tour",
  strength_seeker:  "Strength Seeker",
  well_loved:       "Well Loved",
  fan_favorite:     "Fan Favorite",
  smoke_circle:     "Smoke Circle",
  regular:          "Regular",
  founding_member:  "Founding Member",
  ambassador:       "Ambassador",
  recruiter:        "Recruiter",
  legend_maker:     "Legend Maker",
};

// Award a badge if not already earned, and notify the user
const awardBadge = async (userId, badgeKey) => {
  const { error } = await supabase
    .from("user_badges")
    .insert({ user_id: userId, badge_key: badgeKey });

  // Ignore duplicate errors (unique constraint) — badge already earned
  if (error) {
    if (!error.message.includes("unique")) {
      console.error("Badge award error:", badgeKey, error.message);
    }
    return; // Don't notify if already earned
  }

  // Notify the user they earned a badge (actor_id = userId since it's self-triggered)
  const badgeName = BADGE_NAMES[badgeKey] || badgeKey;
  createNotification(userId, userId, "badge", {
    badge_key: badgeKey,
    message: `You earned the "${badgeName}" badge!`,
  }).catch(() => {});
};

// Get all badge keys already earned by user
const getEarnedKeys = async (userId) => {
  const { data } = await supabase
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", userId);
  return new Set((data || []).map(b => b.badge_key));
};

// Check milestone badges (check-in count)
const checkMilestoneBadges = async (userId, earned) => {
  const { count } = await supabase
    .from("checkins")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const milestones = [
    [1, "first_ash"],
    [10, "aficionado"],
    [25, "smoker"],
    [50, "connoisseur"],
    [100, "centurion"],
    [250, "legend"],
  ];

  for (const [threshold, key] of milestones) {
    if (count >= threshold && !earned.has(key)) {
      await awardBadge(userId, key);
    }
  }
};

// Check variety badges
const checkVarietyBadges = async (userId, earned) => {
  const { data: checkins } = await supabase
    .from("checkins")
    .select("cigar_brand, cigar_vitola, cigars(origin, strength, vitola, brand)")
    .eq("user_id", userId);

  if (!checkins) return;

  // Brand Hopper — 10 different brands
  if (!earned.has("brand_hopper")) {
    const brands = new Set(
      checkins.map(c => c.cigars?.brand || c.cigar_brand).filter(Boolean)
    );
    if (brands.size >= 10) await awardBadge(userId, "brand_hopper");
  }

  // Vitola Variety — 5 different vitolas
  if (!earned.has("vitola_variety")) {
    const vitolas = new Set(
      checkins.map(c => c.cigars?.vitola || c.cigar_vitola).filter(Boolean)
    );
    if (vitolas.size >= 5) await awardBadge(userId, "vitola_variety");
  }

  // World Tour — 5 different origins
  if (!earned.has("world_tour")) {
    const origins = new Set(
      checkins.map(c => c.cigars?.origin).filter(Boolean)
    );
    if (origins.size >= 5) await awardBadge(userId, "world_tour");
  }

  // Strength Seeker — all 4 strength levels
  if (!earned.has("strength_seeker")) {
    const strengths = new Set(
      checkins.map(c => c.cigars?.strength).filter(Boolean)
    );
    const required = ["Light", "Medium", "Medium-Full", "Full"];
    if (required.every(s => strengths.has(s))) {
      await awardBadge(userId, "strength_seeker");
    }
  }
};

// Check social badges
const checkSocialBadges = async (userId, earned) => {
  // Well Loved — received 25+ fires on your check-ins
  if (!earned.has("well_loved")) {
    const { data: myCheckins } = await supabase
      .from("checkins")
      .select("id")
      .eq("user_id", userId);
    if (myCheckins && myCheckins.length > 0) {
      const ids = myCheckins.map(c => c.id);
      const { count: receivedFires } = await supabase
        .from("fires")
        .select("*", { count: "exact", head: true })
        .in("checkin_id", ids);
      if (receivedFires >= 25) await awardBadge(userId, "well_loved");
    }
  }

  // Fan Favorite — a single check-in receives 10+ fires
  if (!earned.has("fan_favorite")) {
    const { data: myCheckins } = await supabase
      .from("checkins")
      .select("id")
      .eq("user_id", userId);
    if (myCheckins && myCheckins.length > 0) {
      const ids = myCheckins.map(c => c.id);
      const { data: fireCounts } = await supabase
        .from("fires")
        .select("checkin_id")
        .in("checkin_id", ids);
      if (fireCounts) {
        const counts = {};
        for (const f of fireCounts) counts[f.checkin_id] = (counts[f.checkin_id] || 0) + 1;
        if (Object.values(counts).some(c => c >= 10)) await awardBadge(userId, "fan_favorite");
      }
    }
  }

  // Smoke Circle — 5 mutual friends
  if (!earned.has("smoke_circle")) {
    const [{ count: sent }, { count: recv }] = await Promise.all([
      supabase.from("friends").select("*", { count: "exact", head: true }).eq("requester_id", userId).eq("status", "accepted"),
      supabase.from("friends").select("*", { count: "exact", head: true }).eq("recipient_id", userId).eq("status", "accepted"),
    ]);
    if ((sent || 0) + (recv || 0) >= 5) await awardBadge(userId, "smoke_circle");
  }
};

// Check Regular badge — checked in at same venue 3+ times
const checkRegularBadge = async (userId, earned) => {
  if (earned.has("regular")) return;
  const { data: checkins } = await supabase
    .from("checkins")
    .select("smoke_location")
    .eq("user_id", userId)
    .not("smoke_location", "is", null);
  if (!checkins) return;
  const counts = {};
  for (const c of checkins) {
    const loc = c.smoke_location?.trim().toLowerCase();
    if (loc) counts[loc] = (counts[loc] || 0) + 1;
  }
  if (Object.values(counts).some(c => c >= 3)) await awardBadge(userId, "regular");
};

// Check Founding Member badge
const checkFoundingMember = async (userId, earned) => {
  if (earned.has("founding_member")) return;

  const { data: thisUser } = await supabase
    .from("users")
    .select("created_at")
    .eq("id", userId)
    .single();

  if (!thisUser) return;

  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .lte("created_at", thisUser.created_at);

  if (count <= 100) await awardBadge(userId, "founding_member");
};

// Check referral badges
const checkReferralBadges = async (userId, earned) => {
  const { count } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", userId);

  const tiers = [
    [1, "ambassador"],
    [5, "recruiter"],
    [15, "legend_maker"],
  ];

  for (const [threshold, key] of tiers) {
    if (count >= threshold && !earned.has(key)) {
      await awardBadge(userId, key);
    }
  }
};

// Main entry point — run all checks for a user
// trigger: "checkin" | "fire" | "fire_received" | "comment" | "referral"
export const checkAndAwardBadges = async (userId, trigger = "checkin") => {
  try {
    const earned = await getEarnedKeys(userId);

    if (trigger === "checkin") {
      await checkMilestoneBadges(userId, earned);
      await checkVarietyBadges(userId, earned);
      await checkFoundingMember(userId, earned);
      await checkRegularBadge(userId, earned);
    }

    if (trigger === "fire" || trigger === "fire_received" || trigger === "friend") {
      const refreshedEarned = await getEarnedKeys(userId);
      await checkSocialBadges(userId, refreshedEarned);
    }

    if (trigger === "comment") {
      // no comment-specific badges currently
    }

    if (trigger === "referral") {
      await checkReferralBadges(userId, earned);
    }
  } catch (e) {
    console.error("Badge engine error:", e);
  }
};

// Fetch all badge definitions + user's earned badges
export const fetchUserBadges = async (userId) => {
  const [{ data: allBadges }, { data: earnedBadges }] = await Promise.all([
    supabase.from("badges").select("*").order("category").order("name"),
    supabase.from("user_badges").select("badge_key, awarded_at").eq("user_id", userId),
  ]);

  const earnedMap = {};
  for (const b of (earnedBadges || [])) {
    earnedMap[b.badge_key] = b.awarded_at || new Date().toISOString();
  }

  return (allBadges || []).map(b => ({
    ...b,
    earned: b.key in earnedMap,
    awarded_at: earnedMap[b.key] || null,
  }));
};
import { supabase } from "./supabase";

// Award a badge if not already earned
const awardBadge = async (userId, badgeKey) => {
  const { error } = await supabase
    .from("user_badges")
    .insert({ user_id: userId, badge_key: badgeKey });
  // Ignore duplicate errors (unique constraint) — badge already earned
  if (error && !error.message.includes("unique")) {
    console.error("Badge award error:", badgeKey, error.message);
  }
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

// Check social badges (fires given, fires received, comments)
const checkSocialBadges = async (userId, earned) => {
  // Fire Starter — given 50+ fires
  if (!earned.has("fire_starter")) {
    const { count: givenFires } = await supabase
      .from("fires")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if (givenFires >= 50) await awardBadge(userId, "fire_starter");
  }

  // Well Loved — received 50+ fires on your check-ins
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
      if (receivedFires >= 50) await awardBadge(userId, "well_loved");
    }
  }

  // Conversationalist — posted 50+ comments
  if (!earned.has("conversationalist")) {
    const { count: commentCount } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if (commentCount >= 50) await awardBadge(userId, "conversationalist");
  }
};

// Check Founding Member badge
const checkFoundingMember = async (userId, earned) => {
  if (earned.has("founding_member")) return;

  // Count users created before or at the same time as this user
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

  // User is within the first 100 (count includes themselves)
  if (count <= 100) await awardBadge(userId, "founding_member");
};

// Main entry point — run all checks for a user
// trigger: "checkin" | "fire" | "comment"
export const checkAndAwardBadges = async (userId, trigger = "checkin") => {
  try {
    const earned = await getEarnedKeys(userId);

    if (trigger === "checkin") {
      await checkMilestoneBadges(userId, earned);
      await checkVarietyBadges(userId, earned);
      await checkFoundingMember(userId, earned);
    }

    if (trigger === "fire") {
      await checkSocialBadges(userId, earned);
    }

    if (trigger === "comment") {
      await checkSocialBadges(userId, earned);
    }

    // Always check well_loved for the check-in owner when a fire is given
    if (trigger === "fire_received") {
      const receivedEarned = await getEarnedKeys(userId);
      await checkSocialBadges(userId, receivedEarned);
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
    earnedMap[b.badge_key] = b.awarded_at;
  }

  return (allBadges || []).map(b => ({
    ...b,
    earned: !!earnedMap[b.badge_key],
    awarded_at: earnedMap[b.badge_key] || null,
  }));
};
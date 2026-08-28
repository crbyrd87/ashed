import { adminClient, verifiedUserId } from "./_auth.js";

// Text Search is the expensive call in this proxy, so it is the one that is
// metered. Autocomplete fires on almost every keystroke and geocode/details
// are cheap, so metering those would mean a database write per letter typed
// for no real saving.
const SEARCH_LIMIT = { max: 60, windowMinutes: 60, feature: "places_search" };

export default async function handler(req, res) {
  // CR-6: this used to answer Access-Control-Allow-Origin: * with no auth at
  // all, on a billed Google key — any site on the internet could drive Places
  // through our account. The app calls this from its own origin, so no
  // cross-origin access is needed.
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const KEY = process.env.GOOGLE_PLACES_KEY;
  if (!KEY) {
    return res.status(500).json({ error: "Google API key not configured" });
  }

  const userId = await verifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Sign in required" });

  const { action, input, address, lat, lng, place_id } = req.query;

  if (action === "search") {
    try {
      const windowStart = new Date(Date.now() - SEARCH_LIMIT.windowMinutes * 60 * 1000).toISOString();
      const supabase = adminClient();
      const { count } = await supabase
        .from("api_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("feature", SEARCH_LIMIT.feature)
        .gte("created_at", windowStart);

      if (count >= SEARCH_LIMIT.max) {
        return res.status(429).json({ error: "Too many venue searches. Please try again later." });
      }
      await supabase.from("api_usage").insert({ user_id: userId, feature: SEARCH_LIMIT.feature });
    } catch (e) {
      // Fails open: a logging outage should not break venue search.
      console.error("[Places API] rate limit check failed:", e.message);
    }
  }

  try {
    let url;

    if (action === "autocomplete") {
      url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(regions)&key=${KEY}`;
    } else if (action === "geocode") {
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${KEY}`;
    } else if (action === "search") {
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=cigar+shop+OR+cigar+lounge+OR+tobacconist+OR+tobacco+shop+OR+tobacco+store+OR+smoke+shop&location=${lat},${lng}&radius=48000&key=${KEY}`;
    } else if (action === "details") {
      url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=name,formatted_address,formatted_phone_number,opening_hours,website,rating,user_ratings_total&key=${KEY}`;
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);

  } catch (e) {
    console.error("[Places API]", e);
    return res.status(500).json({ error: "Request failed", details: e.message });
  }
}

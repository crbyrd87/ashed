import { adminClient, verifiedUserId } from "./_auth.js";

const RATE_LIMITS = {
  band_scanner:    { max: 15, windowMinutes: 60 },
  recommendations: { max: 5,  windowMinutes: 60 },
  pairings:        { max: 5,  windowMinutes: 60 },
  tasting_notes:   { max: 10, windowMinutes: 60 },
};

export default async function handler(req, res) {
  // The app calls this from its own origin, so no cross-origin access is
  // needed. This used to send Access-Control-Allow-Origin: * , which invited
  // any website to spend our Anthropic credits through a user's browser.
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const KEY = process.env.ANTHROPIC_KEY;
  if (!KEY) return res.status(500).json({ error: "Anthropic API key not configured" });

  // CR-5: identity comes from a verified token, never from the request body.
  // Previously user_id was read straight off req.body, so any caller could
  // claim a premium user's id to unlock Opus, and could rotate ids or omit
  // `feature` to slip the rate limiter entirely.
  const userId = await verifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Sign in required" });

  const { model, messages, system, max_tokens, feature } = req.body;

  if (!model || !messages) {
    return res.status(400).json({ error: "Missing required fields: model, messages" });
  }

  // Every request must name a metered feature. Without this an unknown or
  // missing feature simply skipped the limiter.
  if (!feature || !RATE_LIMITS[feature]) {
    return res.status(400).json({ error: "Missing or unknown feature" });
  }

  const supabase = adminClient();

  // Server-side premium check for Opus (band scanner).
  if (model.includes("opus")) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("is_premium")
        .eq("id", userId)
        .single();
      if (error || !data?.is_premium) {
        return res.status(403).json({ error: "Premium subscription required for Band Scanner" });
      }
    } catch (e) {
      return res.status(500).json({ error: "Could not verify premium status" });
    }
  }

  // Rate limiting, keyed to the verified user.
  {
    const { max, windowMinutes } = RATE_LIMITS[feature];
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    try {
      const { count } = await supabase
        .from("api_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("feature", feature)
        .gte("created_at", windowStart);

      if (count >= max) {
        return res.status(429).json({
          error: `Rate limit reached. You can use ${feature.replace("_", " ")} ${max} times per hour. Please try again later.`
        });
      }

      await supabase.from("api_usage").insert({ user_id: userId, feature });
    } catch (e) {
      // Deliberately still fails open: a logging outage should not take the
      // whole feature down. The premium gate above does NOT fail open.
      console.error("Rate limit check failed:", e);
    }
  }

  try {
    const body = { model, messages, max_tokens: max_tokens || 1024 };
    if (system) body.system = system;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Anthropic API error" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Anthropic proxy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

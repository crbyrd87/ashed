import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const RATE_LIMITS = {
  band_scanner:    { max: 10, windowMinutes: 60 },
  recommendations: { max: 5,  windowMinutes: 60 },
  pairings:        { max: 10, windowMinutes: 60 },
  tasting_notes:   { max: 20, windowMinutes: 60 },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const KEY = process.env.ANTHROPIC_KEY;
  if (!KEY) return res.status(500).json({ error: "Anthropic API key not configured" });

  const { model, messages, system, max_tokens, user_id, feature } = req.body;

  if (!model || !messages) {
    return res.status(400).json({ error: "Missing required fields: model, messages" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Server-side premium check for Opus model (band scanner)
  if (model.includes("opus")) {
    if (!user_id) return res.status(403).json({ error: "Premium required for this feature" });
    try {
      const { data, error } = await supabase
        .from("users")
        .select("is_premium")
        .eq("id", user_id)
        .single();
      if (error || !data?.is_premium) {
        return res.status(403).json({ error: "Premium subscription required for Band Scanner" });
      }
    } catch (e) {
      return res.status(500).json({ error: "Could not verify premium status" });
    }
  }

  // Rate limiting
  if (user_id && feature && RATE_LIMITS[feature]) {
    const { max, windowMinutes } = RATE_LIMITS[feature];
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    try {
      const { count } = await supabase
        .from("api_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("feature", feature)
        .gte("created_at", windowStart);

      if (count >= max) {
        return res.status(429).json({
          error: `Rate limit reached. You can use ${feature.replace("_", " ")} ${max} times per hour. Please try again later.`
        });
      }

      // Log this usage
      await supabase.from("api_usage").insert({ user_id, feature });
    } catch (e) {
      console.error("Rate limit check failed:", e);
      // Don't block on rate limit errors — fail open
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
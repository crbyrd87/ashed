import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

// Get prior month name and year
function getPriorMonth() {
  const now = new Date();
  const prior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = prior.toLocaleString("en-US", { month: "long" });
  const year = prior.getFullYear();
  return { month, year, label: `${month} ${year}` };
}

export default async function handler(req, res) {
  // Allow GET only (both cron and manual admin trigger)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { month, year, label } = getPriorMonth();

  try {
    // Fetch all brands in our DB
    const { data: brandsData } = await supabase
      .from("cigars")
      .select("brand")
      .order("brand");

    const brands = [...new Set(brandsData?.map(r => r.brand) || [])];

    if (brands.length === 0) {
      return res.status(200).json({ message: "No brands in DB to check against." });
    }

    const brandList = brands.join(", ");

    // Call Anthropic with web search to find new releases
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        tools: [{ type: "web_search_20260209", name: "web_search" }],
        system: `You are a cigar industry researcher. Search halfwheel.com for new cigar lines or vitolas announced or released in ${label}. 

Our database contains these brands: ${brandList}

Search halfwheel.com for "${label} new cigar releases" and "halfwheel ${label}" to find what was announced.

Return ONLY a valid JSON array, no markdown, no explanation. Include any release from a brand that closely matches our list (e.g. "My Father Cigars" matches "My Father"):
[
  {
    "brand": "exact brand name from our list above",
    "line": "cigar line name",
    "vitolas": "comma-separated vitola names if known, or null",
    "source_url": "halfwheel.com URL where you found this",
    "notes": "one sentence about the release"
  }
]

If no new releases found from those brands, return an empty array: []`,
        messages: [
          {
            role: "user",
            content: `Search halfwheel.com for new cigar releases announced in ${label}. Look for releases from any of these brands: ${brandList}. Return a JSON array of matches.`
          }
        ]
      })
    });

    const data = await response.json();

    // Extract text content from response
    const textContent = data.content?.find(b => b.type === "text")?.text || "[]";
    console.log(`[db-refresh] Raw AI response for ${label}:`, textContent.substring(0, 500));
    const match = textContent.match(/\[[\s\S]*\]/);
    if (!match) {
      return res.status(200).json({ message: "No releases found.", month: label });
    }

    const candidates = JSON.parse(match[0]);
    console.log(`[db-refresh] Found ${candidates.length} candidates for ${label}:`, JSON.stringify(candidates));

    if (!candidates.length) {
      return res.status(200).json({ message: `No new releases found for ${label} from brands in our DB.` });
    }

    // Insert candidates — skip duplicates (same brand + line already pending)
    let inserted = 0;
    for (const c of candidates) {
      if (!c.brand || !c.line) continue;

      const { data: existing } = await supabase
        .from("db_refresh_candidates")
        .select("id")
        .eq("brand", c.brand)
        .eq("line", c.line)
        .eq("status", "pending")
        .maybeSingle();

      if (!existing) {
        await supabase.from("db_refresh_candidates").insert({
          brand: c.brand,
          line: c.line,
          vitolas: c.vitolas || null,
          source_url: c.source_url || null,
          notes: c.notes || null,
        });
        inserted++;
      }
    }

    return res.status(200).json({
      message: `DB refresh complete for ${label}. Found ${candidates.length} candidates, inserted ${inserted} new.`,
      candidates,
    });

  } catch (err) {
    console.error("DB refresh error:", err);
    return res.status(500).json({ error: "DB refresh failed", details: err.message });
  }
}
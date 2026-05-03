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
    console.log(`[db-refresh] Brands found: ${brands.length}`, brands.slice(0, 5));

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
        system: `You are a cigar industry researcher. Search halfwheel.com for new cigar releases that have been announced or released recently.

Our database has these brands: ${brandList}

Search for:
1. "halfwheel PCA 2026" releases from our brands
2. Any new cigar lines or vitolas from our brands announced in the past 60 days

Return matches where the brand closely matches our list. Use the EXACT brand name from our list.

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "brand": "exact brand name from our list",
    "line": "new cigar line name",
    "vitolas": "comma-separated vitola names if known, or null",
    "source_url": "halfwheel.com URL",
    "notes": "one sentence about the release"
  }
]

If nothing found, return: []`,
        messages: [
          {
            role: "user",
            content: `Search halfwheel.com for PCA 2026 new cigar releases and any recent releases from these brands: Asylum, Buffalo Trace, CAO, Macanudo, Drew Estate, Espinosa, My Father, Plasencia, La Aurora, Davidoff, Rocky Patel, Perdomo, Arturo Fuente, Alec Bradley, Tatuaje, Warped, Crowned Heads, Dunbarton Tobacco & Trust, AJ Fernandez, Caldwell, Camacho, Oliva, Padron. Return a JSON array of new lines or vitolas not previously in wide distribution.`
          }
        ]
      })
    });

    const data = await response.json();
    console.log(`[db-refresh] API status: ${response.status}`);
    console.log(`[db-refresh] Full response:`, JSON.stringify(data).substring(0, 2000));

    // Return the raw response for debugging
    if (!data.content) {
      return res.status(200).json({ 
        message: "No content in response", 
        brandsChecked: brands.length,
        apiStatus: response.status,
        apiResponse: JSON.stringify(data).substring(0, 500)
      });
    }

    // Extract text from all text blocks (web search may produce multiple)
    const textContent = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n") || "[]";
    const match = textContent.match(/\[[\s\S]*\]/);
    if (!match) {
      return res.status(200).json({ message: "No releases found.", month: label, brandsChecked: brands.length, rawText: textContent.substring(0, 300) });
    }

    const candidates = JSON.parse(match[0]);
    console.log(`[db-refresh] Found ${candidates.length} candidates for ${label}:`, JSON.stringify(candidates));

    if (!candidates.length) {
      return res.status(200).json({ message: `No new releases found for ${label} from brands in our DB.`, brandsChecked: brands.length, textContent: textContent.substring(0, 200) });
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
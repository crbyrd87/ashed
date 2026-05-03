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

    // Step 1: Fetch Halfwheel's 2026 release list directly
    let halfwheelContent = "";
    try {
      const hwRes = await fetch("https://halfwheel.com/2026-new-cigars/", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AshedApp/1.0)" }
      });
      halfwheelContent = await hwRes.text();
      // Extract just the table text — strip HTML tags
      halfwheelContent = halfwheelContent
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .substring(0, 8000);
      console.log(`[db-refresh] Halfwheel content length: ${halfwheelContent.length}`);
    } catch (e) {
      console.error("[db-refresh] Halfwheel fetch failed:", e.message);
      return res.status(200).json({ message: "Could not fetch Halfwheel data.", brandsChecked: brands.length });
    }

    // Step 2: Use Haiku to filter releases matching our brands
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: `You are a cigar database assistant. Extract new cigar releases from the provided Halfwheel data that match brands in our database.

Our brands: ${brandList}

Return ONLY a valid JSON array. Match brand names loosely (e.g. "Espinosa Premium Cigars" → "Espinosa"). Use exact brand name from our list:
[{"brand":"exact brand from list","line":"line name","vitolas":"vitola names or null","source_url":"https://halfwheel.com/2026-new-cigars/","notes":"one sentence"}]

Return [] if no matches found.`,
        messages: [{
          role: "user",
          content: `Here is the Halfwheel 2026 release data. Find any releases from our brand list:\n\n${halfwheelContent}`
        }]
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
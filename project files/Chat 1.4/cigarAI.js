import { supabase } from "./supabase";

const ANTHROPIC_KEY = process.env.REACT_APP_ANTHROPIC_KEY;

function dedupeLines(arr) {
  const seen = new Set();
  return arr
    .filter(c => {
      const key = c.brand + "|" + c.line;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.line.localeCompare(b.line));
}

function extractJSON(raw) {
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? match[0] : "[]";
}

async function callAI(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  return data.content?.[0]?.text || "[]";
}

export async function searchCigarLines(query, onPartialResults) {
  if (!query || query.trim().length < 2) return [];

  const searchTerm = query.trim().toLowerCase();

  const { data: cached } = await supabase
    .from("cigars")
    .select("brand, line, avg_rating")
    .or("brand.ilike.%" + searchTerm + "%,line.ilike.%" + searchTerm + "%")
    .order("line", { ascending: true });

  const dbResults = cached ? dedupeLines(cached) : [];
  if (dbResults.length > 0 && onPartialResults) onPartialResults(dbResults);

  // TODO (Week 29): Re-enable AI line search before launch.
  // Disabled during development -- AI returns duplicate/variant line names for seeded brands.
  // DB-only search is clean and sufficient while the seed covers top 31 brands.
  return dbResults;
}

export async function getVitolas(brand, line, onPartialResults) {
  const { data: cached } = await supabase
    .from("cigars")
    .select("*")
    .eq("brand", brand)
    .eq("line", line)
    .order("vitola", { ascending: true });

  if (cached && cached.length > 0 && onPartialResults) onPartialResults(cached);

  try {
    const raw = await callAI(
      "You are a cigar database API. Your only job is to return JSON data.\n\n" +
      "Find ALL vitolas/sizes for: " + brand + " - " + line + "\n\n" +
      "CRITICAL RULES:\n" +
      "- Return ONLY a raw JSON array\n" +
      "- NO explanatory text, NO markdown\n" +
      "- If you don't know, return []\n\n" +
      "Format:\n" +
      "[{\n" +
      "  \"brand\": \"" + brand + "\",\n" +
      "  \"line\": \"" + line + "\",\n" +
      "  \"vitola\": \"Robusto\",\n" +
      "  \"wrapper\": \"Country\",\n" +
      "  \"binder\": \"Country\",\n" +
      "  \"filler\": \"Country\",\n" +
      "  \"origin\": \"Country\",\n" +
      "  \"strength\": \"Light|Medium|Medium-Full|Full\",\n" +
      "  \"length_inches\": 5.0,\n" +
      "  \"ring_gauge\": 50,\n" +
      "  \"tasting_notes\": \"Brief tasting notes\",\n" +
      "  \"description\": \"One sentence\"\n" +
      "}]"
    );

    let aiVitolas;
    try { aiVitolas = JSON.parse(extractJSON(raw)); } catch { aiVitolas = []; }
    if (!aiVitolas.length) return cached || [];

    // TODO (Week 29): Re-enable AI writes to DB before launch.
    // AI vitola inserts are disabled during development to keep DB clean.
    // To re-enable: uncomment the insert block below and remove the display-only merge.

    // Display-only merge — AI results shown but NOT written to DB
    const cachedKeys = new Set((cached || []).map(c => c.vitola));
    const aiOnly = aiVitolas.filter(c => !cachedKeys.has(c.vitola));
    return [...(cached || []), ...aiOnly];

  } catch (err) {
    console.error("Vitola lookup failed:", err);
    return cached || [];
  }
}

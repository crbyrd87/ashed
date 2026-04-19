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

  try {
    const raw = await callAI(
      "You are a cigar database API. List all unique cigar brand+line combinations matching: \"" + query + "\"\n\n" +
      "CRITICAL RULES:\n" +
      "- Use the EXACT official line name as it appears on the band and in retailer catalogs. No abbreviations, shorthand, or informal names.\n" +
      "- Example: use \"Serie V\" not \"V\", use \"1964 Anniversary Series\" not \"1964\"\n" +
      "- If two results would refer to the same cigar line, return only the most complete and official name\n" +
      "- Do NOT return duplicate lines — each brand+line combination must be unique\n" +
      "- Only return lines that genuinely match the search query\n\n" +
      "Return ONLY a raw JSON array, no markdown, no explanation:\n" +
      "[{\"brand\": \"Padron\", \"line\": \"1964 Anniversary Series\"}]\n\n" +
      "Sort alphabetically by line. If nothing matches return: []"
    );
    let aiLines;
    try { aiLines = JSON.parse(extractJSON(raw)); } catch { aiLines = []; }

    // Drop AI results where the line name is a substring of an existing DB result
    // (e.g. AI returns "V" but DB already has "Serie V" for same brand)
    aiLines = aiLines.filter(ai => {
      const aiLine = ai.line.toLowerCase();
      const aiBrand = (ai.brand || "").toLowerCase();
      return !dbResults.some(db => {
        if (db.brand.toLowerCase() !== aiBrand) return false;
        const dbLine = db.line.toLowerCase();
        return dbLine.includes(aiLine) || aiLine.includes(dbLine);
      });
    });

    return dedupeLines([...dbResults, ...aiLines]);
  } catch (err) {
    console.error("Search failed:", err);
    return dbResults;
  }
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

    const cachedKeys = new Set((cached || []).map(c => c.vitola));
    const newVitolas = aiVitolas.filter(c => !cachedKeys.has(c.vitola));

    for (const c of newVitolas) {
      const row = {
        brand: c.brand || null,
        line: c.line || null,
        vitola: c.vitola || null,
        wrapper: c.wrapper || null,
        binder: c.binder || null,
        filler: c.filler || null,
        origin: c.origin || null,
        strength: c.strength || null,
        length_inches: c.length_inches || null,
        ring_gauge: c.ring_gauge || null,
        tasting_notes: c.tasting_notes || null,
        description: c.description || null,
        ai_generated: true,
        verified: false,
        total_checkins: 0,
      };
      const { error } = await supabase.from("cigars").insert(row);
      if (error) console.error("Insert error:", error.message);
    }

    const { data: final } = await supabase
      .from("cigars")
      .select("*")
      .eq("brand", brand)
      .eq("line", line)
      .order("vitola", { ascending: true });

    return final || cached || [];

  } catch (err) {
    console.error("Vitola lookup failed:", err);
    return cached || [];
  }
}
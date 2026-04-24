import { supabase } from "./supabase";

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
  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  // TODO (Week 29): Re-enable AI vitola lookup before launch.
  // When re-enabling: uncomment the callAI block below and set source = 'ai_generated' on inserts.
  // All AI-generated rows will be clearly tagged and visible in the admin console for review.
  // Only DB vitolas shown until re-enabled.
  return cached || [];
}
export default async function handler(req, res) {
  // Allow CORS from your app
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { action, input, address, lat, lng } = req.query;
  const KEY = process.env.GOOGLE_PLACES_KEY;

  if (!KEY) {
    return res.status(500).json({ error: "Google API key not configured" });
  }

  try {
    let url;

    if (action === "autocomplete") {
      url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(regions)&key=${KEY}`;
    } else if (action === "geocode") {
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${KEY}`;
    } else if (action === "search") {
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=cigar+shop+OR+cigar+lounge+OR+tobacconist+OR+tobacco+shop+OR+tobacco+store+OR+smoke+shop&location=${lat},${lng}&radius=48000&key=${KEY}`;
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

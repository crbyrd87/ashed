import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Fix Leaflet default icon broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom gold venue pin
const venueIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Blue "you are here" pin
const userIcon = new L.DivIcon({
  html: `<div style="width:14px;height:14px;background:#4a90e2;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 3px rgba(74,144,226,0.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  className: "",
});

// Helper to re-center map when venues change
function MapController({ venues, userLocation }) {
  const map = useMap();
  useEffect(() => {
    if (venues.length > 0) {
      const bounds = venues
        .filter(v => v.geometry?.location)
        .map(v => [v.geometry.location.lat, v.geometry.location.lng]);
      if (userLocation) bounds.push([userLocation.lat, userLocation.lng]);
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40] });
    } else if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 12);
    }
  }, [venues, userLocation, map]);
  return null;
}

const ShopIcon = ({ color = "#c9a84c", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="9" width="18" height="13" rx="1" fill={color}/>
    <polygon points="1,9 23,9 21,5 3,5" fill={color}/>
    <line x1="7" y1="5" x2="6" y2="9" stroke="#a07830" strokeWidth="0.8"/>
    <line x1="11" y1="5" x2="10" y2="9" stroke="#a07830" strokeWidth="0.8"/>
    <line x1="15" y1="5" x2="14" y2="9" stroke="#a07830" strokeWidth="0.8"/>
    <line x1="19" y1="5" x2="18" y2="9" stroke="#a07830" strokeWidth="0.8"/>
    <rect x="9" y="15" width="6" height="7" rx="0.5" fill="#1a0f08"/>
    <circle cx="14" cy="18.5" r="0.8" fill={color}/>
    <rect x="3" y="11" width="4" height="3" rx="0.5" fill="#1a0f08"/>
    <rect x="17" y="11" width="4" height="3" rx="0.5" fill="#1a0f08"/>
    <path d="M19 4 Q20 2 19 0" stroke={color} strokeWidth="0.6" fill="none" opacity="0.6"/>
  </svg>
);

const StarRating = ({ rating, count }) => {
  if (!rating) return null;
  const stars = Math.round(rating);
  return (
    <span style={{ fontSize: 11, color: "#c9a84c" }}>
      {"★".repeat(stars)}{"☆".repeat(5 - stars)} <span style={{ color: "#8a7055" }}>{rating.toFixed(1)}{count ? ` (${count.toLocaleString()})` : ""}</span>
    </span>
  );
};

const formatDistance = (meters) => {
  if (!meters && meters !== 0) return null;
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1609.34).toFixed(1)} mi away`;
};

const getDistanceMeters = (from, lat, lng) => {
  const R = 6371000;
  const dLat = (lat - from.lat) * Math.PI / 180;
  const dLng = (lng - from.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(from.lat * Math.PI/180) * Math.cos(lat * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// All Google API calls go through our serverless proxy to avoid CORS
const placesApi = async (params) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/places?${query}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

// Geocode an address to lat/lng
const geocodeAddress = async (address) => {
  const data = await placesApi({ action: "geocode", address });
  console.log("[Venues] Geocode status:", data.status, "results:", data.results?.length);
  if (data.status === "OK" && data.results?.[0]) {
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  }
  throw new Error(`Geocode failed: ${data.status} - ${data.error_message || ""}`);
};

// Search nearby cigar shops
const searchNearbyPlaces = async (loc) => {
  const data = await placesApi({ action: "search", lat: loc.lat, lng: loc.lng });
  console.log("[Venues] Places status:", data.status, "results:", data.results?.length);
  if (data.status === "OK" || data.status === "ZERO_RESULTS") {
    return (data.results || []).map(p => ({
      ...p,
      _distance: p.geometry?.location ? getDistanceMeters(loc, p.geometry.location.lat, p.geometry.location.lng) : null,
    })).sort((a, b) => (a._distance || 0) - (b._distance || 0));
  }
  throw new Error(`Places search failed: ${data.status} - ${data.error_message || ""}`);
};

// Autocomplete suggestions
const getAutocompleteSuggestions = async (input) => {
  const data = await placesApi({ action: "autocomplete", input });
  if (data.status === "OK" && data.predictions?.length) {
    return data.predictions.slice(0, 5).map(p => ({
      place_id: p.place_id,
      description: p.description,
    }));
  }
  return [];
};

// Fetch full place details (hours, phone) on demand
const getPlaceDetails = async (place_id) => {
  const data = await placesApi({ action: "details", place_id });
  if (data.status === "OK") return data.result;
  return null;
};

// Get smart hours display string
const getHoursDisplay = (openingHours) => {
  if (!openingHours) return null;
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const todayPeriod = (openingHours.periods || []).find(p => p.open?.day === day);

  if (!openingHours.open_now) {
    // Find next open time
    for (let i = 0; i < 7; i++) {
      const checkDay = (day + i) % 7;
      const period = (openingHours.periods || []).find(p => p.open?.day === checkDay);
      if (period?.open?.time) {
        const h = parseInt(period.open.time.slice(0, 2));
        const m = parseInt(period.open.time.slice(2));
        const label = `${h > 12 ? h - 12 : h || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
        if (i === 0) {
          const openMins = h * 60 + m;
          const minsUntilOpen = openMins - currentMins;
          if (minsUntilOpen <= 60 && minsUntilOpen > 0) {
            return { text: `Opening Soon · ${label}`, color: "#c9a84c" };
          }
          return { text: `Closed · Opens at ${label}`, color: "#a0522d" };
        }
        return { text: `Closed · Opens ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][checkDay]} ${label}`, color: "#a0522d" };
      }
    }
    return { text: "Closed", color: "#a0522d" };
  }

  if (todayPeriod?.close?.time) {
    const h = parseInt(todayPeriod.close.time.slice(0, 2));
    const m = parseInt(todayPeriod.close.time.slice(2));
    const closeMins = h * 60 + m;
    const minsUntilClose = closeMins - currentMins;
    const label = `${h > 12 ? h - 12 : h || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
    if (minsUntilClose <= 60 && minsUntilClose > 0) {
      return { text: `Closing Soon · ${label}`, color: "#e8632a" };
    }
    return { text: `Open · Closes ${label}`, color: "#7a9a7a" };
  }

  return { text: "Open now", color: "#7a9a7a" };
};

export default function Venues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" | "map"
  const [userLocation, setUserLocation] = useState(null);
  const [venueDetails, setVenueDetails] = useState({});
  const suggestTimeout = useRef(null);

  const handleQueryChange = (val) => {
    setSearchQuery(val);
    setError(null);
    clearTimeout(suggestTimeout.current);
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestTimeout.current = setTimeout(async () => {
      try {
        const preds = await getAutocompleteSuggestions(val);
        setSuggestions(preds);
        setShowSuggestions(preds.length > 0);
      } catch (e) {
        console.error("[Venues] Autocomplete error:", e);
      }
    }, 350);
  };

  const doSearch = async (query) => {
    setLoading(true);
    setHasSearched(true);
    setVenues([]);
    setError(null);
    setShowSuggestions(false);
    setSuggestions([]);
    try {
      const loc = await geocodeAddress(query);
      const results = await searchNearbyPlaces(loc);
      setVenues(results);
    } catch (e) {
      console.error("[Venues] Search error:", e);
      setError(`Couldn't find results for "${query}". Try a different city or zip.`);
    }
    setLoading(false);
  };

  const requestLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Location not supported on this device.");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        try {
          const results = await searchNearbyPlaces(loc);
          setVenues(results);
        } catch (e) {
          setError("Couldn't load nearby shops. Please try searching by city or zip.");
        }
        setLoading(false);
      },
      (err) => {
        if (err.code === 1) {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          setError(isIOS
            ? "Location access denied. Go to Settings → Privacy & Security → Location Services → Safari → select 'While Using App', then try again."
            : "Location access denied. Click the lock icon in your browser's address bar to allow location, then try again."
          );
        } else {
          setError("Couldn't get your location. Try searching by city or zip.");
        }
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const handleVenueTap = async (venue) => {
    const isSelected = selectedVenue?.place_id === venue.place_id;
    setSelectedVenue(isSelected ? null : venue);
    if (!isSelected && venue.place_id && !venueDetails[venue.place_id]) {
      try {
        const details = await getPlaceDetails(venue.place_id);
        if (details) setVenueDetails(prev => ({ ...prev, [venue.place_id]: details }));
      } catch (e) {
        console.error("Details fetch error:", e);
      }
    }
  };

  const openDirections = (venue) => {
    const addr = encodeURIComponent(venue.vicinity || venue.formatted_address || venue.name);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS ? `maps://maps.apple.com/?q=${addr}` : `https://maps.google.com/?q=${addr}`;
    window.open(url, "_blank");
  };

  const openCall = (venue) => {
    if (venue.formatted_phone_number) {
      window.location.href = `tel:${venue.formatted_phone_number.replace(/\s/g, "")}`;
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: SANS, color: "#e8d5b7" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 2 }}>FIND A CIGAR SHOP</div>
        {hasSearched && venues.length > 0 && (
          <div style={{ display: "flex", background: "#2a1a0e", borderRadius: 20, padding: 2, border: "1px solid #3a2510" }}>
            {[["list", "List"], ["map", "Map"]].map(([id, label]) => (
              <button key={id} onClick={() => setViewMode(id)}
                style={{ padding: "4px 12px", borderRadius: 18, border: "none", background: viewMode === id ? "#c9a84c" : "transparent", color: viewMode === id ? "#1a0f08" : "#8a7055", fontSize: 11, fontWeight: viewMode === id ? 700 : 400, cursor: "pointer", fontFamily: SANS }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ flex: 1, background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: showSuggestions && suggestions.length > 0 ? "8px 8px 0 0" : "8px", padding: "10px 14px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none" }}
            placeholder="Search by city or zip..."
            value={searchQuery}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchQuery.trim() && doSearch(searchQuery.trim())}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          <button
            onClick={() => searchQuery.trim() && doSearch(searchQuery.trim())}
            disabled={loading}
            style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "10px 16px", color: "#1a0f08", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 56, background: "#2a1a0e", border: "1px solid #4a3020", borderTop: "none", borderRadius: "0 0 8px 8px", zIndex: 50, overflow: "hidden" }}>
            {suggestions.map(s => (
              <div
                key={s.place_id}
                onMouseDown={() => { setSearchQuery(s.description); doSearch(s.description); }}
                style={{ padding: "10px 14px", fontSize: 13, color: "#e8d5b7", cursor: "pointer", borderBottom: "1px solid #3a251033", display: "flex", alignItems: "center", gap: 8 }}
              >
                <span style={{ fontSize: 12, color: "#c9a84c" }}>📍</span>
                <span>{s.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Use my location */}
      <button
        onClick={requestLocation}
        style={{ width: "100%", background: "none", border: "1px solid #3a2510", borderRadius: 8, padding: "10px 14px", color: "#8a7055", fontSize: 13, cursor: "pointer", fontFamily: SANS, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
      >
        📍 Use my current location
      </button>

      {/* Error */}
      {error && (
        <div style={{ background: "#a0522d18", border: "1px solid #a0522d44", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#e8a07a", marginBottom: 14, lineHeight: 1.6 }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <ShopIcon size={40} color="#3a2510" />
          </div>
          <div style={{ fontSize: 13, color: "#5a4535" }}>Finding nearby cigar shops...</div>
        </div>
      )}

      {/* No results */}
      {!loading && hasSearched && venues.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>No cigar shops found</div>
          <div style={{ fontSize: 13, color: "#5a4535" }}>Try a different city or zip code.</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasSearched && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <ShopIcon size={48} color="#3a2510" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>Find a cigar shop near you</div>
          <div style={{ fontSize: 13, color: "#5a4535", lineHeight: 1.6 }}>Allow location access or search by city or zip to find nearby cigar shops and lounges.</div>
        </div>
      )}

      {/* Map view */}
      {!loading && viewMode === "map" && venues.length > 0 && (
        <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 16, height: 420 }}>
          <MapContainer
            center={userLocation ? [userLocation.lat, userLocation.lng] : [venues[0].geometry.location.lat, venues[0].geometry.location.lng]}
            zoom={11}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController venues={venues} userLocation={userLocation} />
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}
            {venues.map((venue, i) => venue.geometry?.location && (
              <Marker
                key={venue.place_id || i}
                position={[venue.geometry.location.lat, venue.geometry.location.lng]}
                icon={venueIcon}
              >
                <Popup>
                  <div style={{ fontFamily: SANS, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{venue.name}</div>
                    <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>{venue.vicinity || venue.formatted_address}</div>
                    {venue.rating && <div style={{ fontSize: 11 }}>{"★".repeat(Math.round(venue.rating))} {venue.rating.toFixed(1)}</div>}
                    <button
                      onClick={() => { setSelectedVenue(venue); setViewMode("list"); }}
                      style={{ marginTop: 8, background: "#c9a84c", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%" }}
                    >
                      View details
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Venue list */}
      {!loading && viewMode === "list" && venues.map((venue, i) => {
        const isSelected = selectedVenue?.place_id === venue.place_id;
        const distance = venue._distance != null ? formatDistance(venue._distance) : null;
        const details = venueDetails[venue.place_id];
        const hours = getHoursDisplay(details?.opening_hours || venue.opening_hours);
        const phone = details?.formatted_phone_number || venue.formatted_phone_number;

        return (
          <div
            key={venue.place_id || i}
            style={{ background: "linear-gradient(135deg, #2a1a0e, #221508)", border: `1px solid ${isSelected ? "#c9a84c55" : "#3a2510"}`, borderRadius: 10, marginBottom: 10, overflow: "hidden", cursor: "pointer" }}
            onClick={() => handleVenueTap(venue)}
          >
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <ShopIcon size={16} color="#c9a84c" />
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7" }}>{venue.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#8a7055", marginBottom: 4 }}>
                    {venue.vicinity || venue.formatted_address}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {venue.rating && <StarRating rating={venue.rating} count={venue.user_ratings_total} />}
                    {hours && (
                      <span style={{ fontSize: 11, color: hours.color, fontWeight: 600 }}>{hours.text}</span>
                    )}
                    {!hours && venue.opening_hours && (
                      <span style={{ fontSize: 11, color: venue.opening_hours.open_now ? "#7a9a7a" : "#a0522d", fontWeight: 600 }}>
                        {venue.opening_hours.open_now ? "Open now" : "Closed"}
                      </span>
                    )}
                    {distance && <span style={{ fontSize: 11, color: "#5a4535" }}>{distance}</span>}
                  </div>
                </div>
              </div>
            </div>

            {isSelected && (
              <div style={{ borderTop: "1px solid #3a2510", padding: "12px 14px" }}>
                {phone && (
                  <div style={{ fontSize: 13, color: "#8a7055", marginBottom: 12 }}>
                    📞 <span style={{ color: "#c8b89a" }}>{phone}</span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDirections(venue); }}
                    style={{ flex: 1, background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "10px 0", color: "#1a0f08", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}
                  >
                    📍 Directions
                  </button>
                  {phone && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openCall({ ...venue, formatted_phone_number: phone }); }}
                      style={{ flex: 1, background: "none", border: "1px solid #c9a84c55", borderRadius: 8, padding: "10px 0", color: "#c9a84c", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}
                    >
                      📞 Call
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
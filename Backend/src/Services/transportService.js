const axios = require("axios");

const http = axios.create({ timeout: 10000 });

// ── Haversine aerial distance (km) ───────────────────────────────────────────
function haversine_km(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Geocode city name → lat/lng ──────────────────────────────────────────────
async function geocode_city(city) {
  const { data } = await http.get("https://nominatim.openstreetmap.org/search", {
    params: { q: city, format: "json", limit: 1 },
    headers: {
      "User-Agent": process.env.NOMINATIM_USER_AGENT || "ai-travel-companion/1.0",
    },
  });
  if (!data?.length) throw Object.assign(new Error(`City not found: ${city}`), { code: "CITY_NOT_FOUND" });
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name };
}

// ── City → IRCTC station code map ────────────────────────────────────────────
const STATION_MAP = {
  delhi: "NDLS", "new delhi": "NDLS",
  mumbai: "CSTM", bombay: "CSTM",
  bangalore: "SBC", bengaluru: "SBC",
  chennai: "MAS", madras: "MAS",
  hyderabad: "HYB", secunderabad: "SC",
  kolkata: "HWH", calcutta: "HWH",
  goa: "MAO", madgaon: "MAO",
  jaipur: "JP",
  ahmedabad: "ADI",
  pune: "PUNE",
  kochi: "ERS", cochin: "ERS",
  lucknow: "LKO",
  varanasi: "BSB",
  amritsar: "ASR",
  chandigarh: "CDG",
  nagpur: "NGP",
  indore: "INDB",
  bhopal: "BPL",
  agra: "AGC",
  patna: "PNBE",
  surat: "ST",
  bhubaneswar: "BBS",
  ranchi: "RNC",
  raipur: "R",
  visakhapatnam: "VSKP", vizag: "VSKP",
  coimbatore: "CBE",
  madurai: "MDU",
  mangalore: "MAQ",
  udaipur: "UDZ",
  jodhpur: "JU",
  shimla: "SML",
  dehradun: "DDN",
  haridwar: "HW",
  allahabad: "PRYJ", prayagraj: "PRYJ",
  kanpur: "CNB",
  jabalpur: "JBP",
  gwalior: "GWL",
  mysore: "MYS", mysuru: "MYS",
  hubli: "UBL",
  tirupati: "TPTY",
  vijayawada: "BZA",
  "new bombay": "PANVEL", "navi mumbai": "PANVEL",
};

function get_station_code_from_map(city) {
  const key = city.toLowerCase().trim();
  if (STATION_MAP[key]) return STATION_MAP[key];
  for (const [k, v] of Object.entries(STATION_MAP)) {
    if (key.includes(k) || k.includes(key.split(",")[0].trim())) return v;
  }
  return null;
}

// ── Dynamic station lookup via IRCTC SearchStation API ───────────────────────
async function search_station_code(city, rapidapi_key) {
  try {
    const { data } = await http.get(
      "https://irctc1.p.rapidapi.com/api/v1/searchStation",
      {
        params: { query: city.trim() },
        headers: {
          "x-rapidapi-key":  rapidapi_key,
          "x-rapidapi-host": "irctc1.p.rapidapi.com",
        },
        timeout: 5000,
      }
    );
    if (data?.data?.length) {
      return {
        code: data.data[0].station_code,
        name: data.data[0].station_name,
      };
    }
  } catch {
    // silent — fallback to null
  }
  return null;
}

async function resolve_station(city, rapidapi_key) {
  // 1. Try static map (instant, no API call)
  const from_map = get_station_code_from_map(city);
  if (from_map) return { code: from_map, name: city };
  // 2. Dynamic lookup via SearchStation
  return await search_station_code(city, rapidapi_key);
}

// ── Fare per class based on distance (IR 2023-24 rates) ──────────────────────
function fare_for_class(cls, aerial_km) {
  const km = Math.round(aerial_km * 1.3);
  const fares = {
    SL:  Math.round(Math.max(105, 25  + 0.63 * km)),
    "3A": Math.round(Math.max(245, 100 + 1.58 * km)),
    "2A": Math.round(Math.max(350, 150 + 2.23 * km)),
    "1A": Math.round(Math.max(600, 250 + 4.11 * km)),
    CC:  Math.round(Math.max(200, 80  + 1.20 * km)), // Chair Car
    EC:  Math.round(Math.max(800, 300 + 3.50 * km)), // Executive Chair
    "2S": Math.round(Math.max(60,  15  + 0.40 * km)), // Second Seating
  };
  return fares[cls] || fares["3A"];
}

// ── IRCTC RapidAPI — real trains between stations ────────────────────────────
async function fetch_trains_irctc(from_city, to_city, date, aerial_km) {
  const rapidapi_key = (process.env.RAPIDAPI_KEY || "").trim();

  if (!rapidapi_key) {
    return {
      source: "estimated",
      from_code: "—", to_code: "—",
      note: "Add RAPIDAPI_KEY to Backend/.env for live train data",
      trains: estimated_trains(aerial_km),
    };
  }

  // Resolve station codes — static map first, then dynamic SearchStation API
  const [from_stn, to_stn] = await Promise.all([
    resolve_station(from_city, rapidapi_key),
    resolve_station(to_city, rapidapi_key),
  ]);

  if (!from_stn || !to_stn) {
    const missing = !from_stn ? from_city : to_city;
    return {
      source: "estimated",
      from_code: from_stn?.code || "—",
      to_code:   to_stn?.code   || "—",
      note: `Station not found for "${missing}" — showing fare estimates`,
      trains: estimated_trains(aerial_km),
    };
  }

  // Format date DD-MM-YYYY (IRCTC API requirement)
  const [year, month, day] = date.split("-");
  const irctc_date = `${day}-${month}-${year}`;

  try {
    const { data } = await http.get(
      "https://irctc1.p.rapidapi.com/api/v3/trainBetweenStations",
      {
        params: {
          fromStationCode: from_stn.code,
          toStationCode:   to_stn.code,
          dateOfJourney:   irctc_date,
        },
        headers: {
          "x-rapidapi-key":  rapidapi_key,
          "x-rapidapi-host": "irctc1.p.rapidapi.com",
          "Content-Type":    "application/json",
        },
      }
    );

    if (!data?.status || !Array.isArray(data.data) || !data.data.length) {
      return {
        source: "estimated",
        from_code: from_stn.code,
        to_code:   to_stn.code,
        note: `No trains found for ${from_stn.code} → ${to_stn.code} on ${irctc_date}`,
        trains: estimated_trains(aerial_km),
      };
    }

    return {
      source: "irctc",
      from_code: from_stn.code,
      to_code:   to_stn.code,
      total: data.data.length,
      trains: data.data.map((t) => {
        const classes = Array.isArray(t.class_type) ? t.class_type : [];
        return {
          train_number: t.train_number,
          train_name:   t.train_name,
          departure:    t.from_sta,        // "16:55"
          arrival:      t.to_sta,          // "10:00"
          duration:     t.duration,        // "17:05"
          run_days:     t.run_days || [],
          from_stn:     t.from_stn_name || from_stn.code,
          to_stn:       t.to_stn_name   || to_stn.code,
          classes,
          fares: classes.reduce((acc, cls) => {
            acc[cls] = fare_for_class(cls, aerial_km);
            return acc;
          }, {}),
        };
      }),
    };
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Unknown error";
    return {
      source: "estimated",
      from_code: from_stn.code,
      to_code:   to_stn.code,
      note: `IRCTC API error: ${msg} — showing estimates`,
      trains: estimated_trains(aerial_km),
    };
  }
}

// ── Fallback estimated trains (when API key missing or route fails) ────────────
function estimated_trains(aerial_km) {
  const km = Math.round(aerial_km * 1.3);
  const hrs = +(km / 65).toFixed(1);
  return [
    { train_number: "—", train_name: "Rajdhani Express (estimate)", departure: "—", arrival: "—", duration: `~${Math.floor(hrs)}h`, classes: ["1A","2A","3A"], fares: { "1A": fare_for_class("1A", aerial_km), "2A": fare_for_class("2A", aerial_km), "3A": fare_for_class("3A", aerial_km) }, estimated: true },
    { train_number: "—", train_name: "Shatabdi / Vande Bharat (estimate)", departure: "—", arrival: "—", duration: `~${Math.floor(hrs)}h`, classes: ["CC","EC"], fares: { CC: fare_for_class("CC", aerial_km), EC: fare_for_class("EC", aerial_km) }, estimated: true },
    { train_number: "—", train_name: "Mail / Express (estimate)", departure: "—", arrival: "—", duration: `~${Math.floor(hrs * 1.2)}h`, classes: ["SL","3A","2A"], fares: { SL: fare_for_class("SL", aerial_km), "3A": fare_for_class("3A", aerial_km), "2A": fare_for_class("2A", aerial_km) }, estimated: true },
  ];
}

// ── Bus fare estimation ───────────────────────────────────────────────────────
function calc_bus_fares(aerial_km) {
  const km = Math.round(aerial_km * 1.3);
  const hrs = +(km / 55).toFixed(1);
  return [
    { type: "State Bus (Non-AC)",    fare: Math.round(Math.max(80,  0.9 * km)), duration_h: hrs, note: "State roadways · cheapest" },
    { type: "Private AC Seater",     fare: Math.round(Math.max(200, 1.8 * km)), duration_h: hrs, note: "Semi-sleeper · comfortable" },
    { type: "Private Sleeper",       fare: Math.round(Math.max(400, 2.8 * km)), duration_h: hrs, note: "Flat berth · overnight" },
    { type: "Volvo / Luxury AC",     fare: Math.round(Math.max(600, 4.0 * km)), duration_h: hrs, note: "Premium · best comfort" },
  ];
}

// ── Cab fare estimation (outstation) ─────────────────────────────────────────
function calc_cab_fares(aerial_km) {
  const km = Math.round(aerial_km * 1.3);
  const hrs = +(km / 80).toFixed(1); // highway speed
  return [
    { type: "Hatchback (Ola/Uber)", fare: Math.round(11 * km), duration_h: hrs, note: "4 pax · budget outstation", per: "total" },
    { type: "Sedan",                fare: Math.round(14 * km), duration_h: hrs, note: "4 pax · comfortable",       per: "total" },
    { type: "SUV / Innova",         fare: Math.round(18 * km), duration_h: hrs, note: "6-7 pax · group travel",    per: "total" },
  ];
}

// ── Flight cost estimation (fallback when Amadeus not configured) ─────────────
function estimate_flight_fare(aerial_km) {
  const base = 2500;
  const per_km = aerial_km < 500 ? 6 : aerial_km < 1000 ? 5 : 4;
  return Math.round(base + per_km * aerial_km);
}

// ── IATA city code map ────────────────────────────────────────────────────────
const IATA = {
  // India
  mumbai: "BOM", bombay: "BOM",
  delhi: "DEL", "new delhi": "DEL",
  bangalore: "BLR", bengaluru: "BLR",
  chennai: "MAA", madras: "MAA",
  hyderabad: "HYD",
  kolkata: "CCU", calcutta: "CCU",
  goa: "GOI", panaji: "GOI",
  jaipur: "JAI",
  ahmedabad: "AMD",
  pune: "PNQ",
  kochi: "COK", cochin: "COK",
  lucknow: "LKO",
  varanasi: "VNS",
  amritsar: "ATQ",
  chandigarh: "IXC",
  nagpur: "NAG",
  indore: "IDR",
  srinagar: "SXR",
  leh: "IXL",
  udaipur: "UDR",
  patna: "PAT",
  bhubaneswar: "BBI",
  ranchi: "IXR",
  raipur: "RPR",
  visakhapatnam: "VTZ", vizag: "VTZ",
  coimbatore: "CJB",
  madurai: "IXM",
  mangalore: "IXE",
  // International
  dubai: "DXB", singapore: "SIN", bangkok: "BKK",
  london: "LHR", paris: "CDG", tokyo: "NRT",
  "new york": "JFK", sydney: "SYD", toronto: "YYZ",
  bali: "DPS", phuket: "HKT", kathmandu: "KTM",
  colombo: "CMB", "kuala lumpur": "KUL",
};

function get_iata(city) {
  const key = city.toLowerCase().trim();
  if (IATA[key]) return IATA[key];
  for (const [k, v] of Object.entries(IATA)) {
    if (key.includes(k) || k.includes(key.split(",")[0].trim())) return v;
  }
  return null;
}

// ── Amadeus OAuth2 token (cached) ─────────────────────────────────────────────
let _amadeus_token = null;
let _amadeus_expiry = 0;

async function get_amadeus_token() {
  if (_amadeus_token && Date.now() < _amadeus_expiry) return _amadeus_token;
  const { data } = await http.post(
    "https://test.api.amadeus.com/v1/security/oauth2/token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID,
      client_secret: process.env.AMADEUS_CLIENT_SECRET,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  _amadeus_token = data.access_token;
  _amadeus_expiry = Date.now() + (data.expires_in - 60) * 1000;
  return _amadeus_token;
}

// ── Amadeus flight search ─────────────────────────────────────────────────────
async function search_flights_amadeus(from_city, to_city, date, aerial_km) {
  const client_id = (process.env.AMADEUS_CLIENT_ID || "").trim();
  const client_secret = (process.env.AMADEUS_CLIENT_SECRET || "").trim();

  const origin = get_iata(from_city);
  const dest   = get_iata(to_city);

  // Fallback estimation when Amadeus not configured or IATA not found
  if (!client_id || !client_secret) {
    return {
      source: "estimated",
      available: true,
      origin: origin || from_city.toUpperCase().slice(0, 3),
      destination: dest || to_city.toUpperCase().slice(0, 3),
      note: "Configure AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET in .env for live fares",
      offers: [
        { airline: "Budget (IndiGo/SpiceJet)", fare: estimate_flight_fare(aerial_km), currency: "INR", stops: 0, cabin: "ECONOMY", note: "Estimated · varies by date" },
        { airline: "Full-service (Air India)",  fare: Math.round(estimate_flight_fare(aerial_km) * 1.4), currency: "INR", stops: 0, cabin: "ECONOMY", note: "Estimated · varies by date" },
      ],
    };
  }

  if (!origin || !dest) {
    return {
      source: "estimated",
      available: true,
      note: `No airport found near ${!origin ? from_city : to_city} — showing estimate`,
      offers: [
        { airline: "Budget airline", fare: estimate_flight_fare(aerial_km), currency: "INR", stops: 0, cabin: "ECONOMY", note: "Estimated" },
      ],
    };
  }

  try {
    const token = await get_amadeus_token();
    const { data } = await http.get(
      "https://test.api.amadeus.com/v2/shopping/flight-offers",
      {
        params: {
          originLocationCode: origin,
          destinationLocationCode: dest,
          departureDate: date,
          adults: 1,
          max: 5,
          currencyCode: "INR",
        },
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return {
      source: "amadeus",
      available: true,
      origin,
      destination: dest,
      offers: data.data.map((o) => ({
        airline:   o.validatingAirlineCodes?.[0] || "—",
        fare:      Math.round(parseFloat(o.price.grandTotal)),
        currency:  o.price.currency,
        stops:     (o.itineraries?.[0]?.segments?.length || 1) - 1,
        duration:  o.itineraries?.[0]?.duration?.replace("PT", "").toLowerCase(),
        departure: o.itineraries?.[0]?.segments?.[0]?.departure?.at,
        arrival:   o.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.at,
        cabin:     o.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || "ECONOMY",
      })),
    };
  } catch (err) {
    return {
      source: "estimated",
      available: true,
      note: "Amadeus live search failed — showing estimate",
      offers: [
        { airline: "Budget airline", fare: estimate_flight_fare(aerial_km), currency: "INR", stops: 0, cabin: "ECONOMY", note: "Estimated" },
      ],
    };
  }
}

// ── Main function ─────────────────────────────────────────────────────────────
async function getTransportOptions({ from, to, date }) {
  const travel_date = date || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const [from_geo, to_geo] = await Promise.all([
    geocode_city(from),
    geocode_city(to),
  ]);

  const aerial_km = Math.round(haversine_km(from_geo.lat, from_geo.lng, to_geo.lat, to_geo.lng));
  const road_km   = Math.round(aerial_km * 1.3);

  const [flights, trains] = await Promise.all([
    search_flights_amadeus(from, to, travel_date, aerial_km),
    fetch_trains_irctc(from, to, travel_date, aerial_km),
  ]);

  return {
    from:       from_geo.name.split(",")[0].trim(),
    to:         to_geo.name.split(",")[0].trim(),
    aerial_km,
    road_km,
    date:       travel_date,
    trains,
    buses:      calc_bus_fares(aerial_km),
    cabs:       calc_cab_fares(aerial_km),
    flights,
    booking_links: {
      irctc:  `https://www.irctc.co.in/nget/train-search`,
      redbus: `https://www.redbus.in/bus-tickets/${encodeURIComponent(from.toLowerCase())}-to-${encodeURIComponent(to.toLowerCase())}`,
      uber:   `https://m.uber.com/ul/?action=setPickup`,
      ola:    `https://book.olacabs.com/?utm_source=yatrify`,
    },
  };
}

module.exports = { getTransportOptions };

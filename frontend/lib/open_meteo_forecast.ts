/** WMO Weather interpretation codes (Open-Meteo). */
export function wmo_condition_label(code: number): string {
  if (code === 0) return "Sunny";
  if (code === 1 || code === 2) return "Mainly clear";
  if (code === 3) return "Cloudy";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Mixed";
}

export type open_meteo_current = {
  temp_c: number;
  humidity_pct: number;
  condition_label: string;
  weather_code: number;
};

export type open_meteo_day = {
  date_iso: string;
  max_c: number;
  min_c: number;
  condition_label: string;
  weather_code: number;
};

export type open_meteo_bundle = {
  current: open_meteo_current;
  daily: open_meteo_day[];
};

type om_response = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

export async function fetch_open_meteo_forecast(lat: number, lng: number): Promise<open_meteo_bundle | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as om_response;
  const c = data.current;
  if (
    c?.temperature_2m == null ||
    c.relative_humidity_2m == null ||
    c.weather_code == null ||
    !data.daily?.time?.length
  ) {
    return null;
  }

  const wc = c.weather_code;
  const current: open_meteo_current = {
    temp_c: c.temperature_2m,
    humidity_pct: Math.round(c.relative_humidity_2m),
    weather_code: wc,
    condition_label: wmo_condition_label(wc),
  };

  const times = data.daily.time!;
  const codes = data.daily.weather_code || [];
  const maxs = data.daily.temperature_2m_max || [];
  const mins = data.daily.temperature_2m_min || [];
  const daily: open_meteo_day[] = times.map((t, i) => {
    const code = typeof codes[i] === "number" ? codes[i]! : 0;
    return {
      date_iso: t,
      max_c: typeof maxs[i] === "number" ? maxs[i]! : 0,
      min_c: typeof mins[i] === "number" ? mins[i]! : 0,
      weather_code: code,
      condition_label: wmo_condition_label(code),
    };
  });

  return { current, daily };
}

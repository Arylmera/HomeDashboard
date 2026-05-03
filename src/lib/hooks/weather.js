import { usePolling } from './usePolling.js';

const URL = 'https://api.open-meteo.com/v1/forecast'
  + '?latitude=50.50&longitude=4.85'
  + '&current=temperature_2m,weather_code'
  + '&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,daylight_duration'
  + '&forecast_days=4&timezone=auto';

const EMPTY = { temp: '—', code: 0, desc: '—', daily: [], sun: null };

export function weatherDesc(c) {
  if (c === 0) return 'clear';
  if (c <= 3) return 'partly cloudy';
  if (c <= 48) return 'fog';
  if (c <= 67) return 'rain';
  if (c <= 77) return 'snow';
  if (c <= 82) return 'showers';
  if (c <= 99) return 'storm';
  return '—';
}

// Pure: shape an open-meteo response into the dashboard model.
export function shapeForecast(j) {
  const t = j?.current?.temperature_2m;
  const c = j?.current?.weather_code;
  const d = j?.daily;
  const daily = (d?.time || []).slice(1, 4).map((iso, i) => ({
    date: iso,
    max: d.temperature_2m_max?.[i + 1] != null ? Math.round(d.temperature_2m_max[i + 1]) : null,
    min: d.temperature_2m_min?.[i + 1] != null ? Math.round(d.temperature_2m_min[i + 1]) : null,
    code: d.weather_code?.[i + 1],
    desc: weatherDesc(d.weather_code?.[i + 1]),
  }));
  const sunrise = d?.sunrise?.[0] ? new Date(d.sunrise[0]) : null;
  const sunset  = d?.sunset?.[0]  ? new Date(d.sunset[0])  : null;
  const sun = sunrise && sunset ? {
    sunrise, sunset,
    daylight: d?.daylight_duration?.[0] ?? null,
    tomorrowRise: d?.sunrise?.[1] ? new Date(d.sunrise[1]) : null,
  } : null;
  return { temp: t != null ? Math.round(t) : '—', code: c, desc: weatherDesc(c), daily, sun };
}

export function useWeather({ poll = 30 * 60_000 } = {}) {
  // Open-Meteo is rate-limited; default to once per 30 min.
  const { data } = usePolling(
    async (signal) => {
      const r = await fetch(URL, { signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return shapeForecast(await r.json());
    },
    { poll }
  );
  return data || EMPTY;
}

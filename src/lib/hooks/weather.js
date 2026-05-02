import { useState, useEffect } from 'react';

function weatherDesc(c) {
  if (c === 0) return "clear";
  if (c <= 3) return "partly cloudy";
  if (c <= 48) return "fog";
  if (c <= 67) return "rain";
  if (c <= 77) return "snow";
  if (c <= 82) return "showers";
  if (c <= 99) return "storm";
  return "—";
}

export function useWeather() {
  const [w, setW] = useState({ temp: "—", code: 0, desc: "—", daily: [] });
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=50.50&longitude=4.85&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=4&timezone=auto")
      .then(r => r.json())
      .then(j => {
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
        setW({ temp: t != null ? Math.round(t) : "—", code: c, desc: weatherDesc(c), daily });
      })
      .catch(() => {});
  }, []);
  return w;
}

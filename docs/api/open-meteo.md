# Open-Meteo — Weather API

Base: `https://api.open-meteo.com/v1` · No auth, no key. Public, free, generous rate limit (~10k calls/day per IP).

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `useWeather()`.

## Endpoints we use
| Path | Returns |
|------|---------|
| `/forecast?latitude=&longitude=&current=temperature_2m,weather_code` | `{current:{time, interval, temperature_2m, weather_code}}` |

## Other useful endpoints
| Base | Purpose |
|------|---------|
| `/forecast` | core weather forecast |
| `/archive?latitude=&longitude=&start_date=&end_date=&...` | historical (ERA5) |
| `https://air-quality-api.open-meteo.com/v1/air-quality` | AQI, PM2.5, PM10, ozone |
| `https://marine-api.open-meteo.com/v1/marine` | wave height, sea temperature |
| `https://flood-api.open-meteo.com/v1/flood` | river discharge |
| `https://climate-api.open-meteo.com/v1/climate` | climate model projections |
| `https://geocoding-api.open-meteo.com/v1/search?name=&count=5` | name → lat/lon |
| `https://geocoding-api.open-meteo.com/v1/get?id=` | lookup by geoname id |
| `https://api.open-meteo.com/v1/elevation?latitude=&longitude=` | elevation |

## `/forecast` parameters
- `current=` (comma list): `temperature_2m`, `relative_humidity_2m`, `apparent_temperature`, `is_day`, `precipitation`, `rain`, `showers`, `snowfall`, `weather_code`, `cloud_cover`, `pressure_msl`, `surface_pressure`, `wind_speed_10m`, `wind_direction_10m`, `wind_gusts_10m`.
- `hourly=` same field set, returned as parallel arrays under `hourly`.
- `daily=` (with `timezone=auto`): `weather_code`, `temperature_2m_max/min`, `apparent_temperature_max/min`, `sunrise`, `sunset`, `daylight_duration`, `sunshine_duration`, `uv_index_max`, `precipitation_sum`, `precipitation_hours`, `precipitation_probability_max`, `wind_speed_10m_max`, `wind_gusts_10m_max`, `wind_direction_10m_dominant`, `shortwave_radiation_sum`, `et0_fao_evapotranspiration`.
- `forecast_days=` (1–16). `past_days=` (0–92).
- `temperature_unit=celsius|fahrenheit`. `wind_speed_unit=kmh|ms|mph|kn`. `precipitation_unit=mm|inch`.
- `timezone=auto` (or IANA name) — without this, times are UTC.
- `models=best_match|gfs_global|ecmwf_ifs04|icon_global|...` — pick a specific forecast model.

## WMO weather codes (used by `weather_code`)
| Range | Meaning |
|-------|---------|
| 0 | Clear sky |
| 1–3 | Mainly clear / partly cloudy / overcast |
| 45, 48 | Fog, depositing rime fog |
| 51, 53, 55 | Drizzle (light/moderate/dense) |
| 56, 57 | Freezing drizzle |
| 61, 63, 65 | Rain (slight/moderate/heavy) |
| 66, 67 | Freezing rain |
| 71, 73, 75 | Snow fall |
| 77 | Snow grains |
| 80, 81, 82 | Rain showers |
| 85, 86 | Snow showers |
| 95 | Thunderstorm |
| 96, 99 | Thunderstorm with hail |

The `weatherDesc()` helper in [hooks.js](../../src/lib/hooks.js) compresses these to a label set.

## Pitfalls
- Without `timezone=auto`, "today" alignment in `daily=` is in UTC and edges look wrong locally.
- Free tier is shared — don't hammer; cache results 15+ min.
- Self-hosted: <https://github.com/open-meteo/open-meteo> (Go binary, 100GB+ disk if you mirror full forecast).
- Commercial use is fine under CC BY 4.0; attribute "Weather data by Open-Meteo.com" somewhere in the UI.

## Reference
- Docs + interactive params: <https://open-meteo.com/en/docs>
- WMO codes: <https://open-meteo.com/en/docs#api_form>

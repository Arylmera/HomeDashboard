/* Fallback mock data when Homey is unreachable / not configured. */

export const MOCK_ZONES = [
  { id: "z-liv", name: "Living Room", temp: 21.8, humidity: 48, devices: [
    { id: "d1", name: "Ceiling Lamp",  type: "light",  on: true, dim: 65 },
    { id: "d2", name: "Floor Lamp",    type: "light",  on: false },
    { id: "d3", name: "TV Socket",     type: "socket", on: true, power: 42 },
    { id: "d4", name: "Multi-Sensor",  type: "sensor", reading: "21.8 °C · 48 %" },
  ]},
  { id: "z-kit", name: "Kitchen", temp: 20.5, humidity: 52, devices: [
    { id: "d5", name: "Under-cabinet", type: "light",  on: true },
    { id: "d6", name: "Coffee Maker",  type: "socket", on: false },
    { id: "d7", name: "Motion Sensor", type: "motion", reading: "clear · 12 min" },
  ]},
  { id: "z-bed", name: "Bedroom", temp: 19.1, humidity: 45, devices: [
    { id: "d8",  name: "Bedside Left",  type: "light", on: false },
    { id: "d9",  name: "Bedside Right", type: "light", on: false },
    { id: "d10", name: "Thermostat",    type: "thermostat", reading: "19.0 → 20.0 °C" },
  ]},
  { id: "z-off", name: "Office", temp: 22.1, humidity: 46, devices: [
    { id: "d11", name: "Desk Lamp",  type: "light",  on: true, dim: 80 },
    { id: "d12", name: "Monitor",    type: "socket", on: true, power: 68 },
    { id: "d13", name: "3D Printer", type: "socket", on: false },
  ]},
  { id: "z-bat", name: "Bathroom", temp: 22.8, humidity: 67, devices: [
    { id: "d14", name: "Mirror Light", type: "light",  on: false },
    { id: "d15", name: "Humidity",     type: "sensor", reading: "22.8 °C · 67 %" },
  ]},
  { id: "z-ent", name: "Entrance", temp: 18.0, humidity: 54, devices: [
    { id: "d16", name: "Front Door",  type: "door",   reading: "closed · locked" },
    { id: "d17", name: "Doorbell",    type: "motion", reading: "idle" },
    { id: "d18", name: "Porch Light", type: "light",  on: false },
  ]},
];

export const MOCK_FLOWS = [
  { id: "f1", name: "Good Morning",      trigger: "07:00 · weekday",   enabled: true },
  { id: "f2", name: "Away Mode",         trigger: "all away",          enabled: true },
  { id: "f3", name: "Movie Night",       trigger: "Plex · play",       enabled: true },
  { id: "f4", name: "Sunset Lights",     trigger: "sunset -15m",       enabled: true },
  { id: "f5", name: "Goodnight",         trigger: "23:30 · all days",  enabled: true },
  { id: "f6", name: "Bathroom Humidity", trigger: "humidity > 70 %",   enabled: true },
  { id: "f7", name: "Guest Mode",        trigger: "manual",            enabled: false },
  { id: "f8", name: "Vacation Lights",   trigger: "when away · random",enabled: false },
];

export const MOCK_VARIABLES = [
  { id: "v1", name: "Presence",         type: "boolean", value: true },
  { id: "v2", name: "Guest mode",       type: "boolean", value: false },
  { id: "v3", name: "Heating setpoint", type: "number",  value: 21 },
  { id: "v4", name: "Mood",             type: "string",  value: "evening" },
];

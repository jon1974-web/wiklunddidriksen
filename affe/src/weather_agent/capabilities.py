"""
Weather subagent: current weather via Open-Meteo (no API key).
Uses Open-Meteo geocoding + forecast.
"""
from __future__ import annotations

import urllib.parse
import urllib.request
import json


def get_weather(place: str) -> str:
    """Get current weather for a place (city name or 'here' for default). Returns short summary."""
    place = (place or "").strip() or "Oslo"
    if place.lower() in ("here", "local", "my location"):
        place = "Oslo"  # Default; could use IP geolocation later
    # Geocode
    geo_url = "https://geocoding-api.open-meteo.com/v1/search?name=" + urllib.parse.quote(place) + "&count=1"
    try:
        with urllib.request.urlopen(geo_url, timeout=5) as r:
            geo = json.loads(r.read().decode())
    except Exception as e:
        return f"Weather lookup failed: {e}"
    results = geo.get("results") or []
    if not results:
        return f"No location found for '{place}'."
    lat = results[0].get("latitude")
    lon = results[0].get("longitude")
    name = results[0].get("name", place)
    # Forecast
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            w = json.loads(r.read().decode())
    except Exception as e:
        return f"Weather fetch failed: {e}"
    cur = w.get("current_weather") or {}
    temp = cur.get("temperature")
    code = cur.get("weathercode", 0)
    wind = cur.get("windspeed")
    # WMO codes: 0 clear, 1-3 partly cloudy, 45/48 fog, 51-67 rain, 71-77 snow, 80-82 showers, 95-99 thunder
    desc = _weather_desc(code)
    parts = [f"{name}: {desc}, {temp}°C"]
    if wind is not None:
        parts.append(f"wind {wind} km/h")
    return ", ".join(parts)


def _weather_desc(code: int) -> str:
    if code == 0:
        return "clear"
    if code in (1, 2, 3):
        return "partly cloudy"
    if code in (45, 48):
        return "foggy"
    if code in (51, 53, 55, 56, 57):
        return "drizzle"
    if code in (61, 63, 65, 66, 67):
        return "rain"
    if code in (71, 73, 75, 77):
        return "snow"
    if code in (80, 81, 82):
        return "showers"
    if code in (95, 96, 99):
        return "thunderstorms"
    return "cloudy"

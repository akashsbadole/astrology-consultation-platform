"""
Public, cache-friendly content endpoints — these exist to drive organic
search traffic (per the Astrotalk research: the free-calculator/horoscope
library is a marketing asset, not a per-user compute path), so they're
kept cheap and stateless rather than routed through the full Kundli
engine's per-request calculation cost.
"""
from datetime import date, datetime, timezone

from fastapi import APIRouter

from app.services.kundli.constants import SIGNS
from app.services.kundli.ephemeris import calculate_planet, julian_day_utc
from app.services.kundli.panchang import calculate_karana, calculate_tithi, calculate_yoga

router = APIRouter(tags=["content"])

_HOROSCOPE_TEMPLATES = {
    "daily": "Today favors {sign}'s natural strengths — a good day to act on what you've been planning.",
    "weekly": "This week brings steady progress for {sign}, with clarity building around a key decision.",
    "monthly": "A month of consolidation for {sign} — less about new starts, more about deepening what's working.",
    "yearly": "The year ahead invites {sign} to balance ambition with patience, especially around relationships and finances.",
}


@router.get("/panchang/today")
async def panchang_today():
    now = datetime.now(timezone.utc)
    jd = julian_day_utc(now.year, now.month, now.day, now.hour + now.minute / 60)
    sun = calculate_planet("Sun", jd)
    moon = calculate_planet("Moon", jd)
    tithi_name, tithi_num = calculate_tithi(moon.sidereal_longitude, sun.sidereal_longitude)
    yoga_name, yoga_num = calculate_yoga(moon.sidereal_longitude, sun.sidereal_longitude)
    karana_name = calculate_karana(moon.sidereal_longitude, sun.sidereal_longitude)
    return {
        "date": date.today().isoformat(),
        "tithi": tithi_name, "tithi_number": tithi_num,
        "yoga": yoga_name, "yoga_number": yoga_num,
        "karana": karana_name,
        "moon_nakshatra": moon.nakshatra,
        # Cache this response until midnight IST in front of this endpoint
        # (Redis or a CDN edge cache) — it's identical for every caller on
        # a given day.
    }


@router.get("/horoscope/{sign}/{period}")
async def horoscope(sign: str, period: str):
    sign_title = sign.strip().title()
    if sign_title not in SIGNS:
        return {"error": f"Unknown sign '{sign}'. Valid signs: {', '.join(SIGNS)}"}
    template = _HOROSCOPE_TEMPLATES.get(period, _HOROSCOPE_TEMPLATES["daily"])
    return {"sign": sign_title, "period": period, "content": template.format(sign=sign_title)}

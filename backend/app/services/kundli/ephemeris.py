"""
Core planetary position calculations via pyswisseph.

Uses the Moshier semi-analytical ephemeris (FLG_MOSEPH) rather than the
JPL DE-file-based ephemeris — Moshier needs no external data files (a few
arcseconds less precise than the full DE ephemeris, well within tolerance
for consultation-grade astrology; not appropriate for professional-grade
research astronomy). Swap to file-based ephemeris + swe.set_ephe_path()
later if sub-arcsecond precision becomes a requirement.
"""
from dataclasses import dataclass

import swisseph as swe

from app.services.kundli.constants import NAKSHATRAS, SIGNS

PLANETS = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS, "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER, "Venus": swe.VENUS, "Saturn": swe.SATURN,
}

NAKSHATRA_SPAN = 360 / 27  # 13.3333...
PADA_SPAN = NAKSHATRA_SPAN / 4  # 3.3333...
SIGN_SPAN = 30.0

swe.set_sid_mode(swe.SIDM_LAHIRI)


@dataclass
class PlanetPosition:
    name: str
    tropical_longitude: float
    sidereal_longitude: float
    sign: str
    degree_in_sign: float
    nakshatra: str
    pada: int
    is_retrograde: bool


def julian_day_utc(year: int, month: int, day: int, hour: float) -> float:
    """hour is fractional UTC hours (e.g. 14.5 = 14:30 UTC). Caller is
    responsible for converting the birth location's local time to UTC
    using the correct historical offset BEFORE calling this — that
    conversion is the single most consequential step in the whole
    pipeline and belongs at the API boundary, not buried here."""
    return swe.julday(year, month, day, hour)


def ayanamsa(jd: float) -> float:
    return swe.get_ayanamsa_ut(jd)


def sidereal_longitude(tropical_longitude: float, jd: float) -> float:
    return (tropical_longitude - ayanamsa(jd)) % 360


def sign_of(longitude: float) -> tuple[str, float]:
    index = int(longitude // SIGN_SPAN) % 12
    degree_in_sign = longitude % SIGN_SPAN
    return SIGNS[index], degree_in_sign


def nakshatra_index_and_fraction(longitude: float) -> tuple[int, float]:
    """Returns (nakshatra_index 0-26, fraction_travelled 0.0-1.0).

    Deliberately does NOT divide by NAKSHATRA_SPAN (360/27 = a repeating
    decimal, 13.333...) — at a longitude sitting exactly on a nakshatra
    boundary, that repeating-decimal division can round the wrong way in
    floating point and silently misclassify into the PREVIOUS nakshatra
    (verified: this happened at exactly 40.0°, landing in Krittika
    instead of Rohini, and cascaded into picking the wrong Dasha starting
    planet). Multiplying by 27 first, dividing by the exact integer 360,
    avoids ever constructing that imprecise intermediate value.
    """
    raw = longitude * 27 / 360  # position in "nakshatra units" - integer part is a clean 0-26 index
    index = int(raw) % 27
    fraction = raw - int(raw)
    return index, fraction


def nakshatra_of(longitude: float) -> tuple[str, int]:
    index, fraction = nakshatra_index_and_fraction(longitude)
    pada = int(fraction * 4) + 1
    return NAKSHATRAS[index], pada


def calculate_planet(name: str, jd: float) -> PlanetPosition:
    code = PLANETS[name]
    result, _flags = swe.calc_ut(jd, code, swe.FLG_MOSEPH | swe.FLG_SPEED)
    tropical_lon = result[0]
    speed = result[3]
    sidereal_lon = sidereal_longitude(tropical_lon, jd)
    sign, degree_in_sign = sign_of(sidereal_lon)
    nakshatra, pada = nakshatra_of(sidereal_lon)
    return PlanetPosition(
        name=name,
        tropical_longitude=tropical_lon,
        sidereal_longitude=sidereal_lon,
        sign=sign,
        degree_in_sign=degree_in_sign,
        nakshatra=nakshatra,
        pada=pada,
        is_retrograde=speed < 0,
    )


def calculate_rahu_ketu(jd: float) -> tuple[PlanetPosition, PlanetPosition]:
    """Rahu = the Moon's mean ascending node. Ketu is always exactly 180°
    opposite. Using the MEAN node (not TRUE) — the more commonly used
    convention in Vedic Dasha/chart calculations."""
    result, _flags = swe.calc_ut(jd, swe.MEAN_NODE, swe.FLG_MOSEPH)
    rahu_tropical = result[0]
    ketu_tropical = (rahu_tropical + 180) % 360

    rahu_sidereal = sidereal_longitude(rahu_tropical, jd)
    ketu_sidereal = (rahu_sidereal + 180) % 360

    rahu_sign, rahu_deg = sign_of(rahu_sidereal)
    rahu_nak, rahu_pada = nakshatra_of(rahu_sidereal)
    ketu_sign, ketu_deg = sign_of(ketu_sidereal)
    ketu_nak, ketu_pada = nakshatra_of(ketu_sidereal)

    # Nodes are always shown as retrograde in Vedic astrology by convention
    # (they move backward through the zodiac almost all the time).
    rahu = PlanetPosition("Rahu", rahu_tropical, rahu_sidereal, rahu_sign, rahu_deg, rahu_nak, rahu_pada, True)
    ketu = PlanetPosition("Ketu", ketu_tropical, ketu_sidereal, ketu_sign, ketu_deg, ketu_nak, ketu_pada, True)
    return rahu, ketu


def calculate_ascendant(jd: float, latitude: float, longitude: float) -> tuple[float, str, float]:
    """Returns (sidereal_longitude, sign, degree_in_sign) of the
    Ascendant. Uses Placidus house cusps internally (swe.houses requires
    SOME system to compute the Ascendant point itself) but the Ascendant
    degree it returns is the same regardless of house system — house
    SYSTEM only matters for where cusps 2-12 fall, and this app uses
    whole-sign houses (derived trivially from the Ascendant's sign, see
    chart.py) rather than the Placidus cusps themselves."""
    cusps, ascmc = swe.houses(jd, latitude, longitude, b"P")
    tropical_asc = ascmc[0]
    sidereal_asc = sidereal_longitude(tropical_asc, jd)
    sign, degree_in_sign = sign_of(sidereal_asc)
    return sidereal_asc, sign, degree_in_sign

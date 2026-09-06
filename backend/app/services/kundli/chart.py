"""
Orchestrates the full Kundli generation pipeline: Julian Day -> planetary
positions -> Ascendant -> houses -> Dasha timeline -> Panchang, all in one
call. This is what the API layer actually calls; the individual modules
(ephemeris, dasha, navamsa, panchang, dosha, matching) stay independently
testable, which is how the bugs in Dasha/nakshatra-boundary math got
caught before this orchestration layer was even built.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.services.kundli import dasha as dasha_module
from app.services.kundli import ephemeris
from app.services.kundli import panchang as panchang_module
from app.services.kundli.constants import SIGNS


@dataclass
class ChartResult:
    julian_day: float
    planets: list[dict]
    ascendant: dict
    houses: dict[int, str]  # house number (1-12) -> sign name, whole-sign system
    moon_nakshatra: str
    moon_pada: int
    mahadasha_timeline: list[dict]
    current_mahadasha: dict | None
    current_antardasha: dict | None
    panchang: dict


def _whole_sign_houses(ascendant_sign: str) -> dict[int, str]:
    start_index = SIGNS.index(ascendant_sign)
    return {house: SIGNS[(start_index + house - 1) % 12] for house in range(1, 13)}


def generate_chart(
    year: int, month: int, day: int, hour: float,  # hour is fractional UTC hours
    latitude: float, longitude: float,
    at_time_for_current_dasha: datetime | None = None,
) -> ChartResult:
    jd = ephemeris.julian_day_utc(year, month, day, hour)
    birth_datetime_utc = datetime(year, month, day, tzinfo=timezone.utc) + timedelta(hours=hour)

    planets = [ephemeris.calculate_planet(name, jd) for name in ephemeris.PLANETS]
    rahu, ketu = ephemeris.calculate_rahu_ketu(jd)
    all_planets = planets + [rahu, ketu]

    asc_lon, asc_sign, asc_degree = ephemeris.calculate_ascendant(jd, latitude, longitude)
    houses = _whole_sign_houses(asc_sign)

    moon = next(p for p in all_planets if p.name == "Moon")

    mahadasha_timeline = dasha_module.calculate_mahadasha_timeline(moon.sidereal_longitude, birth_datetime_utc)

    check_time = at_time_for_current_dasha or datetime.now(timezone.utc)
    current_maha = dasha_module.find_current_mahadasha(mahadasha_timeline, check_time)
    current_antar = None
    if current_maha is not None:
        antardashas = dasha_module.calculate_antardasha_timeline(current_maha)
        current_antar = dasha_module.find_current_mahadasha(antardashas, check_time)

    sun = next(p for p in all_planets if p.name == "Sun")
    tithi_name, tithi_num = panchang_module.calculate_tithi(moon.sidereal_longitude, sun.sidereal_longitude)
    yoga_name, yoga_num = panchang_module.calculate_yoga(moon.sidereal_longitude, sun.sidereal_longitude)
    karana_name = panchang_module.calculate_karana(moon.sidereal_longitude, sun.sidereal_longitude)

    return ChartResult(
        julian_day=jd,
        planets=[
            {
                "name": p.name, "sidereal_longitude": round(p.sidereal_longitude, 4),
                "sign": p.sign, "degree_in_sign": round(p.degree_in_sign, 4),
                "nakshatra": p.nakshatra, "pada": p.pada, "is_retrograde": p.is_retrograde,
            }
            for p in all_planets
        ],
        ascendant={"sidereal_longitude": round(asc_lon, 4), "sign": asc_sign, "degree_in_sign": round(asc_degree, 4)},
        houses=houses,
        moon_nakshatra=moon.nakshatra,
        moon_pada=moon.pada,
        mahadasha_timeline=[
            {"planet": p.planet, "start": p.start.isoformat(), "end": p.end.isoformat()} for p in mahadasha_timeline
        ],
        current_mahadasha=(
            {"planet": current_maha.planet, "start": current_maha.start.isoformat(), "end": current_maha.end.isoformat()}
            if current_maha else None
        ),
        current_antardasha=(
            {"planet": current_antar.planet, "start": current_antar.start.isoformat(), "end": current_antar.end.isoformat()}
            if current_antar else None
        ),
        panchang={
            "tithi": tithi_name, "tithi_number": tithi_num,
            "yoga": yoga_name, "yoga_number": yoga_num,
            "karana": karana_name,
        },
    )

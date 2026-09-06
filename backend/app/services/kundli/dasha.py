"""
Vimshottari Dasha — the 120-year planetary period cycle that's the core
timing engine behind most Vedic predictions.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.services.kundli.constants import DASHA_SEQUENCE, DASHA_YEARS, NAKSHATRA_LORDS
from app.services.kundli.ephemeris import nakshatra_index_and_fraction

DAYS_PER_YEAR = 365.2425  # Gregorian mean year


@dataclass
class DashaPeriod:
    planet: str
    start: datetime
    end: datetime


def calculate_mahadasha_timeline(moon_sidereal_longitude: float, birth_datetime_utc: datetime) -> list[DashaPeriod]:
    """Returns the full sequence of Mahadasha (major) periods from birth
    through one complete 120-year cycle. The first period is PRORATED —
    only the remaining balance of that planet's period counts, based on
    how far the Moon had already travelled through its birth nakshatra."""
    nak_index, fraction_travelled = nakshatra_index_and_fraction(moon_sidereal_longitude)
    starting_planet = NAKSHATRA_LORDS[nak_index]
    fraction_remaining = 1 - fraction_travelled

    start_sequence_index = DASHA_SEQUENCE.index(starting_planet)
    ordered_planets = DASHA_SEQUENCE[start_sequence_index:] + DASHA_SEQUENCE[:start_sequence_index]

    periods: list[DashaPeriod] = []
    cursor = birth_datetime_utc

    for i, planet in enumerate(ordered_planets):
        full_years = DASHA_YEARS[planet]
        years = full_years * fraction_remaining if i == 0 else full_years
        duration = timedelta(days=years * DAYS_PER_YEAR)
        period_end = cursor + duration
        periods.append(DashaPeriod(planet=planet, start=cursor, end=period_end))
        cursor = period_end

    return periods


def calculate_antardasha_timeline(mahadasha: DashaPeriod) -> list[DashaPeriod]:
    """Sub-periods within one Mahadasha. Antardasha length = mahadasha's
    ACTUAL duration * (sub-planet's classical years / 120) — the
    denominator is always the fixed 120-year total cycle, never the
    mahadasha planet's own year count. (A first attempt at this divided
    by the mahadasha's own years instead, which made every antardasha
    roughly 12x too long — caught because the sub-periods didn't sum back
    to the parent mahadasha's duration, which they must, exactly.)
    Antardasha order starts with the Mahadasha lord itself, then
    continues the standard 9-planet sequence from there.

    Simplification for the birth (first, prorated) Mahadasha: this treats
    mahadasha.start as the start of the antardasha sequence too. The
    fully rigorous classical method has the birth instant fall partway
    into the first antardasha as well (a second layer of proration) —
    this simpler, widely-used approximation is accurate enough for
    display purposes but is worth knowing about if cross-checking against
    software that implements the fully nested version.
    """
    total_duration = mahadasha.end - mahadasha.start

    start_index = DASHA_SEQUENCE.index(mahadasha.planet)
    ordered = DASHA_SEQUENCE[start_index:] + DASHA_SEQUENCE[:start_index]

    periods: list[DashaPeriod] = []
    cursor = mahadasha.start
    for planet in ordered:
        sub_years = DASHA_YEARS[planet]
        duration = total_duration * (sub_years / 120)
        period_end = cursor + duration
        periods.append(DashaPeriod(planet=planet, start=cursor, end=period_end))
        cursor = period_end

    return periods


def find_current_mahadasha(timeline: list[DashaPeriod], at: datetime) -> DashaPeriod | None:
    for period in timeline:
        if period.start <= at < period.end:
            return period
    return None

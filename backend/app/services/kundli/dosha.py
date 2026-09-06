"""
Dosha (affliction) detection. These are pattern checks over an already-
calculated chart, not new astronomical computation.
"""
from app.services.kundli.constants import SIGNS


def mangal_dosha(mars_sign_index: int, reference_sign_index: int) -> bool:
    """Mars in house 1, 2, 4, 7, 8, or 12 counted from the reference
    point (Ascendant by default — see the `reference` param on the API
    endpoint, since some schools check from the Moon or Venus instead,
    and users/astrologers will ask which one was used)."""
    house = ((mars_sign_index - reference_sign_index) % 12) + 1
    return house in (1, 2, 4, 7, 8, 12)


def kaal_sarp_dosh(planet_longitudes: dict[str, float], rahu_longitude: float, ketu_longitude: float) -> bool:
    """True if all seven classical planets (Sun through Saturn) fall
    within the longitudinal arc between Rahu and Ketu, on ONE side only —
    i.e. none of them are on the opposite arc."""
    # Walk the zodiac starting at Rahu; the arc from Rahu to Ketu going
    # forward (increasing longitude, wrapping at 360) is one side. If
    # every planet's forward-distance from Rahu is less than Rahu-to-Ketu's
    # forward distance, they're all on that one side.
    rahu_to_ketu_arc = (ketu_longitude - rahu_longitude) % 360

    def forward_distance(lon: float) -> float:
        return (lon - rahu_longitude) % 360

    all_within_one_arc = all(forward_distance(lon) < rahu_to_ketu_arc for lon in planet_longitudes.values())
    all_within_other_arc = all(forward_distance(lon) > rahu_to_ketu_arc for lon in planet_longitudes.values())
    return all_within_one_arc or all_within_other_arc


def sade_sati_status(saturn_transit_sign_index: int, natal_moon_sign_index: int) -> str | None:
    """Returns 'rising' (12th from Moon), 'peak' (same as Moon), 'setting'
    (2nd from Moon), or None if Saturn isn't currently transiting any of
    the three Sade Sati signs relative to the natal Moon."""
    house = ((saturn_transit_sign_index - natal_moon_sign_index) % 12) + 1
    if house == 12:
        return "rising"
    if house == 1:
        return "peak"
    if house == 2:
        return "setting"
    return None


def sign_index(sign_name: str) -> int:
    return SIGNS.index(sign_name)

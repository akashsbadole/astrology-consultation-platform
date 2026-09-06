"""
Navamsa (D9) — the divisional chart used primarily for marriage/spiritual
analysis. Each 30° sign is divided into 9 parts of 3°20' each.
"""
from app.services.kundli.constants import SIGNS

# Sign type by classical category, derived from position: Aries=movable,
# Taurus=fixed, Gemini=dual, repeating every 3 signs.
_MOVABLE, _FIXED, _DUAL = 0, 1, 2


def _sign_type(sign_index: int) -> int:
    return sign_index % 3


def navamsa_sign(sidereal_longitude: float) -> str:
    sign_index = int(sidereal_longitude // 30) % 12
    degree_in_sign = sidereal_longitude % 30
    navamsa_number = int(degree_in_sign // (30 / 9))  # 0-8

    sign_type = _sign_type(sign_index)
    if sign_type == _MOVABLE:
        starting_sign_index = sign_index
    elif sign_type == _FIXED:
        starting_sign_index = (sign_index + 8) % 12  # 9th sign from it
    else:  # DUAL
        starting_sign_index = (sign_index + 4) % 12  # 5th sign from it

    navamsa_sign_index = (starting_sign_index + navamsa_number) % 12
    return SIGNS[navamsa_sign_index]

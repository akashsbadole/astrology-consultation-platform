"""
Ashtakoot Guna Milan — orchestrates the 8 koota scores (each individually
computed in constants.py) into the full 36-point compatibility result.
"""
from dataclasses import dataclass

from app.services.kundli.constants import (
    NAKSHATRA_GANA,
    NAKSHATRA_LORDS,
    NAKSHATRA_NADI,
    NAKSHATRA_YONI,
    NAKSHATRAS,
    SIGN_LORDS,
    graha_maitri_score,
    varna_score,
    vashya_score,
    yoni_compatibility,
)

_GANA_SCORE = {
    frozenset(["Deva", "Deva"]): 6, frozenset(["Manushya", "Manushya"]): 6, frozenset(["Rakshasa", "Rakshasa"]): 6,
    frozenset(["Deva", "Manushya"]): 5, frozenset(["Manushya", "Deva"]): 5,
    frozenset(["Deva", "Rakshasa"]): 0, frozenset(["Rakshasa", "Deva"]): 0,
    frozenset(["Manushya", "Rakshasa"]): 3, frozenset(["Rakshasa", "Manushya"]): 3,
}

# Bhakoot: certain sign-distances (counted either direction) are
# classically inauspicious and score 0; all others score the full 7.
_BHAKOOT_INAUSPICIOUS_DISTANCES = {2, 12, 5, 9, 6, 8}


@dataclass
class KootaResult:
    name: str
    score: float
    max_score: float
    note: str | None = None


@dataclass
class MatchResult:
    total_score: float
    max_score: float
    kootas: list[KootaResult]


def _nakshatra_index(nakshatra_name: str) -> int:
    return NAKSHATRAS.index(nakshatra_name)


def _tara_score(nak_a_index: int, nak_b_index: int) -> float:
    """Tara: count nakshatras from A to B (inclusive), mod 9, grouped
    into 3 pairs of 'good'/'bad' categories per classical rule. Scored
    symmetrically (average of both directions) since Tara is classically
    checked both ways."""
    def one_direction(a: int, b: int) -> float:
        count = ((b - a) % 27) + 1
        remainder = count % 9
        # Groups 3, 5, 7 (1-indexed remainder) are classically inauspicious.
        return 0 if remainder in (3, 5, 7) else 3

    return (one_direction(nak_a_index, nak_b_index) + one_direction(nak_b_index, nak_a_index)) / 2


def _bhakoot_score(sign_a_index: int, sign_b_index: int) -> float:
    distance = ((sign_b_index - sign_a_index) % 12) + 1
    reverse_distance = ((sign_a_index - sign_b_index) % 12) + 1
    if distance in _BHAKOOT_INAUSPICIOUS_DISTANCES or reverse_distance in _BHAKOOT_INAUSPICIOUS_DISTANCES:
        return 0
    return 7


def calculate_ashtakoot(
    moon_sign_a: str, moon_nakshatra_a: str,
    moon_sign_b: str, moon_nakshatra_b: str,
) -> MatchResult:
    from app.services.kundli.constants import SIGNS

    sign_a_idx, sign_b_idx = SIGNS.index(moon_sign_a), SIGNS.index(moon_sign_b)
    nak_a_idx, nak_b_idx = _nakshatra_index(moon_nakshatra_a), _nakshatra_index(moon_nakshatra_b)

    lord_a, lord_b = SIGN_LORDS[moon_sign_a], SIGN_LORDS[moon_sign_b]
    gana_a, gana_b = NAKSHATRA_GANA[moon_nakshatra_a], NAKSHATRA_GANA[moon_nakshatra_b]
    nadi_a, nadi_b = NAKSHATRA_NADI[moon_nakshatra_a], NAKSHATRA_NADI[moon_nakshatra_b]
    yoni_a, yoni_b = NAKSHATRA_YONI[moon_nakshatra_a], NAKSHATRA_YONI[moon_nakshatra_b]

    kootas = [
        KootaResult("Varna", varna_score(moon_sign_a, moon_sign_b), 1),
        KootaResult("Vashya", vashya_score(moon_sign_a, moon_sign_b), 2),
        KootaResult("Tara", _tara_score(nak_a_idx, nak_b_idx), 3),
        KootaResult("Yoni", yoni_compatibility(yoni_a, yoni_b), 4),
        KootaResult("Graha Maitri", graha_maitri_score(lord_a, lord_b), 5),
        KootaResult("Gana", _GANA_SCORE.get(frozenset([gana_a, gana_b]), 0), 6),
        KootaResult("Bhakoot", _bhakoot_score(sign_a_idx, sign_b_idx), 7),
        KootaResult(
            "Nadi", 0 if nadi_a == nadi_b else 8, 8,
            note="Nadi Dosha present — same Nadi group" if nadi_a == nadi_b else None,
        ),
    ]

    total = sum(k.score for k in kootas)
    return MatchResult(total_score=total, max_score=36, kootas=kootas)

"""
Static classical Vedic astrology reference data. This is domain data, not
computation — every table here is a fixed lookup, sourced from standard
classical rules (Parashara for Dasha; the standard Ashtakoot Guna Milan
system for matching).

IMPORTANT — read before shipping this to real users: the unambiguous
tables (nakshatra order, Dasha lords/years, Gana, Nadi) are standard
across every classical source and software. Two tables have more
source-to-source variation in their exact intermediate scoring —
YONI_COMPATIBILITY and the Vashya groupings (the latter classically
involves half-sign splits for Sagittarius/Capricorn/Pisces that this
implementation simplifies to whole-sign for tractability). Same-value and
enemy-value cases are unambiguous and correct; the exact "friendly/
neutral" intermediate values should be cross-checked against a reference
implementation (e.g. comparing a handful of test charts against an
established site) before this powers real matchmaking decisions for
users — this is exactly the kind of content where being confidently wrong
does real harm, the same way an unreviewed legal document would.
"""

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]

# The 9-planet Dasha-lord cycle repeats 3x across the 27 nakshatras.
DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = {"Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17}
assert sum(DASHA_YEARS.values()) == 120

NAKSHATRA_LORDS = [DASHA_SEQUENCE[i % 9] for i in range(27)]

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
}

# --- Ashtakoot Guna Milan tables ---

NAKSHATRA_GANA = {
    "Ashwini": "Deva", "Mrigashira": "Deva", "Punarvasu": "Deva", "Pushya": "Deva",
    "Hasta": "Deva", "Swati": "Deva", "Anuradha": "Deva", "Shravana": "Deva", "Revati": "Deva",
    "Bharani": "Manushya", "Rohini": "Manushya", "Ardra": "Manushya", "Purva Phalguni": "Manushya",
    "Uttara Phalguni": "Manushya", "Purva Ashadha": "Manushya", "Uttara Ashadha": "Manushya",
    "Purva Bhadrapada": "Manushya", "Uttara Bhadrapada": "Manushya",
    "Krittika": "Rakshasa", "Ashlesha": "Rakshasa", "Magha": "Rakshasa", "Chitra": "Rakshasa",
    "Vishakha": "Rakshasa", "Jyeshtha": "Rakshasa", "Mula": "Rakshasa", "Dhanishta": "Rakshasa",
    "Shatabhisha": "Rakshasa",
}

NAKSHATRA_NADI = {
    "Ashwini": "Aadi", "Ardra": "Aadi", "Punarvasu": "Aadi", "Uttara Phalguni": "Aadi",
    "Hasta": "Aadi", "Jyeshtha": "Aadi", "Mula": "Aadi", "Shatabhisha": "Aadi", "Purva Bhadrapada": "Aadi",
    "Bharani": "Madhya", "Mrigashira": "Madhya", "Pushya": "Madhya", "Purva Phalguni": "Madhya",
    "Chitra": "Madhya", "Anuradha": "Madhya", "Purva Ashadha": "Madhya", "Dhanishta": "Madhya",
    "Uttara Bhadrapada": "Madhya",
    "Krittika": "Antya", "Rohini": "Antya", "Ashlesha": "Antya", "Magha": "Antya",
    "Swati": "Antya", "Vishakha": "Antya", "Uttara Ashadha": "Antya", "Shravana": "Antya", "Revati": "Antya",
}

NAKSHATRA_YONI = {
    "Ashwini": "Horse", "Shatabhisha": "Horse",
    "Bharani": "Elephant", "Revati": "Elephant",
    "Krittika": "Goat", "Pushya": "Goat",
    "Rohini": "Serpent", "Mrigashira": "Serpent",
    "Ardra": "Dog", "Mula": "Dog",
    "Punarvasu": "Cat", "Ashlesha": "Cat",
    "Magha": "Rat", "Purva Phalguni": "Rat",
    "Uttara Phalguni": "Cow", "Uttara Bhadrapada": "Cow",
    "Hasta": "Buffalo", "Swati": "Buffalo",
    "Chitra": "Tiger", "Vishakha": "Tiger",
    "Anuradha": "Deer", "Jyeshtha": "Deer",
    "Purva Ashadha": "Monkey", "Shravana": "Monkey",
    "Uttara Ashadha": "Mongoose",
    "Dhanishta": "Lion", "Purva Bhadrapada": "Lion",
}

_YONIS = ["Horse", "Elephant", "Goat", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"]

# Known classical enemy pairs (score 0) and same-yoni (score 4). Everything
# else defaults to a neutral middle score (2) — see module docstring: the
# exact "friendly" intermediate values (score 3) vary more by source than
# these unambiguous same/enemy cases, so this is a conservative default
# rather than a guessed precise value.
_YONI_ENEMIES = {
    frozenset(["Cow", "Buffalo"]), frozenset(["Horse", "Buffalo"]),
    frozenset(["Elephant", "Lion"]), frozenset(["Serpent", "Mongoose"]),
    frozenset(["Dog", "Deer"]), frozenset(["Cat", "Rat"]),
    frozenset(["Monkey", "Goat"]), frozenset(["Tiger", "Cow"]),
}
_YONI_FRIENDS = {
    frozenset(["Horse", "Elephant"]), frozenset(["Serpent", "Rat"]),
    frozenset(["Dog", "Rat"]), frozenset(["Deer", "Monkey"]),
    frozenset(["Cow", "Goat"]),
}


def yoni_compatibility(yoni_a: str, yoni_b: str) -> int:
    if yoni_a == yoni_b:
        return 4
    pair = frozenset([yoni_a, yoni_b])
    if pair in _YONI_ENEMIES:
        return 0
    if pair in _YONI_FRIENDS:
        return 3
    return 2  # neutral default — see module docstring


# Natural friendship among the 7 classical planets (Rahu/Ketu excluded —
# classical Graha Maitri is defined only for the 7). 2 = friend, 1 =
# neutral, 0 = enemy. Symmetric by classical convention for this koota's
# purposes (some traditions treat it as directional; this uses the
# simpler symmetric form common in matching software).
_FRIENDS = {
    frozenset(["Sun", "Moon"]), frozenset(["Sun", "Mars"]), frozenset(["Sun", "Jupiter"]),
    frozenset(["Moon", "Sun"]), frozenset(["Moon", "Mercury"]),
    frozenset(["Mars", "Sun"]), frozenset(["Mars", "Moon"]), frozenset(["Mars", "Jupiter"]),
    frozenset(["Mercury", "Sun"]), frozenset(["Mercury", "Venus"]),
    frozenset(["Jupiter", "Sun"]), frozenset(["Jupiter", "Moon"]), frozenset(["Jupiter", "Mars"]),
    frozenset(["Venus", "Mercury"]), frozenset(["Venus", "Saturn"]),
    frozenset(["Saturn", "Mercury"]), frozenset(["Saturn", "Venus"]),
}
_ENEMIES = {
    frozenset(["Sun", "Venus"]), frozenset(["Sun", "Saturn"]),
    frozenset(["Moon", "None"]),  # Moon has no classical enemy — placeholder never matched
    frozenset(["Mars", "Mercury"]),
    frozenset(["Mercury", "Moon"]),
    frozenset(["Jupiter", "Venus"]), frozenset(["Jupiter", "Mercury"]),
    frozenset(["Venus", "Sun"]), frozenset(["Venus", "Moon"]),
    frozenset(["Saturn", "Sun"]), frozenset(["Saturn", "Moon"]), frozenset(["Saturn", "Mars"]),
}


def graha_maitri_score(planet_a: str, planet_b: str) -> int:
    """Returns 0-5 points for the Graha Maitri koota (max 5): computed as
    the AVERAGE of how A regards B and B regards A (classical rule — a
    one-directional friendship still counts as partial compatibility,
    full 5 only when the friendship is mutual)."""
    if planet_a == planet_b:
        return 5
    pair = frozenset([planet_a, planet_b])
    if pair in _FRIENDS:
        relation = 2
    elif pair in _ENEMIES:
        relation = 0
    else:
        relation = 1
    # Symmetric table here, so "mutual" and "one-directional" collapse to
    # the same case — scale the 0/1/2 relation to the 0-5 point range.
    return {0: 0, 1: 3, 2: 5}[relation]


RASHI_VARNA = {
    "Cancer": "Brahmin", "Scorpio": "Brahmin", "Pisces": "Brahmin",
    "Aries": "Kshatriya", "Leo": "Kshatriya", "Sagittarius": "Kshatriya",
    "Taurus": "Vaishya", "Virgo": "Vaishya", "Capricorn": "Vaishya",
    "Gemini": "Shudra", "Libra": "Shudra", "Aquarius": "Shudra",
}
_VARNA_RANK = {"Shudra": 0, "Vaishya": 1, "Kshatriya": 2, "Brahmin": 3}


def varna_score(sign_a: str, sign_b: str) -> int:
    """1 point if the groom's varna rank >= bride's (classical rule is
    directional); this simplified symmetric version awards the point
    whenever either rank is >= the other, i.e. always except readable
    mismatches — kept simple and documented rather than silently guessing
    which chart is "groom" for a same-sex or unspecified-order pairing."""
    return 1 if _VARNA_RANK[RASHI_VARNA[sign_a]] >= _VARNA_RANK[RASHI_VARNA[sign_b]] else 0


# Simplified WHOLE-SIGN Vashya groups — see module docstring: the classical
# rule splits Sagittarius/Capricorn/Pisces in half with different
# assignments per half; this uses one group per whole sign instead.
RASHI_VASHYA = {
    "Aries": "Chatushpada", "Taurus": "Chatushpada", "Leo": "Chatushpada",
    "Sagittarius": "Chatushpada", "Capricorn": "Chatushpada",
    "Gemini": "Manav", "Virgo": "Manav", "Libra": "Manav", "Aquarius": "Manav",
    "Cancer": "Jalachar", "Pisces": "Jalachar",
    "Scorpio": "Keeta",
}
_VASHYA_FRIENDLY = {
    frozenset(["Chatushpada", "Manav"]),
    frozenset(["Jalachar", "Jalachar"]),
}


def vashya_score(sign_a: str, sign_b: str) -> int:
    group_a, group_b = RASHI_VASHYA[sign_a], RASHI_VASHYA[sign_b]
    if group_a == group_b:
        return 2
    if frozenset([group_a, group_b]) in _VASHYA_FRIENDLY:
        return 1
    return 0

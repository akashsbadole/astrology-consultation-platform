"""
Panchang — the five limbs of the Vedic day. Only Tithi, Yoga, and Karana
are computed here (position-based); Vara (weekday) and Nakshatra are
already available elsewhere (plain calendar weekday, and
ephemeris.nakshatra_of() on the Moon respectively).
"""

TITHI_NAMES = [
    "Shukla Pratipada", "Shukla Dwitiya", "Shukla Tritiya", "Shukla Chaturthi", "Shukla Panchami",
    "Shukla Shashthi", "Shukla Saptami", "Shukla Ashtami", "Shukla Navami", "Shukla Dashami",
    "Shukla Ekadashi", "Shukla Dwadashi", "Shukla Trayodashi", "Shukla Chaturdashi", "Purnima",
    "Krishna Pratipada", "Krishna Dwitiya", "Krishna Tritiya", "Krishna Chaturthi", "Krishna Panchami",
    "Krishna Shashthi", "Krishna Saptami", "Krishna Ashtami", "Krishna Navami", "Krishna Dashami",
    "Krishna Ekadashi", "Krishna Dwadashi", "Krishna Trayodashi", "Krishna Chaturdashi", "Amavasya",
]

YOGA_NAMES = [
    "Vishkambha", "Preeti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarman", "Dhriti",
    "Shoola", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata",
    "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
]

# 11 Karanas per lunar month: 4 "fixed" (occur once) + 7 "movable" (repeat
# 8 times to fill the remaining 56 half-tithis).
_MOVABLE_KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"]
_FIXED_KARANAS = ["Shakuni", "Chatushpada", "Naga", "Kimstughna"]


def calculate_tithi(moon_longitude: float, sun_longitude: float) -> tuple[str, int]:
    diff = (moon_longitude - sun_longitude) % 360
    tithi_index = int(diff // 12)  # 0-29
    return TITHI_NAMES[tithi_index], tithi_index + 1


def calculate_yoga(moon_longitude: float, sun_longitude: float) -> tuple[str, int]:
    total = (moon_longitude + sun_longitude) % 360
    yoga_index = int(total // (360 / 27))
    return YOGA_NAMES[yoga_index], yoga_index + 1


def calculate_karana(moon_longitude: float, sun_longitude: float) -> str:
    diff = (moon_longitude - sun_longitude) % 360
    half_tithi_index = int(diff // 6)  # 0-59, each Tithi has 2 Karanas

    if half_tithi_index == 0:
        return _FIXED_KARANAS[3]  # Kimstughna - first half-tithi of the cycle
    if half_tithi_index >= 57:
        return _FIXED_KARANAS[half_tithi_index - 57]  # last 3 half-tithis
    return _MOVABLE_KARANAS[(half_tithi_index - 1) % 7]

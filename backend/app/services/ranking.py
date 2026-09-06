"""
Bayesian-adjusted ranking so one 5-star review can't outrank an
astrologer with 500 reviews averaging 4.6.
"""
PLATFORM_AVERAGE_RATING = 4.2
CONFIDENCE_CONSTANT = 10
ONLINE_BOOST = 0.3


def bayesian_rating(avg_rating: float, rating_count: int) -> float:
    return (CONFIDENCE_CONSTANT * PLATFORM_AVERAGE_RATING + avg_rating * rating_count) / (CONFIDENCE_CONSTANT + rating_count)


def ranking_score(avg_rating: float, rating_count: int, is_online: bool) -> float:
    score = bayesian_rating(avg_rating, rating_count)
    if is_online:
        score += ONLINE_BOOST
    return score

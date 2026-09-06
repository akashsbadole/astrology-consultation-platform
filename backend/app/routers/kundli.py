import uuid
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.models.kundli import KundliChart
from app.models.user import User
from app.schemas.kundli import GenerateKundliRequest, KundliDetail, KundliSummary, MatchRequest
from app.services.kundli.chart import generate_chart
from app.services.kundli.constants import SIGNS
from app.services.kundli.dosha import kaal_sarp_dosh, mangal_dosha
from app.services.kundli.matching import calculate_ashtakoot

router = APIRouter(prefix="/kundli", tags=["kundli"])


@router.post("/generate", response_model=KundliDetail, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/hour")
async def generate(
    request: Request,
    body: GenerateKundliRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Convert local birth time to UTC using the caller-resolved historical
    # offset — this conversion is the single most consequential step in
    # the whole pipeline (see ephemeris.julian_day_utc's docstring) and
    # deliberately happens here at the API boundary, not inside the
    # calculation engine, which only ever deals in UTC.
    local_hour = body.birth_time.hour + body.birth_time.minute / 60 + body.birth_time.second / 3600
    utc_hour = local_hour - body.timezone_offset_hours

    result = generate_chart(
        year=body.birth_date.year, month=body.birth_date.month, day=body.birth_date.day,
        hour=utc_hour, latitude=body.latitude, longitude=body.longitude,
    )

    chart = KundliChart(
        user_id=user.id,
        label=body.label,
        birth_date=body.birth_date,
        birth_time=body.birth_time,
        latitude=body.latitude,
        longitude=body.longitude,
        timezone_offset_hours=body.timezone_offset_hours,
        chart_json=asdict(result),
    )
    session.add(chart)
    await session.commit()
    await session.refresh(chart)

    return KundliDetail(
        id=chart.id, label=chart.label, birth_date=chart.birth_date,
        birth_time=chart.birth_time, latitude=chart.latitude, longitude=chart.longitude,
        chart=chart.chart_json,
    )


@router.get("/me", response_model=list[KundliSummary])
async def list_my_charts(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(KundliChart).where(KundliChart.user_id == user.id).order_by(KundliChart.created_at.desc())
    )
    charts = result.all()
    return [
        KundliSummary(id=c.id, label=c.label, birth_date=c.birth_date, created_at=c.created_at.isoformat())
        for c in charts
    ]


async def _get_owned_chart(chart_id: uuid.UUID, user: User, session: AsyncSession) -> KundliChart:
    chart = await session.get(KundliChart, chart_id)
    # 404, not 403, when it exists but belongs to someone else — never
    # confirm another user's chart ID exists via a distinguishable error.
    if chart is None or chart.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Kundli chart not found")
    return chart


@router.get("/{chart_id}", response_model=KundliDetail)
async def get_chart(chart_id: uuid.UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    chart = await _get_owned_chart(chart_id, user, session)
    return KundliDetail(
        id=chart.id, label=chart.label, birth_date=chart.birth_date,
        birth_time=chart.birth_time, latitude=chart.latitude, longitude=chart.longitude,
        chart=chart.chart_json,
    )


@router.get("/{chart_id}/dosha")
async def get_dosha(chart_id: uuid.UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    chart = await _get_owned_chart(chart_id, user, session)
    data = chart.chart_json

    planets_by_name = {p["name"]: p for p in data["planets"]}
    mars_sign_index = SIGNS.index(planets_by_name["Mars"]["sign"])
    asc_sign_index = SIGNS.index(data["ascendant"]["sign"])

    planet_longitudes = {p["name"]: p["sidereal_longitude"] for p in data["planets"] if p["name"] not in ("Rahu", "Ketu")}
    rahu_lon = planets_by_name["Rahu"]["sidereal_longitude"]
    ketu_lon = planets_by_name["Ketu"]["sidereal_longitude"]

    return {
        "mangal_dosha": mangal_dosha(mars_sign_index, asc_sign_index),
        "mangal_dosha_reference": "ascendant",
        "kaal_sarp_dosh": kaal_sarp_dosh(planet_longitudes, rahu_lon, ketu_lon),
    }


@router.post("/match")
@limiter.limit("20/hour")
async def match(
    request: Request,
    body: MatchRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    chart_a = await _get_owned_chart(body.chart_a_id, user, session)
    chart_b = await _get_owned_chart(body.chart_b_id, user, session)

    moon_a = next(p for p in chart_a.chart_json["planets"] if p["name"] == "Moon")
    moon_b = next(p for p in chart_b.chart_json["planets"] if p["name"] == "Moon")

    result = calculate_ashtakoot(moon_a["sign"], moon_a["nakshatra"], moon_b["sign"], moon_b["nakshatra"])

    return {
        "total_score": result.total_score,
        "max_score": result.max_score,
        "kootas": [{"name": k.name, "score": k.score, "max": k.max_score, "note": k.note} for k in result.kootas],
    }

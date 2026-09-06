"""
Seed the database with initial test data.
Run: python -m app.scripts.seed_data
"""
import asyncio
import uuid
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

import app.models.astrologer  # noqa: F401
import app.models.chat  # noqa: F401
import app.models.consultation  # noqa: F401
import app.models.kundli  # noqa: F401
import app.models.payment  # noqa: F401
import app.models.store  # noqa: F401
import app.models.user  # noqa: F401
import app.models.wallet  # noqa: F401
from app.core.db import engine
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.astrologer import Astrologer, AstrologerStatus
from app.services.wallet_service import ensure_wallet

SEED_USERS = [
    {
        "email": "admin@test.com",
        "password": "Admin123!",
        "full_name": "Test Admin",
        "role": UserRole.admin,
    },
    {
        "email": "customer@test.com",
        "password": "Customer123!",
        "full_name": "Test Customer",
        "role": UserRole.customer,
    },
    {
        "email": "astrologer@test.com",
        "password": "Astro123!",
        "full_name": "Test Astrologer",
        "role": UserRole.astrologer,
    },
    {
        "email": "pandit@test.com",
        "password": "Pandit123!",
        "full_name": "Pandit Sharma",
        "role": UserRole.astrologer,
    },
]

SEED_ASTROLOGERS = [
    {
        "email": "astrologer@test.com",
        "bio": "Vedic astrology specialist with 10 years of experience in kp system and nakshatra analysis.",
        "specializations": ["vedic", "kp", "numerology"],
        "languages": ["hindi", "english"],
        "rate_per_minute_paise": 1500,
    },
    {
        "email": "pandit@test.com",
        "bio": "Traditional Jyotish pandit, expert in muhurta, prashna, and yearly predictions.",
        "specializations": ["vedic", "muhurta", "prashna"],
        "languages": ["hindi", "marathi", "english"],
        "rate_per_minute_paise": 2500,
    },
]


async def seed():
    async with AsyncSession(engine) as session:
        for user_data in SEED_USERS:
            existing = await session.exec(select(User).where(User.email == user_data["email"]))
            if existing.first() is not None:
                print(f"  Skip {user_data['email']} (exists)")
                continue

            user = User(
                email=user_data["email"],
                role=user_data["role"],
                hashed_password=hash_password(user_data["password"]),
                full_name=user_data["full_name"],
                is_active=True,
                email_verified=True,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            await ensure_wallet(session, user.id)
            print(f"  Created {user_data['role'].value}: {user_data['email']} (id={user.id})")

        for astro_data in SEED_ASTROLOGERS:
            user_result = await session.exec(select(User).where(User.email == astro_data["email"]))
            user = user_result.first()
            if user is None:
                print(f"  Skip astrologer {astro_data['email']} (user not found)")
                continue

            existing = await session.exec(select(Astrologer).where(Astrologer.user_id == user.id))
            if existing.first() is not None:
                print(f"  Skip astrologer profile for {astro_data['email']} (exists)")
                continue

            astrologer = Astrologer(
                user_id=user.id,
                status=AstrologerStatus.active,
                bio=astro_data["bio"],
                specializations=astro_data["specializations"],
                languages=astro_data["languages"],
                rate_per_minute_paise=astro_data["rate_per_minute_paise"],
                experience_years=10,
            )
            session.add(astrologer)
            await session.commit()
            print(f"  Created astrologer profile for {astro_data['email']} (status=active)")

        print("\nSeed complete!")


if __name__ == "__main__":
    asyncio.run(seed())

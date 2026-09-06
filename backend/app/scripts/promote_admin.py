"""
The only way to create an admin account. Deliberately a CLI script, not
an HTTP endpoint — an admin-creation HTTP route is a real attack surface
on a platform handling payments; requiring server/container access to run
this is the point, not an oversight.

Run: python -m app.scripts.promote_admin someone@example.com
"""
import asyncio
import sys

from sqlmodel import select

import app.models.user  # noqa: F401
from app.core.db import engine, get_session
from app.models.user import User, UserRole


async def main(email: str) -> None:
    async for session in get_session():
        result = await session.exec(select(User).where(User.email == email))
        user = result.first()
        if user is None:
            print(f"No user found with email {email}")
            return
        user.role = UserRole.admin
        session.add(user)
        await session.commit()
        print(f"{email} is now an admin.")
        break
    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m app.scripts.promote_admin <email>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))

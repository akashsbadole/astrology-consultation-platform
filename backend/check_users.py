from app.models.user import User
from app.core.db import get_session, engine
from sqlmodel import select
import asyncio

async def main():
    async with get_session() as s:
        u = await s.exec(select(User))
        users = u.all()
        print(f'Users: {users}')
        print(f'Count: {len(users)}')

if __name__ == "__main__":
    asyncio.run(main())
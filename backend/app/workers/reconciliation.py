"""
Nightly wallet reconciliation job.
Run via APScheduler or standalone: python -m app.workers.reconciliation
Verifies that SUM(wallet_transactions) for each wallet matches wallet.balance_paise.
"""
import logging

from sqlmodel import select

from app.core.db import get_session
from app.models.wallet import Wallet, WalletTransaction

logger = logging.getLogger(__name__)


async def reconcile_wallets():
    """Check every wallet's balance against its transaction ledger."""
    discrepancies = []
    async for session in get_session():
        wallets = await session.exec(select(Wallet))
        for wallet in wallets:
            txns = await session.exec(
                select(WalletTransaction).where(WalletTransaction.wallet_id == wallet.id)
            )
            ledger_sum = sum(t.amount_paise for t in txns)
            if ledger_sum != wallet.balance_paise:
                discrepancies.append({
                    "wallet_id": str(wallet.id),
                    "balance_paise": wallet.balance_paise,
                    "ledger_sum": ledger_sum,
                    "drift": wallet.balance_paise - ledger_sum,
                })
                logger.warning(
                    "Wallet drift detected: wallet=%s balance=%d ledger=%d drift=%d",
                    wallet.id, wallet.balance_paise, ledger_sum, wallet.balance_paise - ledger_sum,
                )
            break  # one session per iteration
    return discrepancies


if __name__ == "__main__":
    import asyncio
    asyncio.run(reconcile_wallets())

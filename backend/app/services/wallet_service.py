"""
Every wallet balance change in the entire platform goes through debit()
or credit() below — never a direct `UPDATE wallets` anywhere else. That
discipline is what makes the ledger trustworthy: the running balance and
the sum of all transaction rows can never silently drift apart.

Concurrency: uses SELECT ... FOR UPDATE to serialize concurrent
debits/credits against the SAME wallet row. Without this, two simultaneous
requests against a wallet with just enough balance for ONE of them could
both read "balance is sufficient" before either writes back — a classic
double-spend race. This is verified for real in
run_real_tests.py by firing concurrent debits at a wallet that can only
afford one of them.
"""
import enum
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.wallet import Wallet, WalletTransaction, TransactionType


class WalletError(str, enum.Enum):
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE"
    WALLET_NOT_FOUND = "WALLET_NOT_FOUND"


async def ensure_wallet(session: AsyncSession, user_id: uuid.UUID) -> Wallet:
    """Idempotent — safe to call even if the wallet already exists.
    Registration creates one eagerly (see routers/auth.py), but this
    exists as a safety net for any code path that forgets to check."""
    result = await session.exec(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.first()
    if wallet is None:
        wallet = Wallet(user_id=user_id, balance_paise=0)
        session.add(wallet)
        await session.commit()
        await session.refresh(wallet)
    return wallet


async def get_balance(session: AsyncSession, user_id: uuid.UUID) -> int:
    wallet = await ensure_wallet(session, user_id)
    return wallet.balance_paise


async def debit(
    session: AsyncSession, wallet_id: uuid.UUID, amount_paise: int, type_: TransactionType, reference_id: uuid.UUID | None = None
) -> WalletError | WalletTransaction:
    if amount_paise <= 0:
        raise ValueError("debit amount must be positive — pass the magnitude, not a signed value")

    # FOR UPDATE locks this row until the transaction commits/rolls back —
    # a concurrent debit against the SAME wallet blocks here until this
    # one finishes, instead of both reading a stale balance.
    result = await session.exec(select(Wallet).where(Wallet.id == wallet_id).with_for_update())
    wallet = result.first()
    if wallet is None:
        await session.rollback()
        return WalletError.WALLET_NOT_FOUND

    if wallet.balance_paise < amount_paise:
        # Release the FOR UPDATE lock immediately — without this rollback,
        # the lock stays held for as long as this session's transaction
        # stays open, which could be well past this function returning,
        # needlessly blocking other transactions against the same wallet.
        await session.rollback()
        return WalletError.INSUFFICIENT_BALANCE

    wallet.balance_paise -= amount_paise
    session.add(wallet)

    txn = WalletTransaction(wallet_id=wallet_id, amount_paise=-amount_paise, type=type_, reference_id=reference_id)
    session.add(txn)
    await session.commit()
    await session.refresh(txn)
    return txn


async def credit(
    session: AsyncSession, wallet_id: uuid.UUID, amount_paise: int, type_: TransactionType, reference_id: uuid.UUID | None = None
) -> WalletTransaction:
    if amount_paise <= 0:
        raise ValueError("credit amount must be positive — pass the magnitude, not a signed value")

    result = await session.exec(select(Wallet).where(Wallet.id == wallet_id).with_for_update())
    wallet = result.first()
    if wallet is None:
        raise ValueError(f"wallet {wallet_id} does not exist")

    wallet.balance_paise += amount_paise
    session.add(wallet)

    txn = WalletTransaction(wallet_id=wallet_id, amount_paise=amount_paise, type=type_, reference_id=reference_id)
    session.add(txn)
    await session.commit()
    await session.refresh(txn)
    return txn


async def reconcile(session: AsyncSession, wallet_id: uuid.UUID) -> bool:
    """Sanity check: SUM(transactions) must equal the wallet's stored
    balance. Used by the nightly reconciliation job — see
    scripts/reconcile_wallets.py. Returns True if they match."""
    wallet = await session.get(Wallet, wallet_id)
    if wallet is None:
        return False
    result = await session.exec(select(WalletTransaction).where(WalletTransaction.wallet_id == wallet_id))
    total = sum(t.amount_paise for t in result.all())
    return total == wallet.balance_paise

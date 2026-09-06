'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TransactionOut } from '@/lib/types';

function formatPaise(paise: number) {
  return `₹${(Math.abs(paise) / 100).toLocaleString('en-IN')}`;
}

const presetAmounts = [10000, 20000, 50000, 100000];

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function WalletPage() {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [txPage, setTxPage] = useState(1);

  const balance = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: () => api.getWalletBalance(),
  });

  const transactions = useQuery({
    queryKey: ['wallet', 'transactions', txPage],
    queryFn: () => api.getWalletTransactions(txPage),
  });

  const recharge = useMutation({
    mutationFn: async (amountPaise: number) => {
      const order = await api.createRechargeOrder(amountPaise);
      return new Promise<any>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.razorpay_key_id,
          amount: order.amount_paise,
          currency: 'INR',
          name: 'Astrology Platform',
          order_id: order.order_id,
          handler: (response: any) => resolve(response),
          prefill: { contact: '', email: '' },
          theme: { color: '#C6A15B' },
        });
        rzp.on('payment.failed', reject);
        rzp.open();
      });
    },
    onSuccess: () => {
      balance.refetch();
      transactions.refetch();
    },
  });

  const handleRecharge = () => {
    const amount = selectedPreset ?? parseInt(customAmount) * 100;
    if (amount > 0) recharge.mutate(amount);
  };

  const txnTypeBadge: Record<string, string> = {
    recharge: 'bg-green-900 text-green-300',
    consultation_debit: 'bg-red-900 text-red-300',
    store_purchase: 'bg-red-900 text-red-300',
    astrologer_payout: 'bg-red-900 text-red-300',
    referral_bonus: 'bg-green-900 text-green-300',
    refund: 'bg-green-900 text-green-300',
  };

  return (
    <div className="min-h-screen bg-midnight-deep p-6 space-y-6">
      <h1 className="text-3xl font-display text-parchment">My Wallet</h1>

      {/* Balance Card */}
      <div className="rounded-panel bg-midnight border border-brass p-8 text-center">
        <p className="text-mist text-sm uppercase tracking-wider">Current Balance</p>
        {balance.isLoading ? (
          <div className="h-12 bg-midnight-deep rounded-lg animate-pulse mt-2" />
        ) : balance.error ? (
          <p className="text-error mt-2">Failed to load balance</p>
        ) : (
          <p className="text-5xl font-display text-brass mt-2">
            {formatPaise(balance.data?.balance_paise ?? 0)}
          </p>
        )}
      </div>

      {/* Recharge */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6 space-y-4">
        <h2 className="text-xl font-display text-brass">Recharge Wallet</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {presetAmounts.map((a) => (
            <button
              key={a}
              onClick={() => { setSelectedPreset(a); setCustomAmount(''); }}
              className={`py-3 rounded-lg text-sm font-medium transition-colors ${
                selectedPreset === a
                  ? 'bg-brass text-midnight-deep'
                  : 'bg-midnight-deep border border-mist-faint text-parchment hover:border-brass'
              }`}
            >
              ₹{(a / 100).toLocaleString('en-IN')}
            </button>
          ))}
        </div>
        <div>
          <label className="text-mist text-xs uppercase tracking-wider block mb-1">Custom Amount (₹)</label>
          <input
            type="number"
            min="1"
            value={customAmount}
            onChange={(e) => { setCustomAmount(e.target.value); setSelectedPreset(null); }}
            placeholder="Enter amount"
            className="w-full bg-midnight-deep border border-mist-faint rounded-lg px-3 py-2 text-parchment text-sm placeholder:text-mist-faint"
          />
        </div>
        <button
          onClick={handleRecharge}
          disabled={recharge.isPending || (!selectedPreset && !customAmount)}
          className="w-full bg-brass text-midnight-deep py-3 rounded-lg font-semibold hover:bg-brass-dim transition-colors disabled:opacity-50"
        >
          {recharge.isPending ? 'Processing...' : 'Recharge'}
        </button>
        {recharge.error && <p className="text-error text-sm">Recharge failed. Please try again.</p>}
      </div>

      {/* Transaction History */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        <h2 className="text-xl font-display text-brass mb-4">Transaction History</h2>
        {transactions.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-midnight-deep rounded-lg animate-pulse" />)}
          </div>
        ) : transactions.error ? (
          <p className="text-error text-sm">Failed to load transactions.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mist-faint">
                    <th className="text-left text-mist py-2">Date</th>
                    <th className="text-left text-mist py-2">Type</th>
                    <th className="text-right text-mist py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(transactions.data?.items ?? []).map((t: TransactionOut) => (
                    <tr key={t.id} className="border-b border-mist-faint/30">
                      <td className="text-parchment py-3">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${txnTypeBadge[t.type] ?? 'bg-midnight-deep text-mist'}`}>
                          {t.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className={`text-right py-3 font-medium ${t.amount_paise >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {t.amount_paise >= 0 ? '+' : '-'}{formatPaise(t.amount_paise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(transactions.data?.items ?? []).length === 0 && (
              <p className="text-mist text-sm text-center py-4">No transactions yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

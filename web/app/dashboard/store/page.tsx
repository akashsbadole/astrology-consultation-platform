'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProductOut } from '@/lib/types';

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

type CartItem = { product: ProductOut; quantity: number };

const categories = ['All', 'Gemstone', 'Rudraksha', 'Yantra', 'Puja Service'] as const;

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function StorePage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);

  const products = useQuery({
    queryKey: ['products', activeCategory],
    queryFn: () => api.listProducts(activeCategory === 'All' ? undefined : activeCategory),
  });

  const checkout = useMutation({
    mutationFn: async (method: 'wallet' | 'razorpay') => {
      const items = cart.map((c) => ({ product_id: c.product.id, quantity: c.quantity }));
      const order = await api.checkout(items, method);

      if (method === 'razorpay') {
        return new Promise<any>((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: order.total_paise,
            currency: 'INR',
            name: 'Astrology Store',
            order_id: order.id,
            handler: (response: any) => resolve(response),
            theme: { color: '#C6A15B' },
          });
          rzp.on('payment.failed', reject);
          rzp.open();
        });
      }
      return order;
    },
    onSuccess: () => setCart([]),
  });

  const addToCart = (product: ProductOut) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.product.price_paise * c.quantity, 0);

  const categoryEmoji: Record<string, string> = {
    Gemstone: '💎',
    Rudraksha: '🔮',
    Yantra: '✨',
    'Puja Service': '🙏',
  };

  return (
    <div className="min-h-screen bg-midnight-deep p-6 space-y-6">
      <h1 className="text-3xl font-display text-parchment">Spiritual Store</h1>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-brass text-midnight-deep'
                : 'bg-midnight border border-mist-faint text-parchment hover:border-brass'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Product Grid */}
        <div className="flex-1">
          {products.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-midnight rounded-panel animate-pulse" />
              ))}
            </div>
          ) : products.error ? (
            <p className="text-error text-sm">Failed to load products.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(products.data ?? []).map((p) => (
                <div key={p.id} className="rounded-panel bg-midnight border border-mist-faint p-4 flex flex-col">
                  <div className="h-40 bg-midnight-deep rounded-lg mb-3 flex items-center justify-center text-4xl">
                    {categoryEmoji[p.category] ?? '📦'}
                  </div>
                  <h3 className="text-parchment font-medium">{p.name}</h3>
                  {p.description && (
                    <p className="text-mist text-sm mt-1 line-clamp-2">{p.description}</p>
                  )}
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <div>
                      <p className="text-brass font-semibold">{formatPaise(p.price_paise)}</p>
                      <p className={`text-xs ${p.stock_quantity > 0 ? 'text-green-400' : 'text-error'}`}>
                        {p.stock_quantity > 0 ? 'In stock' : 'Out of stock'}
                      </p>
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      disabled={p.stock_quantity <= 0}
                      className="bg-brass text-midnight-deep px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brass-dim transition-colors disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="rounded-panel bg-midnight border border-mist-faint p-6 sticky top-6 space-y-4">
            <h2 className="text-xl font-display text-brass">Cart ({cart.length})</h2>
            {cart.length === 0 ? (
              <p className="text-mist text-sm">Your cart is empty.</p>
            ) : (
              <>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cart.map((c) => (
                    <div key={c.product.id} className="flex items-center justify-between bg-midnight-deep rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-parchment text-sm truncate">{c.product.name}</p>
                        <p className="text-mist text-xs">Qty: {c.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-parchment text-sm">{formatPaise(c.product.price_paise * c.quantity)}</span>
                        <button
                          onClick={() => removeFromCart(c.product.id)}
                          className="text-error text-xs hover:underline"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-mist-faint pt-3">
                  <div className="flex justify-between mb-4">
                    <span className="text-mist">Total</span>
                    <span className="text-brass font-semibold text-lg">{formatPaise(cartTotal)}</span>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => checkout.mutate('wallet')}
                      disabled={checkout.isPending}
                      className="w-full bg-brass text-midnight-deep py-2 rounded-lg font-medium hover:bg-brass-dim transition-colors disabled:opacity-50"
                    >
                      Pay with Wallet
                    </button>
                    <button
                      onClick={() => checkout.mutate('razorpay')}
                      disabled={checkout.isPending}
                      className="w-full bg-midnight-deep border border-mist-faint text-parchment py-2 rounded-lg font-medium hover:border-brass transition-colors disabled:opacity-50"
                    >
                      Pay with Razorpay
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

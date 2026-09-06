export const metadata = { title: 'Terms of Service — Astrology Platform' };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-midnight-deep p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-display text-parchment mb-8">Terms of Service</h1>
        <div className="prose prose-invert space-y-6 text-mist">
          <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section>
            <h2 className="text-xl font-display text-brass">1. Acceptance of Terms</h2>
            <p>By accessing or using our platform, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-brass">2. Services</h2>
            <p>Our platform provides astrology consultation services, birth chart (Kundli) generation, and related spiritual products. Astrological predictions are for informational and entertainment purposes only and should not be the sole basis for any life decision.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-brass">3. Wallet & Payments</h2>
            <p>Consultations are charged on a pay-per-minute basis from your wallet balance. Wallet recharges are processed through Razorpay. Wallet balances are non-transferable and non-refundable except as required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-brass">4. User Conduct</h2>
            <p>You agree not to harass astrologers, share inappropriate content in chats, or attempt to circumvent the billing system. Violation may result in account suspension.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-brass">5. Limitation of Liability</h2>
            <p>The platform and astrologers are not liable for decisions made based on astrological consultations. Services are provided &quot;as is&quot; without warranties of any kind.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-brass">6. Governing Law</h2>
            <p>These Terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Jaipur, Rajasthan.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

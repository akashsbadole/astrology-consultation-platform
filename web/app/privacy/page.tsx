export const metadata = { title: 'Privacy Policy — Astrology Platform' };

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-midnight-deep p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-display text-parchment mb-8">Privacy Policy</h1>
        <div className="prose prose-invert space-y-6 text-mist">
          <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section>
            <h2 className="text-xl font-display text-brass">1. Information We Collect</h2>
            <p>We collect information you provide directly: name, email, phone number, and birth details (date, time, location) required for astrological calculations. We also collect payment information processed through our payment partner Razorpay.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-brass">2. How We Use Your Information</h2>
            <p>Your birth details are used solely for generating astrological charts and predictions. Your contact information is used for account management and communication. Payment information is processed securely by Razorpay and is never stored on our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-brass">3. Data Sharing</h2>
            <p>We do not sell or share your personal information with third parties except as necessary to provide our services (e.g., payment processing through Razorpay). Chat consultations between you and astrologers are private and not shared with third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-brass">4. Data Security</h2>
            <p>We implement industry-standard security measures including encryption in transit (TLS) and at rest. However, no method of transmission over the Internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-brass">5. Your Rights (DPDP Act, 2023)</h2>
            <p>You have the right to access, correct, and delete your personal data. To exercise these rights, use the &quot;Delete Account&quot; feature in your profile settings or contact our support team.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-brass">6. Data Retention</h2>
            <p>We retain your data as long as your account is active. Upon account deletion, personal information is anonymized within 30 days while transaction records are retained for legal compliance.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-brass">7. Contact</h2>
            <p>For privacy-related inquiries, contact us at privacy@astrologerplatform.com</p>
          </section>
        </div>
      </div>
    </div>
  );
}

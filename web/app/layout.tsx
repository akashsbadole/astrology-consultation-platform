import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-fraunces',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'Astrology Platform',
  description: 'Connect with astrologers for chat, audio, and video consultations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc/client';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tapflow - AI-Powered Lead Generation',
  description: 'Find and convert your ideal customers with AI-powered outreach',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}

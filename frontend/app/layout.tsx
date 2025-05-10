/**
 * RootLayout component defines the root layout for the Next.js application.
 * It sets up global metadata, font, and wraps the app with all required providers.
 *
 * Features:
 * - Sets up global HTML structure and language
 * - Applies global font and CSS
 * - Wraps children with Providers for context and state management
 */
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

/**
 * Global metadata for the application
 */
export const metadata: Metadata = {
  title: 'Membership MVP',
  description: 'A membership subscription system built with Sui blockchain',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Membership MVP',
    description: 'A membership subscription system built with Sui blockchain',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'Membership MVP',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Membership MVP',
    description: 'A membership subscription system built with Sui blockchain',
  },
}

/**
 * RootLayout component for the application
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} The root layout with providers
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

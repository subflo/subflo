import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Subflo - Attribution Platform for OnlyFans Media Buyers',
  description: 'Finally know which ads make money. The attribution platform built for OnlyFans media buyers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-background-base text-text-primary`}>
        {children}
      </body>
    </html>
  )
}

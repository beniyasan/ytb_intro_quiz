import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'YTB Quiz - Frontend',
  description: 'Frontend application for YouTube Quiz system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
import type { Metadata, Viewport } from 'next'
import { Noto_Sans_Thai } from 'next/font/google'
import './theme.css'
import './base.css'

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'PharmCare OPD', template: '%s · PharmCare OPD' },
  description: 'บันทึกการบริบาลทางเภสัชกรรมผู้ป่วยนอก โรงพยาบาลอุตรดิตถ์',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body>{children}</body>
    </html>
  )
}

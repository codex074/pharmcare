import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth/dal'
import { getTheme, pcClass } from '@/lib/theme'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'เข้าสู่ระบบ' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ revoked?: string }> }) {
  if (await currentUser()) redirect('/')
  const { revoked } = await searchParams
  const theme = await getTheme()

  return (
    <div className={pcClass(theme)} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <Image
            src="/logo-utth.png"
            alt="โลโก้โรงพยาบาลอุตรดิตถ์"
            width={104}
            height={104}
            priority
            style={{ objectFit: 'contain', background: '#ffffff', borderRadius: '50%', padding: 2, boxShadow: 'var(--shadow)' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--h)' }}>PharmCare OPD</h1>
            <p className="muted">งานบริบาลเภสัชกรรมผู้ป่วยนอก · โรงพยาบาลอุตรดิตถ์</p>
          </div>
        </div>

        <LoginForm notice={revoked ? 'สิทธิ์การใช้งานถูกเปลี่ยน กรุณาเข้าสู่ระบบอีกครั้ง' : undefined} />

        <p className="faint xs" style={{ textAlign: 'center' }}>กลุ่มงานเภสัชกรรม โรงพยาบาลอุตรดิตถ์</p>
      </div>
    </div>
  )
}

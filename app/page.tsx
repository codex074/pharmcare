import Image from 'next/image'
import { requireUser } from '@/lib/auth/dal'
import { logout } from './login/actions'

export default async function Home() {
  const user = await requireUser()

  return (
    <div className="pc" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section className="card" style={{ maxWidth: 440, width: '100%', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <Image src="/logo-utth.png" alt="โลโก้โรงพยาบาลอุตรดิตถ์" width={72} height={72} priority />
        <h1 className="h1">PharmCare OPD</h1>
        <p className="muted">สวัสดี {user.name} · กำลังพัฒนา</p>
        <form action={logout}>
          <button type="submit" className="btn btn-sm">ออกจากระบบ</button>
        </form>
      </section>
    </div>
  )
}

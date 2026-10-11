import Image from 'next/image'

export default function Home() {
  return (
    <div className="pc" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section className="card" style={{ maxWidth: 440, width: '100%', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <Image src="/logo-utth.png" alt="โลโก้โรงพยาบาลอุตรดิตถ์" width={72} height={72} priority />
        <h1 className="h1">PharmCare OPD</h1>
        <p className="muted">งานบริบาลเภสัชกรรม · กำลังพัฒนา</p>
      </section>
    </div>
  )
}

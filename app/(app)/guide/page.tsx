import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <>
      <PageHeader title="ขั้นตอนงาน" />
      <div className="page" style={{ maxWidth: 1120 }}>
        <p className="muted">หน้านี้จะเพิ่มในขั้นที่ 7</p>
      </div>
    </>
  )
}

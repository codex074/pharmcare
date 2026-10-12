import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Icon } from '@/components/icons'
import { PageHeader } from '@/components/page-header'
import { requireUser, type CurrentUser } from '@/lib/auth/dal'
import { ageOn } from '@/lib/calc/dates'
import { CARE_KINDS, CARE_ORDER, isCareKind } from '@/lib/care-kinds'
import { CLINIC, SEX } from '@/lib/codes'
import { lookupHn, type HisResult } from '@/lib/his'
import { hnError, normalizeHn } from '@/lib/patients/hn'
import { fullName, initials } from '@/lib/patients/name'
import { findActivePatientByHn, patientOverview, patientTimeline, type Patient } from '@/lib/patients/queries'
import { bangkokDate, thaiDateShort } from '@/lib/thai-date'
import { naranjoCategory, NARANJO_CATEGORY } from '@/lib/calc/naranjo'
import { OverviewTab } from './overview'
import { FormHost } from './forms/form-host'
import { CareTiles, clinicName, HisBand, patientHref, type PatientParams } from './parts'
import { RegisterForm } from './register-form'
import { TimelineTab } from './timeline'

type Props = { params: Promise<{ hn: string }>; searchParams: Promise<PatientParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `HN ${normalizeHn(decodeURIComponent((await params).hn))}` }
}

export default async function PatientPage({ params, searchParams }: Props) {
  const user = await requireUser()
  const hn = normalizeHn(decodeURIComponent((await params).hn))
  if (hnError(hn)) notFound()
  const sp = await searchParams

  const [patient, his] = await Promise.all([findActivePatientByHn(hn), lookupHn(hn)])
  return patient ? <ExistingPatient patient={patient} his={his} sp={sp} user={user} /> : <NewPatient hn={hn} his={his} sp={sp} />
}

async function NewPatient({ hn, his, sp }: { hn: string; his: HisResult; sp: PatientParams }) {
  const found = his.status === 'found' ? his.patient : null
  const hisClinic = found?.clinics.find((c) => c.code in CLINIC)?.code
  return (
    <>
      <PageHeader title="ผลการค้นหา" back={{ href: '/', label: 'ค้นหา' }} />
      <div className="page" style={{ maxWidth: 1000 }}>
        <section className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-hd" style={{ flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="avatar" style={{ width: 52, height: 52, background: 'var(--line2)', color: 'var(--tx2)' }}>
                <Icon name="userPlus" />
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="mono" style={{ fontSize: 21, fontWeight: 700, color: 'var(--h)' }}>
                  HN {hn}
                </span>
                <span className="muted sm">ยังไม่เคยลงทะเบียนในระบบ PharmCare</span>
              </div>
            </div>
            <span className="chip info">เคสใหม่</span>
          </div>
          <div className="card-bd" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <HisBand his={his} existing={false} retryHref={patientHref(hn, sp)} />
            <RegisterForm
              hn={hn}
              fromHis={!!found}
              prefill={{
                fullName: found ? fullName(found) : undefined,
                sex: found?.sex ?? undefined,
                age: found?.birthDate ? String(ageOn(found.birthDate, bangkokDate())) : undefined,
                clinic: sp.clinic && sp.clinic in CLINIC ? sp.clinic : hisClinic,
              }}
            />
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 className="h2">เลือกการบริบาล</h3>
            <span className="faint sm">ลงทะเบียนผู้ป่วยก่อนเพื่อเริ่มบันทึก</span>
          </div>
          <CareTiles hn={hn} disabled />
        </section>
      </div>
    </>
  )
}

async function ExistingPatient({ patient: p, his, sp, user }: { patient: Patient; his: HisResult; sp: PatientParams; user: CurrentUser }) {
  const tab = sp.tab === 'all' || isCareKind(sp.tab) ? sp.tab : 'overview'
  const showCancelled = sp.cancelled === '1'
  const [o, timeline] = await Promise.all([patientOverview(p), tab === 'overview' ? null : patientTimeline(p.id)])

  // Today's clinic: from HIS when it knows, otherwise what the pharmacist picked (?clinic=).
  const hisClinic = his.status === 'found' ? his.patient.clinics.find((c) => c.visitDate === bangkokDate()) : undefined
  const picked = clinicName(sp.clinic)
  const clinic = hisClinic ? { name: hisClinic.name, fromHis: true } : picked ? { name: picked, fromHis: false } : null
  const clinicParam = hisClinic ? undefined : picked ? sp.clinic : undefined

  const age = ageOn(p.birthDate, bangkokDate())
  const total = CARE_ORDER.reduce((n, k) => n + o.counts[k], 0)
  const allergy = o.allergies[0]
  const allergyText = [p.allergySummary, ...o.allergies.map((a) => `${a.drug} (${a.reaction})`)].filter(Boolean).join(' · ')
  const tabs: { key: string; label: string; count?: number }[] = [
    { key: 'overview', label: 'ภาพรวม' },
    { key: 'all', label: 'ประวัติทั้งหมด', count: total },
    ...CARE_ORDER.map((k) => ({ key: k, label: CARE_KINDS[k].label === 'สอนเทคนิค' ? 'เทคนิค' : CARE_KINDS[k].label, count: o.counts[k] })),
  ]
  const base = { clinic: clinicParam }
  const here = { ...base, tab: sp.tab, cancelled: sp.cancelled }
  const isOwner = p.createdBy === user.id

  return (
    <>
      <PageHeader title="ข้อมูลผู้ป่วย" back={{ href: '/', label: 'ค้นหา' }} />
      <div className="page" style={{ maxWidth: 1180 }}>
        <section className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <span className="avatar" style={{ width: 60, height: 60, fontSize: 19 }}>
              {initials(p.firstName, p.lastName)}
            </span>
            <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 23, fontWeight: 700, color: 'var(--tx)' }}>{fullName(p)}</h2>
                <span className="mono muted" style={{ fontWeight: 600 }}>
                  HN {p.hn}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="muted">
                  {[p.sex ? SEX[p.sex as keyof typeof SEX] : null, age != null ? `${p.birthDateEstimated ? '~' : ''}${age} ปี` : null].filter(Boolean).join(' · ') || 'ไม่ระบุเพศ/อายุ'}
                </span>
                {clinic && (
                  <>
                    <span className="faint" aria-hidden="true">
                      •
                    </span>
                    <span className="chip">
                      คลินิกวันนี้: {clinic.name}
                      <span className="tag" style={{ marginLeft: 2 }}>
                        {clinic.fromHis ? 'จาก HIS' : 'เลือกเอง'}
                      </span>
                    </span>
                  </>
                )}
                <span className="chip mute">{total ? `เคสเดิม · บริบาล ${total} ครั้ง` : 'ลงทะเบียนแล้ว · ยังไม่มีการบริบาล'}</span>
              </div>
            </div>
            {isOwner && (
              <Link className="btn btn-sm" href={patientHref(p.hn, { ...here, form: 'patient' })} scroll={false}>
                <Icon name="edit" size="sm" />
                แก้ไขข้อมูลผู้ป่วย
              </Link>
            )}
          </div>

          {allergyText && (
            <div className="band dan" role="alert" style={{ padding: '14px 18px', fontSize: 15.5, flexWrap: 'wrap' }}>
              <Icon name="alert" />
              <span>แพ้ยา: {allergyText}</span>
              <span style={{ flex: 1 }} />
              {allergy && (
                <span className="sm" style={{ fontWeight: 500 }}>
                  บันทึก {thaiDateShort(allergy.date)}
                  {allergy.naranjoScore != null && ` · Naranjo ${allergy.naranjoScore} (${NARANJO_CATEGORY[naranjoCategory(allergy.naranjoScore)].split(' (')[0]})`}
                </span>
              )}
            </div>
          )}

          {his.status !== 'found' && (
            <>
              <HisBand his={his} existing retryHref={patientHref(p.hn, { ...sp })} />
              {!picked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="label">คลินิกวันนี้:</span>
                  {Object.entries(CLINIC).map(([code, name]) => (
                    <Link key={code} className="chip mute" href={patientHref(p.hn, { tab: sp.tab, clinic: code })} scroll={false} style={{ textDecoration: 'none' }}>
                      {name}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 className="h2">เลือกการบริบาล</h3>
          <CareTiles hn={p.hn} clinic={clinicParam} tab={sp.tab} />
        </section>

        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <Link
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`tab${tab === t.key ? ' on' : ''}`}
              href={patientHref(p.hn, { ...base, tab: t.key === 'overview' ? undefined : t.key, cancelled: sp.cancelled })}
              scroll={false}
              style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
            >
              {t.label}
              {t.count != null && (
                <span className="faint" style={{ fontWeight: 500, marginLeft: 6 }}>
                  {t.count}
                </span>
              )}
            </Link>
          ))}
        </div>

        {tab === 'overview' ? (
          <OverviewTab patient={p} o={o} userId={user.id} hrefFor={(q) => patientHref(p.hn, { ...here, ...q })} />
        ) : (
          <TimelineTab
            rows={timeline!}
            kind={tab as 'all'}
            showCancelled={showCancelled}
            toggleHref={patientHref(p.hn, { ...base, tab, cancelled: showCancelled ? undefined : '1' })}
            userId={user.id}
            hrefFor={(q) => patientHref(p.hn, { ...here, ...q })}
          />
        )}
      </div>
      <FormHost patient={p} user={user} sp={sp} />
    </>
  )
}

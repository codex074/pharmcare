# ความคืบหน้า

อัปเดตล่าสุด: 2026-10-12

## สถานะ

| ขั้น | งาน | สถานะ |
|---|---|---|
| 0 | สร้าง repo + โครงโฟลเดอร์ | ✅ เสร็จ |
| – | นำดีไซน์จาก Claude Design เข้า repo (`docs/design/`) | ✅ เสร็จ |
| 1 | Scaffold Next.js + theme.css จากดีไซน์ + Drizzle + docker compose สำหรับ dev | ✅ เสร็จ |
| 2 | Auth: login / logout / requireUser / rate limit | ✅ เสร็จ |
| 3 | Schema + migrations + triggers + grants | ✅ เสร็จ |
| 4 | ฟังก์ชันคำนวณ (eGFR, TTR, Naranjo, คะแนนเทคนิค) + checklist + unit tests | ✅ เสร็จ |
| 5 | หน้ากรอก HN + การ์ดผู้ป่วย + ประวัติ + เลือกประเภทการบริบาล | ✅ เสร็จ |
| 6 | แฟ้มผู้ป่วย + ฟอร์มบริบาลทุกชนิด | ✅ เสร็จ |
| 7 | ตัวชี้วัด, ส่งออก CSV, ประวัติแก้ไข | ✅ เสร็จ |
| 8 | Deploy pharmcare-web (VPS) + DB production + nginx/tunnel + failover/backup | 🔄 B0–B3 เสร็จ — **ใช้งานจริงได้ที่ https://pharmcare.codex074.com** (login ด้วยบัญชี PharmShift) · เหลือ B4 (VPS failover) + B5 (failover.sh) · HIS ดึงชื่อผู้ป่วยจากเว็บจริงได้แล้ว |
| 9 | `his-relay` + เชื่อม API ผู้ป่วยของโรงพยาบาล | ✅ relay รันจริงบนเครื่อง รพ. (always-on) + Cloudflare Tunnel/Access เสร็จ — ดึงชื่อ+คลินิกจาก HOSxP ได้ |

## รอผู้ใช้

- [ ] ยืนยันขั้นสำคัญใน checklist ยาสูด (ดูบันทึก 2026-10-12) และการใช้ข้อความจาก MED Library
- [x] ยืนยันว่าการอนุมัติ PDPA ของโรงพยาบาลครอบคลุมการเก็บชื่อ-สกุลเต็ม (ผู้ใช้ยืนยัน 2026-10-12)
- [ ] เปิด Swagger ของโปรแกรมคิว (`/api/docs`) ดูว่ามี endpoint ค้นคลินิกจาก HN หรือ VN ไหม
- [ ] ขอ token ของ API กลาง (`/api/hosxp/patient`) และ service account ของโปรแกรมคิว
- [x] เลือกเครื่องในโรงพยาบาลที่จะลง `his-relay` (เครื่อง OPD Windows, Scheduled Task S4U, 2026-10-12)
- [x] ตัดสินใจที่วาง DB production → **CT 103** ใน cluster ของ PharmShift ตาม CLAUDE.md (2026-10-12)
- [ ] อนุมัติ production ทีละชุด (B0 ตรวจ → B1 role/DB → B2 เว็บบน CT 103 → B3 hostname ใน tunnel → B4 VPS → B5 failover.sh) ตาม `deploy/PLAN.md`
- [x] ~~**relay ออฟไลน์**~~ (relay กลับมาออนไลน์ 2026-10-12): `his-relay.codex074.com` ตอบ 530 / Cloudflare error 1033 (tunnel ไม่มี connector) — ตรวจเครื่อง OPD ว่าเปิดอยู่และ cloudflared รันอยู่
- [ ] หมุน secret ที่เคยพิมพ์ในแชต: Cloudflare Access service token ของ relay (`RELAY_SHARED_SECRET` หมุนแล้ว 2026-10-12)
- [ ] เปลี่ยน relay ไปใช้ **service account แยก** ของ queue API (ตอนนี้ใช้ login ส่วนตัว `pharsurg1` — ควรเปลี่ยน + หมุนรหัส เพราะเคยพิมพ์ในแชต)
- [ ] ให้ IT รพ. **whitelist `*.codex074.com` ใน FortiGate** เพื่อให้ PC รพ. เปิดหน้าเว็บ pharmcare ได้ (relay ไม่ต้อง เพราะ VPS เป็นคนเรียก)

## ต่อบน Mac (handoff — 2026-10-12)

โค้ดทั้งหมด (ถึงขั้น 9 ฝั่งแอป + relay + ไฟล์ deploy) push ขึ้น GitHub (branch `main`) แล้ว
ฝั่ง **HIS relay + Cloudflare ตั้งเสร็จบนเครื่อง รพ. (Windows OPD)** — รันเองตลอด **ไม่ต้องทำซ้ำบน Mac**

### เริ่ม dev บน Mac
1. `git clone https://github.com/codex074/pharmcare.git && cd pharmcare`
2. ติดตั้ง: Node 22+ (หรือ 24), Docker Desktop (git มากับ macOS)
3. `npm install`
4. `cp .env.example .env.local` แล้วแก้ `SESSION_JWT_SECRET=` (`openssl rand -base64 48`); DB URLs ใช้ค่า default (127.0.0.1:54329) ได้เลย; `HIS_RELAY_URL=` เว้นว่างไว้ก่อน (กรอกชื่อ/คลินิกเองระหว่าง dev)
5. `npm run db:up` → `npm run db:migrate` → `npm run db:seed`
6. `npm run dev` → http://localhost:3000 (บัญชี dev: `dev_pharm` / `dev-pass-1234`)

### ไฟล์ที่ไม่มากับ git (gitignore) — ต้องสร้าง/ก๊อปเอง
- `.env.local` → ทำตามข้อ 4
- `relay/.env` → อยู่บนเครื่อง รพ. เท่านั้น ไม่ต้องทำบน Mac
- `deploy/*` (README.md, docker-compose.vps.yml, cloudflared-config, service files, RELAY-SETUP.md) → อยู่ในเครื่อง รพ. ไม่ขึ้น git ถ้าต้องการบน Mac ก๊อปมาเอง หรือสร้างใหม่จาก `*.example`

### ต่อ HIS จริงจาก Mac (ถ้าจะทดสอบ)
Mac อยู่นอก รพ. → เรียก relay ผ่าน Cloudflare ได้ โดยตั้งใน `.env.local`: `HIS_RELAY_URL=https://his-relay.codex074.com`, `HIS_RELAY_CF_ACCESS_CLIENT_ID/_SECRET` (service token), `HIS_RELAY_SECRET` (ตรงกับ `relay/.env` บนเครื่อง รพ.) — ระวัง: ดึงข้อมูลผู้ป่วยจริง ใช้เท่าที่จำเป็น

### ขั้นถัดไป (ขั้น 8 — ยังไม่ทำ)
- ตัดสินใจที่วาง DB production ก่อน แล้วทำตาม `deploy/README.md`
- env บน VPS: `HIS_RELAY_URL`, `HIS_RELAY_CF_ACCESS_CLIENT_ID/_SECRET`, `HIS_RELAY_SECRET`, `*_DATABASE_URL`, `SESSION_JWT_SECRET`
- หน้าเว็บที่ PC รพ. เปิด ต้องให้ IT whitelist `*.codex074.com` ใน FortiGate

## ไม่อยู่ในขอบเขตรอบนี้

- ระบบนัดติดตาม (ไม่มีช่องวันนัดในตารางใด ๆ รวมถึง "วันนัดติดตามผล" ในดีไซน์ฟอร์ม DRP)

## บันทึก

- 2026-10-12: สร้าง repo
- 2026-10-12: ขั้น 1 เสร็จ — Next.js 16.3.8 (แทน 14 ที่หมดซัพพอร์ต), theme.css + Noto Sans Thai, ฐานข้อมูล dev จำลองโครง production (`npm run db:up`), `/api/health` ตอบ 503 เมื่อ DB ล่ม, lint/typecheck/build ผ่าน
- 2026-10-12: ขั้น 2 เสร็จ — login ด้วยบัญชี PharmShift (เฉพาะเภสัช/admin), rate limit 5/บัญชี 30/IP ใน 15 นาที, session 12 ชม. แบบ sliding, ถอนสิทธิ์ใน PharmShift แล้วหลุดภายใน 5 นาที, ตาราง `login_attempts` (app เพิ่ม/อ่านได้ ลบ/แก้ไม่ได้) ทดสอบกับ dev DB ครบ 8 บัญชี
- 2026-10-12: ขั้น 3 เสร็จ — ตาราง patients, visits, drps, high_alert_monitoring, adrs, technique_assessments, audit_log ฟิลด์ตามดีไซน์ (กฎ/ช่วงค่าตามต้นแบบ) ค่าที่ใช้คำนวณเก็บเป็นรหัส (`lib/codes.ts`) trigger บังคับ: ต้องระบุผู้บันทึก, แก้ได้เฉพาะเจ้าของ (ยกเว้นซิงก์ชื่อจาก HIS), ยกเลิกต้องมีเหตุผลและย้อนไม่ได้, audit log เขียนเอง ทดสอบ `npm run test:db` 24 ข้อผ่าน
  - ต่างจากแผน: app อ่าน `audit_log` ได้อย่างเดียว (แผนเดิมให้ INSERT ด้วย) เพื่อไม่ให้ปลอมประวัติได้, HN ซ้ำได้ถ้ารายการเดิมถูกยกเลิก, กรอกอายุเองเก็บเป็นวันเกิดประมาณ (`birth_date_estimated`)
- 2026-10-12: ขั้น 4 เสร็จ — `lib/calc/` (eGFR CKD-EPI 2021, TTR Rosendaal, Naranjo, คะแนนเทคนิค, ถึงเป้า) + `lib/checklists.ts` อุปกรณ์ 8 ชนิด ผลตรงกับสูตรต้นแบบ (TTR ของ HN 6900002 = 58%, eGFR ชาย 70 ปี SCr 1.3 = 59) ข้อความ checklist/Naranjo ตรงกับต้นแบบทุกตัวอักษร unit test 50 ข้อ
  - ต่างจากต้นแบบ: eGFR ไม่คำนวณให้อายุต่ำกว่า 18 ปี (สูตรใช้กับผู้ใหญ่) · validation ด้วย zod ย้ายไปทำพร้อมฟอร์มในขั้น 6
- 2026-10-12: ขั้น 5 เสร็จ — โครงแอป (sidebar / drawer บนมือถือ / ธีมมืดจำใน cookie), หน้าค้นหา HN (ฟอร์ม GET ธรรมดา เครื่องสแกนกด Enter ได้ก่อนหน้าโหลดเสร็จ), บริบาลวันนี้, DRP ค้าง, หน้าผู้ป่วย (การ์ด แถบแพ้ยา ค่าล่าสุดเทียบเป้า กราฟ HbA1c ประวัติรวม/แยกประเภท รายการยกเลิกพร้อมเหตุผลและผู้ยกเลิก), ลงทะเบียนเคสใหม่, `lib/his` (NoopLookup, timeout 3 วินาที) ฟอร์มบริบาลเปิดเป็นแผงขวา (`?form=`) ตอนนี้ยังเป็น placeholder ข้อมูลตัวอย่าง `npm run db:seed` ทดสอบผ่านเบราว์เซอร์ 31 ข้อ
  - ต่างจากดีไซน์: เพศไม่เลือกให้ล่วงหน้า (กันค่า eGFR ผิด), ไม่มี "ค้นหาล่าสุด" (ไม่เก็บชื่อผู้ป่วยในเบราว์เซอร์เครื่องรวม), ปุ่มสแกนแค่โฟกัสช่อง HN (ใช้เครื่องสแกนแบบคีย์บอร์ด), eGFR ไม่มีป้ายถึงเป้า (สเปกไม่กำหนดเป้า), ข้อความนัดในดีไซน์เปลี่ยนเป็น "ค้าง N วัน", คลินิกวันนี้ของเคสเดิมเลือกเป็นชิปเมื่อดึง HIS ไม่ได้, เพิ่มปุ่มสลับธีมใน sidebar
- 2026-10-12: ขั้น 6 เสร็จ — ฟอร์มในแผงขวา (เต็มจอบนมือถือ): Visit (eGFR และถึงเป้าคำนวณสด, รายการยาเริ่มจาก Visit ล่าสุด, ปุ่ม "ที่เหลือใช้ตรงตามสั่ง"), DRP (NCC MERP พร้อมคำอธิบาย), ยาความเสี่ยงสูง (ค่าเริ่ม Warfarin / INR 2–3, บอกในเป้าหรือนอกเป้าสด), ADR (Naranjo คิดสด), สอนเทคนิค (checklist 8 อุปกรณ์ ถูก/ไม่ถูกทีละขั้น คะแนนสด เทียบครั้งก่อน), ข้อมูลผู้ป่วย (ชื่อ เพศ วันเกิด น้ำหนัก เป้าหมาย โรคประจำตัว) แก้ไขและยกเลิกได้เฉพาะผู้บันทึก (ปุ่มแสดงเฉพาะเจ้าของ และ server ตรวจซ้ำ) ยกเลิกต้องมีเหตุผล ยกเลิกทะเบียนผู้ป่วยได้เมื่อไม่มีรายการค้าง คะแนน Naranjo และเทคนิคคำนวณใหม่ที่ server เสมอ ตรวจข้อมูลด้วย zod ชุดเดียวกันทั้งหน้าจอและ server ทดสอบผ่านเบราว์เซอร์ 33 ข้อ
  - ต่างจากดีไซน์: รายการประเภท DRP / การแก้ไข / การตอบรับของแพทย์ใช้ตามต้นแบบ (มี "รอคำตอบ"), ข้อความ checklist ตามต้นแบบ, ไม่มีช่องวันนัดและ "นัดประเมินซ้ำ", ADR มีปุ่มเลือกชนิด (แพ้ยา / อาการข้างเคียง / แพ้ยาเทียม) แทน checkbox เดียว, ไม่มีปุ่ม "ดึงจาก HIS" ในฟอร์ม Visit (ยังไม่มีแหล่งค่าแล็บ), ฟอร์มยาความเสี่ยงสูงไม่มีในดีไซน์จึงทำตามแบบฟอร์มอื่น
- 2026-10-12: ขั้น 7 เสร็จ — หน้าตัวชี้วัด (30 วัน / 90 วัน / 1 ปี / ทั้งหมด: ผู้ป่วย, Visit, DRP ต่อ Visit, % แพทย์ยอมรับ, % DRP แก้ไขได้, TTR เฉลี่ย, DRP ตามประเภท, ผลลัพธ์ทางคลินิกเทียบเป้ารายบุคคล, INR ในเป้า, คะแนนเทคนิคแรก → ล่าสุด, ขั้นสำคัญครบ) ตามนิยามใน CLAUDE.md, หน้าข้อมูลและประวัติ (ส่งออก CSV 6 ตาราง รวมรายการที่ยกเลิก มีคอลัมน์ภาษาไทยคู่รหัส กันสูตร Excel, ประวัติการแก้ไขกรองตาม HN / ผู้ใช้ / การกระทำ / ช่วงเวลา แบ่งหน้า แสดงค่าเดิม → ค่าใหม่ ส่งออกเป็น CSV ได้), หน้าขั้นตอนงาน ทดสอบผ่านเบราว์เซอร์ 20 ข้อ, DB test 25 ข้อ
  - เพิ่มจากแผน: ตาราง `export_log` บันทึกทุกการส่งออก (ใคร ตารางไหน กี่แถว) ผ่านฟังก์ชัน `log_export()` ในฐานข้อมูล app อ่านได้อย่างเดียว แสดงรวมในประวัติการแก้ไข (ดีไซน์มีรายการ "ส่งออก")
- 2026-10-12: checklist สอนพ่นยาจาก MED Library (https://sites.google.com/view/med-helper-tools/brochodilator) — ยาสูด 11 แบบ + nebulizer ข้อความภาษาไทยตามเว็บทุกตัวอักษร พร้อม "ข้อผิดพลาดที่พบบ่อย" และ "คำแนะนำ" แสดงใต้ checklist (ไม่นับคะแนน) และอ้างอิงที่มา เพิ่มอุปกรณ์ Ellipta, Easyhaler, Spiromax, NEXThaler, Airmaster, HandiHaler, Breezhaler, nebulizer (migration 0006) ปากกาอินซูลิน, กระบอกฉีด, MDI + spacer, ยาพ่นจมูก ยังใช้ข้อความจากต้นแบบ
  - ต่างจากเว็บ: ขั้น "พ่นทิ้งเมื่อหลอดใหม่" ของ MDI ย้ายไปอยู่ในคำแนะนำ (เป็นขั้นที่ทำเฉพาะบางครั้ง ถ้าเป็นขั้นที่ต้องติ๊กจะทำให้คะแนนผิด) MDI จึงเหลือ 6 ขั้น
  - รอผู้ใช้ยืนยัน: ขั้นสำคัญ (เว็บไม่ได้ระบุ ระบบเลือกขั้นเตรียมยา/ปล่อยยา และขั้นสูดยา) และการใช้ข้อความจากเว็บภายนอกในแอปของโรงพยาบาล
- 2026-10-12: นำดีไซน์ 20 หน้าจอ + theme.css + โลโก้เข้า repo เลิกใช้ Tailwind ใช้ CSS จากดีไซน์แทน
- 2026-10-12: ขั้น 9 (ฝั่งแอป) — `QueueRelayLookup` ใน `lib/his/index.ts` ยิง `GET {HIS_RELAY_URL}/patient?hn=` แนบ Cloudflare Access service token + header secret (`X-Relay-Secret`), map สถานะ 200/404/401/403/5xx/ตอบไม่ใช่ JSON เป็น found/not_found/unavailable, ตรวจ body ด้วย zod ให้ตรง type `HisPatient`, `patientLookup()` เลือก lookup นี้อัตโนมัติเมื่อตั้ง `HIS_RELAY_URL`, เพิ่ม env 3 ตัว (`lib/env.ts`, `.env.example`), unit test `lib/his/his.test.ts` 7 เคส
  - ติดตั้ง Node v24.20.0 + git 2.55.0 บนเครื่อง dev แล้ว, `npm install` + lint/typecheck/test(104)/build ผ่านครบ, ยังไม่ commit/push (โฟลเดอร์ยังไม่ใช่ git repo / ยังไม่มี remote)
  - ค้างรอ: `deploy/PLAN.md` (gitignore ไม่ติดมากับ zip) และ `PATIENT-LOOKUP-API.md` เพื่อสร้างตัว `his-relay` จริงให้ตรง contract — ตอนนี้ contract ยึดตาม type `HisPatient` ในrepo, ชื่อ header auth (`X-Relay-Secret`) เป็นค่าสมมติรอยืนยัน
- 2026-10-12: deploy ฝั่ง HIS relay เสร็จ (commit `df9d8b8`, `37aca7d`) —
  - `relay/his-relay.mjs` ตัวจริง: login queue API (`/auth/login`) + ต่ออายุ token เอง, `GET /patient?hn=` → เรียก `/his/patient/hn` map เป็น `HisPatient`, โหลดรหัสจาก `relay/.env`
  - ช่องคลินิกในฟอร์มลงทะเบียนเปลี่ยนเป็น **free text** pre-fill จาก HIS (เดิมเป็นชิป 6 โค้ด) — เก็บลง `main_clinic_name` (text, ไม่มี constraint)
  - เครื่อง รพ. (Windows OPD): relay รันเป็น **Scheduled Task `his-relay`** (node.exe, AtLogOn, S4U ซ่อนหน้าต่าง, restart เอง, ไม่ให้ sleep) — ไม่ใช้ pm2 เพราะเครื่องมี AppLocker บล็อก %AppData%
  - Cloudflare: Tunnel → `his-relay.codex074.com` → `localhost:4000`, Access policy = Service Auth (เบราว์เซอร์ไม่มี token โดน 403 ตามคาด) ยืนยันแล้วว่า tunnel+Access ขึ้น
  - ข้อควรรู้: queue API ยังใช้ login `pharsurg1` (ควรเปลี่ยนเป็น service account), FortiGate ของ รพ. บล็อก `*.codex074.com` (unrated) → PC รพ. เปิดหน้าเว็บเองไม่ได้จนกว่า IT จะ whitelist (แต่ VPS เรียก relay ได้ปกติ)
  - lint/typecheck/test(105)/build ผ่านครบ
- 2026-10-12: **หยุดที่ก่อนขั้น 8 (VPS)** เพื่อย้ายไปทำต่อบน Mac — ดูหัวข้อ "ต่อบน Mac (handoff)" ด้านบน
- 2026-10-12: ขั้น 8 (เตรียม) บน Mac — ผู้ใช้เลือกวาง DB production บน CT 103 (ตาม CLAUDE.md), เขียน `deploy/PLAN.md` ใหม่ (gitignore) พร้อม `roles.sql`, compose (`web` / `pharmcare-web` บน network `deploy_default`), override พอร์ต 3100 สำหรับ VPS, nginx site, `ship-image.sh` (build amd64 บน Mac แล้ว `docker load`), แพตช์ `failover.sh` ของ PharmShift (สตาร์ต pharmcare-web หลัง promote + สลับ DNS `pharmcare.codex074.com` แบบไม่บล็อก PharmShift)
  - แก้ `Dockerfile`: ใช้ Node 24.13.1 (npm 11 ตรงกับ lockfile — npm 10 ใน Node 22 อ่าน lockfile ไม่ผ่าน), เพิ่ม stage `migrate` (รัน drizzle-kit ใน network ของเซิร์ฟเวอร์), `HOSTNAME=0.0.0.0` (ไม่งั้น healthcheck 127.0.0.1 ไม่ผ่าน) · ล้างรายการ esbuild ค้างใน `package-lock.json` · eslint ข้าม `deploy/`
  - ทดสอบ: image migrate บน DB เปล่าผ่าน, container healthy, `/api/health` 200 · lint/typecheck/test(105)/build ผ่าน
  - ตรวจแล้ว: การแก้ไขข้อมูลทุกจุด (รวม login) เป็น Server Action ซึ่ง Next ตรวจ `Origin` เทียบ host ให้เอง, pool DB 6+2 = 8 ไม่เกิน `CONNECTION LIMIT 10`
- 2026-10-12: ขั้น 8 B0 (ตรวจ CT 103 อ่านอย่างเดียว) ผ่าน — x86_64, network `deploy_default`, ส่ง image ผ่าน `pct exec` ได้, ยังไม่มี role/DB pharmcare, template1 สะอาด, hba ให้ docker network login ด้วย scram ได้
  - พบว่าตาราง `users` ของ PharmShift เปิด RLS อยู่ แต่ policy อ่านเป็น `USING (true)` สำหรับทุก role → `pharmcare_app` อ่านได้ ไม่ต้องแก้ PharmShift · เพิ่ม RLS + policy เดียวกันใน dev DB (`dev/initdb/01`) แล้วทดสอบ login ทุกกรณีผ่าน image จริง (เภสัช/แอดมิน/ตัวพิมพ์ใหญ่+ช่องว่าง เข้าได้; จพง. → "เฉพาะเภสัชกร"; ถูกระงับ; ต้องเปลี่ยนรหัส/รหัส plaintext → "กรุณาเปลี่ยนรหัสผ่านใน PharmShift ก่อน"; รหัสผิด; POST ข้าม origin ถูกปฏิเสธ; เปิดหน้าแฟ้มผู้ป่วยหลัง login ได้) · test:db 26 ข้อผ่าน
- 2026-10-12: ขั้น 8 B1 เสร็จ (ผู้ใช้อนุมัติ) — สร้าง `pharmcare_owner` (limit 2), `pharmcare_app` (limit 10, timeout 15s), DB `pharmcare` บน CT 103 รหัสสุ่มอยู่ใน `deploy/secrets.env` (Mac, gitignore) และ `/root/pharmcare-setup/` บน CT 103 (600, ลบหลัง B2) ไม่เคยผ่าน command line
  - ตรวจผ่าน docker network: app login ได้, รหัสผิดถูกปฏิเสธ, อ่าน `users` ได้ 116 แถวเฉพาะคอลัมน์ที่อนุญาต (`select *` และตารางอื่นเช่น `shifts` ถูกปฏิเสธ), สร้างตารางใน `pharmcare` ไม่ได้, ไม่ใช่ superuser/bypassrls, ไม่เป็นสมาชิก role ใด, `anon`/`authenticated`/`authenticator` connect `pharmcare` ไม่ได้
  - VPS standby: `pharmcare` + 2 role replicate มาแล้ว (streaming, lag 4 วินาที) · PharmShift API 200, หน้าเว็บ 200
- 2026-10-12: ขั้น 8 B2 เสร็จ (ผู้ใช้อนุมัติ) — image `5239e18` (amd64) ส่งไป CT 103, `/opt/pharmcare/` (compose, `pharmcare-web.env` 600, `migrate.env` 600, `.env` tag), migration 7 ไฟล์ผ่าน (9 ตาราง), `pharmcare-web` healthy บน `deploy_default` (RAM ~50 MB / limit 512 MB), ลบไฟล์รหัสชั่วคราว `/root/pharmcare-setup` แล้ว (shred) · PharmShift API 200 ×5 + เว็บ 200, monitor บน VPS ไม่มี fail
  - HIS: ใส่ค่า relay ครบใน env แล้ว แต่ relay ตอบ 530 (error 1033 = tunnel ฝั่งเครื่อง รพ. ไม่ได้เชื่อมต่อ) ทั้งจาก Mac และจาก container — แอปใช้กรอกชื่อ/คลินิกเองไปก่อน เมื่อ relay กลับมาไม่ต้อง restart (env ครบแล้ว)
- 2026-10-12: ขั้น 8 B3 เสร็จ — ผู้ใช้เพิ่ม public hostname `pharmcare.codex074.com` → `pharmcare-web:3000` ใน tunnel ของ PharmShift; `/api/health` 200 ผ่าน Cloudflare, cert ขอบเป็น Google Trust Services (WE1) ตามที่ PC รพ. เชื่อถือ, ผู้ใช้ login ด้วยบัญชี PharmShift ได้
  - HIS ยังดึงไม่ได้: relay ยังตอบ 530 / error 1033 (tunnel บนเครื่อง OPD ไม่มี connector) — `deploy/RELAY-SETUP.md` เขียนว่า cloudflared ยังไม่ได้ติดตั้งเป็น service อาจเคยรันแบบเปิดหน้าต่างค้างไว้แล้วปิดไป
- 2026-10-12: HIS ใช้งานจริงได้ — ผู้ใช้ตั้ง `RELAY_SHARED_SECRET` ใหม่บนเครื่อง OPD; อัปเดต `HIS_RELAY_SECRET` ใน `/opt/pharmcare/pharmcare-web.env` บน CT 103 (600) ให้ตรงกัน แล้ว recreate `pharmcare-web` (healthy, `/api/health` 200) · ทดสอบจากใน container: relay ตอบ 404 กับ HN ทดสอบ (ผ่าน Access + secret; ค่าเก่าได้ 401) · ผู้ใช้ยืนยันค้น HN จากเว็บได้ · VPS ยังไม่มี `/opt/pharmcare/` (B4) — ตอนทำ B4 ใช้ `deploy/pharmcare-web.env` บน Mac ซึ่งอัปเดตแล้ว

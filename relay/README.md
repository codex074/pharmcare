# his-relay

ตัวกลางที่รันบนเครื่องในเครือข่ายโรงพยาบาล ให้ PharmCare ค้นข้อมูลผู้ป่วยจาก HN ได้ โดยไม่ต้องเปิดฐาน HOSxP ออกนอกโรงพยาบาล

- ต่อออกด้วย `cloudflared` เท่านั้น ไม่ต้องเปิดพอร์ตขาเข้า
- เรียกได้เฉพาะ server ของ PharmCare (Cloudflare Access service token + header secret)
- endpoint เดียว: `GET /patient?hn=` คืนชื่อ-สกุล, เพศ, วันเกิด (ถ้ามี) และคลินิกของ visit วันนี้
- แหล่งข้อมูล: API กลางของโรงพยาบาล (`/api/hosxp/patient` แล้ว fallback `/api/hosxp/HIS`) และโปรแกรมคิวสำหรับคลินิก

## สถานะ

`his-relay.mjs` — ฉบับร่างใช้งานได้ (Node ล้วน ไม่มี dependency) ดึง **ทั้งชื่อและคลินิก** จาก queue backend ผ่าน `GET /his/patient/hn` แล้ว map เป็น shape `HisPatient` (ดู `lib/his/index.ts`)

รันเอง (ต้องอยู่ในเครือข่ายที่เข้าถึง queue API ได้ และใช้ **service account แยก** ไม่ใช่ login ส่วนตัว):

```powershell
$env:QUEUE_API_URL="http://172.17.1.240/api/v1"
$env:QUEUE_USERNAME="<pharmcare service account>"
$env:QUEUE_PASSWORD="<password>"
$env:RELAY_SHARED_SECRET="<secret เดียวกับ HIS_RELAY_SECRET ของแอป>"
node relay/his-relay.mjs
```

แล้วตั้งในแอป (`.env.local`): `HIS_RELAY_URL=http://localhost:4000` และ `HIS_RELAY_SECRET=<secret เดียวกัน>` จากนั้นรีสตาร์ท dev

ยังค้าง/ต้องปรับให้ตรง `deploy/PLAN.md` ก่อน production:
- แหล่งชื่อควรใช้ central API (`/api/hosxp/patient`) ตามดีไซน์ — ร่างนี้ใช้ queue API ไปก่อนเพราะคืนชื่อ+คลินิกในที่เดียว
- หน้า cloudflared + Cloudflare Access (service token) — ร่างนี้ยังมีแค่ shared-secret header
- PDPA การเก็บชื่อเต็ม และการเลือกเครื่องในโรงพยาบาลที่จะลง relay (ขั้นที่ 9 ใน [docs/PROGRESS.md](../docs/PROGRESS.md))

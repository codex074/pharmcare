# his-relay

ตัวกลางที่รันบนเครื่องในเครือข่ายโรงพยาบาล ให้ PharmCare ค้นข้อมูลผู้ป่วยจาก HN ได้ โดยไม่ต้องเปิดฐาน HOSxP ออกนอกโรงพยาบาล

- ต่อออกด้วย `cloudflared` เท่านั้น ไม่ต้องเปิดพอร์ตขาเข้า
- เรียกได้เฉพาะ server ของ PharmCare (Cloudflare Access service token + header secret)
- endpoint เดียว: `GET /patient?hn=` คืนชื่อ-สกุล, เพศ, วันเกิด (ถ้ามี) และคลินิกของ visit วันนี้
- แหล่งข้อมูล: API กลางของโรงพยาบาล (`/api/hosxp/patient` แล้ว fallback `/api/hosxp/HIS`) และโปรแกรมคิวสำหรับคลินิก

ยังไม่ได้เริ่มเขียน (ขั้นที่ 9 ใน [docs/PROGRESS.md](../docs/PROGRESS.md))

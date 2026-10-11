# ดีไซน์หน้าจอ

ออกแบบด้วย Claude Design เมื่อ 2026-10-12 (ไฟล์ต้นฉบับ `PharmCare OPD.html` อยู่นอก repo เพราะขนาด 8 MB)

- `theme.css` — CSS กลางของทุกหน้าจอ ใช้ class `.pc` ครอบทั้งแอป และ `.pc.dark` สำหรับธีมมืด สีทั้งหมดเป็นตัวแปร (`--pri`, `--dan`, `--ok` ฯลฯ) ใช้ไฟล์นี้เป็นสไตล์หลักของแอปโดยตรง
- `boards/` — markup ของแต่ละหน้าจอ (template ของ Claude Design: `{{...}}` คือค่าตัวแปร, `<sc-for>` คือการวนรายการ, ข้อมูลตัวอย่างอยู่ใน `<script type="text/x-dc">` ท้ายไฟล์) ใช้เป็นต้นแบบตอนเขียน component ไม่ได้เปิดดูตรงได้ทั้งหมด
- โลโก้โรงพยาบาลอยู่ที่ `public/logo-utth.png`
- ข้อมูลในดีไซน์เป็นข้อมูลสมมติทั้งหมด

| ไฟล์ | หน้าจอ |
|---|---|
| `boards/01-login.html` | 1 · เข้าสู่ระบบ (สถานะ error) |
| `boards/02-search.html` | 2 · ค้นหาผู้ป่วย — คอมพิวเตอร์ |
| `boards/03-patient-new-his-fail.html` | 3a · เคสใหม่ + ดึงข้อมูล HIS ไม่ได้ |
| `boards/04-patient-overview.html` | 3b · หน้าผู้ป่วย เคสเดิม — ภาพรวม |
| `boards/05-patient-timeline.html` | 3c · แท็บประวัติทั้งหมด (timeline) |
| `boards/06-technique-panel.html` | 4 · สอนเทคนิค — แผงขวาบนคอม |
| `boards/07-form-technique.html` | ฟอร์ม · สอนเทคนิคการใช้ยา |
| `boards/08-form-visit.html` | ฟอร์ม · Visit ติดตามโรคเรื้อรัง |
| `boards/09-form-drp.html` | ฟอร์ม · DRP |
| `boards/10-form-adr-naranjo.html` | ฟอร์ม · ADR + Naranjo |
| `boards/11-mobile-search.html` | มือถือ · ค้นหาผู้ป่วย |
| `boards/12-mobile-drawer.html` | มือถือ · เมนู drawer |
| `boards/13-mobile-patient.html` | มือถือ · หน้าผู้ป่วย |
| `boards/14-mobile-technique.html` | มือถือ · สอนเทคนิค เต็มจอ |
| `boards/15-kpi.html` | 5 · ตัวชี้วัด |
| `boards/16-data-history.html` | 6 · ข้อมูลและประวัติ |
| `boards/17-dark-search.html` | ธีมมืด · ค้นหาผู้ป่วย |
| `boards/18-dark-patient.html` | ธีมมืด · หน้าผู้ป่วย |
| `boards/19-dark-mobile-search.html` | ธีมมืด · มือถือ ค้นหา |
| `boards/20-dark-mobile-technique.html` | ธีมมืด · มือถือ สอนเทคนิค |

หน้าจอ 05, 06, 12, 14 และ 17–20 ประกอบจากหน้าจออื่นด้วย `<dc-import>` (เช่น `Patient tab="all"`, `FormTechnique mobile`, `theme="dark"`) ต้นแบบจริงอยู่ในไฟล์ที่ถูก import

## แนวทางนำไปใช้

- ไม่ใช้ Tailwind: ใช้ `theme.css` เป็น global stylesheet แล้วเขียน component React ให้ markup และ class ตรงกับ boards
- ธีมมืด: สลับ class `dark` บน element `.pc` และจำค่าไว้ใน cookie ของผู้ใช้
- ไอคอนเป็น SVG เส้น (class `ic`) ใน boards — รวมไว้เป็น component `Icon` ชุดเดียว
- ฟอนต์ Noto Sans Thai โหลดผ่าน `next/font/google` แทน `@font-face` ที่ฝังใน boards

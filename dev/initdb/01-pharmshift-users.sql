-- Fake copy of pharmshift's public.users (only the columns PharmCare touches,
-- plus salary_number so the column-level GRANT can be tested).
-- Every account's password is: dev-pass-1234   (dev only — never reuse)

CREATE TABLE public.users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pha_id               text UNIQUE,
  password             text,
  prefix               text,
  f_name               text NOT NULL DEFAULT '',
  l_name               text NOT NULL DEFAULT '',
  role                 text NOT NULL DEFAULT 'pharmacist',
  is_sub_admin         boolean DEFAULT false,
  is_active            boolean DEFAULT true,
  must_change_password boolean DEFAULT false,
  salary_number        text,
  created_at           timestamptz DEFAULT now()
);

INSERT INTO public.users (pha_id, password, prefix, f_name, l_name, role, is_active, must_change_password, salary_number) VALUES
  ('dev_pharm',      '$2b$12$Zhf02vtHJQvN.YIVuK9kg.c54TrfN3mdWd8CsKFvRM6tz8q3xOG/y', 'ภญ.', 'สมใจ',   'รักษ์ยา',  'pharmacist',          true,  false, 'S-0001'),
  ('dev_pharm2',     '$2b$12$Zhf02vtHJQvN.YIVuK9kg.c54TrfN3mdWd8CsKFvRM6tz8q3xOG/y', 'ภก.', 'ทดสอบ',  'สองคน',   'pharmacist',          true,  false, 'S-0002'),
  ('dev_admin',      '$2b$12$Zhf02vtHJQvN.YIVuK9kg.c54TrfN3mdWd8CsKFvRM6tz8q3xOG/y', 'ภก.', 'ผู้ดูแล', 'ระบบ',    'admin',               true,  false, 'S-0003'),
  ('dev_tech',       '$2b$12$Zhf02vtHJQvN.YIVuK9kg.c54TrfN3mdWd8CsKFvRM6tz8q3xOG/y', 'นาย', 'จพง',    'ทดสอบ',   'pharmacy_technician', true,  false, 'S-0004'),
  ('dev_officer',    '$2b$12$Zhf02vtHJQvN.YIVuK9kg.c54TrfN3mdWd8CsKFvRM6tz8q3xOG/y', 'นาง', 'เจ้าหน้าที่', 'ทดสอบ', 'officer',           true,  false, 'S-0005'),
  ('dev_inactive',   '$2b$12$Zhf02vtHJQvN.YIVuK9kg.c54TrfN3mdWd8CsKFvRM6tz8q3xOG/y', 'ภญ.', 'ถูกระงับ', 'ทดสอบ',  'pharmacist',          false, false, 'S-0006'),
  ('dev_mustchange', '$2b$12$Zhf02vtHJQvN.YIVuK9kg.c54TrfN3mdWd8CsKFvRM6tz8q3xOG/y', 'ภก.', 'ต้องเปลี่ยน', 'รหัส', 'pharmacist',          true,  true,  'S-0007'),
  ('dev_plaintext',  'dev-pass-1234',                                                   'ภญ.', 'รหัสเก่า', 'ทดสอบ',  'pharmacist',          true,  false, 'S-0008');

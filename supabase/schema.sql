-- ============================================================
-- LIMONADA / Control de Asistencia QR - Schema Supabase
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  qr_payload TEXT NOT NULL,
  document_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  avatar_url TEXT,
  active BOOLEAN DEFAULT true,
  schedule JSONB DEFAULT '{"entry_time":"08:00","lunch_start_time":"13:00","lunch_end_time":"14:00","exit_time":"17:00","tolerance_minutes":15,"lunch_duration_minutes":60}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_document TEXT NOT NULL,
  department TEXT NOT NULL,
  avatar_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('morning_in','lunch_out','lunch_in','shift_out')),
  timestamp TIMESTAMPTZ NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  is_late BOOLEAN DEFAULT false,
  delay_minutes INTEGER DEFAULT 0,
  terminal_name TEXT DEFAULT 'Terminal RR.HH',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_name TEXT DEFAULT 'MakroHouse',
  company_rut TEXT DEFAULT '',
  default_schedule JSONB DEFAULT '{"entry_time":"08:00","lunch_start_time":"13:00","lunch_end_time":"14:00","exit_time":"17:00","tolerance_minutes":15,"lunch_duration_minutes":60}',
  sound_enabled BOOLEAN DEFAULT true,
  auto_detect_event BOOLEAN DEFAULT true,
  allow_manual_type_override BOOLEAN DEFAULT false,
  super_user_pin TEXT DEFAULT '1234',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department);
CREATE INDEX IF NOT EXISTS idx_records_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_records_timestamp ON attendance_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_records_date ON attendance_records(date);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_config_updated_at ON system_config;
CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO system_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEGURIDAD: Row Level Security
-- La app usa la anon key desde el navegador, por lo que se
-- habilitan politicas publicas para estas tablas.
-- IMPORTANTE: cambia super_user_pin tras el primer despliegue.
-- ============================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_employees" ON employees;
CREATE POLICY "public_read_employees" ON employees FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_employees" ON employees;
CREATE POLICY "public_write_employees" ON employees FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_employees" ON employees;
CREATE POLICY "public_update_employees" ON employees FOR UPDATE USING (true);
DROP POLICY IF EXISTS "public_delete_employees" ON employees;
CREATE POLICY "public_delete_employees" ON employees FOR DELETE USING (true);

DROP POLICY IF EXISTS "public_read_records" ON attendance_records;
CREATE POLICY "public_read_records" ON attendance_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_records" ON attendance_records;
CREATE POLICY "public_write_records" ON attendance_records FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_records" ON attendance_records;
CREATE POLICY "public_update_records" ON attendance_records FOR UPDATE USING (true);
DROP POLICY IF EXISTS "public_delete_records" ON attendance_records;
CREATE POLICY "public_delete_records" ON attendance_records FOR DELETE USING (true);

DROP POLICY IF EXISTS "public_read_config" ON system_config;
CREATE POLICY "public_read_config" ON system_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_config" ON system_config;
CREATE POLICY "public_write_config" ON system_config FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_config" ON system_config;
CREATE POLICY "public_update_config" ON system_config FOR UPDATE USING (true);

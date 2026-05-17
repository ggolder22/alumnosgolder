-- ═══════════════════════════════════════════════════════════════
-- ELECTROTECNIA — Setup de base de datos en Supabase
-- Ejecutar en: supabase.com → tu proyecto → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabla de alumnos
CREATE TABLE IF NOT EXISTS students (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name  text NOT NULL,
  email      text NOT NULL UNIQUE,
  dni        text NOT NULL UNIQUE,
  phone      text,
  created_at timestamptz DEFAULT now()
);

-- 2. Tabla de unidades (contenido editable desde el panel admin)
CREATE TABLE IF NOT EXISTS units (
  unit_id    int PRIMARY KEY,
  title      text NOT NULL,
  tag        text,
  topics     jsonb,
  content    text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- lectura pública
CREATE POLICY "public read units"   ON units FOR SELECT TO anon USING (true);
-- solo admin puede insertar/actualizar (upsert desde la app con anon key)
CREATE POLICY "public upsert units" ON units FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public update units" ON units FOR UPDATE TO anon USING (true);

-- 3. Tabla de exámenes
CREATE TABLE IF NOT EXISTS exams (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL,
  unit_id    int  NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Resultados de exámenes
CREATE TABLE IF NOT EXISTS exam_results (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  exam_id    uuid REFERENCES exams(id) ON DELETE CASCADE,
  score      numeric(4,1) NOT NULL CHECK (score >= 0 AND score <= 10),
  taken_at   timestamptz DEFAULT now()
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
-- Habilitar RLS en todas las tablas
ALTER TABLE students      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results  ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (la app usa la anon key)
-- En producción podés reforzar esto con auth de Supabase.

-- students: cualquiera puede insertar (registro) y leer
CREATE POLICY "public insert students" ON students FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public read students"   ON students FOR SELECT TO anon USING (true);

-- exams: solo lectura pública
CREATE POLICY "public read exams" ON exams FOR SELECT TO anon USING (true);

-- exam_results: cualquiera puede insertar y leer
CREATE POLICY "public insert results" ON exam_results FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public read results"   ON exam_results FOR SELECT TO anon USING (true);

-- ── DATOS DE EJEMPLO ─────────────────────────────────────────
-- Podés insertar un examen de prueba:
-- INSERT INTO exams (title, unit_id) VALUES ('Evaluación Unidad 1 — Ley de Ohm', 1);

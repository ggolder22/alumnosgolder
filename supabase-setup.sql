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
-- solo admin puede insertar/actualizar/eliminar (upsert desde la app con anon key)
CREATE POLICY "public upsert units"  ON units FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public update units"  ON units FOR UPDATE TO anon USING (true);
CREATE POLICY "public delete units"  ON units FOR DELETE TO anon USING (true);

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

-- ── STORAGE: bucket para PDFs de unidades ────────────────────
-- Ejecutar en SQL Editor de Supabase:

INSERT INTO storage.buckets (id, name, public)
VALUES ('unit-pdfs', 'unit-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read pdfs"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'unit-pdfs');

CREATE POLICY "admin upload pdfs"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'unit-pdfs');

CREATE POLICY "admin update pdfs"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'unit-pdfs');

CREATE POLICY "admin delete pdfs"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'unit-pdfs');

-- ── Agregar columna pdf_url a units (si ya existe la tabla) ──
ALTER TABLE units ADD COLUMN IF NOT EXISTS pdf_url text;

-- ── SISTEMA DE EXÁMENES ───────────────────────────────────────

-- Agregar columnas al examen
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_active    boolean DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS time_limit   int     DEFAULT 60;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS instructions text;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS unit_ids     jsonb;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_practice  boolean DEFAULT false;

-- Políticas adicionales para exams (insert/update/delete)
CREATE POLICY "public insert exams" ON exams FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public update exams" ON exams FOR UPDATE TO anon USING (true);
CREATE POLICY "public delete exams" ON exams FOR DELETE TO anon USING (true);

-- Tabla de preguntas
CREATE TABLE IF NOT EXISTS exam_questions (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id        uuid REFERENCES exams(id) ON DELETE CASCADE,
  question_text  text NOT NULL,
  type           text NOT NULL CHECK (type IN ('multiple_choice','true_false','short_answer')),
  options        jsonb,
  correct_answer text,
  points         numeric(4,1) DEFAULT 1,
  order_num      int DEFAULT 0
);

ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read questions"   ON exam_questions FOR SELECT TO anon USING (true);
CREATE POLICY "public insert questions" ON exam_questions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public update questions" ON exam_questions FOR UPDATE TO anon USING (true);
CREATE POLICY "public delete questions" ON exam_questions FOR DELETE TO anon USING (true);

-- Columnas adicionales en exam_results
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS answers    jsonb;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Políticas adicionales para exam_results
CREATE POLICY "public update results" ON exam_results FOR UPDATE TO anon USING (true);
CREATE POLICY "public delete results" ON exam_results FOR DELETE TO anon USING (true);

-- ── TABLÓN DE NOVEDADES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL,
  body       text NOT NULL,
  is_pinned  boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read announcements"   ON announcements FOR SELECT TO anon USING (true);
CREATE POLICY "public insert announcements" ON announcements FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public update announcements" ON announcements FOR UPDATE TO anon USING (true);
CREATE POLICY "public delete announcements" ON announcements FOR DELETE TO anon USING (true);

-- ── DATOS DE EJEMPLO ─────────────────────────────────────────
-- Podés insertar un examen de prueba:
-- INSERT INTO exams (title, unit_id, time_limit) VALUES ('Evaluación Unidad 1 — Ley de Ohm', 1, 60);

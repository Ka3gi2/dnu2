ALTER TABLE students ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male','female'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE students ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_year int;
ALTER TABLE students ADD COLUMN IF NOT EXISTS level int;
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_status text DEFAULT 'current' CHECK (student_status IN ('current','graduated'));

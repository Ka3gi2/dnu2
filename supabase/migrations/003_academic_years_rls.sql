ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active academic years"
  ON academic_years FOR SELECT
  USING (is_active = true);

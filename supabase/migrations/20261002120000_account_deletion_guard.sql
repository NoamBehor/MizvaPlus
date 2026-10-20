-- Allow account deletion when this user fulfilled someone else's minyan report.
ALTER TABLE public.minyan_reports
  DROP CONSTRAINT IF EXISTS minyan_reports_fulfilled_by_user_id_fkey;

ALTER TABLE public.minyan_reports
  ADD CONSTRAINT minyan_reports_fulfilled_by_user_id_fkey
  FOREIGN KEY (fulfilled_by_user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

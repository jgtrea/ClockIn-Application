-- Create QR table for section check-in
CREATE TABLE public.qr (
  "qrId" uuid NOT NULL DEFAULT gen_random_uuid (),
  "createdAt" timestamp with time zone NULL DEFAULT now(),
  "scanCount" integer NULL DEFAULT 0,
  status boolean NULL,
  "sectId" uuid NOT NULL,
  CONSTRAINT qr_pkey PRIMARY KEY ("qrId"),
  CONSTRAINT qr_sectId_fkey FOREIGN KEY ("sectId") REFERENCES sections ("sectId") ON DELETE CASCADE
) TABLESPACE pg_default;

-- Enable Row Level Security
ALTER TABLE public.qr ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for qr table
CREATE POLICY "qr_all_users_select" ON public.qr FOR SELECT USING (true);
CREATE POLICY "qr_authenticated_insert" ON public.qr FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "qr_authenticated_update" ON public.qr FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "qr_authenticated_delete" ON public.qr FOR DELETE USING (auth.role() = 'authenticated');

-- Create index for faster sectId lookups
CREATE INDEX qr_sectid_idx ON public.qr ("sectId");

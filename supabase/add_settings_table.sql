-- Create a settings table for global application config
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read settings
CREATE POLICY "Settings are viewable by everyone" ON public.app_settings
  FOR SELECT USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Initialize quiz_enabled setting
INSERT INTO public.app_settings (key, value)
VALUES ('quiz_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

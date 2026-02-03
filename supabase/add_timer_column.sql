-- Add last_question_start_time to daily_sessions for anti-cheat timer
ALTER TABLE public.daily_sessions 
ADD COLUMN IF NOT EXISTS last_question_start_time timestamp with time zone;

-- Update existing sessions (optional, just safety)
UPDATE public.daily_sessions 
SET last_question_start_time = now() 
WHERE last_question_start_time IS NULL AND completed = false;

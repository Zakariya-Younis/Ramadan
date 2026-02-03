-- ============================================
-- CLEAN UP AND CREATE NEW SCHEMA
-- ============================================
-- Run this FIRST before running questions_data.sql

-- ============================================
-- STEP 1: Drop old triggers first (before dropping tables)
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_session_created ON public.daily_sessions;

-- ============================================
-- STEP 2: Drop old functions
-- ============================================

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_last_active();

-- ============================================
-- STEP 3: Drop old tables
-- ============================================

DROP TABLE IF EXISTS public.user_answers CASCADE;
DROP TABLE IF EXISTS public.daily_sessions CASCADE;
DROP TABLE IF EXISTS public.attempts CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- STEP 4: Create all tables
-- ============================================

-- Create users table with enhanced fields
CREATE TABLE public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  name text,
  email text UNIQUE,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_banned boolean DEFAULT false,
  last_active timestamp with time zone,
  total_days_participated integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create questions table with difficulty and bonus support
CREATE TABLE public.questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_option integer NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_bonus boolean DEFAULT false,
  bonus_date date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create daily_sessions table for tracking user quiz sessions
CREATE TABLE public.daily_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  session_date date NOT NULL,
  question_ids jsonb NOT NULL,
  current_question_index integer DEFAULT 0,
  total_score integer DEFAULT 0,
  completed boolean DEFAULT false,
  has_bonus boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, session_date)
);

-- Create user_answers table for tracking individual answers
CREATE TABLE public.user_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.daily_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  user_answer integer NOT NULL,
  is_correct boolean NOT NULL,
  score integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Keep attempts table for backward compatibility and leaderboard
CREATE TABLE public.attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  score integer DEFAULT 0,
  attempt_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, attempt_date)
);

-- ============================================
-- STEP 5: Enable Row Level Security
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: Create policies
-- ============================================

-- Users policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any user" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Questions policies
CREATE POLICY "Questions are viewable by everyone" ON public.questions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Daily sessions policies
CREATE POLICY "Users can view own sessions" ON public.daily_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.daily_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.daily_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON public.daily_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- User answers policies
CREATE POLICY "Users can view own answers" ON public.user_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.daily_sessions
      WHERE daily_sessions.id = user_answers.session_id
      AND daily_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own answers" ON public.user_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_sessions
      WHERE daily_sessions.id = user_answers.session_id
      AND daily_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all answers" ON public.user_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Attempts policies (for leaderboard)
CREATE POLICY "Users can view own attempts" ON public.attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts" ON public.attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts" ON public.attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- STEP 7: Create functions
-- ============================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, last_active)
  VALUES (new.id, new.email, now());
  RETURN new;
EXCEPTION
  WHEN others THEN
    RETURN new;
END;
$$;

-- Function to update last_active timestamp
CREATE OR REPLACE FUNCTION public.update_last_active()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.users
  SET last_active = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 8: Create triggers
-- ============================================

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update last_active when session is created
CREATE TRIGGER on_session_created
  AFTER INSERT ON public.daily_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_last_active();

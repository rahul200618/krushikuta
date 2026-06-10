-- ============================================================
-- Krishikuta Exam Portal — Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Mock Tests
CREATE TABLE IF NOT EXISTS mock_tests (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General',
    price NUMERIC DEFAULT 0,
    image_url TEXT,
    landing_page_url TEXT,
    popup_message TEXT,
    banner_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Mock Questions
CREATE TABLE IF NOT EXISTS mock_questions (
    id SERIAL PRIMARY KEY,
    mock_test_id INTEGER REFERENCES mock_tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL,
    image_url TEXT,
    marks INTEGER DEFAULT 4,
    topic TEXT DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Student Profiles (firebase_uid stores Supabase Auth UUID)
CREATE TABLE IF NOT EXISTS student_profiles (
    firebase_uid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT,
    college TEXT,
    district TEXT,
    guardian_name TEXT,
    guardian_profession TEXT,
    guardian_contact TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. User Purchases
CREATE TABLE IF NOT EXISTS user_purchases (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    mock_test_id INTEGER NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    payment_method TEXT DEFAULT 'Online',
    granted_by_admin BOOLEAN DEFAULT false,
    email TEXT,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_purchases_user_test_unique UNIQUE (user_id, mock_test_id)
);

-- 5. Exam Submissions
CREATE TABLE IF NOT EXISTS exam_submissions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    test_id INTEGER REFERENCES mock_tests(id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT,
    email TEXT,
    college TEXT,
    score INTEGER DEFAULT NULL,
    total_questions INTEGER DEFAULT 0,
    answers JSONB,
    is_completed BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Payment Requests (offline UTR)
CREATE TABLE IF NOT EXISTS payment_requests (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    utr TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- RLS Policies (run after creating tables)
-- Allow anon/authenticated read on mock_tests
-- ============================================================
ALTER TABLE mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Public read for mock_tests
CREATE POLICY "Public can view active tests" ON mock_tests FOR SELECT USING (is_active = true);

-- Authenticated users can manage their own profile
CREATE POLICY "Users manage own profile" ON student_profiles FOR ALL USING (auth.uid()::text = firebase_uid);

-- Users can read their own purchases
CREATE POLICY "Users read own purchases" ON user_purchases FOR SELECT USING (auth.uid()::text = user_id);

-- Users can read their own submissions
CREATE POLICY "Users read own submissions" ON exam_submissions FOR SELECT USING (auth.uid()::text = user_id);

-- Users can insert payment requests
CREATE POLICY "Users insert payment requests" ON payment_requests FOR INSERT WITH CHECK (true);

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }

  const { action, payload = {} } = body;

  try {
    switch (action) {

      // ── PROFILE ──────────────────────────────────────────────
      case 'get-profile': {
        const { userId } = payload;
        const { data, error } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('firebase_uid', userId)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        return res.status(200).json({ profile: data || null });
      }

      case 'save-profile': {
        const { userId, profile } = payload;
        const { data, error } = await supabase
          .from('student_profiles')
          .upsert({ firebase_uid: userId, ...profile, updated_at: new Date().toISOString() }, { onConflict: 'firebase_uid' })
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json({ profile: data });
      }

      // ── TESTS ────────────────────────────────────────────────
      case 'list-mock-tests': {
        const { data, error } = await supabase
          .from('mock_tests')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ tests: data });
      }

      case 'get-mock-questions': {
        const { testId } = payload;
        const { data, error } = await supabase
          .from('mock_questions')
          .select('*')
          .eq('mock_test_id', testId)
          .order('id');
        if (error) throw error;
        return res.status(200).json({ questions: data });
      }

      // ── EXAM SESSION ─────────────────────────────────────────
      case 'start-test': {
        const { userId, testId, name, phone, email, college } = payload;

        // Check for existing submission
        const { data: existing } = await supabase
          .from('exam_submissions')
          .select('id')
          .eq('user_id', userId)
          .eq('test_id', testId)
          .single();

        let submissionId;
        if (existing) {
          // Reset for retake
          const { error } = await supabase
            .from('exam_submissions')
            .update({ score: null, is_completed: false, answers: null, submitted_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (error) throw error;
          submissionId = existing.id;
        } else {
          // Get total questions count
          const { count } = await supabase
            .from('mock_questions')
            .select('id', { count: 'exact', head: true })
            .eq('mock_test_id', testId);

          const { data, error } = await supabase
            .from('exam_submissions')
            .insert([{ user_id: userId, test_id: testId, name, phone, email, college, is_completed: false, total_questions: count || 0 }])
            .select('id')
            .single();
          if (error) throw error;
          submissionId = data.id;
        }

        return res.status(200).json({ submissionId });
      }

      case 'submit-test': {
        const { submissionId, testId, answers } = payload;
        // answers: { [questionId]: selectedOptionIndex }

        // Fetch all questions with correct answers
        const { data: questions, error: qErr } = await supabase
          .from('mock_questions')
          .select('id, correct_option_index, marks, topic')
          .eq('mock_test_id', testId);
        if (qErr) throw qErr;

        let score = 0;
        for (const q of questions) {
          const selected = answers[q.id];
          if (selected !== undefined && selected !== null && parseInt(selected) === q.correct_option_index) {
            score += (q.marks || 4);
          }
        }

        const { error } = await supabase
          .from('exam_submissions')
          .update({ score, answers, is_completed: true, submitted_at: new Date().toISOString() })
          .eq('id', submissionId);
        if (error) throw error;

        return res.status(200).json({ score, totalQuestions: questions.length });
      }

      case 'get-user-performance': {
        const { userId } = payload;
        const { data: submissions, error } = await supabase
          .from('exam_submissions')
          .select('*, mock_tests(title, category)')
          .eq('user_id', userId)
          .eq('is_completed', true)
          .order('submitted_at', { ascending: false });
        if (error) throw error;

        const scores = submissions.map(s => s.score).filter(s => s !== null);
        const totalAttempts = submissions.length;
        const averageScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const bestScore = scores.length ? Math.max(...scores) : 0;

        return res.status(200).json({ totalAttempts, averageScore, bestScore, submissions });
      }

      // ── ADMIN: MOCK TESTS ────────────────────────────────────
      case 'save-mock-test': {
        const { test } = payload;
        const { id, ...rest } = test;
        let data, error;
        if (id) {
          ({ data, error } = await supabase.from('mock_tests').update(rest).eq('id', id).select().single());
        } else {
          ({ data, error } = await supabase.from('mock_tests').insert([rest]).select().single());
        }
        if (error) throw error;
        return res.status(200).json({ test: data });
      }

      case 'delete-mock-test': {
        const { testId } = payload;
        const { error } = await supabase.from('mock_tests').delete().eq('id', testId);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // ── ADMIN: QUESTIONS ─────────────────────────────────────
      case 'save-mock-question': {
        const { question } = payload;
        const { id, ...rest } = question;
        rest.options = typeof rest.options === 'string' ? JSON.parse(rest.options) : rest.options;
        let data, error;
        if (id) {
          ({ data, error } = await supabase.from('mock_questions').update(rest).eq('id', id).select().single());
        } else {
          ({ data, error } = await supabase.from('mock_questions').insert([rest]).select().single());
        }
        if (error) throw error;
        return res.status(200).json({ question: data });
      }

      case 'delete-mock-question': {
        const { questionId } = payload;
        const { error } = await supabase.from('mock_questions').delete().eq('id', questionId);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // ── ADMIN: ACCESS ────────────────────────────────────────
      case 'grant-access': {
        const { userId, testId, email, amount = 0, paymentMethod = 'Admin Granted' } = payload;
        const { data, error } = await supabase
          .from('user_purchases')
          .upsert([{ user_id: userId, mock_test_id: testId, amount, status: 'active', payment_method: paymentMethod, granted_by_admin: true, email }], { onConflict: 'user_id,mock_test_id' })
          .select();
        if (error) throw error;
        return res.status(200).json({ purchase: data?.[0] });
      }

      case 'revoke-access': {
        const { userId, testId } = payload;
        const { error } = await supabase
          .from('user_purchases')
          .update({ status: 'revoked' })
          .eq('user_id', userId)
          .eq('mock_test_id', testId);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      case 'list-user-access': {
        const { search } = payload;
        let query = supabase
          .from('user_purchases')
          .select('*')
          .order('purchased_at', { ascending: false });
        if (search) {
          query = query.or(`user_id.ilike.%${search}%,email.ilike.%${search}%`);
        }
        const { data: purchases, error } = await query;
        if (error) throw error;

        const userIds = [...new Set(purchases.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from('student_profiles')
          .select('firebase_uid, name, mobile, college')
          .in('firebase_uid', userIds);
        
        const profileMap = {};
        if (profiles) {
          profiles.forEach(p => profileMap[p.firebase_uid] = p);
        }

        const enriched = purchases.map(p => ({
          ...p,
          student_profiles: profileMap[p.user_id] || null
        }));

        return res.status(200).json({ purchases: enriched });
      }

      case 'list-student-profiles': {
        const { search } = payload;
        let query = supabase.from('student_profiles').select('*').order('created_at', { ascending: false });
        if (search) {
          query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,mobile.ilike.%${search}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json({ profiles: data });
      }

      // ── PAYMENTS ─────────────────────────────────────────────
      case 'submit-payment-request': {
        const { userEmail, utr, amount } = payload;
        const { data, error } = await supabase
          .from('payment_requests')
          .insert([{ user_email: userEmail, utr, amount, status: 'pending' }])
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json({ request: data });
      }

      case 'list-payment-requests': {
        const { data, error } = await supabase
          .from('payment_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ requests: data });
      }

      case 'update-payment-request': {
        const { requestId, status, userId, testId } = payload;
        const { data: pr, error: prErr } = await supabase
          .from('payment_requests')
          .update({ status })
          .eq('id', requestId)
          .select()
          .single();
        if (prErr) throw prErr;

        // Auto-grant access on approve
        if (status === 'approved' && userId && testId) {
          await supabase.from('user_purchases').upsert([{
            user_id: userId, mock_test_id: testId, amount: pr.amount,
            status: 'active', payment_method: 'Manual Pay', granted_by_admin: true, email: pr.user_email
          }], { onConflict: 'user_id,mock_test_id' });
        }
        return res.status(200).json({ request: pr });
      }

      case 'check-user-access': {
        const { userId, testIds } = payload;
        const { data, error } = await supabase
          .from('user_purchases')
          .select('mock_test_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .in('mock_test_id', testIds);
        if (error) throw error;
        return res.status(200).json({ accessList: data.map(d => d.mock_test_id) });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[exam-api] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

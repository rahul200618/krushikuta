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

      // ── REGISTRATIONS ───────────────────────────────────────
      case 'submit-registration': {
        const { data: regData, error: regError } = await supabase
          .from('registrations')
          .insert([payload])
          .select()
          .single();
        if (regError) throw regError;
        return res.status(200).json({ registration: regData });
      }

      // ── TESTS ────────────────────────────────────────────────
      case 'list-mock-tests': {
        const { data, error } = await supabase
          .from('mock_tests')
          .select('*, mock_questions(count)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        
        // Add total_questions property based on the count relation
        const enriched = data.map(t => ({
          ...t,
          total_questions: t.mock_questions?.[0]?.count || 0
        }));
        // Clean up the relation object to avoid passing it to frontend unnecessarily
        enriched.forEach(t => delete t.mock_questions);

        return res.status(200).json({ tests: enriched });
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

        const percentages = submissions.map(s => {
          const maxScore = (s.total_questions || 50) * 4;
          return Math.round((s.score / maxScore) * 100);
        });
        const totalAttempts = submissions.length;
        const averageScore = percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0;
        const bestScore = percentages.length ? Math.max(...percentages) : 0;

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
        let { userId, testId, email, amount = 0, paymentMethod = 'Admin Granted' } = payload;
        
        if (!userId) {
          const { data: usersData } = await supabase.auth.admin.listUsers();
          const user = usersData?.users?.find(u => u.email === email);
          if (!user) throw new Error('No student found with this email. Ask them to sign up first.');
          userId = user.id;
        }

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
        
        // Get auth users (source of truth)
        const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
        if (authErr) throw authErr;
        const authUsers = authData?.users || [];
        
        // Get extra profile details
        const { data: profileData } = await supabase.from('student_profiles').select('*').order('created_at', { ascending: false });
        const profiles = profileData || [];
        
        const profileMap = {};
        profiles.forEach(p => profileMap[p.firebase_uid] = p);
        
        let merged = authUsers.map(u => ({
           firebase_uid: u.id,
           email: u.email,
           name: profileMap[u.id]?.name || '-',
           mobile: profileMap[u.id]?.mobile || '-',
           college: profileMap[u.id]?.college || '-',
           created_at: u.created_at
        }));
        
        if (search) {
           const s = search.toLowerCase();
           merged = merged.filter(m => (m.email && m.email.toLowerCase().includes(s)) || (m.name && m.name.toLowerCase().includes(s)) || (m.mobile && m.mobile.toLowerCase().includes(s)));
        }

        return res.status(200).json({ profiles: merged });
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
        if (status === 'approved' && pr.user_email) {
          let targetUserId = userId;
          
          if (!targetUserId) {
            const { data: profile } = await supabase.from('student_profiles').select('firebase_uid').eq('email', pr.user_email).single();
            if (profile) targetUserId = profile.firebase_uid;
          }
          
          if (!targetUserId) {
            const { data: authData } = await supabase.auth.admin.listUsers();
            const user = authData?.users?.find(u => u.email === pr.user_email);
            if (user) targetUserId = user.id;
          }

          if (targetUserId) {
            await supabase.from('user_purchases').upsert([{
              user_id: targetUserId, mock_test_id: testId || -1, amount: pr.amount,
              status: 'active', payment_method: 'UPI Verified', granted_by_admin: true, email: pr.user_email
            }], { onConflict: 'user_id,mock_test_id' });
          }
        }
        return res.status(200).json({ request: pr });
      }

      case 'check-user-access': {
        const { userId, testIds } = payload;
        let query = supabase
          .from('user_purchases')
          .select('mock_test_id')
          .eq('user_id', userId)
          .eq('status', 'active');
        
        if (testIds && testIds.length > 0) {
          query = query.in('mock_test_id', testIds);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json({ access: data.map(d => d.mock_test_id) });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[exam-api] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

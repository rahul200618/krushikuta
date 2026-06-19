import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function logToFile(msg) {
  try {
    const logPath = path.join(process.cwd(), 'api-debug.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (err) {}
}

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.warn('[exam-api] WARNING: SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY) is not defined in environment variables. Falling back to ANON_KEY. Admin features and RLS bypass will fail.');
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  serviceKey || process.env.VITE_SUPABASE_ANON_KEY || ''
);

function isPlaceholderConfig() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  return !url || url.includes('placeholder-project') || url.includes('placeholder');
}

function handleMockAction(action, payload) {
  logToFile(`[MOCK] Running mock handler for action: ${action}`);
  switch (action) {
    case 'check-mobile': {
      const { mobile } = payload;
      const cleanMobile = (mobile || '').replace(/\D/g, '');
      
      if (cleanMobile === '6360749270') {
        return { exists: true, email: 'student@example.com', name: 'Karthik' };
      }
      return { exists: false, email: null, name: null };
    }
    
    case 'get-profile': {
      const { userId } = payload;
      return {
        profile: {
          firebase_uid: userId,
          name: 'Karthik',
          email: 'student@example.com',
          mobile: '6360749270',
          college: 'University of Agricultural Sciences',
          district: 'Bengaluru',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
    }
    
    case 'save-profile': {
      const { userId, profile } = payload;
      return {
        profile: {
          firebase_uid: userId,
          ...profile,
          updated_at: new Date().toISOString()
        }
      };
    }
    
    case 'list-mock-tests': {
      return {
        tests: [
          { id: 1, title: 'Agriculture Practical Mock Test 1', description: 'Practice test for agricultural practical examinations.', category: 'Practical Exam', price: 0, is_active: true, total_questions: 3 },
          { id: 2, title: 'AO/AAO General Agriculture', description: 'Comprehensive prep for Agriculture Officer exams.', category: 'AO/AAO', price: 0, is_active: true, total_questions: 3 },
          { id: 3, title: 'Premium Agriculture Test Series', description: 'Premium questions prepared by top experts.', category: 'Premium Series', price: 3000, is_active: true, total_questions: 3 }
        ]
      };
    }
    
    case 'get-mock-questions': {
      const { testId } = payload;
      return {
        questions: [
          { id: 101, mock_test_id: testId, question_text: 'Which of the following is a primary macronutrient for plants?', options: ['Nitrogen', 'Iron', 'Zinc', 'Boron'], correct_option_index: 0, marks: 4, topic: 'Agronomy' },
          { id: 102, mock_test_id: testId, question_text: 'What is the standard spacing for planting banana?', options: ['1.8m x 1.8m', '3m x 3m', '5m x 5m', '1m x 1m'], correct_option_index: 0, marks: 4, topic: 'Horticulture' },
          { id: 103, mock_test_id: testId, question_text: 'Which soil type has the highest water holding capacity?', options: ['Sandy soil', 'Clayey soil', 'Loamy soil', 'Silty soil'], correct_option_index: 1, marks: 4, topic: 'Soil Science' }
        ]
      };
    }
    
    case 'start-test': {
      return { submissionId: 999 };
    }
    
    case 'submit-test': {
      return { score: 12, totalQuestions: 3 };
    }
    
    case 'check-user-access': {
      return { access: [1, 2, -1] };
    }

    case 'get-user-performance': {
      return {
        totalAttempts: 1,
        averageScore: 100,
        bestScore: 100,
        submissions: [
          {
            id: 999,
            user_id: 'mock-user-123',
            test_id: 1,
            score: 12,
            total_questions: 3,
            is_completed: true,
            submitted_at: new Date().toISOString(),
            mock_tests: {
              title: 'Agriculture Practical Mock Test 1',
              category: 'Practical Exam'
            }
          }
        ]
      };
    }

    case 'list-user-access': {
      return {
        purchases: [
          {
            id: 1,
            user_id: 'mock-user-123',
            mock_test_id: -1,
            amount: 3000,
            status: 'active',
            payment_method: 'UPI Verified',
            email: 'student@example.com',
            purchased_at: new Date().toISOString(),
            student_profiles: {
              name: 'Karthik',
              mobile: '6360749270',
              college: 'University of Agricultural Sciences'
            }
          }
        ]
      };
    }

    case 'list-payment-requests': {
      return {
        requests: [
          {
            id: 1,
            user_email: 'student@example.com',
            utr: '301234567890',
            amount: 3000,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ]
      };
    }

    case 'list-student-profiles': {
      return {
        profiles: [
          {
            firebase_uid: 'mock-user-123',
            email: 'student@example.com',
            name: 'Karthik',
            mobile: '6360749270',
            college: 'University of Agricultural Sciences',
            created_at: new Date().toISOString()
          }
        ]
      };
    }

    case 'grant-access': {
      return {
        purchase: {
          id: Math.floor(Math.random() * 1000) + 10,
          user_id: payload.userId || 'mock-user-123',
          mock_test_id: payload.testId,
          amount: payload.amount || 0,
          status: 'active',
          payment_method: payload.paymentMethod || 'Admin Granted',
          email: payload.email,
          purchased_at: new Date().toISOString()
        }
      };
    }

    case 'revoke-access': {
      return { success: true };
    }

    case 'change-user-password': {
      return { success: true };
    }

    case 'update-payment-request': {
      return {
        request: {
          id: payload.requestId,
          status: payload.status,
          user_email: 'student@example.com',
          utr: '301234567890',
          amount: 3000,
          created_at: new Date().toISOString()
        }
      };
    }

    case 'save-mock-test': {
      const { test } = payload;
      const newTest = {
        id: test.id || Math.floor(Math.random() * 1000) + 10,
        title: test.title,
        description: test.description || '',
        category: test.category || 'General',
        price: test.price || 0,
        is_free: !!test.is_free,
        image_url: test.image_url || null,
        is_active: test.is_active !== undefined ? test.is_active : true,
        popup_message: test.popup_message || null,
        created_at: new Date().toISOString(),
        total_questions: 3
      };
      return { test: newTest };
    }

    case 'delete-mock-test': {
      return { success: true };
    }

    case 'save-mock-question': {
      const { question } = payload;
      const newQuestion = {
        id: question.id || Math.floor(Math.random() * 1000) + 1000,
        mock_test_id: question.mock_test_id,
        question_text: question.question_text,
        options: question.options,
        correct_option_index: question.correct_option_index,
        marks: question.marks || 4,
        topic: question.topic || 'General',
        image_url: question.image_url || null
      };
      return { question: newQuestion };
    }

    case 'delete-mock-question': {
      return { success: true };
    }
    
    default:
      return { error: `MOCK fallback not defined for action: ${action}` };
  }
}

export default async function handler(req, res) {
  logToFile(`API Request - Action: ${req.body?.action}`);
  logToFile(`process.env.VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL}`);
  logToFile(`process.env.SUPABASE_URL: ${process.env.SUPABASE_URL}`);
  logToFile(`serviceKey exists: ${!!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)}`);
  logToFile(`process.env.VITE_SUPABASE_ANON_KEY exists: ${!!process.env.VITE_SUPABASE_ANON_KEY}`);
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

  if (isPlaceholderConfig()) {
    const mockRes = handleMockAction(action, payload);
    if (mockRes.error) {
      return res.status(400).json({ error: mockRes.error });
    }
    return res.status(200).json(mockRes);
  }

  try {
    switch (action) {

      // ── PROFILE ──────────────────────────────────────────────
      case 'check-mobile': {
        const { mobile } = payload;
        if (!mobile) return res.status(400).json({ error: 'Mobile number is required' });
        
        const cleanMobile = mobile.replace(/\D/g, '');
        if (cleanMobile.length < 10) {
          return res.status(400).json({ error: 'Invalid mobile number. Please enter at least 10 digits.' });
        }
        
        const last10Digits = cleanMobile.slice(-10);
        
        const { data, error } = await supabase
          .from('student_profiles')
          .select('firebase_uid, email, name, mobile')
          .like('mobile', `%${last10Digits}`);
          
        if (error) throw error;
        
        const found = data && data.length > 0 ? data[0] : null;
        
        return res.status(200).json({ 
          exists: !!found, 
          email: found ? found.email : null,
          name: found ? found.name : null 
        });
      }

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
        try {
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
        } catch (err) {
          console.error('[exam-api] list-mock-tests failed:', err);
          logToFile(`list-mock-tests error: ${err.message || err}`);
          return res.status(200).json({ tests: [], error: err.message });
        }
      }

      case 'get-mock-questions': {
        try {
          const { testId } = payload;
          const { data, error } = await supabase
            .from('mock_questions')
            .select('*')
            .eq('mock_test_id', testId)
            .order('id');
          if (error) throw error;
          return res.status(200).json({ questions: data });
        } catch (err) {
          console.error('[exam-api] get-mock-questions failed:', err);
          logToFile(`get-mock-questions error: ${err.message || err}`);
          return res.status(200).json({ questions: [], error: err.message });
        }
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

        let correctCount = 0;
        let wrongCount = 0;
        for (const q of questions) {
          const selected = answers[q.id];
          if (selected !== undefined && selected !== null) {
            if (parseInt(selected) === q.correct_option_index) {
              correctCount++;
            } else {
              wrongCount++;
            }
          }
        }
        // Save score scaled by 100 to support decimal values
        const score = correctCount * 300 - wrongCount * 75;

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

        // Map over submissions and unscale the score if it is a new system score
        const enrichedSubmissions = submissions.map(s => {
          const isScaled = s.answers && s.answers._time_taken !== undefined;
          const actualScore = isScaled ? s.score / 100 : (s.score || 0);
          return {
            ...s,
            score: actualScore,
            is_scaled: isScaled
          };
        });

        const percentages = enrichedSubmissions.map(s => {
          const maxScore = (s.total_questions || 50) * (s.is_scaled ? 3 : 4);
          return maxScore > 0 ? Math.round((s.score / maxScore) * 100) : 0;
        });
        const totalAttempts = enrichedSubmissions.length;
        const averageScore = percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0;
        const bestScore = percentages.length ? Math.max(...percentages) : 0;

        return res.status(200).json({ 
          totalAttempts, 
          averageScore, 
          bestScore, 
          submissions: enrichedSubmissions 
        });
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
        try {
          let { userId, testId, email, amount = 0, paymentMethod = 'Admin Granted' } = payload;
          
          if (!userId) {
            let usersData = null;
            try {
              if (serviceKey) {
                const res = await supabase.auth.admin.listUsers();
                if (res && !res.error) usersData = res.data;
              }
            } catch (e) {
              console.warn('[exam-api] listUsers failed during grant-access:', e);
            }

            const user = usersData?.users?.find(u => u.email === email);
            if (user) {
              userId = user.id;
            } else {
              // Fallback to student_profiles
              const { data: profile } = await supabase
                .from('student_profiles')
                .select('firebase_uid')
                .eq('email', email)
                .maybeSingle();
              if (profile) {
                userId = profile.firebase_uid;
              } else {
                throw new Error('No student found with this email. Ask them to sign up first.');
              }
            }
          }

          const { data, error } = await supabase
            .from('user_purchases')
            .upsert([{ user_id: userId, mock_test_id: testId, amount, status: 'active', payment_method: paymentMethod, granted_by_admin: true, email }], { onConflict: 'user_id,mock_test_id' })
            .select();
          if (error) throw error;
          return res.status(200).json({ purchase: data?.[0] });
        } catch (err) {
          console.error('[exam-api] grant-access failed:', err);
          logToFile(`grant-access error: ${err.message || err}`);
          return res.status(500).json({ error: err.message || 'Failed to grant access' });
        }
      }

      case 'revoke-access': {
        try {
          const { userId, testId } = payload;
          const { error } = await supabase
            .from('user_purchases')
            .update({ status: 'revoked' })
            .eq('user_id', userId)
            .eq('mock_test_id', testId);
          if (error) throw error;
          return res.status(200).json({ success: true });
        } catch (err) {
          console.error('[exam-api] revoke-access failed:', err);
          logToFile(`revoke-access error: ${err.message || err}`);
          return res.status(500).json({ error: err.message || 'Failed to revoke access' });
        }
      }

      case 'list-user-access': {
        try {
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
          let profiles = [];
          if (userIds.length > 0) {
            const { data, error: profError } = await supabase
              .from('student_profiles')
              .select('firebase_uid, name, mobile, college')
              .in('firebase_uid', userIds);
            if (!profError) profiles = data || [];
          }
          
          const profileMap = {};
          profiles.forEach(p => profileMap[p.firebase_uid] = p);

          const enriched = purchases.map(p => ({
            ...p,
            student_profiles: profileMap[p.user_id] || null
          }));

          return res.status(200).json({ purchases: enriched });
        } catch (err) {
          console.error('[exam-api] list-user-access failed:', err);
          logToFile(`list-user-access error: ${err.message || err}`);
          return res.status(200).json({ purchases: [], error: err.message });
        }
      }

      case 'list-student-profiles': {
        try {
          const { search } = payload;
          
          let authUsers = [];
          let authErr = null;
          try {
            if (serviceKey) {
              const { data: authData, error: authErrObj } = await supabase.auth.admin.listUsers();
              if (authErrObj) authErr = authErrObj;
              else authUsers = authData?.users || [];
            } else {
              authErr = new Error('No SUPABASE_SERVICE_ROLE_KEY configured. Cannot list auth users.');
            }
          } catch (err) {
            authErr = err;
          }
          
          if (authErr) {
            console.warn('[exam-api] listUsers failed, falling back to student_profiles table:', authErr.message || authErr);
            logToFile(`listUsers warning: ${authErr.message || authErr}`);
          }

          // Get extra profile details
          let profiles = [];
          try {
            const { data: profileData, error: profileErr } = await supabase
              .from('student_profiles')
              .select('*')
              .order('created_at', { ascending: false });
            if (profileErr) throw profileErr;
            profiles = profileData || [];
          } catch (err) {
            console.error('[exam-api] failed to fetch student_profiles table:', err);
            logToFile(`student_profiles query error: ${err.message || err}`);
            if (!authUsers.length) {
              return res.status(200).json({ profiles: [], error: err.message || 'Failed to load profiles' });
            }
          }
          
          let merged = [];
          if (authUsers.length > 0) {
            const profileMap = {};
            profiles.forEach(p => profileMap[p.firebase_uid] = p);
            
            merged = authUsers.map(u => ({
               firebase_uid: u.id,
               email: u.email,
               name: profileMap[u.id]?.name || '-',
               mobile: profileMap[u.id]?.mobile || '-',
               college: profileMap[u.id]?.college || '-',
               district: profileMap[u.id]?.district || '-',
               category: profileMap[u.id]?.category || '',
               guardian_name: profileMap[u.id]?.guardian_name || '-',
               guardian_contact: profileMap[u.id]?.guardian_contact || '-',
               guardian_profession: profileMap[u.id]?.guardian_profession || '-',
               primary_device_id: profileMap[u.id]?.primary_device_id || null,
               created_at: u.created_at
            }));
          } else {
            // Fallback when listUsers fails: use profiles table as source of truth
            merged = profiles.map(p => ({
               firebase_uid: p.firebase_uid,
               email: p.email || '',
               name: p.name || '-',
               mobile: p.mobile || '-',
               college: p.college || '-',
               district: p.district || '-',
               category: p.category || '',
               guardian_name: p.guardian_name || '-',
               guardian_contact: p.guardian_contact || '-',
               guardian_profession: p.guardian_profession || '-',
               primary_device_id: p.primary_device_id || null,
               created_at: p.created_at
            }));
          }
          
          if (search) {
             const s = search.toLowerCase();
             merged = merged.filter(m => (m.email && m.email.toLowerCase().includes(s)) || (m.name && m.name.toLowerCase().includes(s)) || (m.mobile && m.mobile.toLowerCase().includes(s)));
          }

          return res.status(200).json({ profiles: merged });
        } catch (err) {
          console.error('[exam-api] list-student-profiles failed:', err);
          logToFile(`list-student-profiles error: ${err.message || err}`);
          return res.status(200).json({ profiles: [], error: err.message });
        }
      }

      case 'reset-student-device': {
        try {
          const { userId } = payload;
          if (!userId) return res.status(400).json({ error: 'User ID is required' });
          
          const { data, error } = await supabase
            .from('student_profiles')
            .update({ primary_device_id: null })
            .eq('firebase_uid', userId)
            .select()
            .single();
            
          if (error) throw error;
          return res.status(200).json({ success: true, profile: data });
        } catch (err) {
          console.error('[exam-api] reset-student-device failed:', err);
          logToFile(`reset-student-device error: ${err.message || err}`);
          return res.status(500).json({ error: err.message || 'Failed to reset device' });
        }
      }

      case 'change-user-password': {
        try {
          const { userId, newPassword } = payload;
          if (!userId) return res.status(400).json({ error: 'User ID is required' });
          if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
          }
          
          if (!serviceKey) {
            throw new Error('Supabase Service Role Key is not configured. Admin cannot change user password.');
          }

          const { data, error } = await supabase.auth.admin.updateUserById(userId, {
            password: newPassword
          });
          
          if (error) throw error;
          return res.status(200).json({ success: true, user: data.user });
        } catch (err) {
          console.error('[exam-api] change-user-password failed:', err);
          logToFile(`change-user-password error: ${err.message || err}`);
          return res.status(500).json({ error: err.message || 'Failed to change password' });
        }
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
        try {
          const { data, error } = await supabase
            .from('payment_requests')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          return res.status(200).json({ requests: data });
        } catch (err) {
          console.error('[exam-api] list-payment-requests failed:', err);
          logToFile(`list-payment-requests error: ${err.message || err}`);
          return res.status(200).json({ requests: [], error: err.message });
        }
      }

      case 'update-payment-request': {
        try {
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
              try {
                const { data: profile } = await supabase
                  .from('student_profiles')
                  .select('firebase_uid')
                  .eq('email', pr.user_email)
                  .maybeSingle();
                if (profile) targetUserId = profile.firebase_uid;
              } catch (e) {}
            }
            
            if (!targetUserId) {
              try {
                if (serviceKey) {
                  const { data: authData } = await supabase.auth.admin.listUsers();
                  const user = authData?.users?.find(u => u.email === pr.user_email);
                  if (user) targetUserId = user.id;
                }
              } catch (e) {}
            }

            if (targetUserId) {
              const grantTestId = testId || (Number(pr.amount) === 2799 ? -2 : -1);
              const { error: grantErr } = await supabase.from('user_purchases').upsert([{
                user_id: targetUserId, mock_test_id: grantTestId, amount: pr.amount,
                status: 'active', payment_method: 'UPI Verified', granted_by_admin: true, email: pr.user_email
              }], { onConflict: 'user_id,mock_test_id' });
              if (grantErr) throw grantErr;
            } else {
              console.warn('[exam-api] Payment approved but no user found to grant access to:', pr.user_email);
            }
          }
          return res.status(200).json({ request: pr });
        } catch (err) {
          console.error('[exam-api] update-payment-request failed:', err);
          logToFile(`update-payment-request error: ${err.message || err}`);
          return res.status(500).json({ error: err.message || 'Failed to update payment request' });
        }
      }

      case 'check-user-access': {
        try {
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
        } catch (err) {
          console.error('[exam-api] check-user-access failed:', err);
          logToFile(`check-user-access error: ${err.message || err}`);
          return res.status(200).json({ access: [], error: err.message });
        }
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[exam-api] Error:', err);
    console.error('[exam-api] Error Stack:', err.stack || err);
    logToFile(`ERROR: ${err.message || err}`);
    logToFile(`ERROR STACK: ${err.stack || ''}`);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

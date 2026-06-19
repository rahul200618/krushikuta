import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yepujdzvwiugjnymspgj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllcHVqZHp2d2l1Z2pueW1zcGdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY2Mjg0NiwiZXhwIjoyMDk0MjM4ODQ2fQ.Eul9wWTjFzCQh9noqds9VxgHs54Uuy_M957hQD6Ob5I';

const sb = createClient(supabaseUrl, serviceKey, {
  db: { schema: 'public' }
});

async function run() {
  // Check if RLS is enabled on the table
  const { data: tableInfo, error: tableErr } = await sb
    .from('payment_requests')
    .select('id')
    .limit(1);
  console.log('Service key access:', tableInfo ? 'OK' : tableErr?.message);

  // Use the Management API to run raw SQL via the pg REST endpoint
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      sql: `
        DROP POLICY IF EXISTS "Users can read own payment requests" ON payment_requests;
        CREATE POLICY "Users can read own payment requests"
          ON payment_requests
          FOR SELECT
          TO authenticated
          USING (user_email = auth.email());
      `
    })
  });

  const text = await response.text();
  console.log('exec_sql response:', response.status, text.slice(0, 200));
}

run().catch(console.error);

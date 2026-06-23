import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yepujdzvwiugjnymspgj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllcHVqZHp2d2l1Z2pueW1zcGdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY2Mjg0NiwiZXhwIjoyMDk0MjM4ODQ2fQ.Eul9wWTjFzCQh9noqds9VxgHs54Uuy_M957hQD6Ob5I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (data?.users) {
    console.log("Users:", data.users.map(u => ({ id: u.id, email: u.email })));
  }
  if (error) console.error("Error listing users:", error);
}

test();

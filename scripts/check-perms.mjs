import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yepujdzvwiugjnymspgj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllcHVqZHp2d2l1Z2pueW1zcGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI4NDYsImV4cCI6MjA5NDIzODg0Nn0.M-ibFe97prM5pQj_ty-_-tHlTBb5aL4shUbdBlIeZiQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('registrations').select('*').limit(1);
  if (error) {
    console.error("PERMISSION ERROR:", error.message);
  } else {
    console.log("TABLE ACCESSIBLE. Rows:", data.length);
  }
}

check();

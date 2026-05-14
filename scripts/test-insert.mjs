import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yepujdzvwiugjnymspgj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllcHVqZHp2d2l1Z2pueW1zcGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI4NDYsImV4cCI6MjA5NDIzODg0Nn0.M-ibFe97prM5pQj_ty-_-tHlTBb5aL4shUbdBlIeZiQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  const { data, error } = await supabase.from('registrations').insert([{
    full_name: 'Test',
    email: 'test@example.com',
    phone: '123',
    service_slug: 'test'
  }]);
  
  if (error) {
    console.error("INSERT ERROR:", error.message);
    console.error("FULL ERROR:", error);
  } else {
    console.log("INSERT SUCCESS");
  }
}

testInsert();

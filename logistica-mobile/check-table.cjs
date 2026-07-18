const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('reportes').select('id').limit(1);
  if (error) {
    console.log("ERROR or NOT EXISTS", error);
  } else {
    console.log("EXISTS", data);
  }
}
check();

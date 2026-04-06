import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: guests } = await supabase.from('guests').select().limit(1);
  const { data: bookings } = await supabase.from('bookings').select().limit(1);
  console.log("GUESTS COLUMNS:", guests ? Object.keys(guests[0] || {}) : "No records");
  console.log("BOOKINGS COLUMNS:", bookings ? Object.keys(bookings[0] || {}) : "No records");
}
run();

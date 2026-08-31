import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fqpgfnowhpgninqlnsgv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxcGdmbm93aHBnbmlucWxuc2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODExMDMsImV4cCI6MjEwMzc1NzEwM30.3CW128lDUXhNUohEnhjQq1UcNfRtk9xh72cFaZh8bqE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

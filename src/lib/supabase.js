import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ybnsgusvnlubdqomtiss.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnNndXN2bmx1YmRxb210aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODkyMjQsImV4cCI6MjA5MDQ2NTIyNH0.S8tuXuhGCP70KKWmTnXXXnNO01zGSMs4yV4D14fJiyY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

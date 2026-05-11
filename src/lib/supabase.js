import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mdcqdigxbmfajlmaxrta.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY3FkaWd4Ym1mYWpsbWF4cnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMDAxMjIsImV4cCI6MjA5Mzc3NjEyMn0.3zadgyNaG4HvtqSa1Ohzmf3BqzKhFzRvjHWQl2V6oOM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

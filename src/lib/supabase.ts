import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://bfszysdzxttrwbbeuqoh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmc3p5c2R6eHR0cndiYmV1cW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTE2NzgsImV4cCI6MjA5NDI4NzY3OH0.F8fzijnZtHJH3DhebJKbdgM4_s4AaYsxLHcqV4UD8zM'
)

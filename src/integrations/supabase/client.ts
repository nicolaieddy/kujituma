
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL = "https://yyidkpmrqvgvzbjvtnjy.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aWRrcG1ycXZndnpianZ0bmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzAyNzUsImV4cCI6MjA2NjYwNjI3NX0.y3aZEjl9q6fER8lmRsL4bKWM3bBH0mxYTKHlmSqcU5g"

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
})

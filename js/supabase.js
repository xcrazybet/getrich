// Supabase Configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://vhahsqxbkuoumvsjotue.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYWhzcXhia3VvdW12c2pvdHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MjI0ODcsImV4cCI6MjA4MjA5ODQ4N30.SJwMFGtQRb_1YDf8Jy8gHJIomH8n8mx5jBPVPklNcW8'

export const supabase = createClient(supabaseUrl, supabaseKey)

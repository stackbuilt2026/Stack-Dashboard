// Your Supabase connection info. The URL is already filled in from your
// project. The anon key is NOT secret — Supabase is designed for this key
// to be public in a website's code; the database's Row Level Security
// rules (set up by supabase-setup.sql) are what actually keep your data
// safe, not hiding this key.
//
// To find your anon key: Supabase dashboard -> your project -> Settings
// (gear icon, bottom left) -> API -> "Project API keys" -> copy the one
// labeled "anon" / "public" (NOT the "service_role" one — never put that
// one here or anywhere in this website's files).
window.STACK_DASHBOARD_CONFIG = {
  supabaseUrl: "https://cmmncfcelwsiqbgnuvnh.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbW5jZmNlbHdzaXFiZ251dm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODA1MTAsImV4cCI6MjEwMjY1NjUxMH0.2r_HEa-iH_58t7Cyssw3dfafXdvykn9rUXHnaGc_uLs",
};

const SUPABASE_URL = "https://qxzngpkelycroxabvrma.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4em5ncGtlbHljcm94YWJ2cm1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNDk1MzYsImV4cCI6MjA5ODgyNTUzNn0.BiU5VtTzLeKnUvfX_WgCStNhiVInSkklhxQjeCmtjFw";

const db = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
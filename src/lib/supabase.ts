import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use sessionStorage to ensure each tab is completely independent.
// When session storage is used, logging in in Tab A doesn't affect Tab B.
const storage = typeof window !== "undefined" ? window.sessionStorage : undefined;

// Create separate clients for Worker and Provider to have independent sessions within the same tab if needed,
// though sessionStorage handles the cross-tab independence.
export const workerSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-worker-token',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: storage
  }
});

export const providerSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-provider-token',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: storage
  }
});

export const getSupabase = (): SupabaseClient => {
  if (typeof window === "undefined") return workerSupabase;

  const path = window.location.pathname;
  if (path.startsWith("/provider")) {
    sessionStorage.setItem("last_portal_context", "provider");
    return providerSupabase;
  }
  if (path.startsWith("/worker")) {
    sessionStorage.setItem("last_portal_context", "worker");
    return workerSupabase;
  }

  // If we're on a neutral path, check if we have a preferred portal context
  const lastPortal = sessionStorage.getItem("last_portal_context");
  if (lastPortal === "provider") {
    return providerSupabase;
  }

  return workerSupabase;
};

// For convenience - proxies requests to the appropriate client
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    return (client as any)[prop];
  },
});

export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;
let initializationAttempted = false;

export function getSupabaseClient() {
  // If we have a valid instance, return it
  if (supabaseInstance) {
    console.log('🔄 [Supabase] Returning existing instance');
    return supabaseInstance;
  }

  // Check environment variables
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  // Only log on first attempt or when credentials change
  if (!initializationAttempted) {
    console.log('🔍 [Supabase] Creating new client...');
    console.log('🔍 [Supabase] URL:', SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'NOT SET');
    console.log('🔍 [Supabase] Service Role:', SUPABASE_SERVICE_ROLE ? `${SUPABASE_SERVICE_ROLE.substring(0, 20)}...` : 'NOT SET');
    initializationAttempted = true;
  }

  // If credentials are missing, return null but allow retry
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.warn('⚠️ Supabase credentials not configured. Database features will be disabled.');
    return null;
  }

  // Create the client
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { 
    auth: { 
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    }
  });

  console.log('✅ [Supabase] Client created successfully');

  // Test connection asynchronously (non-blocking, with error handling)
  supabaseInstance.from('institutions').select('id').limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ [Supabase] Connection test failed:', error.message);
      } else {
        console.log('✅ [Supabase] Connection test successful');
      }
    })
    .catch(err => {
      console.error('❌ [Supabase] Connection test error:', err.message || err);
    });

  return supabaseInstance;
}

/**
 * Check database connectivity and return detailed status
 */
export async function checkDbConnection() {
  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      error: 'Supabase client not initialized',
      rows: 0
    };
  }

  try {
    const { data, error } = await client
      .from('institutions')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ [checkDbConnection] Query error:', error);
      return {
        connected: false,
        error: error.message,
        rows: 0
      };
    }
    
    console.log('✅ [checkDbConnection] Success, rows:', data?.length ?? 0);
    return {
      connected: true,
      rows: data?.length ?? 0
    };
  } catch (e: any) {
    console.error('❌ [checkDbConnection] Exception:', e);
    return {
      connected: false,
      error: e.message,
      rows: 0
    };
  }
}

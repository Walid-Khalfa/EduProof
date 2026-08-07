import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger";

let supabaseInstance: SupabaseClient | null = null;
let initializationAttempted = false;

export function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (!initializationAttempted) {
    initializationAttempted = true;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    logger.warn('Supabase credentials not configured. Database features will be disabled.');
    return null;
  }

  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public'
    },
  });

  logger.info('Supabase client created successfully');

  (async () => {
    try {
      const { data, error } = await supabaseInstance.from('institutions').select('id').limit(1);
      if (error) {
        logger.error('Supabase connection test failed', { error: error.message });
      } else {
        logger.info('Supabase connection test successful', { rows: data?.length ?? 0 });
      }
    } catch (err: any) {
      logger.error('Supabase connection test error', { error: err.message });
    }
  })();

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
      logger.error('checkDbConnection query error', { error });
      return {
        connected: false,
        error: error.message,
        rows: 0
      };
    }

    logger.info('checkDbConnection success', { rows: data?.length ?? 0 });
    return {
      connected: true,
      rows: data?.length ?? 0
    };
  } catch (e: any) {
    logger.error('checkDbConnection exception', { error: e.message });
    return {
      connected: false,
      error: e.message,
      rows: 0
    };
  }
}

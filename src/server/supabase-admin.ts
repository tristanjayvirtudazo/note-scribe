import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the service-role key. It bypasses row level security and storage
 * policies, so it is used only for narrowly scoped server work (issuing upload targets,
 * deleting stored files, administrative clean-up). Never expose it to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (see .env.example).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

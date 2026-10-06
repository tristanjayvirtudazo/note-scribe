import { STORAGE_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

/**
 * Sends a file from the browser to a storage location the server has pre-approved.
 * The bytes go straight to storage so large files do not pass through the app server.
 */
export async function uploadToTarget(target: { path: string; token: string }, file: File): Promise<boolean> {
  const { error } = await createClient()
    .storage.from(STORAGE_BUCKET)
    .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type });
  if (error) console.error("Upload failed", error);
  return !error;
}

import "server-only";
import { STORAGE_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/server/errors";
import { createAdminClient } from "@/server/supabase-admin";

// Gateway to the private Supabase Storage bucket holding uploaded source files.
// Reads run with the signed-in user's session, so the bucket's per-user read policy applies.
// Writes (upload targets, deletion, listing) use the service role: users have no write policy,
// so the only way bytes get into the bucket is through a target this server issued.

async function userBucket() {
  const supabase = await createClient();
  return supabase.storage.from(STORAGE_BUCKET);
}

function adminBucket() {
  return createAdminClient().storage.from(STORAGE_BUCKET);
}

export interface UploadTarget {
  path: string;
  token: string;
}

export interface StoredObject {
  name: string;
  size: number | null;
  mimeType: string | null;
  createdAt: Date | null;
}

function toStoredObject(object: { name: string; created_at?: string | null; metadata?: Record<string, unknown> | null }): StoredObject {
  const size: unknown = object.metadata?.size;
  const mimeType: unknown = object.metadata?.mimetype;
  return {
    name: object.name,
    size: typeof size === "number" ? size : null,
    mimeType: typeof mimeType === "string" ? mimeType : null,
    createdAt: object.created_at ? new Date(object.created_at) : null,
  };
}

export const noteFileStorage = {
  /** One-time permission for the browser to upload a single file to exactly this path. */
  async createUploadTarget(path: string): Promise<UploadTarget> {
    const { data, error } = await adminBucket().createSignedUploadUrl(path);
    if (error || !data) {
      console.error("Could not create upload target", error);
      throw new AppError("We could not prepare the upload. Please try again.");
    }
    return { path: data.path, token: data.token };
  },

  async listFolder(folder: string): Promise<StoredObject[]> {
    const { data, error } = await adminBucket().list(folder, { limit: 1000 });
    if (error || !data) {
      console.error("Could not list stored files", error);
      throw new AppError("We could not check the uploaded files. Please try again.");
    }
    return data.map(toStoredObject);
  },

  async download(path: string): Promise<Blob | null> {
    const { data, error } = await (await userBucket()).download(path);
    return error ? null : data;
  },

  /** Best effort: a file left behind is harmless and still private to its owner. */
  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await adminBucket().remove(paths);
    if (error) console.error("Could not remove stored files", paths, error);
  },

  /** Deletes every object under the user's top-level folder (used when an account is deleted). */
  async removeUserFolder(userId: string): Promise<void> {
    const bucket = adminBucket();
    const uploads = await this.listFolder(userId);
    const paths: string[] = [];
    for (const upload of uploads) {
      const folder = `${userId}/${upload.name}`;
      const objects = await this.listFolder(folder);
      paths.push(...objects.map((object) => `${folder}/${object.name}`));
    }
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await bucket.remove(paths.slice(index, index + 100));
      if (error) {
        console.error("Could not remove a user's stored files", error);
        throw new AppError("We could not remove your files. Please try again.");
      }
    }
  },

  async createViewUrl(path: string, expiresInSeconds: number): Promise<string | null> {
    const { data, error } = await (await userBucket()).createSignedUrl(path, expiresInSeconds);
    return error || !data ? null : data.signedUrl;
  },
};

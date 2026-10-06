/**
 * Removes stored files that no note refers to (abandoned uploads), once they are older than
 * a day. Run on a schedule: pnpm storage:cleanup
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local", quiet: true });

const BUCKET = "note-files";
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  if (!url || !key || !databaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL must be set.");

  const storage = createClient(url, key, { auth: { persistSession: false } }).storage.from(BUCKET);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const known = new Set((await prisma.noteFile.findMany({ select: { path: true } })).map((file) => file.path));
    const cutoff = Date.now() - MIN_AGE_MS;
    const orphans: string[] = [];

    const list = async (prefix: string) => {
      const { data, error } = await storage.list(prefix, { limit: 1000 });
      if (error) throw error;
      return data ?? [];
    };
    for (const userFolder of await list("")) {
      for (const uploadFolder of await list(userFolder.name)) {
        const folder = `${userFolder.name}/${uploadFolder.name}`;
        for (const object of await list(folder)) {
          const path = `${folder}/${object.name}`;
          const createdAt = object.created_at ? new Date(object.created_at).getTime() : 0;
          if (!known.has(path) && createdAt < cutoff) orphans.push(path);
        }
      }
    }

    console.log(`${known.size} files in use, ${orphans.length} orphaned files to remove.`);
    for (let index = 0; index < orphans.length; index += 100) {
      const { error } = await storage.remove(orphans.slice(index, index + 100));
      if (error) throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

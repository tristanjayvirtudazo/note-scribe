#!/bin/sh
# Build step for Vercel (see vercel.json "buildCommand").
#
# On production builds, apply pending database migrations and the Supabase Storage setup
# before building, so the schema is in place when the new code goes live. If a migration
# fails the build fails and the previous deployment stays live.
#
# Preview builds skip this step: they usually share the production environment variables,
# and a feature branch must never migrate the production database. To migrate a separate
# preview database, set DIRECT_URL for the Preview environment and add "preview" below.
#
# DIRECT_URL must be the Supabase *session pooler* address (port 5432 on
# aws-0-<region>.pooler.supabase.com). The direct host (db.<ref>.supabase.co) is IPv6-only
# and unreachable from Vercel's build containers.
set -eu

case "${VERCEL_ENV:-}" in
  production)
    echo "[vercel-build] VERCEL_ENV=production: applying migrations and storage setup"
    pnpm db:migrate
    pnpm db:storage
    ;;
  *)
    echo "[vercel-build] VERCEL_ENV=${VERCEL_ENV:-unset}: skipping migrations"
    ;;
esac

pnpm build

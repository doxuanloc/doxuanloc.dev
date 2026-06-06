#!/usr/bin/env bash
# deploy.sh — gen daily content + build + commit + push → Vercel auto-deploys
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DATE=$(date -u +%F)
SSH_KEY="$HOME/.ssh/id_rsa_doxuanloc"

log() { printf '\033[36m%s\033[0m %s\n' "$(date -u +%T)" "$*"; }
die() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# ── 1. Gen today's content ───────────────────────────────
if [ -f "content/news/$DATE.json" ] && [ -f "content/blog/$DATE.json" ]; then
  log "Content for $DATE already exists — skipping gen"
else
  log "Generating content (Grok)…"
  node scripts/gen-today.mjs || die "gen-today failed"
fi

# ── 2. Validate ──────────────────────────────────────────
log "Validating content…"
node scripts/validate-content.mjs || die "validate-content failed"

# ── 3. Build ─────────────────────────────────────────────
log "Building…"
npm run build 2>&1 | tail -6

# ── 4. Commit changed content ────────────────────────────
log "Staging content…"
git add content/ 2>/dev/null || true

if ! git diff --cached --quiet; then
  git commit -m "content: daily $DATE [auto]"
  log "Committed content"
else
  log "No content changes to commit"
fi

# ── 5. Push → triggers Vercel auto-deploy ────────────────
log "Pushing to origin/main…"
GIT_SSH_COMMAND="ssh -i $SSH_KEY" git push origin main

log "✅  Done — Vercel will deploy from the new commit."
log "    Check: https://vercel.com/dashboard"

#!/usr/bin/env bash
set -euo pipefail

app=${1:?application directory required}
revision=${2:?tested commit SHA required}
build=${3:?build artifact directory required}

fail() { printf 'Deploy stopped: %s\n' "$*" >&2; exit 1; }

[[ $(id -u) != 0 ]] || fail 'use a non-root deploy user'
[[ "$app" =~ ^/var/www/[a-zA-Z0-9_-]+$ ]] || fail 'invalid application directory'
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || fail 'invalid commit SHA'
[[ -s "$build/manifest.json" && -d "$build/assets" ]] || fail 'missing build manifest or assets'
cd -- "$app"
[[ -f .env && -f artisan ]] || fail 'the application must already be provisioned'
[[ ! -e public/hot ]] || fail 'public/hot is present; remove it before production deployment'

exec 9>"$(git rev-parse --git-path tokuup-deploy.lock)"
flock -n 9 || fail 'another deploy is already running'
[[ $(git branch --show-current) == main ]] || fail 'the server must be checked out on main'
[[ -z $(git status --porcelain --untracked-files=no) ]] || fail 'the server has tracked changes'
git fetch --no-tags origin refs/heads/main
[[ $(git rev-parse FETCH_HEAD) == "$revision" ]] || fail 'main moved; run the workflow again for the latest commit'
git merge-base --is-ancestor HEAD "$revision" || fail 'the target is not a fast-forward'
git diff --quiet HEAD "$revision" -- database/migrations || fail 'migration changes require a manual release'
php artisan migrate:status --pending=2 --no-ansi || fail 'resolve pending migrations before deploying'

mkdir -p public/build/assets
manifest=$(mktemp public/build/.manifest.XXXXXXXX)
maintenance=0
cleanup() {
    local result=$?
    rm -f -- "$manifest"
    if (( result != 0 && maintenance == 1 )); then
        printf '%s\n' 'Deploy failed during maintenance. Inspect the error and restore service before running artisan up.' >&2
    fi
    return "$result"
}
trap cleanup EXIT

# Hashed assets can be copied before switching the manifest.
cp -a "$build/assets/." public/build/assets/
install -m 0644 -- "$build/manifest.json" "$manifest"
php artisan down --retry=30
maintenance=1
git merge --ff-only "$revision"
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction --no-progress
php artisan optimize
mv -f -- "$manifest" public/build/manifest.json
php artisan queue:restart
php artisan up
maintenance=0
printf 'Deployed commit %s\n' "$(git rev-parse HEAD)"

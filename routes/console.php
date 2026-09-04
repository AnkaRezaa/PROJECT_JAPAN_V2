<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('subscriptions:expire')->dailyAt('00:10');
Schedule::command('presentations:cleanup-imports --days=14')->dailyAt('00:30');
Schedule::command('logs:prune --days=90')->dailyAt('00:45');
Schedule::command('payments:reconcile-pending --hours=48')->everyTenMinutes()->withoutOverlapping();
Schedule::command('news:publish-scheduled')->everyMinute()->withoutOverlapping();
Schedule::command('auth:clear-resets')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('live-classes:cleanup-snapshots --days=30')->dailyAt('01:00')->withoutOverlapping();
Schedule::command('accounts:anonymize-suspended')->dailyAt('01:15')->withoutOverlapping();
Schedule::command('reviews:prune --days=30 --limit=100 --chunk=1000')->dailyAt('01:30')->withoutOverlapping();

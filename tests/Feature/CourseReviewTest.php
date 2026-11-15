<?php

use App\Models\HariModul;
use App\Models\Langganan;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ProgresHariModul;
use App\Models\UlasanKelas;
use App\Services\UlasanKelasService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function createCourseReviewFixture(bool $access = true, bool $learned = true): array
{
    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'N3'], ['stage' => 3, 'is_premium' => false]);
    $program = ProgramPembelajaran::create(['title' => 'Kelas Ulasan', 'slug' => 'kelas-ulasan-'.Str::uuid(), 'level_id' => $level->id, 'status' => 'published']);
    $module = Modul::create(['title' => 'Week ulasan', 'program_pembelajaran_id' => $program->id, 'level_id' => $level->id, 'week_number' => 1, 'status' => 'published']);
    $day = HariModul::create(['module_id' => $module->id, 'day_number' => 1, 'title' => 'Hari pertama', 'status' => 'published']);
    $user = Pengguna::factory()->create(['role' => 'user']);
    $plan = PaketPembayaran::create(['name' => 'Paket ulasan', 'slug' => 'plan-'.Str::uuid(), 'scope_type' => 'program', 'program_pembelajaran_id' => $program->id, 'price' => 10000, 'duration_days' => 30]);
    $subscription = $access ? Langganan::create(['user_id' => $user->id, 'payment_plan_id' => $plan->id, 'scope_type' => 'program', 'program_pembelajaran_id' => $program->id, 'status' => 'active', 'start_date' => today(), 'end_date' => today()->addDays(30)]) : null;
    if ($learned) {
        ProgresHariModul::create(['user_id' => $user->id, 'module_day_id' => $day->id, 'completed_at' => now()]);
    }

    return compact('program', 'module', 'day', 'user', 'subscription');
}

it('exposes the same public rating on all marketing pages without leaking review content', function () {
    $f = createCourseReviewFixture();
    foreach ([5, 4, 4] as $rating) {
        $review = new UlasanKelas;
        $review->forceFill(['user_id' => Pengguna::factory()->create()->id, 'program_pembelajaran_id' => $f['program']->id, 'rating' => $rating, 'comment' => 'Private to the review page', 'status' => 'published'])->save();
    }
    $hidden = new UlasanKelas;
    $hidden->forceFill(['user_id' => Pengguna::factory()->create()->id, 'program_pembelajaran_id' => $f['program']->id, 'rating' => 1, 'status' => 'hidden'])->save();
    $deleted = new UlasanKelas;
    $deleted->forceFill(['user_id' => Pengguna::factory()->create()->id, 'program_pembelajaran_id' => $f['program']->id, 'rating' => 1, 'status' => 'published'])->save();
    $deleted->delete();

    foreach (['home', 'pricing', 'katalog'] as $route) {
        $this->get(route($route))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('programs', fn ($items) => collect($items)->firstWhere('id', $f['program']->id)['review_summary'] === [
                'count' => 3, 'average' => 4.3, 'url' => route('public.classes.reviews', $f['program']->slug),
            ])
            ->missing('programs.0.reviews'));
    }
    $this->get(route('public.classes.show', $f['program']->slug))->assertInertia(fn (Assert $page) => $page
        ->where('program.review_summary.count', 3)->where('program.review_summary.average', 4.3));
    $this->get(route('public.classes.reviews', $f['program']->slug))->assertInertia(fn (Assert $page) => $page
        ->where('summary.count', 3)->where('summary.average', 4.3));
    $hidden->forceFill(['status' => 'published'])->save();
    $this->get(route('public.classes.show', $f['program']->slug))->assertInertia(fn (Assert $page) => $page
        ->where('program.review_summary.count', 4)->where('program.review_summary.average', 3.5));
});

it('keeps rating aggregates isolated per class with bounded query counts', function () {
    $f = createCourseReviewFixture();
    $this->get(route('public.classes.show', $f['program']->slug))->assertInertia(fn (Assert $page) => $page
        ->where('program.review_summary.count', 0)->where('program.review_summary.average', null));

    $queries = [];
    DB::listen(function ($query) use (&$queries) {
        if (str_contains($query->sql, 'course_reviews')) $queries[] = $query->sql;
    });
    $queries = [];
    $this->get(route('pricing'))->assertOk();
    $baseline = count($queries);
    foreach (range(1, 4) as $i) {
        $other = ProgramPembelajaran::create(['title' => 'Other '.$i, 'slug' => 'other-'.$i, 'status' => 'published']);
        $review = new UlasanKelas;
        $review->forceFill(['user_id' => $f['user']->id, 'program_pembelajaran_id' => $other->id, 'rating' => 5, 'status' => 'published'])->save();
    }
    $queries = [];
    $this->get(route('pricing'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('programs', fn ($items) => collect($items)->firstWhere('id', $f['program']->id)['review_summary']['count'] === 0
            && (float) collect($items)->firstWhere('slug', 'other-1')['review_summary']['average'] === 5.0));
    expect(count($queries))->toBe($baseline)->and($baseline)->toBeGreaterThan(0);
});

it('allows public course reviews but keeps unpublished classes and write routes protected', function () {
    $f = createCourseReviewFixture();
    $this->get(route('public.classes.reviews', $f['program']->slug))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('Kelas/Ulasan')->where('summary.count', 0)->where('summary.average', null)->where('canReview', false)->where('learningContext', false));
    $this->put(route('user.kelas.reviews.update', $f['program']->slug), ['rating' => 5])->assertRedirect(route('login'));
    foreach (['admin', 'superadmin'] as $role) {
        $this->actingAs(Pengguna::factory()->create(['role' => $role]))->put(route('user.kelas.reviews.update', $f['program']->slug), ['rating' => 5])->assertForbidden();
    }
    $f['program']->update(['status' => 'draft']);
    $this->get(route('public.classes.reviews', $f['program']->slug))->assertNotFound();
    $this->actingAs($f['user'])->put(route('user.kelas.reviews.update', $f['program']->slug), ['rating' => 5])->assertNotFound();
});

it('requires current full class access and a completed day in the same class', function () {
    $f = createCourseReviewFixture(true, false);
    $url = route('user.kelas.reviews.update', $f['program']->slug);
    $this->actingAs($f['user'])->put($url, ['rating' => 5])->assertForbidden();
    $other = createCourseReviewFixture();
    ProgresHariModul::create(['user_id' => $f['user']->id, 'module_day_id' => $other['day']->id, 'completed_at' => now()]);
    $this->put($url, ['rating' => 5])->assertForbidden();
    ProgresHariModul::create(['user_id' => $f['user']->id, 'module_day_id' => $f['day']->id, 'completed_at' => now()]);
    $this->put($url, ['rating' => 5])->assertSessionHasNoErrors();
    $preview = createCourseReviewFixture(false, true);
    $this->actingAs($preview['user'])->put(route('user.kelas.reviews.update', $preview['program']->slug), ['rating' => 5])->assertForbidden();
    expect(UlasanKelas::count())->toBe(1);
});

it('upserts only the authenticated authors review and never changes learning rewards', function () {
    $f = createCourseReviewFixture();
    $url = route('user.kelas.reviews.update', $f['program']->slug);
    $xp = $f['user']->fresh()->xp;
    $this->actingAs($f['user'])->put($url, ['rating' => 4, 'comment' => '<script>alert(1)</script>', 'user_id' => 999, 'status' => 'hidden'])->assertSessionHasNoErrors();
    $review = UlasanKelas::firstOrFail();
    expect($review->user_id)->toBe($f['user']->id)->and($review->status)->toBe('published')->and($review->comment)->toBe('<script>alert(1)</script>');
    $this->put($url, ['rating' => 2, 'comment' => null])->assertSessionHasNoErrors();
    expect(UlasanKelas::count())->toBe(1)->and($review->fresh()->rating)->toBe(2)->and($review->fresh()->comment)->toBeNull()
        ->and($f['user']->fresh()->xp)->toBe($xp);
    $this->get(route('user.kelas.reviews.index', $f['program']->slug))->assertInertia(fn (Assert $page) => $page
        ->where('canReview', true)->where('learningContext', true)->where('ownReview.rating', 2)->missing('reviews.data.0.email')->missing('reviews.data.0.user_id'));
});

it('validates rating and comment and limits review writes', function () {
    $f = createCourseReviewFixture();
    $url = route('user.kelas.reviews.update', $f['program']->slug);
    $this->actingAs($f['user']);
    foreach ([0, 6, 'bad'] as $rating) {
        $this->putJson($url, ['rating' => $rating])->assertUnprocessable()->assertJsonValidationErrors('rating');
    }
    $this->putJson($url, ['rating' => 4, 'comment' => str_repeat('a', 1001)])->assertUnprocessable()->assertJsonValidationErrors('comment');
    for ($i = 0; $i < 6; $i++) {
        $this->put($url, ['rating' => 5])->assertSessionHasNoErrors();
    }
    $this->putJson($url, ['rating' => 4])->assertStatus(429);
    expect(UlasanKelas::count())->toBe(1);
});

it('enforces database uniqueness and rechecks the locked account before saving', function () {
    $f = createCourseReviewFixture();
    $service = app(UlasanKelasService::class);
    $service->save($f['user'], $f['program'], ['rating' => 4]);
    $review = UlasanKelas::firstOrFail();
    expect(fn () => $review->replicate()->save())->toThrow(\Illuminate\Database\QueryException::class);
    DB::table('users')->where('id', $f['user']->id)->update(['status' => 'suspended']);
    expect(fn () => $service->save($f['user'], $f['program'], ['rating' => 1]))
        ->toThrow(\Symfony\Component\HttpKernel\Exception\HttpException::class);
    expect(UlasanKelas::count())->toBe(1)->and($review->fresh()->rating)->toBe(4);
});

it('keeps expired reviews visible and permits only their author to remove them', function () {
    $f = createCourseReviewFixture();
    $this->actingAs($f['user'])->put(route('user.kelas.reviews.update', $f['program']->slug), ['rating' => 5])->assertSessionHasNoErrors();
    $review = UlasanKelas::firstOrFail();
    $other = Pengguna::factory()->create(['role' => 'user']);
    $this->actingAs($other)->delete(route('user.kelas.reviews.destroy', $f['program']->slug), ['review_id' => $review->id])->assertSessionHasNoErrors();
    expect($review->fresh())->not->toBeNull();
    $f['subscription']->update(['end_date' => today()->subDay()]);
    $this->actingAs($f['user'])->put(route('user.kelas.reviews.update', $f['program']->slug), ['rating' => 3])->assertForbidden();
    $this->get(route('public.classes.reviews', $f['program']->slug))->assertInertia(fn (Assert $page) => $page->where('summary.count', 1)->where('canReview', false));
    $this->delete(route('user.kelas.reviews.destroy', $f['program']->slug))->assertSessionHasNoErrors();
    expect(UlasanKelas::count())->toBe(0);
});

it('allows only superadmin moderation and keeps hidden edits hidden from public totals', function () {
    $f = createCourseReviewFixture();
    $this->actingAs($f['user'])->put(route('user.kelas.reviews.update', $f['program']->slug), ['rating' => 5, 'comment' => 'Ulasan siswa'])->assertSessionHasNoErrors();
    $review = UlasanKelas::firstOrFail();
    $url = route('superadmin.course-reviews.update', $review);
    foreach ([['role' => 'user'], ['role' => 'admin', 'admin_scope' => 'global'], ['role' => 'admin', 'admin_scope' => 'kloter']] as $role) {
        $this->actingAs(Pengguna::factory()->create($role))->patch($url, ['status' => 'hidden', 'reason' => 'Alasan internal'])->assertForbidden();
    }
    $root = Pengguna::factory()->create(['role' => 'superadmin']);
    $this->actingAs($root)->patchJson($url, ['status' => 'hidden'])->assertUnprocessable()->assertJsonValidationErrors('reason');
    $this->patch($url, ['status' => 'hidden', 'reason' => 'Alasan internal', 'rating' => 1])->assertSessionHasNoErrors();
    expect($review->fresh()->rating)->toBe(5)->and($review->fresh()->moderated_by)->toBe($root->id);
    $this->get(route('superadmin.course-reviews.index'))->assertInertia(fn (Assert $page) => $page->where('reviews.data.0.status', 'hidden'));
    $this->actingAs($f['user'])->get(route('public.classes.reviews', $f['program']->slug))->assertInertia(fn (Assert $page) => $page
        ->where('summary.count', 0)->has('reviews.data', 0)->where('ownReview.status', 'hidden')->missing('ownReview.moderation_reason'));
    $this->put(route('user.kelas.reviews.update', $f['program']->slug), ['rating' => 3, 'comment' => 'Diperbarui'])->assertSessionHasNoErrors();
    expect($review->fresh()->status)->toBe('hidden');
    $this->actingAs($root)->patch($url, ['status' => 'published', 'reason' => 'Pulihkan'])->assertSessionHasNoErrors();
    $this->get(route('public.classes.reviews', $f['program']->slug))->assertInertia(fn (Assert $page) => $page->where('summary.count', 1)->where('summary.average', 3));
    $this->assertDatabaseHas('activity_logs', ['action' => 'moderate_course_review', 'actor_id' => $root->id]);
});

it('aggregates all visible reviews independently from filtering and paginates with bounded queries', function () {
    $f = createCourseReviewFixture();
    for ($i = 1; $i <= 12; $i++) {
        $review = new UlasanKelas;
        $review->forceFill(['user_id' => Pengguna::factory()->create()->id, 'program_pembelajaran_id' => $f['program']->id, 'rating' => $i <= 6 ? 5 : 1, 'status' => 'published'])->save();
    }
    $this->get(route('public.classes.reviews', ['program' => $f['program']->slug, 'rating' => 5, 'sort' => 'highest']))->assertInertia(fn (Assert $page) => $page
        ->where('summary.count', 12)->where('summary.average', 3)->where('reviews.total', 6)->where('reviews.data.0.rating', 5));
    $service = app(UlasanKelasService::class);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $data = $service->pageData(Request::create('/'), $f['program']);
    $count = count(DB::getQueryLog());
    DB::disableQueryLog();
    expect($data['reviews']->count())->toBe(10)->and($count)->toBeLessThanOrEqual(4);
    $this->get(route('public.classes.reviews', ['program' => $f['program']->slug, 'page' => 2]))->assertInertia(fn (Assert $page) => $page->has('reviews.data', 2));
});

it('retains moderation after deletion and resubmission without retaining deleted review content', function () {
    $f = createCourseReviewFixture();
    $writeUrl = route('user.kelas.reviews.update', $f['program']->slug);
    $deleteUrl = route('user.kelas.reviews.destroy', $f['program']->slug);
    $readUrl = route('public.classes.reviews', $f['program']->slug);
    $this->actingAs($f['user'])->put($writeUrl, ['rating' => 1, 'comment' => 'Konten lama'])->assertSessionHasNoErrors();
    $review = UlasanKelas::firstOrFail();
    $root = Pengguna::factory()->create(['role' => 'superadmin']);
    $moderateUrl = route('superadmin.course-reviews.update', $review);
    $this->actingAs($root)->patch($moderateUrl, ['status' => 'hidden', 'reason' => 'Keputusan moderasi'])->assertSessionHasNoErrors();
    $moderatedAt = $review->fresh()->moderated_at->toIso8601String();
    for ($i = 0; $i < 2; $i++) {
        $this->actingAs($f['user'])->delete($deleteUrl)->assertSessionHasNoErrors();
        $this->delete($deleteUrl)->assertSessionHasNoErrors();
        expect(UlasanKelas::count())->toBe(0);
        $withdrawn = UlasanKelas::withTrashed()->findOrFail($review->id);
        expect($withdrawn->trashed())->toBeTrue()->and($withdrawn->rating)->toBeNull()->and($withdrawn->comment)->toBeNull()
            ->and($withdrawn->status)->toBe('hidden')->and($withdrawn->moderated_by)->toBe($root->id)
            ->and($withdrawn->moderation_reason)->toBe('Keputusan moderasi')
            ->and($withdrawn->moderated_at->toIso8601String())->toBe($moderatedAt);
        $this->get($readUrl)->assertInertia(fn (Assert $page) => $page->where('ownReview', null)->where('summary.count', 0)->has('reviews.data', 0));
        $this->put($writeUrl, ['rating' => 3, 'comment' => 'Konten baru', 'status' => 'published', 'deleted_at' => null])->assertSessionHasNoErrors();
        expect(UlasanKelas::withTrashed()->count())->toBe(1)->and($review->fresh()->status)->toBe('hidden')->and($review->fresh()->comment)->toBe('Konten baru');
        $this->get($readUrl)->assertInertia(fn (Assert $page) => $page->where('ownReview.status', 'hidden')->where('summary.count', 0)->has('reviews.data', 0));
    }
    $this->actingAs($root)->patch($moderateUrl, ['status' => 'published', 'reason' => 'Pulihkan konten baru'])->assertSessionHasNoErrors();
    $this->get($readUrl)->assertInertia(fn (Assert $page) => $page->where('summary.count', 1)->where('summary.average', 3)->where('reviews.data.0.comment', 'Konten baru'));
});

it('keeps normal resubmissions published but denies expired resubmissions and hides withdrawn rows from moderation', function () {
    $f = createCourseReviewFixture();
    $writeUrl = route('user.kelas.reviews.update', $f['program']->slug);
    $deleteUrl = route('user.kelas.reviews.destroy', $f['program']->slug);
    $this->actingAs($f['user'])->put($writeUrl, ['rating' => 5, 'comment' => 'Lama'])->assertSessionHasNoErrors();
    $id = UlasanKelas::firstOrFail()->id;
    $this->delete($deleteUrl)->assertSessionHasNoErrors();
    $f['subscription']->update(['end_date' => today()->subDay()]);
    $this->put($writeUrl, ['rating' => 4])->assertForbidden();
    expect(UlasanKelas::withTrashed()->findOrFail($id)->trashed())->toBeTrue();
    $root = Pengguna::factory()->create(['role' => 'superadmin']);
    $this->actingAs($root)->get(route('superadmin.course-reviews.index'))->assertInertia(fn (Assert $page) => $page->has('reviews.data', 0));
    $this->patch(route('superadmin.course-reviews.update', $id), ['status' => 'published', 'reason' => 'Tidak mengembalikan konten terhapus'])->assertNotFound();
    $f['subscription']->update(['end_date' => today()->addDay()]);
    $this->actingAs($f['user'])->put($writeUrl, ['rating' => 4, 'comment' => 'Baru'])->assertSessionHasNoErrors();
    expect(UlasanKelas::firstOrFail()->id)->toBe($id)->and(UlasanKelas::firstOrFail()->status)->toBe('published');
    $this->get(route('public.classes.reviews', $f['program']->slug))->assertInertia(fn (Assert $page) => $page->where('summary.count', 1)->where('summary.average', 4));
});

<?php

use App\Models\CurriculumTrack;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Services\AksesLanggananService;
use App\Services\KelasPenggunaPayloadService;
use App\Services\ProgramLearningTypeBackfill;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function classTypeFixture(string $type = 'mandiri'): ProgramPembelajaran
{
    $track = CurriculumTrack::firstOrCreate(['code' => 'type-test'], ['name' => 'Type test', 'status' => 'active']);

    return ProgramPembelajaran::create(['curriculum_track_id' => $track->id, 'learning_type' => $type,
        'title' => 'Class', 'slug' => 'class-'.Str::uuid(), 'status' => 'published', 'sort_order' => 1]);
}

it('stores explicit types independently of names and preserves omitted updates', function () {
    $program = classTypeFixture();
    $this->actingAs(Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']));
    $payload = ['curriculum_track_id' => $program->curriculum_track_id, 'title' => 'Careworker', 'status' => 'draft', 'sort_order' => 1, 'learning_type' => 'mentor'];
    $this->post(route('admin.programs.store'), $payload)->assertSessionHasNoErrors();
    $created = ProgramPembelajaran::where('title', 'Careworker')->firstOrFail();
    expect($created->isMentor())->toBeTrue();
    $this->get(route('admin.programs.index', ['type' => 'mentor']))->assertInertia(fn (Assert $page) => $page->has('programs.data', 1)->where('programs.data.0.is_mentor', true));
    unset($payload['learning_type']);
    $this->put(route('admin.programs.update', $created), $payload)->assertSessionHasNoErrors();
    expect($created->fresh()->learning_type)->toBe('mentor');
    $this->put(route('admin.programs.update', $created), [...$payload, 'learning_type' => 'mandiri', 'title' => 'Mentor in title'])->assertSessionHasNoErrors();
    expect($created->fresh()->isMentor())->toBeFalse();
    $this->post(route('admin.programs.store'), $payload)->assertSessionHasErrors('learning_type');
    $this->actingAs(Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'kloter']))
        ->post(route('admin.programs.store'), [...$payload, 'learning_type' => 'mentor'])->assertForbidden();
});

it('keeps technical access key plans compatible and locks only real operational records', function () {
    $program = classTypeFixture('mentor');
    $plan = app(AksesLanggananService::class)->accessKeyPlanForProgram($program);
    expect($plan->isTechnicalAccessKeyPlan())->toBeTrue()->and($program->learningTypeLockReason(true))->toBeNull();
    $program->accessKeys()->create(['payment_plan_id' => $plan->id, 'scope_type' => 'program', 'code' => 'TYPE-KEY', 'duration_days' => 30, 'max_uses' => 1, 'status' => 'active']);
    expect($program->learningTypeLockReason(true))->not->toBeNull();
    $this->actingAs(Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']))
        ->put(route('admin.programs.update', $program), ['curriculum_track_id' => $program->curriculum_track_id, 'title' => 'Changed', 'status' => 'published', 'sort_order' => 1, 'learning_type' => 'mandiri'])
        ->assertSessionHasErrors('learning_type');
    expect($program->fresh()->learning_type)->toBe('mentor');
});

it('rejects mismatched commercial plans but allows correct mentor plans', function () {
    $program = classTypeFixture('mentor');
    $this->actingAs(Pengguna::factory()->create(['role' => 'superadmin']));
    $payload = ['program_pembelajaran_id' => $program->id, 'name' => 'Plan', 'slug' => 'type-plan', 'price' => 10000, 'duration_days' => 30, 'is_active' => true, 'scope_type' => 'program'];
    $this->post(route('superadmin.payments.plans.store'), $payload)->assertSessionHasErrors('scope_type');
    $this->post(route('superadmin.payments.plans.store'), [...$payload, 'scope_type' => 'kloter'])->assertRedirect()->assertSessionHasNoErrors();
    expect($program->paymentPlans()->count())->toBe(1)->and($program->learningTypeLockReason(true))->not->toBeNull();
});

it('classifies legacy evidence without using names and detects conflicts before schema changes', function () {
    $program = classTypeFixture();
    $program->update(['title' => 'Mentor name is not evidence']);
    $service = app(ProgramLearningTypeBackfill::class);
    expect($service->mapping()[$program->id])->toBe('mandiri');
    $technical = app(AksesLanggananService::class)->accessKeyPlanForProgram($program);
    expect($service->mapping()[$program->id])->toBe('mandiri');
    $technical->update(['scope_type' => 'kloter', 'price' => 10000, 'is_active' => true]);
    expect($service->mapping()[$program->id])->toBe('mentor');
    PaketPembayaran::create(['program_pembelajaran_id' => $program->id, 'slug' => 'conflict', 'name' => 'Conflicting', 'scope_type' => 'program', 'price' => 5000, 'duration_days' => 30, 'is_active' => true]);
    expect(fn () => $service->mapping())->toThrow(RuntimeException::class, 'Tipe kelas ambigu');
});

it('only uses the class type as a label fallback without granting access', function () {
    $program = classTypeFixture('mentor');
    $user = Pengguna::factory()->create(['role' => 'user']);
    $payload = app(KelasPenggunaPayloadService::class)->forProgram($user, $program);
    expect($payload['access_mode'])->toBeNull()->and($payload['access_mode_label'])->toBe('Kelas Mentor')
        ->and($payload['has_class_access'])->toBeFalse();
});

it('validates new cohorts and preserves mentor access key issuance', function () {
    $mentor = classTypeFixture('mentor');
    $mandiri = classTypeFixture();
    $admin = Pengguna::factory()->create(['role' => 'superadmin']);
    $this->actingAs($admin);
    $payload = ['program_pembelajaran_id' => $mandiri->id, 'nama' => 'New cohort',
        'tanggal_mulai' => now()->toDateString(), 'status' => 'active', 'is_default' => false];
    $this->post(route('superadmin.kloters.store'), $payload)->assertSessionHasErrors('program_pembelajaran_id');
    $this->post(route('superadmin.kloters.store'), [...$payload, 'program_pembelajaran_id' => $mentor->id])->assertRedirect()->assertSessionHasNoErrors();
    $cohort = $mentor->kloterBelajar()->firstOrFail();
    $this->post(route('superadmin.kloters.access-keys.store', $cohort), ['name' => 'Mentor key', 'duration_days' => 30, 'max_uses' => 2])
        ->assertRedirect()->assertSessionHasNoErrors();
    $key = $mentor->accessKeys()->firstOrFail();
    expect($key->kloter_belajar_id)->toBe($cohort->id)->and($key->scope_type)->toBe('program')
        ->and($key->paymentPlan->isTechnicalAccessKeyPlan())->toBeTrue();
    $student = Pengguna::factory()->create(['role' => 'user']);
    $subscription = app(AksesLanggananService::class)->activateFromAccessKey($student, $key);
    expect($subscription->kloter_belajar_id)->toBe($cohort->id);
    $this->post(route('superadmin.payments.access-keys.store'), ['program_pembelajaran_id' => $mandiri->id,
        'duration_days' => 30, 'max_uses' => 1])->assertRedirect()->assertSessionHasNoErrors();
    expect($mandiri->accessKeys()->count())->toBe(1);
});

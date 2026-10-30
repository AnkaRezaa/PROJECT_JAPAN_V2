<?php

use App\Models\Pengguna;

it('rejects mentors from global exam administration before resolving resources', function () {
    $mentor = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'kloter']);

    $this->actingAs($mentor)->get(route('admin.exams.index'))->assertForbidden();
    $this->actingAs($mentor)->post(route('admin.exams.store'), [])->assertForbidden();
    $this->actingAs($mentor)->get(route('admin.exams.question-banks.index'))->assertForbidden();
});

it('renders scoped analytics for a global admin', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);

    $this->actingAs($admin)->get(route('admin.analytics'))->assertOk();
});

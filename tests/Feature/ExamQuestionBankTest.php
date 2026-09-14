<?php

use App\Models\Exam;
use App\Models\ExamBankQuestion;
use App\Models\ExamQuestionBank;
use App\Models\ExamQuestionWrapper;
use App\Models\ExamSection;
use App\Models\ExamVersion;
use App\Models\LevelPembelajaran;
use App\Models\Pengguna;
use App\Services\ExamQuestionBankService;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = Pengguna::factory()->create([
        'role' => 'admin',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $this->user = Pengguna::factory()->create([
        'role' => 'user',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $this->level = LevelPembelajaran::firstOrCreate(['level_name' => 'N3'], ['stage' => 3]);
});

it('allows admin to view question banks index and denies regular user', function () {
    $bank = ExamQuestionBank::create([
        'level_id' => $this->level->id,
        'title' => 'Shin Kanzen Master N3 Dokkai',
        'slug' => 'shin-kanzen-master-n3-dokkai',
        'source' => '3A Corporation',
        'status' => 'published',
        'created_by' => $this->admin->id,
    ]);

    $this->actingAs($this->user)
        ->get(route('admin.exams.question-banks.index'))
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->get(route('admin.exams.question-banks.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Ujian/BankSoal/Index')
            ->has('banks.data', 1)
            ->where('banks.data.0.title', 'Shin Kanzen Master N3 Dokkai'));
});

it('allows admin to create, update, and delete question bank', function () {
    $res = $this->actingAs($this->admin)
        ->post(route('admin.exams.question-banks.store'), [
            'level_id' => $this->level->id,
            'title' => 'Bank Soal Tryout Resmi 2023',
            'source' => 'The Japan Foundation',
            'description' => 'Kumpulan soal asli 2023',
            'status' => 'published',
        ]);

    $res->assertRedirect();
    $bank = ExamQuestionBank::where('title', 'Bank Soal Tryout Resmi 2023')->firstOrFail();
    expect($bank->slug)->toBe('bank-soal-tryout-resmi-2023');

    // Update
    $this->actingAs($this->admin)
        ->patch(route('admin.exams.question-banks.update', $bank->slug), [
            'title' => 'Bank Soal Tryout Resmi 2023 Update',
            'status' => 'draft',
        ])
        ->assertRedirect();

    expect($bank->fresh()->title)->toBe('Bank Soal Tryout Resmi 2023 Update');
    expect($bank->fresh()->status)->toBe('draft');

    // Delete
    $this->actingAs($this->admin)
        ->delete(route('admin.exams.question-banks.destroy', $bank->slug))
        ->assertRedirect(route('admin.exams.question-banks.index'));

    expect(ExamQuestionBank::find($bank->id))->toBeNull();
});

it('allows admin to manage wrappers and questions inside a bank', function () {
    $bank = ExamQuestionBank::create([
        'level_id' => $this->level->id,
        'title' => 'Koleksi Dokkai N3',
        'slug' => 'koleksi-dokkai-n3',
        'status' => 'published',
        'created_by' => $this->admin->id,
    ]);

    // Store wrapper
    $wRes = $this->actingAs($this->admin)
        ->postJson(route('admin.exams.question-banks.wrappers.store', $bank->slug), [
            'title' => 'Mondai 4 - Bacaan Pendek',
            'wrapper_code' => 'WRAP-N3-D04',
            'category' => 'reading',
            'mondai_number' => 'Mondai 4',
            'stimulus_text' => '日本の文化について...',
        ]);

    $wRes->assertCreated();
    $wrapperId = $wRes->json('wrapper.id');
    expect($wrapperId)->not->toBeNull();

    // Store question inside wrapper
    $qRes = $this->actingAs($this->admin)
        ->postJson(route('admin.exams.question-banks.questions.store', $bank->slug), [
            'exam_question_wrapper_id' => $wrapperId,
            'code' => 'N3-D04-01',
            'type' => 'multiple_choice',
            'points' => 2,
            'question_text' => '本文の内容と合っているものはどれですか。',
            'options' => ['A', 'B', 'C', 'D'],
            'correct_answer' => 'C',
            'explanation' => 'Jawaban benar C karena...',
        ]);

    $qRes->assertCreated();
    $questionId = $qRes->json('question.id');
    expect($questionId)->not->toBeNull();

    // Verify bank detail page loads them
    $this->actingAs($this->admin)
        ->get(route('admin.exams.question-banks.show', $bank->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Ujian/BankSoal/Show')
            ->has('bank.wrappers', 1)
            ->where('bank.wrappers.0.questions.0.code', 'N3-D04-01'));
});

it('allows downloading template and mass importing questions via CSV', function () {
    $bank = ExamQuestionBank::create([
        'level_id' => $this->level->id,
        'title' => 'Bank Soal Import Test',
        'slug' => 'bank-soal-import-test',
        'status' => 'published',
        'created_by' => $this->admin->id,
    ]);

    // Test template download
    $this->actingAs($this->admin)
        ->get(route('admin.exams.question-banks.template', 'csv'))
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');

    // Create CSV content for test
    $csvContent = implode("\n", [
        'wrapper_code,wrapper_title,category,mondai,stimulus_text,wrapper_audio,code,type,question_text,opsi_a,opsi_b,opsi_c,opsi_d,correct_answer,explanation,bobot,audio_url',
        'WRAP-CSV-01,Wacana Berita,reading,Mondai 5,"富士山に登る人が増えています。",,N3-01,multiple_choice,富士山について何が書かれていますか。,人が多い,人が少ない,山がない,寒い,A,Sesuai teks kalimat 1,1,',
        'WRAP-CSV-01,Wacana Berita,reading,Mondai 5,"富士山に登る人が増えています。",,N3-02,multiple_choice,何が増えていますか。,登る人,車,電車,鳥,A,Teks menyebut orang mendaki,1,',
    ]);

    $file = UploadedFile::fake()->createWithContent('bank-soal.csv', $csvContent);

    // Preview
    $previewRes = $this->actingAs($this->admin)
        ->post(route('admin.exams.question-banks.import.preview', $bank->slug), ['file' => $file]);

    $previewRes->assertOk();
    expect($previewRes->json('valid'))->toBeTrue();
    expect($previewRes->json('summary.wrappers'))->toBe(1);
    expect($previewRes->json('summary.questions'))->toBe(2);

    // Commit import
    $commitRes = $this->actingAs($this->admin)
        ->post(route('admin.exams.question-banks.import', $bank->slug), ['file' => $file]);

    $commitRes->assertOk();
    expect($commitRes->json('success'))->toBeTrue();
    expect($bank->wrappers()->count())->toBe(1);
    expect($bank->questions()->count())->toBe(2);
});

it('auto-groups questions when stimulus text is shared but wrapper_code is omitted', function () {
    $bank = ExamQuestionBank::create([
        'level_id' => $this->level->id,
        'title' => 'Bank Auto Grouping',
        'slug' => 'bank-auto-grouping',
        'status' => 'published',
        'created_by' => $this->admin->id,
    ]);

    $csvContent = implode("\n", [
        'wrapper_code,wrapper_title,category,mondai,stimulus_text,wrapper_audio,code,type,question_text,opsi_a,opsi_b,opsi_c,opsi_d,correct_answer,explanation,bobot,audio_url',
        ',,reading,Mondai 3,"京都の秋は紅葉がとても美しいです。",,AUTO-1,multiple_choice,京都の秋はどうですか。,美しい,汚い,暑い,静か,A,,1,',
        ',,reading,Mondai 3,"京都の秋は紅葉がとても美しいです。",,AUTO-2,multiple_choice,何が美しいですか。,紅葉,海,川,空,A,,1,',
    ]);

    $file = UploadedFile::fake()->createWithContent('auto-group.csv', $csvContent);

    $service = app(ExamQuestionBankService::class);
    $res = $service->commit($bank, $file);

    expect($res['wrappers_count'])->toBe(1);
    expect($res['questions_count'])->toBe(2);
    expect($bank->wrappers()->first()->stimulus_text)->toContain('京都の秋');
});

it('allows pulling questions from bank into an exam section', function () {
    $bank = ExamQuestionBank::create([
        'level_id' => $this->level->id,
        'title' => 'Bank For Pulling',
        'slug' => 'bank-for-pulling',
        'status' => 'published',
        'created_by' => $this->admin->id,
    ]);

    $wrapper = $bank->wrappers()->create([
        'title' => 'Wacana Pull',
        'category' => 'reading',
        'stimulus_text' => 'Bacaan contoh stimulus...',
    ]);

    $question = $bank->questions()->create([
        'exam_question_wrapper_id' => $wrapper->id,
        'code' => 'PULL-01',
        'type' => 'multiple_choice',
        'points' => 2,
        'question_text' => 'Apakah ini soal pull?',
        'options' => ['Ya', 'Tidak'],
        'correct_answer' => 'Ya',
        'content_hash' => 'hash123',
    ]);

    // Create target Exam and Section
    $exam = Exam::create([
        'level_id' => $this->level->id,
        'slug' => 'target-exam-pull',
        'title' => 'Target Exam Pull',
        'type' => 'simulation',
        'access_type' => 'all',
        'status' => 'draft',
    ]);
    $version = ExamVersion::create([
        'exam_id' => $exam->id,
        'version_number' => 1,
        'status' => 'draft',
    ]);
    $section = ExamSection::create([
        'exam_version_id' => $version->id,
        'key' => 'grammar_reading',
        'title' => 'Tata Bahasa & Bacaan',
        'sort_order' => 1,
        'time_limit_seconds' => 1800,
    ]);

    $res = $this->actingAs($this->admin)
        ->postJson(route('admin.exam-sections.questions.pull', $section->id), [
            'bank_question_ids' => [$question->id],
        ]);

    $res->assertOk();
    expect($res->json('pulled_count'))->toBe(1);
    expect($section->questions()->count())->toBe(1);

    $pulledQ = $section->questions()->first();
    expect($pulledQ->code)->toBe('PULL-01');
    expect($pulledQ->correct_answer)->toBe('Ya');
    expect($pulledQ->question_reading)->toContain('Bacaan contoh stimulus');
});

<?php

use App\Models\DokkaiAttemptAnswer;
use App\Models\DokkaiParagraph;
use App\Models\DokkaiPassage;
use App\Models\DokkaiQuestion;
use App\Models\JawabanPengerjaanKuis;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\PengerjaanKuis;
use App\Models\ProgramPembelajaran;
use App\Models\Soal;
use App\Services\KuisDokkaiService;
use App\Services\KuisGrammarService;
use App\Services\SoalKuisService;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->level = LevelPembelajaran::create(['level_name' => 'N5', 'stage' => 1, 'is_premium' => false]);
    $this->program = ProgramPembelajaran::create([
        'level_id' => $this->level->id,
        'title' => 'Program Test Safety',
        'slug' => 'program-test-safety-' . Str::random(6),
        'status' => 'published',
    ]);
    $this->module = Modul::create([
        'level_id' => $this->level->id,
        'program_pembelajaran_id' => $this->program->id,
        'title' => 'Week 1 Safety',
        'week_number' => 1,
        'status' => 'published',
    ]);
    $this->quiz = Kuis::create([
        'module_id' => $this->module->id,
        'title' => 'Kuis Safety Test',
        'type' => 'multiple_choice',
        'status' => 'published',
        'time_limit' => 300,
        'passing_score' => 70,
    ]);
    $this->user = Pengguna::factory()->create();
});

it('prevents hard-deleting quiz questions that already have student attempt answers', function () {
    $question1 = Soal::create([
        'quiz_id' => $this->quiz->id,
        'type' => 'multiple_choice',
        'question_text' => 'Pertanyaan 1 Yang Sudah Dikerjakan',
        'correct_answer' => 'A',
        'options' => ['A', 'B', 'C', 'D'],
        'order' => 0,
        'points' => 1,
    ]);

    $question2 = Soal::create([
        'quiz_id' => $this->quiz->id,
        'type' => 'multiple_choice',
        'question_text' => 'Pertanyaan 2 Belum Dikerjakan',
        'correct_answer' => 'B',
        'options' => ['A', 'B', 'C', 'D'],
        'order' => 1,
        'points' => 1,
    ]);

    // Simulasi siswa mengerjakan kuis dan menjawab soal 1
    $attempt = PengerjaanKuis::create([
        'user_id' => $this->user->id,
        'quiz_id' => $this->quiz->id,
        'score' => 100,
        'is_passed' => true,
        'completed_at' => now(),
    ]);

    JawabanPengerjaanKuis::create([
        'attempt_id' => $attempt->id,
        'question_id' => $question1->id,
        'selected_answer' => 'A',
        'is_correct' => true,
    ]);

    $service = app(SoalKuisService::class);

    // Payload admin hanya menyertakan question2 (berusaha menghapus question1)
    $payload = [
        'time_limit' => 300,
        'passing_score' => 70,
        'questions' => [
            [
                'id' => $question2->id,
                'type' => 'multiple_choice',
                'question_text' => 'Pertanyaan 2 Belum Dikerjakan',
                'correct_answer' => 'B',
                'options' => ['A', 'B', 'C', 'D'],
                'points' => 1,
            ],
        ],
    ];

    expect(fn () => $service->syncQuestions($this->quiz, $payload))
        ->toThrow(ValidationException::class);

    // Pastikan data soal 1 dan riwayat jawaban tetap utuh di database
    expect(Soal::where('id', $question1->id)->exists())->toBeTrue();
    expect(JawabanPengerjaanKuis::where('question_id', $question1->id)->exists())->toBeTrue();
});

it('allows deleting quiz questions when no student attempt answers exist', function () {
    $question1 = Soal::create([
        'quiz_id' => $this->quiz->id,
        'type' => 'multiple_choice',
        'question_text' => 'Pertanyaan Draf Belum Ada Murid',
        'correct_answer' => 'A',
        'options' => ['A', 'B', 'C', 'D'],
        'order' => 0,
        'points' => 1,
    ]);

    $question2 = Soal::create([
        'quiz_id' => $this->quiz->id,
        'type' => 'multiple_choice',
        'question_text' => 'Pertanyaan Baru',
        'correct_answer' => 'B',
        'options' => ['A', 'B', 'C', 'D'],
        'order' => 1,
        'points' => 1,
    ]);

    $service = app(SoalKuisService::class);

    $payload = [
        'time_limit' => 300,
        'passing_score' => 70,
        'questions' => [
            [
                'id' => $question2->id,
                'type' => 'multiple_choice',
                'question_text' => 'Pertanyaan Baru',
                'correct_answer' => 'B',
                'options' => ['A', 'B', 'C', 'D'],
                'points' => 1,
            ],
        ],
    ];

    $service->syncQuestions($this->quiz, $payload);

    expect(Soal::where('id', $question1->id)->exists())->toBeFalse();
    expect(Soal::where('id', $question2->id)->exists())->toBeTrue();
});

it('prevents hard-deleting dokkai questions that already have attempt answers', function () {
    $dokkaiQuiz = Kuis::create([
        'module_id' => $this->module->id,
        'title' => 'Kuis Dokkai Safety Test',
        'type' => 'dokkai',
        'status' => 'published',
        'time_limit' => 300,
        'passing_score' => 70,
    ]);

    $passage = DokkaiPassage::create([
        'quiz_id' => $dokkaiQuiz->id,
        'title' => 'Wacana Test Safety',
        'jlpt_level' => 'N5',
    ]);

    $paragraph = DokkaiParagraph::create([
        'dokkai_passage_id' => $passage->id,
        'paragraph_number' => 1,
        'label' => 'Paragraf 1',
        'content_raw' => 'これはテストです。',
    ]);

    $dokkaiQ1 = DokkaiQuestion::create([
        'dokkai_passage_id' => $passage->id,
        'question_number' => 1,
        'question_text' => 'Soal Dokkai 1 yang sudah ada attempt',
        'evidence_paragraph_id' => $paragraph->id,
        'options' => [
            ['id' => 1, 'option_label' => 'A', 'option_text' => 'Benar', 'is_correct' => true],
            ['id' => 2, 'option_label' => 'B', 'option_text' => 'Salah', 'is_correct' => false],
        ],
        'order' => 0,
    ]);

    $dokkaiQ2 = DokkaiQuestion::create([
        'dokkai_passage_id' => $passage->id,
        'question_number' => 2,
        'question_text' => 'Soal Dokkai 2 baru',
        'evidence_paragraph_id' => $paragraph->id,
        'options' => [
            ['id' => 1, 'option_label' => 'A', 'option_text' => 'Benar', 'is_correct' => true],
            ['id' => 2, 'option_label' => 'B', 'option_text' => 'Salah', 'is_correct' => false],
        ],
        'order' => 1,
    ]);

    $attempt = PengerjaanKuis::create([
        'user_id' => $this->user->id,
        'quiz_id' => $this->quiz->id,
        'score' => 100,
        'is_passed' => true,
        'completed_at' => now(),
    ]);

    DokkaiAttemptAnswer::create([
        'attempt_id' => $attempt->id,
        'dokkai_question_id' => $dokkaiQ1->id,
        'selected_option' => 'A',
        'is_correct' => true,
    ]);

    $service = app(KuisDokkaiService::class);

    // Payload hanya mengirim q2, berusaha menghapus q1
    $payload = [
        'passage' => [
            'title' => 'Wacana Test Safety',
            'jlpt_level' => 'N5',
        ],
        'paragraphs' => [
            ['id' => $paragraph->id, 'paragraph_number' => 1, 'label' => 'Paragraf 1', 'content_raw' => 'これはテストです。'],
        ],
        'vocabularies' => [],
        'questions' => [
            [
                'id' => $dokkaiQ2->id,
                'question_number' => 1,
                'question_text' => 'Soal Dokkai 2 baru',
                'evidence_paragraph_number' => 1,
                'options' => [
                    ['id' => 1, 'option_label' => 'A', 'option_text' => 'Benar', 'is_correct' => true],
                    ['id' => 2, 'option_label' => 'B', 'option_text' => 'Salah', 'is_correct' => false],
                ],
                'order' => 0,
            ],
        ],
    ];

    expect(fn () => $service->sync($dokkaiQuiz, $payload))
        ->toThrow(ValidationException::class);

    expect(DokkaiQuestion::where('id', $dokkaiQ1->id)->exists())->toBeTrue();
    expect(DokkaiAttemptAnswer::where('dokkai_question_id', $dokkaiQ1->id)->exists())->toBeTrue();
});

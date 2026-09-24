<?php

use App\Models\DeckPresentasi;
use App\Models\Flashcard;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\LogReward;
use App\Models\Progres;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ReviewFlashcard;
use App\Models\SetFlashcard;
use App\Models\SlidePresentasi;
use App\Models\Soal;
use App\Services\AksesKuisPenggunaService;
use App\Services\ProgresRoadmapService;
use Database\Seeders\KelasDemoSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function createDayRoadmapFixture(): array
{
    $level = LevelPembelajaran::create([
        'level_name' => 'D73',
        'stage' => 73,
        'is_premium' => false,
    ]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Kelas Day Test',
        'slug' => 'kelas-day-test',
        'status' => 'published',
        'sort_order' => 1,
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Pola Kalimat',
        'week_number' => 1,
        'description' => 'Week dengan dua Day.',
        'status' => 'published',
    ]);
    $dayOne = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 1,
        'title' => 'Pengenalan',
        'status' => 'published',
    ]);
    $dayTwo = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 2,
        'title' => 'Latihan',
        'status' => 'published',
    ]);

    foreach ([$dayOne, $dayTwo] as $day) {
        $set = SetFlashcard::create([
            'level_id' => $level->id,
            'module_id' => $module->id,
            'module_day_id' => $day->id,
            'title' => 'Flashcard '.$day->day_number,
            'status' => 'published',
        ]);
        Flashcard::create([
            'flashcard_set_id' => $set->id,
            'front_text' => 'kata-'.$day->day_number,
            'back_text' => 'arti-'.$day->day_number,
        ]);
    }

    return compact('level', 'program', 'module', 'dayOne', 'dayTwo');
}

it('keeps Day assignments inside the selected Week', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $otherModule = Modul::create([
        'level_id' => $fixture['level']->id,
        'program_pembelajaran_id' => $fixture['program']->id,
        'title' => 'Week Lain',
        'week_number' => 2,
        'status' => 'published',
    ]);
    $otherDay = HariModul::create([
        'module_id' => $otherModule->id,
        'day_number' => 1,
        'title' => 'Day Week Lain',
        'status' => 'published',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.flashcards.store'), [
            'title' => 'Relasi tidak valid',
            'level_id' => $fixture['level']->id,
            'module_id' => $fixture['module']->id,
            'module_day_id' => $otherDay->id,
            'status' => 'draft',
        ])
        ->assertSessionHasErrors('module_day_id');
});

it('prepares one flashcard set and one checkpoint quiz when an admin creates a Day', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->post(route('admin.module-days.store', $fixture['module']), [
            'day_number' => 3,
            'title' => 'Penerapan Kanji',
            'description' => 'Latihan terpadu untuk Day ketiga.',
            'status' => 'draft',
        ])
        ->assertRedirect();

    $day = HariModul::query()
        ->where('module_id', $fixture['module']->id)
        ->where('day_number', 3)
        ->firstOrFail();

    expect($day->flashcardSets()->count())->toBe(1)
        ->and($day->flashcardSets()->value('title'))->toBe('Penerapan Kanji')
        ->and($day->flashcardSets()->value('source_type'))->toBe('day')
        ->and($day->quizzes()->count())->toBe(1)
        ->and($day->checkpoint_quiz_id)->toBe($day->quizzes()->value('id'));
});

it('keeps flashcard vocabulary and generated quiz content inside the same Week and Day', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $set = SetFlashcard::where('module_day_id', $fixture['dayOne']->id)->firstOrFail();
    $otherModule = Modul::create([
        'level_id' => $fixture['level']->id,
        'program_pembelajaran_id' => $fixture['program']->id,
        'title' => 'Week Terpisah',
        'week_number' => 2,
        'status' => 'published',
    ]);
    $otherDay = HariModul::create([
        'module_id' => $otherModule->id,
        'day_number' => 1,
        'title' => 'Day Terpisah',
        'status' => 'published',
    ]);
    $otherVocabulary = Kosakata::create([
        'module_id' => $otherModule->id,
        'content_type' => 'kanji',
        'word' => '別',
        'meaning_id' => 'berbeda',
        'status' => 'published',
    ]);
    $otherQuiz = Kuis::create([
        'module_id' => $otherModule->id,
        'module_day_id' => $otherDay->id,
        'type' => 'multiple_choice',
        'status' => 'draft',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.flashcards.builder.update', $set), [
            'status' => 'published',
            'cards' => [[
                'front_text' => '別',
                'vocabulary_id' => $otherVocabulary->id,
            ]],
        ])
        ->assertSessionHasErrors('cards.0.vocabulary_id');

    $this->actingAs($admin)
        ->post(route('admin.flashcards.generate-quiz', $set), [
            'quiz_id' => $otherQuiz->id,
            'mode' => 'word_to_meaning',
            'count' => 2,
        ])
        ->assertSessionHasErrors('quiz_id');
});

it('imports kanji details into a vocabulary record scoped to the flashcard Week', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $set = SetFlashcard::where('module_day_id', $fixture['dayOne']->id)->firstOrFail();
    $csv = implode("\n", [
        'front_text,reading,back_text,content_type,onyomi,kunyomi,radicals,stroke_count',
        '新,しん,baru,kanji,シン,あたらしい,斤|木,13',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.flashcards.import', $set), [
            'import_file' => UploadedFile::fake()->createWithContent('flashcards.csv', $csv),
        ])
        ->assertRedirect();

    $card = $set->flashcards()->where('front_text', '新')->firstOrFail();
    $vocabulary = $card->vocabulary()->firstOrFail();

    expect($vocabulary->module_id)->toBe($fixture['module']->id)
        ->and($vocabulary->content_type)->toBe('kanji')
        ->and($vocabulary->metadata['onyomi'])->toBe('シン')
        ->and($vocabulary->metadata['kunyomi'])->toBe('あたらしい')
        ->and($vocabulary->metadata['radicals'])->toBe(['斤', '木'])
        ->and($vocabulary->metadata['stroke_count'])->toBe(13);
});

it('keeps flashcard imports idempotent and rejects a different Week or Day', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $set = SetFlashcard::where('module_day_id', $fixture['dayOne']->id)->firstOrFail();
    $headers = 'module_week,day_number,front_text,reading,back_text,meaning_en,hint,example_sentence,example_reading,example_meaning,content_type,jlpt_level,onyomi,kunyomi,radicals,stroke_count,notes';
    $wrongScope = implode("\n", [
        $headers,
        '2,1,scope-kanji,scope-reading,arti,meaning,kategori,contoh,contoh-reading,arti-contoh,kanji,N3,ON,KUN,radical-a|radical-b,9,catatan',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.flashcards.import', $set), [
            'import_file' => UploadedFile::fake()->createWithContent('wrong-scope.csv', $wrongScope),
        ])
        ->assertSessionHasErrors('import_file');

    expect(Kosakata::where('word', 'scope-kanji')->exists())->toBeFalse();

    $valid = implode("\n", [
        $headers,
        '1,1,scope-kanji,scope-reading,arti,meaning,kategori,contoh,contoh-reading,arti-contoh,kanji,N3,ON,KUN,radical-a|radical-b,9,catatan',
    ]);

    foreach ([1, 2] as $attempt) {
        $this->actingAs($admin)
            ->post(route('admin.flashcards.import', $set), [
                'import_file' => UploadedFile::fake()->createWithContent("valid-{$attempt}.csv", $valid),
            ])
            ->assertRedirect();
    }

    $vocabulary = Kosakata::where('word', 'scope-kanji')->firstOrFail();

    expect($set->flashcards()->where('vocabulary_id', $vocabulary->id)->count())->toBe(1)
        ->and($vocabulary->days()->whereKey($fixture['dayOne']->id)->exists())->toBeTrue()
        ->and($vocabulary->example_reading)->toBe('contoh-reading')
        ->and($vocabulary->metadata['onyomi'])->toBe('ON')
        ->and($vocabulary->metadata['kunyomi'])->toBe('KUN')
        ->and($vocabulary->metadata['radicals'])->toBe(['radical-a', 'radical-b'])
        ->and($vocabulary->metadata['stroke_count'])->toBe(9);
});

it('saves detailed flashcards through the shared vocabulary source', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $set = SetFlashcard::where('module_day_id', $fixture['dayOne']->id)->firstOrFail();

    $this->actingAs($admin)
        ->post(route('admin.flashcards.builder.update', $set), [
            'status' => 'published',
            'cards' => [[
                'front_text' => 'shared-kanji',
                'reading' => 'shared-reading',
                'back_text' => 'arti bersama',
                'meaning_en' => 'shared meaning',
                'hint' => 'kanji',
                'content_type' => 'kanji',
                'jlpt_level' => 'N3',
                'example_sentence' => 'shared example',
                'example_reading' => 'shared example reading',
                'example_meaning' => 'arti contoh',
                'onyomi' => 'ON',
                'kunyomi' => 'KUN',
                'radicals' => ['radical'],
                'stroke_count' => 7,
                'notes' => 'catatan',
            ]],
        ])
        ->assertRedirect();

    $vocabulary = Kosakata::where('word', 'shared-kanji')->firstOrFail();
    $card = $set->flashcards()->firstOrFail();

    expect($card->vocabulary_id)->toBe($vocabulary->id)
        ->and($card->back_text)->toBe($vocabulary->meaning_id)
        ->and($vocabulary->days()->whereKey($fixture['dayOne']->id)->exists())->toBeTrue()
        ->and($vocabulary->example_reading)->toBe('shared example reading')
        ->and($vocabulary->metadata['onyomi'])->toBe('ON')
        ->and($vocabulary->metadata['kunyomi'])->toBe('KUN')
        ->and($vocabulary->metadata['radicals'])->toBe(['radical'])
        ->and($vocabulary->metadata['stroke_count'])->toBe(7);
});

it('rejects quiz imports that belong to a different Week or Day', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $quiz = Kuis::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['dayOne']->id,
        'type' => 'multiple_choice',
        'status' => 'draft',
    ]);
    $headers = 'module_week,day_number,type,question_text,correct_answer,options,explanation,audio_url,points';
    $wrongScope = implode("\n", [
        $headers,
        '1,2,multiple_choice,Soal lintas Day,A,A|B,Penjelasan,,1',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.quizzes.questions.import', $quiz), [
            'import_file' => UploadedFile::fake()->createWithContent('quiz-wrong-day.csv', $wrongScope),
        ])
        ->assertSessionHasErrors('import_file');

    expect($quiz->questions()->count())->toBe(0);

    $valid = implode("\n", [
        $headers,
        '1,1,multiple_choice,Soal Day yang benar,A,A|B,Penjelasan,,1',
    ]);

    $this->actingAs($admin)
        ->postJson(route('admin.quizzes.questions.import.preview', $quiz), [
            'import_file' => UploadedFile::fake()->createWithContent('quiz-preview.csv', $valid),
        ])
        ->assertOk()
        ->assertJsonPath('valid_count', 1)
        ->assertJsonPath('invalid_count', 0)
        ->assertJsonPath('valid_rows.0.question_text', 'Soal Day yang benar')
        ->assertJsonPath('valid_rows.0.correct_answer', 'A')
        ->assertJsonPath('valid_rows.0.options', ['A', 'B']);

    $this->actingAs($admin)
        ->post(route('admin.quizzes.questions.import', $quiz), [
            'import_file' => UploadedFile::fake()->createWithContent('quiz-correct-day.csv', $valid),
        ])
        ->assertRedirect();

    $saved = $quiz->questions()->where('question_text', 'Soal Day yang benar')->firstOrFail();

    expect($saved->correct_answer)->toBe('A')
        ->and($saved->options)->toBe(['A', 'B']);
});

it('locks a later Day until the previous Day is complete', function () {
    $fixture = createDayRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $roadmap = app(ProgresRoadmapService::class);
    $firstSet = SetFlashcard::where('module_day_id', $fixture['dayOne']->id)->firstOrFail();
    $secondSet = SetFlashcard::where('module_day_id', $fixture['dayTwo']->id)->firstOrFail();
    $firstCard = $firstSet->flashcards()->firstOrFail();
    $secondCard = $secondSet->flashcards()->firstOrFail();

    expect($roadmap->statusAksesHari($user, $fixture['dayTwo'])['allowed'])->toBeFalse()
        ->and($roadmap->selesaikanDariFlashcard($user, $firstSet)['day_completed'])->toBeFalse();

    ReviewFlashcard::create([
        'user_id' => $user->id,
        'flashcard_id' => $firstCard->id,
        'status' => 'learning',
    ]);
    $first = $roadmap->selesaikanDariFlashcard($user, $firstSet);

    expect($first['day_completed'])->toBeTrue()
        ->and($first['module_completed'])->toBeFalse()
        ->and($roadmap->statusAksesHari($user, $fixture['dayTwo'])['allowed'])->toBeTrue();

    ReviewFlashcard::create([
        'user_id' => $user->id,
        'flashcard_id' => $secondCard->id,
        'status' => 'learning',
    ]);
    $second = $roadmap->selesaikanDariFlashcard($user, $secondSet);

    expect($second['day_completed'])->toBeTrue()
        ->and($second['module_completed'])->toBeTrue()
        ->and($user->progress()->where('module_id', $fixture['module']->id)->whereNotNull('completed_at')->exists())->toBeTrue()
        ->and($user->dayProgress()->whereNotNull('completed_at')->count())->toBe(2);
});

it('only completes a Day from its checkpoint quiz', function () {
    $fixture = createDayRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $checkpoint = Kuis::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['dayOne']->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'published',
    ]);
    Soal::create([
        'quiz_id' => $checkpoint->id,
        'type' => 'multiple_choice',
        'question_text' => 'Apa arti kata ini?',
        'correct_answer' => 'arti',
        'options' => ['arti', 'salah'],
        'order' => 1,
    ]);
    $otherQuiz = Kuis::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['dayOne']->id,
        'type' => 'fill_blank',
        'passing_score' => 70,
        'status' => 'published',
    ]);
    $fixture['dayOne']->update(['checkpoint_quiz_id' => $checkpoint->id]);
    $roadmap = app(ProgresRoadmapService::class);
    $flashcardSet = SetFlashcard::where('module_day_id', $fixture['dayOne']->id)->firstOrFail();
    $card = $flashcardSet->flashcards()->firstOrFail();
    ReviewFlashcard::create([
        'user_id' => $user->id,
        'flashcard_id' => $card->id,
        'status' => 'learning',
    ]);

    $flashcardResult = $roadmap->selesaikanDariFlashcard($user, $flashcardSet);
    $ignored = $roadmap->selesaikanDariKuis($user, $otherQuiz, 100);
    $completed = $roadmap->selesaikanDariKuis($user, $checkpoint, 80);

    expect($flashcardResult['day_completed'])->toBeFalse()
        ->and($ignored['day_completed'])->toBeFalse()
        ->and($completed['day_completed'])->toBeTrue()
        ->and($roadmap->hariSelesai($user, $fixture['dayOne']))->toBeTrue();
});

it('completes the Week automatically after all Days are completed', function () {
    $fixture = createDayRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $roadmap = app(ProgresRoadmapService::class);

    $setOne = SetFlashcard::where('module_day_id', $fixture['dayOne']->id)->firstOrFail();
    ReviewFlashcard::create([
        'user_id' => $user->id,
        'flashcard_id' => $setOne->flashcards()->firstOrFail()->id,
        'status' => 'learning',
    ]);
    $resOne = $roadmap->selesaikanDariFlashcard($user, $setOne);
    expect($resOne['module_completed'])->toBeFalse()
        ->and($user->progress()->where('module_id', $fixture['module']->id)->whereNotNull('completed_at')->exists())->toBeFalse();

    $setTwo = SetFlashcard::where('module_day_id', $fixture['dayTwo']->id)->firstOrFail();
    ReviewFlashcard::create([
        'user_id' => $user->id,
        'flashcard_id' => $setTwo->flashcards()->firstOrFail()->id,
        'status' => 'learning',
    ]);
    $resTwo = $roadmap->selesaikanDariFlashcard($user, $setTwo);
    expect($resTwo['module_completed'])->toBeTrue()
        ->and($user->progress()->where('module_id', $fixture['module']->id)->whereNotNull('completed_at')->exists())->toBeTrue();
});

it('requires a Day when an admin creates a quiz', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->post(route('admin.quizzes.store'), [
            'module_id' => $fixture['module']->id,
            'type' => 'multiple_choice',
            'time_limit' => 600,
            'passing_score' => 70,
        ])
        ->assertSessionHasErrors(['module_day_id']);
});

it('allows an admin to clear every exam question and forces the exam back to draft', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $exam = Kuis::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['dayOne']->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'published',
    ]);
    Soal::create([
        'quiz_id' => $exam->id,
        'type' => 'multiple_choice',
        'question_text' => 'Soal yang akan dihapus.',
        'correct_answer' => 'A',
        'options' => ['A', 'B'],
        'order' => 1,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.quizzes.builder.update', $exam), [
            'time_limit' => null,
            'passing_score' => 70,
            'questions' => [],
        ])
        ->assertRedirect();

    expect($exam->fresh()->status)->toBe('draft')
        ->and($exam->questions()->count())->toBe(0);
});

it('returns weekly presentation nodes in the roadmap payload', function () {
    $fixture = createDayRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $deck = DeckPresentasi::create([
        'level_id' => $fixture['level']->id,
        'module_id' => $fixture['module']->id,
        'module_day_id' => null,
        'week_slot' => 'opening',
        'title' => 'PPT Pembuka Mingguan',
        'status' => 'published',
    ]);
    SlidePresentasi::create([
        'presentation_deck_id' => $deck->id,
        'title' => 'Pembuka',
        'layout' => 'title',
        'content' => 'Ringkasan Minggu.',
        'background' => 'light',
        'order' => 1,
    ]);
    $closingDeck = DeckPresentasi::create([
        'level_id' => $fixture['level']->id,
        'module_id' => $fixture['module']->id,
        'module_day_id' => null,
        'week_slot' => 'closing',
        'title' => 'PPT Penutup Mingguan',
        'status' => 'published',
    ]);
    SlidePresentasi::create([
        'presentation_deck_id' => $closingDeck->id,
        'title' => 'Penutup',
        'layout' => 'title',
        'content' => 'Rangkuman Minggu.',
        'background' => 'light',
        'order' => 1,
    ]);

    $this->actingAs($user)
        ->get(route('user.modul.program', $fixture['program']->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('weeks.0.presentations.0.title', 'PPT Pembuka Mingguan')
            ->where('weeks.0.presentations.0.placement', 'opening')
            ->where('weeks.0.presentations.0.slides_count', 1)
            ->where('weeks.0.weekly_exams', [])
            ->where('weeks.0.presentations.1.title', 'PPT Penutup Mingguan')
            ->where('weeks.0.presentations.1.placement', 'closing')
            ->where('weeks.0.presentations.1.locked', true)
            ->where('weeks.0.live_session', null));
});

it('opens an empty weekly presentation workspace', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('admin.modules.presentations.builder', $fixture['module']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Presentasi/BuilderPresentasi')
            ->where('module.id', $fixture['module']->id)
            ->where('activePlacement', 'opening')
            ->where('createMode', true)
            ->where('deck', null)
            ->has('decks', 0)
        );
});

it('keeps old presentation builder links inside the weekly workspace', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $closing = DeckPresentasi::create([
        'level_id' => $fixture['level']->id,
        'module_id' => $fixture['module']->id,
        'module_day_id' => null,
        'week_slot' => 'closing',
        'title' => 'Penutup Mingguan',
        'status' => 'draft',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.presentations.builder', $closing))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Presentasi/BuilderPresentasi')
            ->where('activePlacement', 'closing')
            ->where('deck.id', $closing->id)
            ->where('decks.0.id', $closing->id)
        );
});

it('creates multiple presentations in the same position and after a Day', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);

    $payload = [
        'title' => 'Pembuka Mingguan',
        'description' => '',
        'level_id' => $fixture['level']->id,
        'module_id' => $fixture['module']->id,
        'module_day_id' => null,
        'week_slot' => 'opening',
        'status' => 'draft',
    ];

    $this->actingAs($admin)
        ->post(route('admin.presentations.store'), $payload)
        ->assertRedirect();

    expect(DeckPresentasi::query()
        ->where('module_id', $fixture['module']->id)
        ->where('week_slot', 'opening')
        ->count())->toBe(1);

    $this->actingAs($admin)
        ->post(route('admin.presentations.store'), $payload)
        ->assertRedirect();

    $this->actingAs($admin)
        ->post(route('admin.presentations.store'), [
            ...$payload,
            'title' => 'Setelah Day Satu',
            'module_day_id' => $fixture['dayOne']->id,
            'week_slot' => 'after_day',
        ])
        ->assertRedirect();

    expect(DeckPresentasi::query()
        ->where('module_id', $fixture['module']->id)
        ->where('week_slot', 'opening')
        ->count())->toBe(2)
        ->and(DeckPresentasi::query()
            ->where('module_day_id', $fixture['dayOne']->id)
            ->where('week_slot', 'after_day')
        ->count())->toBe(1);
});

it('reorders every presentation inside one Week atomically', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $opening = DeckPresentasi::create([
        'level_id' => $fixture['level']->id,
        'module_id' => $fixture['module']->id,
        'week_slot' => 'opening',
        'sort_order' => 0,
        'title' => 'Pembuka',
        'status' => 'draft',
    ]);
    $closing = DeckPresentasi::create([
        'level_id' => $fixture['level']->id,
        'module_id' => $fixture['module']->id,
        'week_slot' => 'closing',
        'sort_order' => 0,
        'title' => 'Penutup',
        'status' => 'draft',
    ]);

    $this->actingAs($admin)
        ->patchJson(route('admin.modules.presentations.reorder', $fixture['module']), [
            'positions' => [
                [
                    'deck_id' => $opening->id,
                    'week_slot' => 'after_day',
                    'module_day_id' => $fixture['dayOne']->id,
                    'sort_order' => 0,
                ],
                [
                    'deck_id' => $closing->id,
                    'week_slot' => 'after_day',
                    'module_day_id' => $fixture['dayOne']->id,
                    'sort_order' => 1,
                ],
            ],
        ])
        ->assertOk();

    expect($opening->fresh()->week_slot)->toBe('after_day')
        ->and($opening->fresh()->module_day_id)->toBe($fixture['dayOne']->id)
        ->and($opening->fresh()->sort_order)->toBe(0)
        ->and($closing->fresh()->week_slot)->toBe('after_day')
        ->and($closing->fresh()->module_day_id)->toBe($fixture['dayOne']->id)
        ->and($closing->fresh()->sort_order)->toBe(1);
});

it('rejects a presentation position that points outside its Week', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $otherModule = Modul::create([
        'level_id' => $fixture['level']->id,
        'program_pembelajaran_id' => $fixture['program']->id,
        'title' => 'Week Lain',
        'week_number' => 2,
        'status' => 'published',
    ]);
    $otherDay = HariModul::create([
        'module_id' => $otherModule->id,
        'day_number' => 1,
        'title' => 'Day Luar',
        'status' => 'published',
    ]);
    $deck = DeckPresentasi::create([
        'level_id' => $fixture['level']->id,
        'module_id' => $fixture['module']->id,
        'week_slot' => 'opening',
        'sort_order' => 0,
        'title' => 'Presentasi Week Satu',
        'status' => 'draft',
    ]);

    $this->actingAs($admin)
        ->patchJson(route('admin.modules.presentations.reorder', $fixture['module']), [
            'positions' => [[
                'deck_id' => $deck->id,
                'week_slot' => 'after_day',
                'module_day_id' => $otherDay->id,
                'sort_order' => 0,
            ]],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('positions.0.module_day_id');

    expect($deck->fresh()->week_slot)->toBe('opening')
        ->and($deck->fresh()->module_day_id)->toBeNull();
});

it('uploads an MP4 asset for a presentation deck', function () {
    Storage::fake('public');

    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $deck = DeckPresentasi::create([
        'level_id' => $fixture['level']->id,
        'module_id' => $fixture['module']->id,
        'week_slot' => 'opening',
        'title' => 'Media Mingguan',
        'status' => 'draft',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.presentations.media.upload', $deck), [
            'media' => UploadedFile::fake()->create('materi.mp4', 1024, 'video/mp4'),
        ])
        ->assertOk()
        ->assertJsonPath('type', 'video/mp4');

    expect(Storage::disk('public')->allFiles("presentations/assets/{$deck->id}/media"))
        ->toHaveCount(1);
});

it('deletes only the active presentation deck and its managed files', function () {
    Storage::fake('local');
    Storage::fake('public');

    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $opening = DeckPresentasi::create([
        'level_id' => $fixture['level']->id,
        'module_id' => $fixture['module']->id,
        'module_day_id' => null,
        'week_slot' => 'opening',
        'title' => 'Pembuka Mingguan',
        'status' => 'draft',
    ]);
    $closing = DeckPresentasi::create([
        'level_id' => $fixture['level']->id,
        'module_id' => $fixture['module']->id,
        'module_day_id' => null,
        'week_slot' => 'closing',
        'title' => 'Penutup Mingguan',
        'status' => 'draft',
    ]);
    SlidePresentasi::create([
        'presentation_deck_id' => $opening->id,
        'title' => 'Slide pembuka',
        'layout' => 'title',
        'background' => 'light',
        'order' => 0,
    ]);

    Storage::disk('local')->put("presentations/{$opening->id}/pdf/source.pdf", 'pdf');
    Storage::disk('local')->put("presentations/imports/pptx/{$opening->id}/source.pptx", 'pptx');
    Storage::disk('public')->put("presentations/assets/{$opening->id}/images/slide.png", 'image');
    Storage::disk('public')->put("presentations/slides/{$opening->id}/snapshots/slide.png", 'snapshot');

    $this->actingAs($admin)
        ->delete(route('admin.presentations.destroy', [
            'presentationDeck' => $opening,
            'workspace' => 1,
        ]))
        ->assertRedirect(route('admin.modules.presentations.builder', $fixture['module']));

    $this->assertDatabaseMissing('presentation_decks', ['id' => $opening->id]);
    $this->assertDatabaseHas('presentation_decks', ['id' => $closing->id]);
    $this->assertDatabaseMissing('presentation_slides', ['presentation_deck_id' => $opening->id]);
    Storage::disk('local')->assertMissing("presentations/{$opening->id}");
    Storage::disk('local')->assertMissing("presentations/imports/pptx/{$opening->id}");
    Storage::disk('public')->assertMissing("presentations/assets/{$opening->id}");
    Storage::disk('public')->assertMissing("presentations/slides/{$opening->id}");
});

it('opens a Day checkpoint quiz without requiring a standalone flashcard session', function () {
    $fixture = createDayRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $checkpoint = Kuis::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['dayOne']->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'published',
    ]);
    $fixture['dayOne']->update(['checkpoint_quiz_id' => $checkpoint->id]);
    $secondSet = SetFlashcard::create([
        'level_id' => $fixture['level']->id,
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['dayOne']->id,
        'title' => 'Flashcard tambahan',
        'status' => 'published',
    ]);
    Flashcard::create([
        'flashcard_set_id' => $secondSet->id,
        'front_text' => 'tambahan',
        'back_text' => 'additional',
    ]);
    $firstCard = SetFlashcard::where('module_day_id', $fixture['dayOne']->id)
        ->where('id', '!=', $secondSet->id)
        ->firstOrFail()
        ->flashcards()
        ->firstOrFail();
    ReviewFlashcard::create([
        'user_id' => $user->id,
        'flashcard_id' => $firstCard->id,
        'status' => 'learning',
    ]);

    $access = app(AksesKuisPenggunaService::class);
    $status = $access->status($user, $checkpoint->fresh());

    expect($status['allowed'])->toBeTrue()
        ->and($status['reason'])->toBeNull();

    $this->actingAs($user)
        ->get(route('user.flashcards.show', $secondSet))
        ->assertRedirect(route('user.quizzes.show', $checkpoint));
});

it('does not expose a manual Day completion route', function () {
    expect(Route::has('user.module-days.complete'))->toBeFalse();
});

it('returns Week and Day hierarchy to the user roadmap', function () {
    $fixture = createDayRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);

    $this->actingAs($user)
        ->get(route('user.modul.program', $fixture['program']->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Modul/DaftarModul')
            ->has('weeks', 1)
            ->where('weeks.0.week_number', 1)
            ->where('weeks.0.display_title', $fixture['module']->title)
            ->has('weeks.0.days', 2)
            ->where('weeks.0.days.0.day_number', 1)
            ->where('weeks.0.days.0.status', 'active')
            ->where('weeks.0.days.0.completion_method', 'flashcard')
            ->where('weeks.0.days.0.flashcard_summary.total', 1)
            ->where('weeks.0.days.0.flashcard_summary.reviewed', 0)
            ->where('weeks.0.days.1.status', 'locked')
            ->has('program.payment_plans')
            ->has('program.available_kloters')
            ->where('program.has_class_access', false));
});

it('returns a selected class as an admin Week and Day workspace', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('admin.modules.index', [
            'program_id' => $fixture['program']->id,
            'focus' => 'flashcard',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ModulMateri/ManajemenModulMateri')
            ->where('filters.program_id', (string) $fixture['program']->id)
            ->where('filters.focus', 'flashcard')
            ->has('modules.data', 1)
            ->where('modules.data.0.id', $fixture['module']->id)
            ->has('modules.data.0.days', 2)
            ->where('modules.data.0.days.0.day_number', 1)
            ->where('modules.data.0.days.0.is_ready', true)
            ->where('modules.data.0.days.0.completion_method', 'flashcard')
            ->has('modules.data.0.days.0.flashcard_sets', 1)
            ->where('modules.data.0.days.0.flashcard_sets.0.item_count', 1));
});

it('does not mix Weeks from every class when the admin workspace has no class context', function () {
    createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('admin.modules.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ModulMateri/ManajemenModulMateri')
            ->has('modules.data', 0));
});

it('opens the quiz editor after creating a quiz from a Day context', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);

    $response = $this->actingAs($admin)
        ->post(route('admin.quizzes.store'), [
            'module_id' => $fixture['module']->id,
            'module_day_id' => $fixture['dayOne']->id,
            'type' => 'multiple_choice',
            'time_limit' => null,
            'passing_score' => 70,
            'status' => 'draft',
        ]);

    $quiz = Kuis::query()->latest('id')->firstOrFail();

    $response->assertRedirect(route('admin.quizzes.builder', $quiz));
    expect($quiz->module_day_id)->toBe($fixture['dayOne']->id);
});

it('rejects direct resource URLs for a locked Day', function () {
    $fixture = createDayRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $query = [
        'module' => $fixture['module']->id,
        'day' => $fixture['dayTwo']->id,
    ];

    $this->actingAs($user)
        ->get(route('user.modul.program.kosakata', $fixture['program']->slug).'?'.http_build_query($query))
        ->assertForbidden();

    $this->actingAs($user)
        ->get(route('user.modul.program.presentasi', $fixture['program']->slug).'?'.http_build_query($query))
        ->assertForbidden();
});

it('treats the all Week vocabulary filter as no module filter', function () {
    $fixture = createDayRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);

    $this->actingAs($user)
        ->get(route('user.modul.program.kosakata', $fixture['program']->slug).'?module=all&content_type=kanji')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Kosakata/KosakataPage')
            ->where('selected_module_id', null));
});

it('keeps the next Week locked until the previous Week is complete', function () {
    $fixture = createDayRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $nextModule = Modul::create([
        'level_id' => $fixture['module']->level_id,
        'program_pembelajaran_id' => $fixture['program']->id,
        'title' => 'Penerapan Pola Kalimat',
        'week_number' => 2,
        'description' => 'Week lanjutan.',
        'status' => 'published',
    ]);
    $roadmap = app(ProgresRoadmapService::class);

    expect($roadmap->statusAksesModul($user, $nextModule))
        ->toMatchArray([
            'allowed' => false,
            'reason' => 'previous_week_required',
        ]);

    Progres::create([
        'user_id' => $user->id,
        'module_id' => $fixture['module']->id,
        'completed_at' => now(),
    ]);

    expect($roadmap->statusAksesModul($user, $nextModule)['allowed'])->toBeTrue();
});

it('stores handwriting practice without changing quiz score or Day requirements', function () {
    $fixture = createDayRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $quiz = Kuis::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['dayOne']->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'published',
    ]);
    $fixture['dayOne']->update(['checkpoint_quiz_id' => $quiz->id]);
    $scoredQuestion = Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'multiple_choice',
        'question_text' => 'Pilih jawaban benar.',
        'correct_answer' => 'A',
        'options' => ['A', 'B'],
        'order' => 1,
        'points' => 2,
    ]);
    $practiceQuestion = Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'handwriting',
        'question_text' => 'Tulis kanji baru.',
        'correct_answer' => '新',
        'options' => [
            'schema' => 'handwriting-v1',
            'practice_only' => true,
            'character' => '新',
            'stroke_count' => 13,
        ],
        'order' => 2,
        'points' => 50,
    ]);
    $set = SetFlashcard::where('module_day_id', $fixture['dayOne']->id)->firstOrFail();
    ReviewFlashcard::create([
        'user_id' => $user->id,
        'flashcard_id' => $set->flashcards()->firstOrFail()->id,
        'status' => 'learning',
    ]);
    app(ProgresRoadmapService::class)->selesaikanDariFlashcard($user, $set);

    $this->actingAs($user)
        ->postJson(route('user.questions.check', $practiceQuestion), [
            'answer' => '新',
            'answer_payload' => [
                'completed_strokes' => 13,
                'total_strokes' => 13,
                'attempts_by_stroke' => array_fill(0, 13, 1),
                'mistakes' => 0,
                'hints_used' => 0,
                'duration_ms' => 5000,
                'revealed' => false,
            ],
        ])
        ->assertOk()
        ->assertJsonPath('practice_only', true)
        ->assertJsonPath('is_correct', true);

    $this->actingAs($user)
        ->postJson(route('user.attempts.store'), [
            'quiz_id' => $quiz->id,
            'answers' => [
                [
                    'question_id' => $scoredQuestion->id,
                    'answer_text' => 'A',
                ],
                [
                    'question_id' => $practiceQuestion->id,
                    'answer_text' => '新',
                    'answer_payload' => [
                        'completed_strokes' => 13,
                        'total_strokes' => 13,
                        'attempts_by_stroke' => array_fill(0, 13, 1),
                        'mistakes' => 0,
                        'hints_used' => 0,
                        'duration_ms' => 5000,
                        'revealed' => false,
                    ],
                ],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('score', 100)
        ->assertJsonPath('total_questions', 1)
        ->assertJsonPath('practice_questions', 1)
        ->assertJsonPath('passed', true);

    $attempt = PengerjaanKuis::where('quiz_id', $quiz->id)->firstOrFail();

    expect($attempt->answers()->where('question_id', $practiceQuestion->id)->value('earned_points'))->toBe(0)
        ->and($attempt->answers()->where('question_id', $practiceQuestion->id)->value('answer_payload'))->not->toBeNull();
})->skip('Digantikan oleh alur handwriting berbasis flashcard.');

it('lets an admin add handwriting questions from the Day vocabulary picker', function () {
    $fixture = createDayRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $vocabulary = Kosakata::create([
        'module_id' => $fixture['module']->id,
        'content_type' => 'kanji',
        'word' => '新',
        'reading' => 'しん',
        'meaning_id' => 'baru',
        'status' => 'published',
    ]);
    // The picker is scoped to the Week, so vocabulary assigned to another Day remains reusable.
    $vocabulary->days()->sync([$fixture['dayTwo']->id]);
    $quiz = Kuis::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['dayOne']->id,
        'type' => 'multiple_choice',
        'status' => 'draft',
    ]);

    $this->actingAs($admin)
        ->getJson(route('admin.vocabulary.picker', [
            'module_id' => $fixture['module']->id,
            'module_day_id' => $fixture['dayOne']->id,
        ]))
        ->assertOk()
        ->assertJsonPath('data.0.id', $vocabulary->id)
        ->assertJsonPath('data.0.writing_characters.0.character', '新');

    $this->actingAs($admin)
        ->post(route('admin.quizzes.questions.generate-vocabulary', $quiz), [
            'mode' => 'handwriting',
            'count' => 1,
            'status' => 'all',
            'content_type' => 'all',
            'vocabulary_ids' => [$vocabulary->id],
            'handwriting_selections' => [[
                'vocabulary_id' => $vocabulary->id,
                'character' => '新',
            ]],
        ])
        ->assertRedirect();

    $question = $quiz->questions()->firstOrFail();

    expect($question->type)->toBe('handwriting')
        ->and($question->correct_answer)->toBe('新')
        ->and($question->options['practice_only'])->toBeTrue()
        ->and($question->options['vocabulary_id'])->toBe($vocabulary->id);
})->skip('Generator soal handwriting sudah dihentikan.');

it('seeds handwriting demo content idempotently', function () {
    $this->seed(KelasDemoSeeder::class);
    $this->seed(KelasDemoSeeder::class);

    $questions = Soal::query()->where('type', 'handwriting')->get();
    $question = $questions->firstOrFail();
    $vocabularyId = (int) $question->options['vocabulary_id'];
    $vocabulary = Kosakata::findOrFail($vocabularyId);

    expect($questions)->toHaveCount(12)
        ->and($question->options['practice_only'])->toBeTrue()
        ->and($question->options['stroke_count'])->toBeGreaterThan(0)
        ->and($vocabulary->days()->exists())->toBeTrue()
        ->and(Flashcard::query()->where('vocabulary_id', $vocabulary->id)->count())->toBe(1);
})->skip('Seeder sekarang menyimpan sumber handwriting sebagai flashcard.');

it('seeds an idempotent three-Day roadmap for every demo Week', function () {
    $this->seed(KelasDemoSeeder::class);
    $this->seed(KelasDemoSeeder::class);

    expect(ProgramPembelajaran::count())->toBe(2)
        ->and(Modul::count())->toBe(6)
        ->and(HariModul::count())->toBe(18)
        ->and(SetFlashcard::count())->toBe(18)
        ->and(Kuis::count())->toBe(18);

    Modul::with(['days', 'flashcardSets', 'quizzes', 'presentationDecks'])
        ->get()
        ->each(function (Modul $module) {
            expect($module->days->pluck('day_number')->sort()->values()->all())->toBe([1, 2, 3])
                ->and($module->flashcardSets)->toHaveCount(3)
                ->and($module->quizzes)->toHaveCount(3)
                ->and($module->presentationDecks->where('audience_scope', 'shared'))->toHaveCount(3);

            $module->days->each(function (HariModul $day) use ($module) {
                expect($module->flashcardSets->where('module_day_id', $day->id))->toHaveCount(1)
                    ->and($day->checkpoint_quiz_id)->not->toBeNull()
                    ->and($module->quizzes->firstWhere('id', $day->checkpoint_quiz_id)?->module_day_id)->toBe($day->id);
            });
        });
});

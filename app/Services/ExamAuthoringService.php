<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamSection;
use App\Models\ExamSession;
use App\Models\ExamVersion;
use App\Models\ExamVersionQuestion;
use App\Models\Pengguna;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ExamAuthoringService
{
    public function __construct(private readonly ExamAuditService $audit) {}

    public function create(array $data, Pengguna $actor): Exam
    {
        return DB::transaction(function () use ($data, $actor) {
            $exam = Exam::create([
                ...Arr::only($data, ['level_id', 'category', 'ssw_field', 'title', 'description', 'type', 'access_type']),
                'slug' => $this->uniqueSlug($data['slug'] ?? $data['title']),
                'status' => 'draft',
                'created_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);
            $exam->versions()->create([
                'version_number' => 1,
                'status' => 'draft',
                'attempt_limit' => $data['attempt_limit'] ?? null,
                'result_release_policy' => $data['result_release_policy'] ?? ($data['type'] === 'practice' ? 'immediate' : 'manual'),
                'review_policy' => $data['review_policy'] ?? 'wrong_only',
                'ranking_policy' => $data['type'] === 'simulation' ? ($data['ranking_policy'] ?? 'first_attempt') : 'disabled',
                'estimated_total_pass_score' => $data['estimated_total_pass_score'] ?? null,
                'total_time_limit_seconds' => ($data['category'] ?? 'jlpt') === 'jft_basic' ? 3600 : null,
            ]);
            $this->audit->record($exam, 'created', $actor);

            return $exam->load('level', 'versions');
        });
    }

    public function update(Exam $exam, array $data, Pengguna $actor): Exam
    {
        return DB::transaction(function () use ($exam, $data, $actor) {
            $exam = Exam::whereKey($exam->id)->lockForUpdate()->firstOrFail();
            $hasPublishedHistory = $exam->versions()->whereIn('status', ['published', 'retired'])->exists();
            if ($hasPublishedHistory && ((array_key_exists('type', $data) && $data['type'] !== $exam->type)
                || (array_key_exists('level_id', $data) && (int) $data['level_id'] !== (int) $exam->level_id))) {
                throw ValidationException::withMessages(['exam' => 'Jenis dan level tidak dapat diubah setelah ujian memiliki versi terbit.']);
            }
            if (($data['status'] ?? null) === 'published' && ! $exam->versions()->where('status', 'published')->exists()) {
                throw ValidationException::withMessages(['status' => 'Terbitkan versi ujian terlebih dahulu.']);
            }
            $exam->update([...Arr::only($data, ['level_id', 'title', 'description', 'type', 'access_type', 'status']), 'updated_by' => $actor->id]);
            $this->audit->record($exam, 'updated', $actor);
            $this->flushCache();

            return $exam->refresh();
        });
    }

    public function createDraftVersion(Exam $exam, Pengguna $actor): ExamVersion
    {
        return DB::transaction(function () use ($exam, $actor) {
            $source = $exam->versions()->with('sections.questions')->where('status', 'published')->latest('version_number')->lockForUpdate()->first();
            $number = ((int) $exam->versions()->max('version_number')) + 1;
            $draft = $exam->versions()->create([
                'version_number' => $number,
                'status' => 'draft',
                'attempt_limit' => $source?->attempt_limit,
                'result_release_policy' => $source?->result_release_policy ?? 'manual',
                'review_policy' => $source?->review_policy ?? 'wrong_only',
                'ranking_policy' => $source?->ranking_policy ?? 'disabled',
                'estimated_total_pass_score' => $source?->estimated_total_pass_score,
                'total_time_limit_seconds' => $source?->total_time_limit_seconds,
            ]);

            foreach ($source?->sections ?? [] as $section) {
                $newSection = $draft->sections()->create($section->only(['key', 'title', 'short_title', 'sort_order', 'time_limit_seconds', 'raw_max_points', 'estimated_max_score', 'estimated_pass_score']));
                foreach ($section->questions as $question) {
                    $newSection->questions()->create($question->makeVisible(['correct_answer', 'correct_answer_reading', 'explanation', 'explanation_reading', 'content_hash'])->only([
                        'source_question_id', 'code', 'type', 'sort_order', 'points', 'question_text', 'question_reading', 'options', 'option_readings', 'correct_answer', 'correct_answer_reading', 'explanation', 'explanation_reading', 'audio_path', 'content_hash',
                    ]));
                }
            }

            $this->audit->record($draft, 'draft_created', $actor, ['source_version_id' => $source?->id]);

            return $draft->load('sections.questions');
        });
    }

    public function updateVersion(ExamVersion $version, array $data): ExamVersion
    {
        return DB::transaction(function () use ($version, $data) {
            $locked = ExamVersion::whereKey($version->id)->lockForUpdate()->firstOrFail();
            $this->assertDraft($locked);
            $locked->update($data);

            return $locked->refresh();
        });
    }

    public function syncSections(ExamVersion $version, array $sections): ExamVersion
    {
        DB::transaction(function () use ($version, $sections) {
            $version = ExamVersion::whereKey($version->id)->lockForUpdate()->firstOrFail();
            $this->assertDraft($version);
            $version->sections()->update(['sort_order' => DB::raw('sort_order + 10000')]);
            $keep = [];
            foreach ($sections as $section) {
                $model = $version->sections()->updateOrCreate(['key' => $section['key']], $section);
                $keep[] = $model->id;
            }
            $version->sections()->whereNotIn('id', $keep)->delete();
        });

        return $version->load('sections.questions');
    }

    public function syncQuestions(ExamSection $section, array $questions): ExamSection
    {
        DB::transaction(function () use ($section, $questions) {
            $version = ExamVersion::whereKey($section->exam_version_id)->lockForUpdate()->firstOrFail();
            $this->assertDraft($version);
            $section = $version->sections()->whereKey($section->id)->firstOrFail();
            $section->questions()->update(['sort_order' => DB::raw('sort_order + 10000')]);
            $keep = [];
            foreach ($questions as $question) {
                $question['content_hash'] = hash('sha256', json_encode($question, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
                $model = isset($question['id'])
                    ? $section->questions()->whereKey($question['id'])->firstOrFail()
                    : new ExamVersionQuestion(['exam_section_id' => $section->id]);
                $model->fill($question)->save();
                $keep[] = $model->id;
            }
            $section->questions()->whereNotIn('id', $keep)->delete();
            $section->update(['raw_max_points' => $section->questions()->sum('points')]);
        });

        return $section->load('questions');
    }

    public function readiness(ExamVersion $version): array
    {
        $version->load('exam', 'sections.questions');
        $errors = [];
        if ($version->exam->category === 'jft_basic') {
            $keys = $version->sections->sortBy('sort_order')->pluck('key')->values()->all();
            if ($keys !== ['vocabulary', 'conversation', 'listening', 'reading']) {
                $errors[] = 'JFT-Basic memerlukan bagian huruf dan kosakata, percakapan, mendengarkan, dan membaca sesuai urutan.';
            }
            if ((int) $version->total_time_limit_seconds !== 3600) {
                $errors[] = 'Waktu total JFT-Basic harus 60 menit.';
            }
        }
        if ($version->sections->isEmpty()) {
            $errors[] = 'Ujian belum memiliki bagian.';
        }
        foreach ($version->sections as $section) {
            if ($section->questions->isEmpty()) {
                $errors[] = "Bagian {$section->title} belum memiliki soal.";
            }
            if ($section->time_limit_seconds < 60) {
                $errors[] = "Durasi bagian {$section->title} minimal satu menit.";
            }
            if ($section->estimated_pass_score > $section->estimated_max_score) {
                $errors[] = "Batas lulus bagian {$section->title} melebihi skor maksimalnya.";
            }
            foreach ($section->questions as $question) {
                if (trim((string) $question->correct_answer) === '') {
                    $errors[] = "Soal {$question->code} belum memiliki kunci jawaban.";
                }
                if ($question->type === 'listening' && ! $question->audio_path) {
                    $errors[] = "Soal {$question->code} belum memiliki audio.";
                }
                if ($version->exam->category === 'jft_basic' && $section->key === 'listening' && $question->type !== 'listening') {
                    $errors[] = "Soal {$question->code} pada bagian mendengarkan harus bertipe audio.";
                }
            }
        }
        $maximumScore = (int) $version->sections->sum('estimated_max_score');
        if ($maximumScore > 65535) {
            $errors[] = 'Total skor maksimal terlalu besar.';
        }
        if ($version->exam->type === 'simulation' && ! $version->estimated_total_pass_score) {
            $errors[] = 'Batas estimasi lulus total simulasi belum diatur.';
        } elseif ($version->estimated_total_pass_score && $version->estimated_total_pass_score > $maximumScore) {
            $errors[] = 'Batas estimasi lulus total melebihi skor maksimal seluruh bagian.';
        }

        return ['valid' => $errors === [], 'errors' => array_values(array_unique($errors))];
    }

    public function publish(ExamVersion $version, Pengguna $actor): ExamVersion
    {
        return DB::transaction(function () use ($version, $actor) {
            Exam::whereKey($version->exam_id)->lockForUpdate()->firstOrFail();
            $locked = ExamVersion::whereKey($version->id)->lockForUpdate()->firstOrFail();
            $this->assertDraft($locked);
            $readiness = $this->readiness($locked);
            if (! $readiness['valid']) {
                throw ValidationException::withMessages(['version' => $readiness['errors']]);
            }
            $locked->load('sections.questions');
            $hash = hash('sha256', $locked->sections->toJson(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            $locked->exam->versions()->where('status', 'published')->update(['status' => 'retired']);
            $locked->update(['status' => 'published', 'content_hash' => $hash, 'published_at' => now(), 'published_by' => $actor->id]);
            $locked->exam->update(['status' => 'published', 'updated_by' => $actor->id]);
            $this->audit->record($locked, 'published', $actor, ['content_hash' => $hash]);
            $this->flushCache();

            return $locked->refresh();
        });
    }

    public function createSession(ExamVersion $version, array $data, Pengguna $actor): ExamSession
    {
        abort_if($version->status !== 'published', 422, 'Sesi hanya dapat dibuat dari versi terbit.');

        return DB::transaction(function () use ($version, $data, $actor) {
            $cohorts = $data['cohort_ids'] ?? [];
            unset($data['cohort_ids']);
            $session = $version->sessions()->create([...$data, 'created_by' => $actor->id]);
            $session->cohorts()->sync($cohorts);
            $this->audit->record($session, 'created', $actor);
            $this->flushCache();

            return $session->load('cohorts');
        });
    }

    public function flushCache(): void
    {
        Cache::forget('exam:catalog:version');
    }

    private function assertDraft(ExamVersion $version): void
    {
        abort_if($version->status !== 'draft', 409, 'Versi yang sudah diterbitkan tidak dapat diubah.');
    }

    private function uniqueSlug(string $value): string
    {
        $base = Str::slug($value) ?: Str::random(10);
        $slug = $base;
        for ($suffix = 2; Exam::where('slug', $slug)->exists(); $suffix++) {
            $slug = $base.'-'.$suffix;
        }

        return $slug;
    }
}

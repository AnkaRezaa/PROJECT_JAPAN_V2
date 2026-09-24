<?php

namespace App\Services;

use App\Models\GrammarBank;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\PelajaranGrammar;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\LengthAwarePaginator as ConcretePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GrammarBankService
{
    public function list(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        if (! Schema::hasTable('grammar_bank')) {
            return new ConcretePaginator([], 0, $perPage);
        }

        $query = GrammarBank::query()
            ->with(['level', 'creator:id,name'])
            ->withCount(['lessons', 'examQuestions'])
            ->latest('id');

        if (! empty($filters['search'])) {
            $query->search($filters['search']);
        }

        if (! empty($filters['level']) && $filters['level'] !== 'all') {
            $query->level($filters['level']);
        }

        if (! empty($filters['category']) && $filters['category'] !== 'all') {
            $query->where('category', $filters['category']);
        }

        if (! empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        return $query->paginate($perPage)->withQueryString();
    }

    public function store(array $data, ?int $userId = null): GrammarBank
    {
        $jlptLevel = strtoupper(trim((string) ($data['jlpt_level'] ?? 'N3')));
        $levelId = $data['level_id'] ?? null;

        if (! $levelId) {
            $levelId = LevelPembelajaran::where('level_name', 'like', "%{$jlptLevel}%")->value('id');
        }

        $lessonKey = ! empty($data['lesson_key'])
            ? Str::slug($data['lesson_key'])
            : Str::slug(($data['pattern'] ?? 'grammar').'-'.($data['title'] ?? 'pola').'-'.Str::random(4));

        return GrammarBank::create([
            'level_id' => $levelId,
            'jlpt_level' => $jlptLevel,
            'lesson_key' => $lessonKey,
            'pattern' => trim((string) ($data['pattern'] ?? '')),
            'title' => trim((string) ($data['title'] ?? '')),
            'meaning' => trim((string) ($data['meaning'] ?? '')),
            'formula' => trim((string) ($data['formula'] ?? '')),
            'explanation' => trim((string) ($data['explanation'] ?? '')),
            'examples' => $data['examples'] ?? [],
            'category' => $data['category'] ?? 'bunpo',
            'tags' => $data['tags'] ?? [],
            'status' => $data['status'] ?? 'published',
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);
    }

    public function update(GrammarBank $grammarBank, array $data, ?int $userId = null): GrammarBank
    {
        $jlptLevel = strtoupper(trim((string) ($data['jlpt_level'] ?? $grammarBank->jlpt_level)));
        $levelId = $data['level_id'] ?? $grammarBank->level_id;

        if (! $levelId && $jlptLevel) {
            $levelId = LevelPembelajaran::where('level_name', 'like', "%{$jlptLevel}%")->value('id');
        }

        $grammarBank->update([
            'level_id' => $levelId,
            'jlpt_level' => $jlptLevel,
            'pattern' => trim((string) ($data['pattern'] ?? $grammarBank->pattern)),
            'title' => trim((string) ($data['title'] ?? $grammarBank->title)),
            'meaning' => trim((string) ($data['meaning'] ?? $grammarBank->meaning)),
            'formula' => trim((string) ($data['formula'] ?? $grammarBank->formula)),
            'explanation' => trim((string) ($data['explanation'] ?? $grammarBank->explanation)),
            'examples' => $data['examples'] ?? $grammarBank->examples,
            'category' => $data['category'] ?? $grammarBank->category,
            'tags' => $data['tags'] ?? $grammarBank->tags,
            'status' => $data['status'] ?? $grammarBank->status,
            'updated_by' => $userId,
        ]);

        return $grammarBank->fresh();
    }

    public function delete(GrammarBank $grammarBank): bool
    {
        return $grammarBank->delete();
    }

    public function assignToDay(GrammarBank $grammarBank, HariModul $day): Kuis
    {
        return DB::transaction(function () use ($grammarBank, $day) {
            $existingQuiz = $day->quizzes()
                ->where('type', 'grammar')
                ->whereHas('grammarLesson', fn ($q) => $q->where('grammar_bank_id', $grammarBank->id))
                ->first();

            if ($existingQuiz) {
                return $existingQuiz;
            }

            $quiz = Kuis::create([
                'module_id' => $day->module_id,
                'module_day_id' => $day->id,
                'type' => 'grammar',
                'time_limit' => null,
                'passing_score' => 70,
                'status' => 'draft',
            ]);

            PelajaranGrammar::create([
                'quiz_id' => $quiz->id,
                'grammar_bank_id' => $grammarBank->id,
                'lesson_key' => $grammarBank->lesson_key . '-day-' . $day->id,
                'level' => $grammarBank->jlpt_level,
                'pattern' => $grammarBank->pattern,
                'title' => $grammarBank->title,
                'meaning' => $grammarBank->meaning,
                'formula' => $grammarBank->formula,
                'explanation' => $grammarBank->explanation,
                'examples' => $grammarBank->examples,
                'settings' => [
                    'counts' => ['transformation' => 5, 'sentence_builder' => 5, 'context_choice' => 5],
                    'difficulty' => 'mixed',
                    'useDistractors' => true,
                ],
            ]);

            return $quiz;
        });
    }

    public function levels(): array
    {
        return LevelPembelajaran::select('id', 'level_name')
            ->orderBy('stage')
            ->get()
            ->map(fn ($level) => [
                'id' => $level->id,
                'name' => $level->level_name,
                'code' => preg_replace('/[^N0-9]/', '', $level->level_name) ?: $level->level_name,
            ])
            ->toArray();
    }
}

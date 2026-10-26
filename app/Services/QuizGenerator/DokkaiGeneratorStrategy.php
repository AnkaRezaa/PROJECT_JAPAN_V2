<?php

namespace App\Services\QuizGenerator;

use App\Contracts\QuizGeneratorStrategyInterface;
use App\Models\Kuis;
use App\Services\KloterBelajarService;
use App\Services\KuisDokkaiService;
use Illuminate\Validation\ValidationException;

final class DokkaiGeneratorStrategy implements QuizGeneratorStrategyInterface
{
    public function __construct(private readonly KuisDokkaiService $dokkai, private readonly KloterBelajarService $scope) {}

    public function generateDraft(array $payload, array $settings): array
    {
        $quiz = Kuis::where('type', 'dokkai')->findOrFail($payload['input']['source_quiz_id']);
        if ($quiz->module_id) {
            $this->scope->abortJikaModulDiLuarCakupan($payload['_user'], $quiz->module_id);
        } else {
            abort_unless($payload['_user']->isAdminGlobal(), 403);
        }
        $source = $this->dokkai->payload($quiz, true);
        $sourceLevel = preg_replace('/^JLPT\s*/i', '', (string) ($source['quiz']['jlpt_level'] ?? ''));
        $targetLevel = preg_replace('/^JLPT\s*/i', '', (string) ($payload['level'] ?? ''));
        if ($sourceLevel !== $targetLevel) {
            throw ValidationException::withMessages(['input.source_quiz_id' => 'Level wacana tidak sesuai dengan filter.']);
        }
        $paragraphs = collect($source['paragraphs'])->keyBy('id');
        $paragraphNumbers = $paragraphs->keys()->flip()->map(fn ($index) => $index + 1);
        $questions = [];
        foreach ($source['questions'] as $q) {
            $optionTexts = array_map(fn ($option) => trim($option['option_text']), $q['options']);
            $correct = collect($q['options'])->where('is_correct', true);
            $paragraph = $paragraphs->get($q['evidence_paragraph_id']);
            if (! trim($q['question_text']) || count($optionTexts) < 2 || count($optionTexts) > 8
                || count(array_unique($optionTexts)) !== count($optionTexts) || in_array('', $optionTexts, true)
                || $correct->count() !== 1 || ! $paragraph || ! trim($q['evidence_quote'] ?? '')
                || ! str_contains($paragraph['content_raw'], $q['evidence_quote'])) {
                continue;
            }
            $questions[] = QuizGeneratorDraft::question([
                'prompt' => $q['question_text'], 'translation' => $q['question_translation'],
                ...QuizGeneratorDraft::choices($optionTexts, $correct->first()['option_text'], [], array_column($q['options'], 'option_translation')),
                'explanation' => $q['explanation_correct'], 'distractor_explanations' => $q['explanation_distractors'],
                'source' => ['type' => 'dokkai', 'id' => $q['id'], 'quiz_id' => $quiz->id],
                'evidence' => ['paragraph_number' => $paragraphNumbers->get($paragraph['id']), 'quote' => $q['evidence_quote']],
            ]);
        }
        $questions = collect($questions)->shuffle()->take((int) ($settings['count'] ?? count($questions)))->all();
        if (! $questions) {
            throw ValidationException::withMessages(['input.source_quiz_id' => 'Wacana ini belum memiliki soal dengan opsi dan eviden yang valid.']);
        }
        $material = [
            'passage' => $source['quiz'],
            'paragraphs' => array_map(fn ($p) => [...array_diff_key($p, ['id' => true]), 'paragraph_number' => $paragraphNumbers->get($p['id'])], $source['paragraphs']),
            'vocabularies' => array_map(fn ($v) => [
                ...array_diff_key($v, ['id' => true, 'paragraph_id' => true]),
                'paragraph_number' => $paragraphNumbers->get($v['paragraph_id'] ?? null),
            ], $source['vocabularies']),
        ];
        unset($material['passage']['id'], $material['passage']['status'], $material['passage']['time_limit'], $material['passage']['passing_score'], $material['passage']['xp_reward']);

        return QuizGeneratorDraft::pack('dokkai', $payload['level'], $material, $questions);
    }

    public function regenerateSingleQuestion(string $id, array $context): array
    {
        $draft = $this->generateDraft($context['payload'], ['count' => 60]);
        $used = collect($context['existing_questions'])->pluck('source.id')->all();
        $question = collect($draft['questions'])->first(fn ($q) => ! in_array($q['source']['id'], $used, true));
        if (! $question) {
            throw ValidationException::withMessages(['question_id' => 'Tidak ada soal alternatif pada wacana yang sama.']);
        }

        return [...$question, 'id' => $id];
    }
}

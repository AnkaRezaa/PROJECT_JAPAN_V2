<?php

namespace App\Services\QuizGenerator;

use App\Contracts\QuizGeneratorStrategyInterface;
use App\Services\KuisGrammarGeneratorService;
use Illuminate\Validation\ValidationException;

final class GrammarGeneratorStrategy implements QuizGeneratorStrategyInterface
{
    public function __construct(private readonly KuisGrammarGeneratorService $generator) {}

    private function lesson(array $payload): array
    {
        $lesson = [...($payload['input'] ?? []), 'level' => $payload['level']];
        $lesson['examples'] = array_values(array_filter($lesson['examples'] ?? [], fn ($example) => trim($example['japanese'] ?? '') !== ''));
        if (! $lesson['examples']) {
            throw ValidationException::withMessages(['input.examples' => 'Tambahkan contoh kalimat yang valid sebelum membuat soal.']);
        }

        return $lesson;
    }

    private function engine(array $payload): KuisGrammarGeneratorService
    {
        return $this->generator->forModule($payload['_quiz']?->module_id ?? null);
    }

    public function generateDraft(array $payload, array $settings): array
    {
        $lesson = $this->lesson($payload);
        $stages = $this->engine($payload)->generateFromLesson($lesson, $settings);
        $questions = [];
        foreach ($stages as $stage => $items) {
            foreach ($items as $question) {
                $questions[] = $this->normalize($question, $stage);
            }
        }

        return QuizGeneratorDraft::pack('grammar', $payload['level'], ['lesson' => $lesson], $questions);
    }

    public function regenerateSingleQuestion(string $id, array $context): array
    {
        $question = collect($context['existing_questions'])->firstWhere('id', $id);
        abort_unless($question, 422, 'Soal yang diperbarui tidak ditemukan dalam draf.');
        $stage = $question['stage'];
        $lesson = $this->lesson($context['payload']);
        $settings = $context['settings'] ?? [];
        $existing = collect($context['existing_questions']);

        if ($stage === 'sentence_builder') {
            $usedSentences = $existing
                ->where('stage', 'sentence_builder')
                ->map(function ($q) {
                    return collect($q['answer']['correct_order'] ?? [])
                        ->map(fn ($tokId) => collect($q['tokens'] ?? [])->firstWhere('id', $tokId)['text'] ?? '')
                        ->implode('');
                })
                ->map(fn ($text) => str_replace(['|', ' '], '', trim((string) $text)))
                ->filter()
                ->all();

            $availableExamples = array_values(array_filter(
                $lesson['examples'],
                fn ($ex) => ! in_array(str_replace(['|', ' '], '', trim((string) ($ex['japanese'] ?? ''))), $usedSentences, true)
            ));

            if (empty($availableExamples)) {
                throw ValidationException::withMessages(['question_id' => 'Belum tersedia variasi soal baru. Tambahkan bahan atau ubah pengaturan.']);
            }

            $lesson['examples'] = $availableExamples;
        } elseif ($stage === 'context_choice') {
            $usedAnswers = $existing
                ->where('stage', 'context_choice')
                ->map(function ($q) {
                    return collect($q['choices'] ?? [])->firstWhere('id', $q['answer']['choice_id'] ?? null)['text']
                        ?? '';
                })
                ->map(fn ($text) => str_replace(['|', ' '], '', trim((string) $text)))
                ->filter()
                ->all();

            $availableExamples = array_values(array_filter(
                $lesson['examples'],
                fn ($ex) => ! in_array(str_replace(['|', ' '], '', trim((string) ($ex['japanese'] ?? ''))), $usedAnswers, true)
            ));

            if (empty($availableExamples)) {
                throw ValidationException::withMessages(['question_id' => 'Belum tersedia variasi soal baru. Tambahkan bahan atau ubah pengaturan.']);
            }

            $lesson['examples'] = $availableExamples;
        } elseif ($stage === 'transformation') {
            $usedBases = $existing
                ->where('stage', 'transformation')
                ->pluck('japanese')
                ->map(fn ($j) => trim((string) $j))
                ->filter()
                ->all();

            $settings['exclude_verbs'] = $usedBases;
        }

        $native = $this->engine($context['payload'])->regenerateSingleQuestion(
            $stage, $lesson, $settings, 0
        );

        return [...$this->normalize($native, $stage), 'id' => $id];
    }

    private function normalize(array $q, string $stage): array
    {
        $answer = $stage === 'sentence_builder'
            ? ['tokens' => $q['tokens'] ?? [], 'answer' => ['correct_order' => $q['correctOrder'] ?? []]]
            : QuizGeneratorDraft::choices($q['choices'] ?? [], $q['correctAnswer'] ?? '');

        return QuizGeneratorDraft::question([
            'kind' => $stage === 'sentence_builder' ? 'sentence_builder' : 'choice', 'stage' => $stage,
            'prompt' => $q['prompt'] ?? '',
            'japanese' => $stage === 'transformation' ? ($q['japanese'] ?? '') : '',
            'reading' => $stage === 'transformation' ? ($q['reading'] ?? null) : null,
            'translation' => $q['translation'] ?? null,
            'context' => $q['context'] ?? null, 'explanation' => $q['explanation'] ?? null,
            'source' => ['type' => 'grammar'], ...$answer,
        ]);
    }
}

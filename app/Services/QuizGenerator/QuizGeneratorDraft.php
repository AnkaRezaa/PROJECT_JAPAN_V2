<?php

namespace App\Services\QuizGenerator;

use Illuminate\Support\Str;

final class QuizGeneratorDraft
{
    public static function pack(string $type, string $level, array $material, array $questions): array
    {
        return ['schema_version' => 1, 'type' => $type, 'level' => $level,
            'material' => $material, 'questions' => array_values($questions), 'warnings' => []];
    }

    public static function question(array $fields): array
    {
        return array_replace([
            'id' => (string) Str::uuid(), 'kind' => 'choice', 'stage' => null,
            'prompt' => '', 'japanese' => '', 'reading' => null, 'translation' => null,
            'context' => null, 'choices' => [], 'tokens' => [], 'answer' => [],
            'explanation' => null, 'explanation_reading' => null, 'distractor_explanations' => [], 'audio_url' => null, 'points' => 1, 'source' => null, 'evidence' => null,
        ], $fields);
    }

    public static function choices(array $texts, string $correct, array $readings = [], array $translations = []): array
    {
        $choices = [];
        $correctId = null;
        foreach (array_values($texts) as $index => $text) {
            $id = 'c'.($index + 1);
            $choices[] = ['id' => $id, 'text' => trim((string) $text), 'reading' => $readings[$index] ?? null, 'translation' => $translations[$index] ?? null];
            if (trim((string) $text) === trim($correct)) {
                $correctId = $id;
            }
        }

        return ['choices' => $choices, 'answer' => ['choice_id' => $correctId]];
    }

    public static function vocabularyQuestions(array $draft): array
    {
        return array_map(fn (array $q) => [
            'type' => 'multiple_choice', 'question_text' => $q['prompt'], 'question_reading' => $q['reading'],
            'correct_answer' => collect($q['choices'])->firstWhere('id', $q['answer']['choice_id'])['text'],
            'options' => array_column($q['choices'], 'text'), 'option_readings' => array_column($q['choices'], 'reading'),
            'correct_answer_reading' => collect($q['choices'])->firstWhere('id', $q['answer']['choice_id'])['reading'] ?? null,
            'explanation' => $q['explanation'], 'explanation_reading' => $q['explanation_reading'], 'audio_url' => $q['audio_url'],
        ], $draft['questions']);
    }

    public static function grammarStages(array $draft): array
    {
        $titles = ['transformation' => 'Transformasi Pola', 'sentence_builder' => 'Penyusunan Kalimat', 'context_choice' => 'Pilihan Kontekstual'];
        $stages = [];
        foreach ($titles as $id => $title) {
            $questions = collect($draft['questions'])->where('stage', $id)->map(fn (array $q) => [
                'id' => $q['id'], 'type' => $q['kind'] === 'sentence_builder' ? 'sentence_builder' : $id,
                'prompt' => $q['prompt'], 'japanese' => $q['japanese'], 'reading' => $q['reading'],
                'translation' => $q['translation'], 'context' => $q['context'],
                ...($q['kind'] === 'sentence_builder'
                    ? ['tokens' => $q['tokens'], 'correctOrder' => $q['answer']['correct_order']]
                    : ['choices' => array_column($q['choices'], 'text'), 'correctAnswer' => collect($q['choices'])->firstWhere('id', $q['answer']['choice_id'])['text']]),
                'explanation' => $q['explanation'], 'points' => $q['points'],
            ])->values()->all();
            $stages[] = ['id' => $id, 'title' => $title, 'questions' => $questions];
        }

        return $stages;
    }
}

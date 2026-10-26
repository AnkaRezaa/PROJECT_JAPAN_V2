<?php

namespace App\Services\QuizGenerator;

use App\Contracts\QuizGeneratorStrategyInterface;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

final class QuizGeneratorManager
{
    public function __construct(
        private readonly VocabGeneratorStrategy $vocab,
        private readonly GrammarGeneratorStrategy $grammar,
        private readonly DokkaiGeneratorStrategy $dokkai,
    ) {}

    private function strategy(string $type): QuizGeneratorStrategyInterface
    {
        return match ($type) {
            'vocab' => $this->vocab, 'grammar' => $this->grammar, 'dokkai' => $this->dokkai,
            default => abort(404),
        };
    }

    public function generate(string $type, array $payload, array $settings): array
    {
        $draft = $this->strategy($type)->generateDraft($payload, $settings);
        $this->validateQuestions($draft['questions']);
        $expected = (int) ($type === 'grammar' ? array_sum($settings['counts'] ?? ['transformation' => 5, 'sentence_builder' => 5, 'context_choice' => 5]) : ($settings['count'] ?? 10));
        if ($type !== 'dokkai' && count($draft['questions']) !== $expected) {
            throw ValidationException::withMessages(['settings.count' => 'Bahan tidak cukup untuk jumlah soal yang diminta. Kurangi jumlah atau tambah materi.']);
        }
        if ($type === 'dokkai' && count($draft['questions']) < $expected) {
            $draft['warnings'][] = 'Jumlah soal disesuaikan dengan soal bereviden valid pada wacana ini.';
        }

        return $draft;
    }

    public function regenerate(string $type, string $id, array $context): array
    {
        abort_unless(collect($context['existing_questions'])->contains('id', $id), 422, 'Soal tidak ditemukan dalam draf.');
        $signatures = array_map($this->signature(...), $context['existing_questions']);
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $question = $this->strategy($type)->regenerateSingleQuestion($id, $context);
            $this->validateQuestions([$question]);
            if (! in_array($this->signature($question), $signatures, true)) {
                return $question;
            }
        }
        throw ValidationException::withMessages(['question_id' => 'Belum tersedia variasi soal baru. Tambahkan bahan atau ubah pengaturan.']);
    }

    private function signature(array $q): string
    {
        $correct = ($q['kind'] ?? '') === 'sentence_builder'
            ? collect($q['answer']['correct_order'] ?? [])->map(fn ($id) => collect($q['tokens'] ?? [])->firstWhere('id', $id)['text'] ?? '')->implode('')
            : (collect($q['choices'] ?? [])->firstWhere('id', $q['answer']['choice_id'] ?? null)['text'] ?? '');

        return json_encode([$q['stage'] ?? '', trim($q['prompt'] ?? ''), trim($q['japanese'] ?? ''), $correct]);
    }

    private function validateQuestions(array $questions): void
    {
        Validator::make(['questions' => $questions], [
            'questions' => ['required', 'array', 'min:1', 'max:60'],
            'questions.*.id' => ['required', 'string', 'max:100', 'distinct'],
            'questions.*.kind' => ['required', 'in:choice,sentence_builder'],
            'questions.*.prompt' => ['required', 'string', 'max:10000'],
        ])->validate();
        $seen = [];
        foreach ($questions as $q) {
            $valid = true;
            if ($q['kind'] === 'choice') {
                $texts = array_column($q['choices'], 'text');
                $valid = count($texts) >= 2 && count($texts) <= 8 && count(array_unique($texts)) === count($texts)
                    && ! in_array('', $texts, true) && in_array($q['answer']['choice_id'] ?? null, array_column($q['choices'], 'id'), true);
            } else {
                $ids = array_column($q['tokens'], 'id');
                $order = $q['answer']['correct_order'] ?? [];
                $valid = count($ids) >= 2 && count(array_unique($ids)) === count($ids) && is_array($order) && count($order) >= 2
                    && count(array_unique($order)) === count($order) && ! array_diff($order, $ids);
            }
            $signature = $this->signature($q);
            if (! $valid || isset($seen[$signature])) {
                throw ValidationException::withMessages(['input' => 'Bahan menghasilkan soal berulang atau opsi/token tidak valid. Kurangi jumlah soal atau lengkapi materi.']);
            }
            $seen[$signature] = true;
        }
    }
}

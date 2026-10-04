<?php

namespace App\Services;

use App\Models\GrammarBank;
use App\Models\Kosakata;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class KuisGrammarGeneratorService
{
    private const COMMON_PARTICLE_DISTRACTORS = [
        'まで', 'のに', 'から', 'より', 'だけ', 'しか', 'には', 'でも', 'ほど', 'ばかり', 'こそ', 'へ', 'で'
    ];

    /**
     * Generate complete 3-stage quiz draft from lesson inputs.
     */
    public function generateFromLesson(array $lessonData, array $settings = []): array
    {
        $level = $this->normalizeLevel($lessonData['level'] ?? 'N3');
        $pattern = trim($lessonData['pattern'] ?? '');
        $formula = trim($lessonData['formula'] ?? '');
        $meaning = trim($lessonData['meaning'] ?? '');
        $examples = $lessonData['examples'] ?? [];

        $counts = $settings['counts'] ?? [
            'transformation' => 5,
            'sentence_builder' => 5,
            'context_choice' => 5,
        ];
        $useDistractors = $settings['useDistractors'] ?? true;
        $difficulty = $settings['difficulty'] ?? 'mixed';
        $autoMeaning = $settings['autoMeaning'] ?? true;
        $targetForm = $settings['target_form'] ?? 'auto';

        return [
            'transformation' => $this->generateStage1Transformation($pattern, $formula, $examples, (int) ($counts['transformation'] ?? 5), $difficulty, $level, $targetForm),
            'sentence_builder' => $this->generateStage2SentenceBuilder($examples, $pattern, (int) ($counts['sentence_builder'] ?? 5), $useDistractors, $difficulty, $level),
            'context_choice' => $this->generateStage3ContextChoice($examples, $pattern, $level, (int) ($counts['context_choice'] ?? 5), $difficulty, $autoMeaning),
        ];
    }

    /**
     * Stage 1: Transformation questions.
     * Dynamically adapts to ANY grammar pattern by detecting grammatical conjugation requirement.
     */
    public function generateStage1Transformation(
        string $pattern,
        string $formula,
        array $examples,
        int $targetCount = 5,
        string $difficulty = 'mixed',
        string $level = 'N3',
        string $targetFormOverride = 'auto'
    ): array {
        $questions = [];
        $cleanExamples = array_values(array_filter($examples, fn ($ex) => !empty(trim($ex['japanese'] ?? ''))));

        $detection = $this->detectRequiredConjugation($pattern, $formula, $targetFormOverride);
        $targetForm = $detection['form'];
        $suffix = $detection['suffix'];

        $verbsPool = $this->resolveVerbsPool($level, $cleanExamples);
        if (empty($verbsPool)) {
            foreach ($cleanExamples as $ex) {
                if (!empty($ex['japanese'])) {
                    $firstWord = explode(' ', trim(str_replace('|', ' ', $ex['japanese'])))[0] ?? '';
                    if ($firstWord !== '') {
                        $verbsPool[] = [
                            'base' => $firstWord,
                            'reading' => $ex['reading'] ?? '',
                            'meaning' => $ex['translation'] ?? '',
                        ];
                    }
                }
            }
        }

        if (empty($verbsPool)) {
            throw ValidationException::withMessages([
                'lesson.examples' => 'Tambahkan contoh kalimat pada materi atau pastikan bank kosakata memiliki data untuk menghasilkan soal transformasi.',
            ]);
        }
        shuffle($verbsPool);

        for ($i = 0; $i < $targetCount; $i++) {
            $verb = $verbsPool[$i % count($verbsPool)];
            $base = $verb['base'];
            $reading = $verb['reading'];
            $meaning = $verb['meaning'];

            $correctAnswer = $this->conjugateVerb($base, $targetForm) . $suffix;

            // Generate realistic grammatical distractors using alternate forms
            $distractorForms = array_diff(['te', 'ta', 'nai', 'ba', 'stem', 'dict'], [$targetForm]);
            shuffle($distractorForms);

            $distractors = [];
            foreach ($distractorForms as $altForm) {
                $altCand = $this->conjugateVerb($base, $altForm) . $suffix;
                if ($altCand !== $correctAnswer && !in_array($altCand, $distractors, true)) {
                    $distractors[] = $altCand;
                }
                if (count($distractors) >= 3) {
                    break;
                }
            }

            // Fill if still less than 3
            while (count($distractors) < 3) {
                $distractors[] = $base . 'です';
            }

            $choices = array_merge([$correctAnswer], array_slice($distractors, 0, 3));
            shuffle($choices);

            $cleanPatternDisplay = $pattern ?: 'pola materi';
            $questions[] = [
                'id' => 'gen-trans-' . ($i + 1),
                'type' => 'transformation',
                'prompt' => "Ubah kata berikut ke bentuk yang tepat sesuai kaidah {$cleanPatternDisplay}.",
                'japanese' => $base,
                'reading' => $reading,
                'translation' => $meaning,
                'choices' => $choices,
                'correctAnswer' => $correctAnswer,
                'explanation' => "Berdasarkan rumus {$formula}, bentuk perubahan yang benar dari kata \"{$base}\" adalah \"{$correctAnswer}\".",
                'points' => 1,
            ];
        }

        return $questions;
    }

    /**
     * Stage 2: Sentence Builder questions.
     * Takes sentences from input examples or dynamically queries GrammarBank/Kosakata.
     */
    public function generateStage2SentenceBuilder(
        array $examples,
        string $pattern,
        int $targetCount = 5,
        bool $useDistractors = true,
        string $difficulty = 'mixed',
        string $level = 'N3'
    ): array {
        $questions = [];
        $cleanExamples = array_values(array_filter($examples, fn ($ex) => !empty(trim($ex['japanese'] ?? ''))));

        // If user examples empty, pull real examples dynamically from database
        $sentencesPool = $cleanExamples;
        if (empty($sentencesPool)) {
            $sentencesPool = $this->fetchDatabaseExamples($pattern, $level);
        }

        for ($i = 0; $i < $targetCount; $i++) {
            $item = $sentencesPool[$i % max(1, count($sentencesPool))] ?? [
                'japanese' => $pattern ? "{$pattern}の文法を正しく使います" : '日本語を毎日勉強します',
                'translation' => 'Menggunakan tata bahasa dengan tepat.',
            ];

            $rawJapanese = $item['japanese'] ?? '';
            $translation = $item['translation'] ?? '';

            $rawTokens = $this->smartSegmentJapaneseSentence($rawJapanese);

            $tokens = [];
            $correctOrder = [];

            foreach ($rawTokens as $idx => $tokenText) {
                $tokenId = 't_' . ($i + 1) . '_' . ($idx + 1);
                $tokens[] = [
                    'id' => $tokenId,
                    'text' => $tokenText,
                    'distractor' => false,
                ];
                $correctOrder[] = $tokenId;
            }

            if ($useDistractors) {
                $availableDistractors = array_diff(self::COMMON_PARTICLE_DISTRACTORS, $rawTokens);
                shuffle($availableDistractors);
                $distractorWord = reset($availableDistractors) ?: 'のに';

                $tokens[] = [
                    'id' => 't_' . ($i + 1) . '_d1',
                    'text' => $distractorWord,
                    'distractor' => true,
                ];
            }

            shuffle($tokens);

            $cleanSentence = str_replace('|', '', $rawJapanese);
            $questions[] = [
                'id' => 'gen-sb-' . ($i + 1),
                'type' => 'sentence_builder',
                'prompt' => 'Susun potongan kata berikut menjadi kalimat yang tepat.',
                'context' => $translation,
                'tokens' => $tokens,
                'correctOrder' => $correctOrder,
                'explanation' => "Kalimat lengkap yang benar: {$cleanSentence}" . ($translation ? " ({$translation})." : '.'),
                'points' => 1,
            ];
        }

        return $questions;
    }

    /**
     * Stage 3: Context Choice questions.
     * Takes real situations from user input or database, with dynamic JLPT-level distractors.
     */
    public function generateStage3ContextChoice(
        array $examples,
        string $pattern,
        string $jlptLevel,
        int $targetCount = 5,
        string $difficulty = 'mixed',
        bool $autoMeaning = true
    ): array {
        $questions = [];
        $cleanExamples = array_values(array_filter($examples, fn ($ex) => !empty(trim($ex['japanese'] ?? ''))));

        $sentencesPool = $cleanExamples;
        if (empty($sentencesPool)) {
            $sentencesPool = $this->fetchDatabaseExamples($pattern, $jlptLevel);
        }

        $bankDistractors = $this->fetchDistractorsFromDatabase($jlptLevel, $pattern);

        for ($i = 0; $i < $targetCount; $i++) {
            $item = $sentencesPool[$i % max(1, count($sentencesPool))] ?? null;

            if ($item && !empty($item['japanese'])) {
                $translation = $item['translation'] ?? '';
                $situation = $translation ? "Situasi: {$translation}" : "Situasi penggunaan pola {$pattern}";
                $correctAnswer = str_replace('|', '', $item['japanese']);
            } else {
                $situation = "Situasi penggunaan pola {$pattern}";
                $correctAnswer = $pattern;
            }

            // Distractor selection: Bank DB -> Synthesized -> Fallbacks
            shuffle($bankDistractors);
            $distractors = [];
            foreach ($bankDistractors as $cand) {
                if ($cand !== $correctAnswer && !in_array($cand, $distractors, true)) {
                    $distractors[] = $cand;
                }
                if (count($distractors) >= 3) {
                    break;
                }
            }

            if (count($distractors) < 3) {
                $synthetic = $this->synthesizeGrammaticalDistractors($correctAnswer, $pattern);
                foreach ($synthetic as $synth) {
                    if ($synth !== $correctAnswer && !in_array($synth, $distractors, true)) {
                        $distractors[] = $synth;
                    }
                    if (count($distractors) >= 3) {
                        break;
                    }
                }
            }

            if (count($distractors) < 3) {
                try {
                    $extraExamples = Kosakata::query()
                        ->whereNotNull('example_sentence')
                        ->where('example_sentence', '!=', '')
                        ->inRandomOrder()
                        ->take(10)
                        ->pluck('example_sentence')
                        ->toArray();

                    shuffle($extraExamples);
                    foreach ($extraExamples as $ex) {
                        $cleaned = str_replace('|', '', trim($ex));
                        if ($cleaned !== '' && $cleaned !== $correctAnswer && !in_array($cleaned, $distractors, true)) {
                            $distractors[] = $cleaned;
                        }
                        if (count($distractors) >= 3) {
                            break;
                        }
                    }
                } catch (\Throwable) {
                    // Database query error handled silently
                }
            }

            $choices = array_merge([$correctAnswer], array_slice($distractors, 0, 3));
            shuffle($choices);

            $questions[] = [
                'id' => 'gen-cc-' . ($i + 1),
                'type' => 'context_choice',
                'prompt' => 'Pilih kalimat bahasa Jepang yang paling tepat untuk situasi di bawah.',
                'context' => $situation,
                'choices' => $choices,
                'correctAnswer' => $correctAnswer,
                'explanation' => "Jawaban yang tepat adalah \"{$correctAnswer}\" yang menerapkan kaidah pola {$pattern}.",
                'points' => 1,
            ];
        }

        return $questions;
    }

    /**
     * Regenerate a single question for a specific stage.
     */
    public function regenerateSingleQuestion(string $stage, array $lessonData, array $settings = [], int $index = 0): array
    {
        $pattern = trim($lessonData['pattern'] ?? '');
        $formula = trim($lessonData['formula'] ?? '');
        $examples = $lessonData['examples'] ?? [];
        $level = $this->normalizeLevel($lessonData['level'] ?? 'N3');
        $difficulty = $settings['difficulty'] ?? 'mixed';
        $useDistractors = $settings['useDistractors'] ?? true;
        $autoMeaning = $settings['autoMeaning'] ?? true;

        $targetForm = $settings['target_form'] ?? 'auto';

        if ($stage === 'transformation') {
            $list = $this->generateStage1Transformation($pattern, $formula, $examples, 1, $difficulty, $level, $targetForm);
            $q = $list[0] ?? [];
            $q['id'] = 'gen-trans-' . ($index + 1) . '-' . time();
            return $q;
        }

        if ($stage === 'sentence_builder') {
            $list = $this->generateStage2SentenceBuilder($examples, $pattern, 1, $useDistractors, $difficulty, $level);
            $q = $list[0] ?? [];
            $q['id'] = 'gen-sb-' . ($index + 1) . '-' . time();
            return $q;
        }

        $list = $this->generateStage3ContextChoice($examples, $pattern, $level, 1, $difficulty, $autoMeaning);
        $q = $list[0] ?? [];
        $q['id'] = 'gen-cc-' . ($index + 1) . '-' . time();
        return $q;
    }

    /**
     * Detects what verb/adjective form the pattern attaches to.
     */
    private function detectRequiredConjugation(string $pattern, string $formula, string $targetFormOverride = 'auto'): array
    {
        if ($targetFormOverride !== 'auto' && !empty($targetFormOverride)) {
            $suffix = preg_replace('/^[〜~]/u', '', $pattern);
            if ($targetFormOverride === 'te') {
                $suffix = preg_replace('/^[〜~]?[てで]/u', '', $pattern);
            } elseif ($targetFormOverride === 'ta') {
                $suffix = preg_replace('/^[〜~]?[ただ]/u', '', $pattern);
            } elseif ($targetFormOverride === 'ba') {
                $suffix = preg_replace('/^[〜~]?[ば]/u', '', $pattern);
            } elseif ($targetFormOverride === 'nai') {
                $suffix = preg_replace('/^[〜~]?(ない|なければ)/u', '', $pattern);
            }
            return ['form' => $targetFormOverride, 'suffix' => trim($suffix)];
        }

        $combined = $pattern . ' ' . $formula;

        // Check for Te-form
        if (preg_match('/[〜~]?([てで])([^\s+〜~]*)/u', $pattern, $matches)) {
            return ['form' => 'te', 'suffix' => $matches[2] ?? ''];
        }
        if (str_contains($combined, 'V-て') || str_contains($combined, 'Vて') || str_contains($combined, 'て形')) {
            return ['form' => 'te', 'suffix' => ltrim(str_replace(['〜', '~', 'て'], '', $pattern))];
        }

        // Check for Ta-form
        if (preg_match('/[〜~]?([ただ])([^\s+〜~]*)/u', $pattern, $matches)) {
            return ['form' => 'ta', 'suffix' => $matches[2] ?? ''];
        }
        if (str_contains($combined, 'V-た') || str_contains($combined, 'Vた') || str_contains($combined, 'た形')) {
            return ['form' => 'ta', 'suffix' => ltrim(str_replace(['〜', '~', 'た'], '', $pattern))];
        }

        // Check for Ba-form (Conditional)
        if (str_contains($pattern, 'ば') || str_contains($combined, 'ば形') || str_contains($combined, 'V-ば') || str_contains($combined, 'Vば')) {
            $suffix = str_contains($pattern, 'ほど') ? 'ほど' : '';
            return ['form' => 'ba', 'suffix' => $suffix];
        }

        // Check for Nai-form
        if (str_contains($pattern, 'ない') || str_contains($pattern, 'なければ') || str_contains($combined, 'ない形')) {
            $suffix = str_contains($pattern, 'なければ') ? 'ならない' : (str_contains($pattern, 'ないで') ? 'でください' : '');
            return ['form' => 'nai', 'suffix' => $suffix];
        }

        // Check for Stem/Pre-masu
        if (str_contains($combined, 'ます形') || str_contains($combined, 'V-ます') || str_contains($combined, 'ステム')) {
            return ['form' => 'stem', 'suffix' => ltrim(str_replace(['〜', '~'], '', $pattern))];
        }

        // Default: Dictionary/Plain form
        return ['form' => 'dict', 'suffix' => ltrim(str_replace(['〜', '~'], '', $pattern))];
    }

    /**
     * Pure mathematical Japanese conjugation for any verb or i-adjective.
     */
    private function conjugateVerb(string $base, string $form): string
    {
        if (empty($base)) {
            return '';
        }

        if ($form === 'dict') {
            return $base;
        }

        // Suru verbs (e.g. 勉強する, 練習する, する)
        if (str_ends_with($base, 'する')) {
            $prefix = mb_substr($base, 0, -2);
            return match ($form) {
                'te' => $prefix . 'して',
                'ta' => $prefix . 'した',
                'nai' => $prefix . 'しない',
                'ba' => $prefix . 'すれば',
                'stem' => $prefix . 'し',
                default => $base,
            };
        }

        // Kuru verb
        if ($base === 'くる' || $base === '来る') {
            $isKanji = ($base === '来る');
            return match ($form) {
                'te' => $isKanji ? '来て' : 'きて',
                'ta' => $isKanji ? '来た' : 'きた',
                'nai' => $isKanji ? '来ない' : 'こない',
                'ba' => $isKanji ? '来れば' : 'くれば',
                'stem' => $isKanji ? '来' : 'き',
                default => $base,
            };
        }

        // I-Adjectives (e.g. 高い, 安い, 早い)
        if (str_ends_with($base, 'い') && !str_ends_with($base, 'る') && mb_strlen($base) >= 2) {
            $stem = mb_substr($base, 0, -1);
            return match ($form) {
                'te' => $stem . 'くて',
                'ta' => $stem . 'かった',
                'nai' => $stem . 'くない',
                'ba' => $stem . 'ければ',
                'stem' => $stem,
                default => $base,
            };
        }

        // Irregular: 行く (Iku)
        if ($base === '行く' || $base === 'いく') {
            $isKanji = ($base === '行く');
            return match ($form) {
                'te' => $isKanji ? '行って' : 'いって',
                'ta' => $isKanji ? '行った' : 'いった',
                'nai' => $isKanji ? '行かない' : 'いかない',
                'ba' => $isKanji ? '行けば' : 'いけば',
                'stem' => $isKanji ? '行き' : 'いき',
                default => $base,
            };
        }

        // General Japanese Verbs: inspect last character
        $lastChar = mb_substr($base, -1);
        $stem = mb_substr($base, 0, -1);

        // Ichidan check (verbs ending in べる, みる, きる, ねる, etc.)
        $ichidanCheck = in_array($base, ['食べる', '見る', '起きる', '教える', '寝る', '着る', '降りる', '信じる'], true);
        if ($ichidanCheck) {
            return match ($form) {
                'te' => $stem . 'て',
                'ta' => $stem . 'た',
                'nai' => $stem . 'ない',
                'ba' => $stem . 'れば',
                'stem' => $stem,
                default => $base,
            };
        }

        // Godan verbs by ending character
        return match ($lastChar) {
            'う' => match ($form) {
                'te' => $stem . 'って',
                'ta' => $stem . 'った',
                'nai' => $stem . 'わない',
                'ba' => $stem . 'えば',
                'stem' => $stem . 'い',
                default => $base,
            },
            'く' => match ($form) {
                'te' => $stem . 'いて',
                'ta' => $stem . 'いた',
                'nai' => $stem . 'かない',
                'ba' => $stem . 'けば',
                'stem' => $stem . 'き',
                default => $base,
            },
            'ぐ' => match ($form) {
                'te' => $stem . 'いで',
                'ta' => $stem . 'いだ',
                'nai' => $stem . 'がない',
                'ba' => $stem . 'げば',
                'stem' => $stem . 'ぎ',
                default => $base,
            },
            'す' => match ($form) {
                'te' => $stem . 'して',
                'ta' => $stem . 'した',
                'nai' => $stem . 'さない',
                'ba' => $stem . 'せば',
                'stem' => $stem . 'し',
                default => $base,
            },
            'つ' => match ($form) {
                'te' => $stem . 'って',
                'ta' => $stem . 'った',
                'nai' => $stem . 'たない',
                'ba' => $stem . 'てば',
                'stem' => $stem . 'ち',
                default => $base,
            },
            'ぬ' => match ($form) {
                'te' => $stem . 'んで',
                'ta' => $stem . 'んだ',
                'nai' => $stem . 'なない',
                'ba' => $stem . 'ねば',
                'stem' => $stem . 'に',
                default => $base,
            },
            'ぶ' => match ($form) {
                'te' => $stem . 'んで',
                'ta' => $stem . 'んだ',
                'nai' => $stem . 'ばない',
                'ba' => $stem . 'べば',
                'stem' => $stem . 'び',
                default => $base,
            },
            'む' => match ($form) {
                'te' => $stem . 'んで',
                'ta' => $stem . 'んだ',
                'nai' => $stem . 'まない',
                'ba' => $stem . 'めば',
                'stem' => $stem . 'み',
                default => $base,
            },
            'る' => match ($form) {
                'te' => $stem . 'って',
                'ta' => $stem . 'った',
                'nai' => $stem . 'らない',
                'ba' => $stem . 'れば',
                'stem' => $stem . 'り',
                default => $base,
            },
            default => $base,
        };
    }

    /**
     * Resolves pool of verbs dynamically from database Kosakata and user examples.
     */
    private function resolveVerbsPool(string $level, array $cleanExamples): array
    {
        $pool = [];

        // 1. Try pulling verbs from Kosakata table
        try {
            $dbVerbs = Kosakata::query()
                ->where(function ($q) {
                    $q->where('category', 'like', '%verb%')
                      ->orWhere('category', 'like', '%kata kerja%')
                      ->orWhere('content_type', 'kosakata');
                })
                ->whereNotNull('word')
                ->whereNotNull('reading')
                ->inRandomOrder()
                ->take(15)
                ->get();

            if ($dbVerbs->isEmpty()) {
                $dbVerbs = Kosakata::query()
                    ->whereNotNull('word')
                    ->whereNotNull('reading')
                    ->inRandomOrder()
                    ->take(15)
                    ->get();
            }

            foreach ($dbVerbs as $item) {
                $pool[] = [
                    'base' => $item->word,
                    'reading' => $item->reading,
                    'meaning' => $item->meaning_id ?: ($item->meaning_en ?: 'kata kerja'),
                ];
            }
        } catch (\Throwable) {
            // Handled
        }

        return $pool;
    }

    /**
     * Fetches example sentences dynamically from database GrammarBank or Kosakata.
     */
    private function fetchDatabaseExamples(string $pattern, string $level): array
    {
        $results = [];

        try {
            // 1. Check GrammarBank for matching pattern or level
            if (\Illuminate\Support\Facades\Schema::hasTable('grammar_bank')) {
                $bankItems = GrammarBank::query()
                    ->where(function ($q) use ($pattern, $level) {
                        if (!empty($pattern)) {
                            $q->where('pattern', 'like', "%{$pattern}%");
                        } else {
                            $q->where('jlpt_level', $level);
                        }
                    })
                    ->whereNotNull('examples')
                    ->inRandomOrder()
                    ->take(5)
                    ->get();

                foreach ($bankItems as $item) {
                    if (is_array($item->examples)) {
                        foreach ($item->examples as $ex) {
                            if (!empty($ex['japanese'])) {
                                $results[] = [
                                    'japanese' => $ex['japanese'],
                                    'translation' => $ex['translation'] ?? '',
                                ];
                            }
                        }
                    }
                }
            }
        } catch (\Throwable) {
            // Silently proceed to Kosakata fallback
        }

        // 2. Fallback to Kosakata example sentences if GrammarBank returned empty
        if (empty($results)) {
            try {
                $vocabItems = Kosakata::query()
                    ->whereNotNull('example_sentence')
                    ->inRandomOrder()
                    ->take(5)
                    ->get();

                foreach ($vocabItems as $v) {
                    $results[] = [
                        'japanese' => $v->example_sentence,
                        'translation' => $v->example_meaning ?: ($v->meaning_id ?: ''),
                    ];
                }
            } catch (\Throwable) {
                // Return empty
            }
        }

        return $results;
    }

    /**
     * Fetches distractor sentences dynamically from GrammarBank and Kosakata.
     */
    private function fetchDistractorsFromDatabase(string $level, string $excludePattern): array
    {
        $distractors = [];

        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('grammar_bank')) {
                $items = GrammarBank::query()
                    ->where('jlpt_level', $level)
                    ->where('pattern', '!=', $excludePattern)
                    ->inRandomOrder()
                    ->take(10)
                    ->get();

                foreach ($items as $item) {
                    $firstExample = $item->examples[0]['japanese'] ?? null;
                    if ($firstExample) {
                        $distractors[] = str_replace('|', '', $firstExample);
                    }
                }
            }
        } catch (\Throwable) {
            // Handled below
        }

        // Additional distractors from Kosakata examples
        if (count($distractors) < 5) {
            try {
                $vocabExamples = Kosakata::query()
                    ->whereNotNull('example_sentence')
                    ->inRandomOrder()
                    ->take(5)
                    ->pluck('example_sentence')
                    ->toArray();

                $distractors = array_merge($distractors, $vocabExamples);
            } catch (\Throwable) {
                // Handled below
            }
        }

        return array_values(array_unique(array_filter($distractors)));
    }

    /**
     * Segments Japanese sentence using natural particle boundaries instead of blind substring slicing.
     */
    private function smartSegmentJapaneseSentence(string $sentence): array
    {
        $clean = trim($sentence);
        if (empty($clean)) {
            return [];
        }

        // 1. Explicit pipe delimiters (|)
        if (str_contains($clean, '|')) {
            $parts = array_values(array_filter(array_map('trim', explode('|', $clean))));
            if (!empty($parts)) {
                return $parts;
            }
        }

        // 2. Whitespace separated
        $parts = preg_split('/\s+/u', $clean, -1, PREG_SPLIT_NO_EMPTY);
        if (count($parts) >= 3) {
            return array_values($parts);
        }

        // 3. Natural Japanese particle lookbehind segmentation
        // Split after particles/punctuations: は, が, を, に, で, へ, と, から, まで, より, も, 、
        $segments = preg_split('/(?<=[はがをにでへとからもより、。])(?=[^\s])/u', $clean, -1, PREG_SPLIT_NO_EMPTY);
        if (count($segments) >= 2) {
            $finalTokens = [];
            foreach ($segments as $seg) {
                $seg = trim($seg);
                if (mb_strlen($seg) > 8) {
                    $half = (int) ceil(mb_strlen($seg) / 2);
                    $finalTokens[] = mb_substr($seg, 0, $half);
                    $finalTokens[] = mb_substr($seg, $half);
                } else {
                    $finalTokens[] = $seg;
                }
            }
            if (count($finalTokens) >= 2) {
                return array_values(array_filter($finalTokens));
            }
        }

        // 4. Fallback: split into balanced chunks (minimum 2 chars)
        $len = mb_strlen($clean);
        $step = max(2, (int) ceil($len / 3));
        $tokens = [];
        for ($offset = 0; $offset < $len; $offset += $step) {
            $tokens[] = mb_substr($clean, $offset, $step);
        }
        return array_values(array_filter($tokens));
    }

    /**
     * Synthesizes grammatical distractors by mutating particles and predicate inflections.
     */
    private function synthesizeGrammaticalDistractors(string $correctSentence, string $pattern): array
    {
        $distractors = [];

        // 1. Swap particles
        $particleSwaps = [
            'に' => 'で',
            'で' => 'に',
            'を' => 'が',
            'が' => 'を',
            'は' => 'も',
            'から' => 'まで',
        ];

        foreach ($particleSwaps as $from => $to) {
            if (str_contains($correctSentence, $from)) {
                $mutated = preg_replace('/' . preg_quote($from, '/') . '/u', $to, $correctSentence, 1);
                if ($mutated !== $correctSentence && !in_array($mutated, $distractors, true)) {
                    $distractors[] = $mutated;
                }
            }
            if (count($distractors) >= 2) {
                break;
            }
        }

        // 2. Invert predicate / politeness endings
        $predicateSwaps = [
            'ます。' => 'ません。',
            'ません。' => 'ました。',
            'です。' => 'でした。',
            'でした。' => 'ではありません。',
            'ない。' => 'ある。',
            'た。' => 'なかった。',
        ];

        foreach ($predicateSwaps as $from => $to) {
            if (str_ends_with($correctSentence, $from)) {
                $mutated = mb_substr($correctSentence, 0, -mb_strlen($from)) . $to;
                if ($mutated !== $correctSentence && !in_array($mutated, $distractors, true)) {
                    $distractors[] = $mutated;
                }
                break;
            }
        }

        return $distractors;
    }


    /**
     * Normalizes JLPT level string (e.g. "JLPT N3" -> "N3").
     */
    private function normalizeLevel(string $level): string
    {
        if (preg_match('/N[1-5]/i', $level, $matches)) {
            return strtoupper($matches[0]);
        }
        return 'N3';
    }
}

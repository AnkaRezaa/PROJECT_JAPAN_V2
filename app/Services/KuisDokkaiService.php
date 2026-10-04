<?php

namespace App\Services;

use App\Events\KuisSelesai;
use App\Models\DokkaiAttemptAnswer;
use App\Models\DokkaiParagraph;
use App\Models\DokkaiPassage;
use App\Models\DokkaiQuestion;
use App\Models\DokkaiVocabulary;
use App\Models\Kuis;
use App\Models\LogReward;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class KuisDokkaiService
{
    /**
     * Format payload wacana Dokkai untuk dikonsumsi frontend runner / CMS.
     * Jika $isAdmin false, 'is_correct' pada options disembunyikan agar anti-cheat.
     */
    public function payload(Kuis $quiz, bool $isAdmin = false, ?Pengguna $user = null): array
    {
        $quiz->loadMissing([
            'dokkaiPassage.paragraphs',
            'dokkaiPassage.vocabularies',
            'dokkaiPassage.questions.evidenceParagraph',
        ]);

        $passage = $quiz->dokkaiPassage;
        if (! $passage) {
            return [
                'quiz' => [
                    'id' => $quiz->id,
                    'title' => 'Wacana Dokkai',
                    'sub_title' => null,
                    'theme_category' => 'Dokkai',
                    'jlpt_level' => 'N3',
                    'estimated_reading_time' => 5,
                    'xp_reward' => 80,
                    'audio_url' => null,
                    'status' => $quiz->status,
                ],
                'paragraphs' => [],
                'vocabularies' => [],
                'questions' => [],
            ];
        }

        $paragraphs = $passage->paragraphs->map(fn (DokkaiParagraph $p) => [
            'id' => $p->id,
            'paragraph_number' => $p->paragraph_number,
            'label' => $p->label,
            'character_count' => $p->character_count,
            'content_raw' => $p->content_raw,
        ])->values()->all();

        $paragraphIdToNumber = $passage->paragraphs->pluck('paragraph_number', 'id')->all();

        $vocabularies = $passage->vocabularies->map(fn (DokkaiVocabulary $v) => [
            'id' => $v->id,
            'paragraph_id' => $v->paragraph_id,
            'word' => $v->word,
            'furigana' => $v->furigana,
            'romaji' => $v->romaji,
            'meaning' => $v->meaning,
            'pitch_accent' => $v->pitch_accent,
            'part_of_speech' => $v->part_of_speech,
            'jlpt_level' => $v->jlpt_level,
            'example_sentence' => $v->example_sentence,
            'example_translation' => $v->example_translation,
            'audio_url' => $v->audio_url,
            'is_bookmarked' => false,
        ])->values()->all();

        $questions = $passage->questions->map(function (DokkaiQuestion $q) use ($isAdmin, $paragraphIdToNumber) {
            $rawOptions = is_array($q->options) ? $q->options : [];
            $sanitizedOptions = array_map(function ($opt) use ($isAdmin) {
                $base = [
                    'id' => $opt['id'] ?? null,
                    'option_label' => $opt['option_label'] ?? '',
                    'option_text' => $opt['option_text'] ?? '',
                    'option_translation' => $opt['option_translation'] ?? null,
                ];

                if ($isAdmin) {
                    $base['is_correct'] = (bool) ($opt['is_correct'] ?? false);
                }

                return $base;
            }, $rawOptions);

            return [
                'id' => $q->id,
                'question_number' => $q->question_number,
                'question_text' => $q->question_text,
                'question_translation' => $q->question_translation,
                'evidence_paragraph_id' => $q->evidence_paragraph_id,
                'evidence_paragraph_number' => $q->evidence_paragraph_id
                    ? ($paragraphIdToNumber[$q->evidence_paragraph_id] ?? $q->evidenceParagraph?->paragraph_number ?? null)
                    : null,
                'evidence_quote' => $isAdmin ? $q->evidence_quote : null,
                'explanation_correct' => $isAdmin ? $q->explanation_correct : null,
                'explanation_distractors' => $isAdmin ? $q->explanation_distractors : null,
                'options' => $sanitizedOptions,
            ];
        })->values()->all();

        return [
            'quiz' => [
                'id' => $quiz->id,
                'title' => $passage->title,
                'sub_title' => $passage->sub_title,
                'theme_category' => $passage->theme_category,
                'jlpt_level' => $passage->jlpt_level,
                'estimated_reading_time' => $passage->estimated_reading_time,
                'xp_reward' => $passage->xp_reward,
                'audio_url' => $passage->audio_url,
                'status' => $quiz->status,
                'passing_score' => (int) ($quiz->passing_score ?? 70),
            ],
            'paragraphs' => $paragraphs,
            'vocabularies' => $vocabularies,
            'questions' => $questions,
        ];
    }

    /**
     * Sinkronisasi data wacana Dokkai dari form Admin CMS.
     */
    public function sync(Kuis $quiz, array $payload): Kuis
    {
        abort_unless($quiz->isDokkai(), 422, 'Kuis ini bukan kuis Dokkai.');

        return DB::transaction(function () use ($quiz, $payload) {
            $quiz->update([
                'passing_score' => $payload['passing_score'] ?? 70,
                'time_limit' => $payload['time_limit'] ?? null,
            ]);

            $passageData = $payload['passage'] ?? [];
            /** @var DokkaiPassage $passage */
            $passage = $quiz->dokkaiPassage()->updateOrCreate([], [
                'title' => trim($passageData['title'] ?? 'Wacana Dokkai'),
                'sub_title' => isset($passageData['sub_title']) ? trim($passageData['sub_title']) : null,
                'theme_category' => trim($passageData['theme_category'] ?? 'Budaya & Tradisi'),
                'jlpt_level' => $passageData['jlpt_level'] ?? 'N3',
                'estimated_reading_time' => (int) ($passageData['estimated_reading_time'] ?? 5),
                'xp_reward' => (int) ($passageData['xp_reward'] ?? 80),
                'audio_url' => $passageData['audio_url'] ?? null,
                'status' => $quiz->status ?? 'draft',
            ]);

            // Sync Paragraf
            $keptParagraphIds = [];
            $paragraphMapByNumber = [];
            if (! empty($payload['paragraphs']) && is_array($payload['paragraphs'])) {
                foreach ($payload['paragraphs'] as $idx => $pData) {
                    $pNumber = (int) ($pData['paragraph_number'] ?? $idx + 1);
                    $contentRaw = trim($pData['content_raw'] ?? '');
                    $charCount = mb_strlen(preg_replace('/\s+/', '', $contentRaw));

                    /** @var DokkaiParagraph $paragraph */
                    $paragraph = $passage->paragraphs()->updateOrCreate(
                        ['id' => $pData['id'] ?? null],
                        [
                            'paragraph_number' => $pNumber,
                            'label' => $pData['label'] ?? "Paragraf {$pNumber}",
                            'character_count' => $charCount,
                            'content_raw' => $contentRaw,
                        ]
                    );
                    $keptParagraphIds[] = $paragraph->id;
                    $paragraphMapByNumber[$pNumber] = $paragraph->id;
                }
            }
            $passage->paragraphs()->whereNotIn('id', $keptParagraphIds)->delete();

            // Sync Kosakata
            $keptVocabIds = [];
            if (! empty($payload['vocabularies']) && is_array($payload['vocabularies'])) {
                foreach ($payload['vocabularies'] as $vData) {
                    $vocab = $passage->vocabularies()->updateOrCreate(
                        ['id' => $vData['id'] ?? null],
                        [
                            'paragraph_id' => $vData['paragraph_id'] ?? null,
                            'word' => trim($vData['word'] ?? ''),
                            'furigana' => trim($vData['furigana'] ?? ''),
                            'romaji' => isset($vData['romaji']) ? trim($vData['romaji']) : null,
                            'meaning' => trim($vData['meaning'] ?? ''),
                            'pitch_accent' => $vData['pitch_accent'] ?? null,
                            'part_of_speech' => $vData['part_of_speech'] ?? null,
                            'jlpt_level' => $vData['jlpt_level'] ?? $passage->jlpt_level,
                            'example_sentence' => $vData['example_sentence'] ?? null,
                            'example_translation' => $vData['example_translation'] ?? null,
                            'audio_url' => $vData['audio_url'] ?? null,
                        ]
                    );
                    $keptVocabIds[] = $vocab->id;
                }
            }
            $passage->vocabularies()->whereNotIn('id', $keptVocabIds)->delete();

            // Sync Soal & Eviden
            $keptQuestionIds = [];
            if (! empty($payload['questions']) && is_array($payload['questions'])) {
                foreach ($payload['questions'] as $qIdx => $qData) {
                    $qNumber = (int) ($qData['question_number'] ?? $qIdx + 1);

                    // Resolve evidence paragraph id if passed as index or number
                    $evidenceParagraphId = $qData['evidence_paragraph_id'] ?? null;
                    if (! $evidenceParagraphId && isset($qData['evidence_paragraph_number'])) {
                        $evidenceParagraphId = $paragraphMapByNumber[$qData['evidence_paragraph_number']] ?? null;
                    }

                    $question = $passage->questions()->updateOrCreate(
                        ['id' => $qData['id'] ?? null],
                        [
                            'question_number' => $qNumber,
                            'question_text' => trim($qData['question_text'] ?? ''),
                            'question_translation' => isset($qData['question_translation']) ? trim($qData['question_translation']) : null,
                            'evidence_paragraph_id' => $evidenceParagraphId,
                            'evidence_quote' => isset($qData['evidence_quote']) ? trim($qData['evidence_quote']) : null,
                            'explanation_correct' => isset($qData['explanation_correct']) ? trim($qData['explanation_correct']) : null,
                            'explanation_distractors' => $qData['explanation_distractors'] ?? null,
                            'options' => $qData['options'] ?? [],
                            'order' => (int) ($qData['order'] ?? $qIdx),
                        ]
                    );
                    $keptQuestionIds[] = $question->id;
                }
            }
            $passage->questions()->whereNotIn('id', $keptQuestionIds)->delete();

            return $quiz->fresh([
                'dokkaiPassage.paragraphs',
                'dokkaiPassage.vocabularies',
                'dokkaiPassage.questions',
            ]);
        });
    }

    /**
     * Evaluasi pengerjaan kuis Dokkai, hitung skor, berikan XP (idempoten), dan kembalikan payload review.
     */
    public function evaluateAttempt(Kuis $quiz, Pengguna $user, array $submittedAnswers, ?string $submissionToken = null): array
    {
        $quiz->loadMissing(['dokkaiPassage.questions.evidenceParagraph', 'module']);
        $passage = $quiz->dokkaiPassage;
        abort_unless($passage, 404, 'Materi wacana Dokkai tidak ditemukan.');

        $questions = $passage->questions;
        abort_if($questions->isEmpty(), 422, 'Wacana Dokkai belum memiliki soal.');

        $totalQuestions = $questions->count();
        $correctCount = 0;
        $answerRecords = [];
        $detailedQuestions = [];

        foreach ($questions as $question) {
            $userChoice = $submittedAnswers[$question->id] ?? null;
            $options = is_array($question->options) ? $question->options : [];
            $correctOption = collect($options)->first(fn ($o) => (bool) ($o['is_correct'] ?? false));
            $correctLabel = $correctOption['option_label'] ?? null;

            $isCorrect = ($userChoice !== null && $correctLabel !== null && $userChoice === $correctLabel);
            if ($isCorrect) {
                $correctCount++;
            }

            $answerRecords[] = [
                'dokkai_question_id' => $question->id,
                'selected_option' => $userChoice,
                'is_correct' => $isCorrect,
            ];

            // Detailed question for review response (with is_correct & explanations revealed)
            $detailedQuestions[] = [
                'id' => $question->id,
                'question_number' => $question->question_number,
                'question_text' => $question->question_text,
                'question_translation' => $question->question_translation,
                'evidence_paragraph_id' => $question->evidence_paragraph_id,
                'evidence_quote' => $question->evidence_quote,
                'explanation_correct' => $question->explanation_correct,
                'explanation_distractors' => $question->explanation_distractors,
                'options' => $options,
            ];
        }

        $score = $totalQuestions > 0 ? (int) round(($correctCount / $totalQuestions) * 100) : 0;
        $passingScore = (int) ($quiz->passing_score ?? 70);
        $isPassed = $score >= $passingScore;

        // DB Transaction for attempt saving and XP
        $xpEarned = 0;
        DB::transaction(function () use ($user, $quiz, $passage, $score, $isPassed, $answerRecords, $submissionToken, &$xpEarned) {
            $attempt = PengerjaanKuis::create([
                'user_id' => $user->id,
                'quiz_id' => $quiz->id,
                'submission_token' => $submissionToken ?: Str::uuid()->toString(),
                'status' => 'completed',
                'score' => $score,
                'xp_earned' => 0,
                'started_at' => now(),
                'completed_at' => now(),
                'attempted_at' => now(),
            ]);

            foreach ($answerRecords as $rec) {
                DokkaiAttemptAnswer::create([
                    'attempt_id' => $attempt->id,
                    'dokkai_question_id' => $rec['dokkai_question_id'],
                    'selected_option' => $rec['selected_option'],
                    'is_correct' => $rec['is_correct'],
                ]);
            }

            // Anti-Exploit Idempotency: Lock user untuk proteksi race condition konkuren
            $lockedUser = Pengguna::where('id', $user->id)->lockForUpdate()->first();

            $alreadyRewarded = LogReward::query()
                ->where('user_id', $user->id)
                ->where('source_type', 'quiz')
                ->where('source_id', $quiz->id)
                ->exists();

            if ($isPassed && ! $alreadyRewarded && $lockedUser) {
                $xpReward = (int) ($passage->xp_reward ?? 80);
                $xpEarned = $xpReward;
                $lockedUser->increment('xp', $xpEarned);

                LogReward::create([
                    'user_id' => $user->id,
                    'source_type' => 'quiz',
                    'source_id' => $quiz->id,
                    'xp_amount' => $xpEarned,
                    'description' => "Menyelesaikan Kuis Dokkai: {$passage->title}",
                ]);

                $attempt->update(['xp_earned' => $xpEarned]);
            }

            if (class_exists(KuisSelesai::class)) {
                event(new KuisSelesai($user, $quiz->id, $score, $xpEarned));
            }
        });

        return [
            'result' => [
                'score' => $score,
                'correct_count' => $correctCount,
                'total_questions' => $totalQuestions,
                'is_passed' => $isPassed,
                'xp_earned' => $xpEarned,
            ],
            'questions' => $detailedQuestions,
        ];
    }
}

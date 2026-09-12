<?php

namespace Database\Seeders;

use App\Models\CurriculumTrack;
use App\Models\Exam;
use App\Models\ExamVersion;
use App\Models\LevelPembelajaran;
use App\Models\Pengguna;
use App\Services\ExamAuthoringService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class StandaloneExamDemoSeeder extends Seeder
{
    public const EXAM_SLUG = 'simulasi-jlpt-n3-mini-demo';

    private const SESSION_NAME = 'Sesi Demo Terbuka';

    public function run(): void
    {
        $admin = Pengguna::query()->where('email', 'admin@toku-up.com')->first();

        if (! $admin) {
            throw new RuntimeException('Akun admin demo belum tersedia. Jalankan PenggunaSeeder terlebih dahulu.');
        }

        $authoring = app(ExamAuthoringService::class);

        DB::transaction(function () use ($admin, $authoring) {
            $level = $this->level();
            $exam = Exam::query()->where('slug', self::EXAM_SLUG)->first();

            if (! $exam) {
                $exam = $authoring->create([
                    'level_id' => $level->id,
                    'slug' => self::EXAM_SLUG,
                    'title' => 'Simulasi JLPT N3 Mini',
                    'description' => 'Paket demo singkat untuk mencoba alur ujian mandiri, riwayat, dan peringkat.',
                    'type' => 'simulation',
                    'access_type' => 'all',
                    'attempt_limit' => 3,
                    'result_release_policy' => 'immediate',
                    'review_policy' => 'wrong_only',
                    'ranking_policy' => 'first_attempt',
                    'estimated_total_pass_score' => 72,
                ], $admin);

                $version = $exam->versions()->where('status', 'draft')->firstOrFail();
                $version = $this->seedVersion($version, $authoring);
                $version = $authoring->publish($version, $admin);
            } else {
                $version = $exam->publishedVersion()->first();

                if (! $version) {
                    throw new RuntimeException('Slug paket demo sudah dipakai oleh ujian yang belum diterbitkan.');
                }
            }

            $version->sessions()->updateOrCreate(
                ['name' => self::SESSION_NAME],
                [
                    'starts_at' => '2026-01-01 00:00:00',
                    'ends_at' => '2037-12-31 23:59:59',
                    'status' => 'active',
                    'attempt_limit_override' => 3,
                    'ranking_enabled' => true,
                    'created_by' => $admin->id,
                ]
            );
        });
    }

    private function level(): LevelPembelajaran
    {
        $track = CurriculumTrack::query()->updateOrCreate(
            ['code' => 'jlpt'],
            ['name' => 'JLPT', 'status' => 'active', 'sort_order' => 1]
        );

        return LevelPembelajaran::query()->firstOrCreate(
            ['level_name' => 'JLPT N3'],
            ['curriculum_track_id' => $track->id, 'stage' => 3, 'is_premium' => false]
        );
    }

    private function seedVersion(ExamVersion $version, ExamAuthoringService $authoring): ExamVersion
    {
        $version = $authoring->syncSections($version, [
            [
                'key' => 'vocabulary',
                'title' => '言語知識（文字・語彙）',
                'short_title' => 'Kosakata',
                'sort_order' => 1,
                'time_limit_seconds' => 600,
                'estimated_max_score' => 60,
                'estimated_pass_score' => 19,
            ],
            [
                'key' => 'grammar_reading',
                'title' => '言語知識（文法）・読解',
                'short_title' => 'Tata Bahasa & Membaca',
                'sort_order' => 2,
                'time_limit_seconds' => 900,
                'estimated_max_score' => 60,
                'estimated_pass_score' => 19,
            ],
        ]);

        $sections = $version->sections->keyBy('key');
        $authoring->syncQuestions($sections->get('vocabulary'), $this->vocabularyQuestions());
        $authoring->syncQuestions($sections->get('grammar_reading'), $this->grammarQuestions());

        return $version->refresh();
    }

    private function vocabularyQuestions(): array
    {
        return [
            [
                'code' => 'DEMO-VOC-001',
                'type' => 'multiple_choice',
                'sort_order' => 1,
                'points' => 1,
                'question_text' => '「受付」の読み方として最もよいものを選んでください。',
                'question_reading' => '「うけつけ」の よみかたとして もっとも よいものを えらんでください。',
                'options' => ['うけつけ', 'うけづけ', 'じゅけつけ', 'じゅけづけ'],
                'correct_answer' => 'うけつけ',
                'explanation' => '「受付」は「うけつけ」と読み、layanan penerimaan atau resepsionis を表します。',
            ],
            [
                'code' => 'DEMO-VOC-002',
                'type' => 'typing',
                'sort_order' => 2,
                'points' => 1,
                'question_text' => '「環境」の読み方をひらがなで入力してください。',
                'question_reading' => '「かんきょう」の よみかたを ひらがなで にゅうりょくしてください。',
                'correct_answer' => 'かんきょう',
                'explanation' => '「環境」の読み方は「かんきょう」です。',
            ],
            [
                'code' => 'DEMO-VOC-003',
                'type' => 'fill_blank',
                'sort_order' => 3,
                'points' => 1,
                'question_text' => 'Kalimat 「この商品は人気があるので、すぐに＿＿＿。」 paling tepat dilengkapi dengan kata apa?',
                'options' => ['売り切れました', '売り切れです', '売り切ります', '売り切れそうです'],
                'correct_answer' => '売り切れました',
                'correct_answer_reading' => 'うりきれました',
                'explanation' => 'Bentuk lampau 「売り切れました」 sesuai dengan hasil yang sudah terjadi.',
            ],
            [
                'code' => 'DEMO-VOC-004',
                'type' => 'listening',
                'sort_order' => 4,
                'points' => 1,
                'question_text' => 'Dengarkan pengucapan audio berikut. Pilihlah kosakata kanji yang tepat sesuai dengan kata yang Anda dengar.',
                'question_reading' => 'しんかんせん',
                'options' => ['新幹線', '地下鉄', '飛行機', '自転車'],
                'correct_answer' => '新幹線',
                'explanation' => 'Audio melafalkan kata 「新幹線」（しんかんせん） yang berarti kereta cepat.',
                'audio_path' => null,
            ],
            [
                'code' => 'DEMO-VOC-005',
                'type' => 'multiple_choice',
                'sort_order' => 5,
                'points' => 1,
                'question_text' => '「具合」と同じような意味で使える言葉はどれですか。',
                'question_reading' => '「ぐあい」と おなじような いみで つかえる ことばは どれですか。',
                'options' => ['調子', '様子', '都合', '気分'],
                'correct_answer' => '調子',
                'explanation' => '「体の具合が悪い」 dapat dipadankan dengan 「体の調子が悪い」 (kondisi tubuh kurang sehat).',
            ],
        ];
    }

    private function grammarQuestions(): array
    {
        return [
            [
                'code' => 'DEMO-GRM-001',
                'type' => 'multiple_choice',
                'sort_order' => 1,
                'points' => 1,
                'question_text' => '日本語は勉強すればする＿＿、上手になります。',
                'options' => ['ほど', 'しか', 'まで', 'だけ'],
                'correct_answer' => 'ほど',
                'explanation' => 'Pola 「〜ば〜ほど」 menyatakan semakin A, semakin B.',
            ],
            [
                'code' => 'DEMO-GRM-002',
                'type' => 'sentence_builder',
                'sort_order' => 2,
                'points' => 1,
                'question_text' => 'Susun menjadi kalimat yang benar: 日本へ / 日本語を / 行くために / 勉強しています',
                'options' => ['日本へ', '行くために', '日本語を', '勉強しています'],
                'correct_answer' => '日本へ行くために日本語を勉強しています',
                'explanation' => '「〜ために」 menunjukkan tujuan suatu tindakan.',
            ],
            [
                'code' => 'DEMO-GRM-003',
                'type' => 'fill_blank',
                'sort_order' => 3,
                'points' => 1,
                'question_text' => '雨が降っている＿＿、試合は行われました。',
                'options' => ['のに', 'ので', 'ために', 'ながら'],
                'correct_answer' => 'のに',
                'explanation' => '「〜のに」 menyatakan hasil yang berlawanan dengan dugaan.',
            ],
            [
                'code' => 'DEMO-GRM-004',
                'type' => 'sentence_builder',
                'sort_order' => 4,
                'points' => 1,
                'question_text' => 'Susun menjadi kalimat yang tepat: 薬を / 治りました / 飲んだら / すぐに',
                'options' => ['薬を', '飲んだら', 'すぐに', '治りました'],
                'correct_answer' => '薬を飲んだらすぐに治りました',
                'explanation' => 'Pola 「〜たら」 menyatakan urutan kejadian sebab-akibat atau kondisi kondisional.',
            ],
            [
                'code' => 'DEMO-GRM-005',
                'type' => 'multiple_choice',
                'sort_order' => 5,
                'points' => 1,
                'question_text' => '「田中先生、明日の会議には＿＿＿か。」',
                'options' => ['いらっしゃいます', '参ります', '申します', '拝見します'],
                'correct_answer' => 'いらっしゃいます',
                'explanation' => '「いらっしゃいます」 adalah bentuk Sonkeigo (hormat) untuk Tanaka Sensei.',
            ],
        ];
    }
}

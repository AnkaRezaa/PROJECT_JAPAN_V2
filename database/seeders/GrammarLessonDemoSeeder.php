<?php

namespace Database\Seeders;

use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\Modul;
use App\Models\ProgramPembelajaran;
use App\Services\KuisGrammarService;
use Illuminate\Database\Seeder;

class GrammarLessonDemoSeeder extends Seeder
{
    public function __construct(
        private readonly KuisGrammarService $grammarService
    ) {}

    public function run(): void
    {
        $programs = ProgramPembelajaran::query()
            ->whereIn('slug', [
                KelasDemoSeeder::MANDIRI_SLUG,
                KelasDemoSeeder::MENTOR_SLUG,
            ])
            ->get();

        $lessons = $this->lessonsData();

        foreach ($programs as $program) {
            $module = Modul::query()
                ->where('program_pembelajaran_id', $program->id)
                ->where('week_number', 1)
                ->first();

            if (! $module) {
                continue;
            }

            $days = HariModul::query()
                ->where('module_id', $module->id)
                ->orderBy('day_number')
                ->get();

            foreach ($days as $index => $day) {
                if (! isset($lessons[$index])) {
                    continue;
                }

                $payload = $lessons[$index];

                $quiz = Kuis::updateOrCreate(
                    [
                        'module_id' => $module->id,
                        'module_day_id' => $day->id,
                        'type' => 'grammar',
                    ],
                    [
                        'time_limit' => $payload['time_limit'] ?? null,
                        'passing_score' => $payload['passing_score'] ?? 70,
                        'status' => 'published',
                    ]
                );

                $this->grammarService->sync($quiz, $payload);
                $quiz->update(['status' => 'published']);
                $this->grammarService->assertPublishable($quiz);
            }
        }
    }

    private function lessonsData(): array
    {
        return [
            // Day 1: 〜ば〜ほど (Semakin..., semakin...)
            [
                'time_limit' => null,
                'passing_score' => 70,
                'lesson' => [
                    'lesson_key' => 'n3-grm-ba-hodo',
                    'level' => 'JLPT N3',
                    'pattern' => '〜ば〜ほど',
                    'title' => 'Semakin..., semakin...',
                    'meaning' => 'Semakin A, semakin B',
                    'formula' => 'Vば + V辞書形 + ほど / A-ければ + A-い + ほど',
                    'explanation' => 'Pola ini digunakan untuk menunjukkan bahwa peningkatan atau perubahan pada kondisi pertama secara bertahap memperkuat atau mempengaruhi hasil pada kondisi kedua.',
                    'examples' => [
                        [
                            'japanese' => '勉強すればするほど、日本語が上手になります。',
                            'reading' => 'べんきょうすればするほど、にほんごがじょうずになります。',
                            'translation' => 'Semakin banyak belajar, semakin mahir bahasa Jepang.',
                        ],
                        [
                            'japanese' => '練習すればするほど、上手になります。',
                            'reading' => 'れんしゅうすればするほど、じょうずになります。',
                            'translation' => 'Semakin banyak berlatih, semakin mahir.',
                        ],
                        [
                            'japanese' => '安ければ安いほど、買いやすいです。',
                            'reading' => 'やすければやすいほど、かいやすいです。',
                            'translation' => 'Semakin murah, semakin mudah untuk dibeli.',
                        ],
                    ],
                ],
                'stages' => [
                    [
                        'id' => 'transformation',
                        'questions' => [
                            [
                                'type' => 'transformation',
                                'prompt' => 'Ubah kata kerja berikut ke bentuk kondisional ば.',
                                'japanese' => '勉強する',
                                'reading' => 'べんきょうする',
                                'translation' => 'belajar',
                                'choices' => ['勉強すれば', '勉強したら', '勉強して', '勉強すると'],
                                'correctAnswer' => '勉強すれば',
                                'explanation' => 'Kata kerja kelompok 3「する」berubah menjadi「すれば」dalam bentuk ば.',
                                'points' => 1,
                            ],
                            [
                                'type' => 'transformation',
                                'prompt' => 'Pilih perubahan bentuk ば yang benar untuk kata kerja golongan II.',
                                'japanese' => '考える',
                                'reading' => 'かんがえる',
                                'translation' => 'berpikir',
                                'choices' => ['考えれば', '考えたら', '考えて', '考えると'],
                                'correctAnswer' => '考えれば',
                                'explanation' => 'Kata kerja golongan II mengganti akhiran「る」dengan「れば」.',
                                'points' => 1,
                            ],
                        ],
                    ],
                    [
                        'id' => 'sentence_builder',
                        'questions' => [
                            [
                                'type' => 'sentence_builder',
                                'prompt' => 'Susun potongan berikut menjadi kalimat yang tepat.',
                                'context' => 'Semakin banyak belajar, semakin mahir.',
                                'tokens' => [
                                    ['id' => 't1', 'text' => '勉強すれば', 'reading' => 'べんきょうすれば'],
                                    ['id' => 't2', 'text' => 'する', 'reading' => 'する'],
                                    ['id' => 't3', 'text' => 'ほど', 'reading' => 'ほど'],
                                    ['id' => 't4', 'text' => '上手になります', 'reading' => 'じょうずになります'],
                                    ['id' => 'd1', 'text' => 'まで', 'reading' => 'まで', 'distractor' => true],
                                ],
                                'correctOrder' => ['t1', 't2', 't3', 't4'],
                                'explanation' => 'Pola yang benar adalah bentuk ば diikuti bentuk kamus dan「ほど」: 勉強すれば + する + ほど + 上手になります.',
                                'points' => 1,
                            ],
                            [
                                'type' => 'sentence_builder',
                                'prompt' => 'Susun kalimat sesuai arti berikut.',
                                'context' => 'Semakin murah, semakin baik.',
                                'tokens' => [
                                    ['id' => 't1', 'text' => '安ければ', 'reading' => 'やすければ'],
                                    ['id' => 't2', 'text' => '安い', 'reading' => 'やすい'],
                                    ['id' => 't3', 'text' => 'ほど', 'reading' => 'ほど'],
                                    ['id' => 't4', 'text' => 'いいです', 'reading' => 'いいです'],
                                    ['id' => 'd1', 'text' => 'しか', 'reading' => 'しか', 'distractor' => true],
                                ],
                                'correctOrder' => ['t1', 't2', 't3', 't4'],
                                'explanation' => 'Untuk kata sifat い, polanya adalah「〜ければ〜いほど」.',
                                'points' => 1,
                            ],
                        ],
                    ],
                    [
                        'id' => 'context_choice',
                        'questions' => [
                            [
                                'type' => 'context_choice',
                                'prompt' => 'Pilih kalimat yang paling cocok dengan situasi.',
                                'context' => 'Semakin sering latihan, kemampuan berbicara semakin meningkat.',
                                'choices' => [
                                    '練習すればするほど、話すのが上手になります。',
                                    '練習したがりです。',
                                    '練習する前に、上手になります。',
                                    '練習してから、話しません。',
                                ],
                                'correctAnswer' => '練習すればするほど、話すのが上手になります。',
                                'explanation' => '「〜ば〜ほど」menyatakan bahwa seiring bertambahnya latihan, hasilnya semakin meningkat.',
                                'points' => 1,
                            ],
                            [
                                'type' => 'context_choice',
                                'prompt' => 'Pilih respons yang menyatakan hubungan "semakin..., semakin...".',
                                'context' => 'Temanmu mengatakan bahwa buku ini semakin menarik saat terus dibaca.',
                                'choices' => [
                                    '読めば読むほど、面白くなります。',
                                    '読んだことがあります。',
                                    '読むつもりです。',
                                    '読まないでください。',
                                ],
                                'correctAnswer' => '読めば読むほど、面白くなります。',
                                'explanation' => '「読めば読むほど」berarti semakin banyak dibaca, semakin....',
                                'points' => 1,
                            ],
                        ],
                    ],
                ],
            ],

            // Day 2: 〜ように (Supaya / Agar)
            [
                'time_limit' => null,
                'passing_score' => 70,
                'lesson' => [
                    'lesson_key' => 'n3-grm-you-ni',
                    'level' => 'JLPT N3',
                    'pattern' => '〜ように',
                    'title' => 'Supaya / Agar',
                    'meaning' => 'Supaya / Agar kondisi tertentu dapat terwujud',
                    'formula' => 'V(Kamus / Bentuk Potensial / Bentuk Nai) + ように',
                    'explanation' => 'Digunakan untuk menyatakan tujuan di mana klausa pertama adalah kondisi non-volisional (di luar kendali langsung, seperti kata kerja bentuk kemungkinan atau bentuk negatif) yang diharapkan terwujud melalui tindakan di klausa kedua.',
                    'examples' => [
                        [
                            'japanese' => '日本語が上手に話せるように、毎日練習しています。',
                            'reading' => 'にほんごがじょうずにはなせるように、まいにちれんしゅうしています。',
                            'translation' => 'Agar bisa berbicara bahasa Jepang dengan lancar, saya berlatih setiap hari.',
                        ],
                        [
                            'japanese' => '風邪を引かないように、マスクをしています。',
                            'reading' => 'かぜをひかないように、ますくをしています。',
                            'translation' => 'Agar tidak terkena flu, saya memakai masker.',
                        ],
                        [
                            'japanese' => '後ろの人にも聞こえるように、大きな声で話してください。',
                            'reading' => 'うしろのひとにもきこえるように、おおきなこえではなしてください。',
                            'translation' => 'Tolong bicara dengan suara keras agar orang di belakang juga bisa mendengar.',
                        ],
                    ],
                ],
                'stages' => [
                    [
                        'id' => 'transformation',
                        'questions' => [
                            [
                                'type' => 'transformation',
                                'prompt' => 'Ubah kata kerja potensial berikut agar cocok dengan pola「〜ように」.',
                                'japanese' => '話せる',
                                'reading' => 'はなせる',
                                'translation' => 'bisa berbicara',
                                'choices' => ['話せるように', '話すために', '話せるのに', '話せば'],
                                'correctAnswer' => '話せるように',
                                'explanation' => 'Kata kerja bentuk potensial (bisa) digabungkan langsung dengan「ように」.',
                                'points' => 1,
                            ],
                            [
                                'type' => 'transformation',
                                'prompt' => 'Pilih bentuk negatif yang tepat untuk menyatakan "agar tidak lupa".',
                                'japanese' => '忘れない',
                                'reading' => 'わすれない',
                                'translation' => 'tidak lupa',
                                'choices' => ['忘れないように', '忘れるように', '忘れたら', '忘れないで'],
                                'correctAnswer' => '忘れないように',
                                'explanation' => 'Bentuk negatif「忘れない」+「ように」menyatakan agar tidak lupa.',
                                'points' => 1,
                            ],
                        ],
                    ],
                    [
                        'id' => 'sentence_builder',
                        'questions' => [
                            [
                                'type' => 'sentence_builder',
                                'prompt' => 'Susun kalimat yang menyatakan tujuan kelulusan ujian.',
                                'context' => 'Supaya lulus ujian, setiap hari belajar.',
                                'tokens' => [
                                    ['id' => 't1', 'text' => '試験に', 'reading' => 'しけんに'],
                                    ['id' => 't2', 'text' => '合格できるように', 'reading' => 'ごうかくできるように'],
                                    ['id' => 't3', 'text' => '毎日', 'reading' => 'まいにち'],
                                    ['id' => 't4', 'text' => '勉強します', 'reading' => 'べんきょうします'],
                                    ['id' => 'd1', 'text' => 'ために', 'reading' => 'ために', 'distractor' => true],
                                ],
                                'correctOrder' => ['t1', 't2', 't3', 't4'],
                                'explanation' => 'Bentuk potensial「合格できる」dipadukan dengan「ように」menjadi「合格できるように」.',
                                'points' => 1,
                            ],
                            [
                                'type' => 'sentence_builder',
                                'prompt' => 'Susun kalimat untuk pencegahan sakit flu.',
                                'context' => 'Agar tidak masuk angin, mencuci tangan.',
                                'tokens' => [
                                    ['id' => 't1', 'text' => '風邪を', 'reading' => 'かぜを'],
                                    ['id' => 't2', 'text' => '引かないように', 'reading' => 'ひかないように'],
                                    ['id' => 't3', 'text' => '手を', 'reading' => 'てを'],
                                    ['id' => 't4', 'text' => '洗います', 'reading' => 'あらいます'],
                                    ['id' => 'd1', 'text' => 'ようにと', 'reading' => 'ようにと', 'distractor' => true],
                                ],
                                'correctOrder' => ['t1', 't2', 't3', 't4'],
                                'explanation' => 'Urutan yang tepat adalah: 風邪を + 引かないように + 手を + 洗います.',
                                'points' => 1,
                            ],
                        ],
                    ],
                    [
                        'id' => 'context_choice',
                        'questions' => [
                            [
                                'type' => 'context_choice',
                                'prompt' => 'Pilih kalimat yang tepat untuk situasi memasang alarm agar bisa bangun pagi.',
                                'context' => 'Supaya bisa bangun jam 6 besok pagi, saya memasang alarm.',
                                'choices' => [
                                    '明日の朝６時に起きられるように、目覚まし時計をかけました。',
                                    '明日の朝６時に起きるために、目覚まし時計を壊しました。',
                                    '明日の朝６時に起きるように、寝ませんでした。',
                                    '明日の朝６時に起きてから、目覚ましをかけます。',
                                ],
                                'correctAnswer' => '明日の朝６時に起きられるように、目覚まし時計をかけました。',
                                'explanation' => '「起きられるように」menggunakan bentuk potensial untuk menyatakan tujuan yang ingin dicapai melalui pemasangan alarm.',
                                'points' => 1,
                            ],
                            [
                                'type' => 'context_choice',
                                'prompt' => 'Pilih kalimat yang menyatakan upaya mencatat agar nomor telepon tidak terlupakan.',
                                'context' => 'Supaya tidak lupa nomor telepon, saya mencatatnya di buku catatan.',
                                'choices' => [
                                    '電話番号を忘れないように、手帳にメモしました。',
                                    '電話番号を忘れるように、手帳を捨てました。',
                                    '電話番号を忘れたので、電話しました。',
                                    '電話番号を忘れるために、メモしました。',
                                ],
                                'correctAnswer' => '電話番号を忘れないように、手帳にメモしました。',
                                'explanation' => '「忘れないように」menyatakan tindakan pencegahan agar hal yang tidak diinginkan tidak terjadi.',
                                'points' => 1,
                            ],
                        ],
                    ],
                ],
            ],

            // Day 3: 〜ために (Untuk / Demi)
            [
                'time_limit' => null,
                'passing_score' => 70,
                'lesson' => [
                    'lesson_key' => 'n3-grm-tame-ni',
                    'level' => 'JLPT N3',
                    'pattern' => '〜ために',
                    'title' => 'Untuk / Demi',
                    'meaning' => 'Demi / Untuk tujuan tertentu',
                    'formula' => 'V(Kamus) / N + の + ために',
                    'explanation' => 'Digunakan untuk menyatakan tujuan di mana subjek memiliki kendali dan kehendak penuh (volisional) atas tindakan yang dilakukan untuk mencapai tujuan tersebut.',
                    'examples' => [
                        [
                            'japanese' => '日本へ留学するために、日本語を勉強しています。',
                            'reading' => 'にほんへりゅうがくするために、にほんごをべんきょうしています。',
                            'translation' => 'Untuk kuliah/belajar di Jepang, saya sedang belajar bahasa Jepang.',
                        ],
                        [
                            'japanese' => '健康のために、毎朝ジョギングをしています。',
                            'reading' => 'けんこうのために、まいあさじょぎんぐをしています。',
                            'translation' => 'Demi kesehatan, setiap pagi saya melakukan joging.',
                        ],
                        [
                            'japanese' => '将来の夢をかなえるために、一生懸命頑張ります。',
                            'reading' => 'しょうらいのゆめをかなえるために、いっしょうけんめいがんばります。',
                            'translation' => 'Demi mewujudkan impian masa depan, saya berusaha sekuat tenaga.',
                        ],
                    ],
                ],
                'stages' => [
                    [
                        'id' => 'transformation',
                        'questions' => [
                            [
                                'type' => 'transformation',
                                'prompt' => 'Ubah kata kerja bentuk kamus berikut dengan pola tujuan「〜ために」.',
                                'japanese' => '留学する',
                                'reading' => 'りゅうがくする',
                                'translation' => 'kuliah di luar negeri',
                                'choices' => ['留学するために', '留学するように', '留学すれば', '留学したのに'],
                                'correctAnswer' => '留学するために',
                                'explanation' => 'Kata kerja bentuk kamus volisional langsung digabungkan dengan「ために」.',
                                'points' => 1,
                            ],
                            [
                                'type' => 'transformation',
                                'prompt' => 'Pilih bentuk yang tepat ketika kata benda (Noun) dipadukan dengan「ために」.',
                                'japanese' => '家族',
                                'reading' => 'かぞく',
                                'translation' => 'keluarga',
                                'choices' => ['家族のために', '家族のように', '家族だから', '家族について'],
                                'correctAnswer' => '家族のために',
                                'explanation' => 'Kata benda membutuhkan partikel「の」sebelum「ために」: 家族 + の + ために.',
                                'points' => 1,
                            ],
                        ],
                    ],
                    [
                        'id' => 'sentence_builder',
                        'questions' => [
                            [
                                'type' => 'sentence_builder',
                                'prompt' => 'Susun kalimat yang menyatakan tujuan menabung untuk membeli mobil.',
                                'context' => 'Untuk membeli mobil baru, menabung uang.',
                                'tokens' => [
                                    ['id' => 't1', 'text' => '新しい車を', 'reading' => 'あたらしいくるまを'],
                                    ['id' => 't2', 'text' => '買うために', 'reading' => 'かうために'],
                                    ['id' => 't3', 'text' => 'お金を', 'reading' => 'おかねを'],
                                    ['id' => 't4', 'text' => '貯めています', 'reading' => 'ためています'],
                                    ['id' => 'd1', 'text' => 'ように', 'reading' => 'ように', 'distractor' => true],
                                ],
                                'correctOrder' => ['t1', 't2', 't3', 't4'],
                                'explanation' => 'Urutan yang benar: 新しい車を買うために + お金を + 貯めています.',
                                'points' => 1,
                            ],
                            [
                                'type' => 'sentence_builder',
                                'prompt' => 'Susun kalimat tentang berolahraga demi kesehatan tubuh.',
                                'context' => 'Demi kesehatan, berolahraga setiap hari.',
                                'tokens' => [
                                    ['id' => 't1', 'text' => '健康の', 'reading' => 'けんこうの'],
                                    ['id' => 't2', 'text' => 'ために', 'reading' => 'ために'],
                                    ['id' => 't3', 'text' => '毎日', 'reading' => 'まいにち'],
                                    ['id' => 't4', 'text' => '運動しています', 'reading' => 'うんどうしています'],
                                    ['id' => 'd1', 'text' => 'ながら', 'reading' => 'ながら', 'distractor' => true],
                                ],
                                'correctOrder' => ['t1', 't2', 't3', 't4'],
                                'explanation' => 'Urutan yang tepat: 健康の + ために + 毎日 + 運動しています.',
                                'points' => 1,
                            ],
                        ],
                    ],
                    [
                        'id' => 'context_choice',
                        'questions' => [
                            [
                                'type' => 'context_choice',
                                'prompt' => 'Pilih kalimat yang menyatakan aksi sadar untuk mencapai tujuan membeli rumah.',
                                'context' => 'Demi membeli rumah sendiri, dia bekerja keras siang dan malam.',
                                'choices' => [
                                    '自分の家を買うために、一生懸命働いています。',
                                    '自分の家を買えるように、働かないことにしました。',
                                    '自分の家を買ったために、お金が増えました。',
                                    '自分の家を買うので、仕事を辞めました。',
                                ],
                                'correctAnswer' => '自分の家を買うために、一生懸命働いています。',
                                'explanation' => '「家を買うために」menunjukkan tindakan sadar dan terarah (bekerja keras) demi tujuan tersebut.',
                                'points' => 1,
                            ],
                            [
                                'type' => 'context_choice',
                                'prompt' => 'Pilih kalimat yang menyatakan tindakan demi masa depan anak-anak.',
                                'context' => 'Orang tua berjuang demi kebahagiaan anak-anak.',
                                'choices' => [
                                    '子供たちの幸せのために、両親は頑張っています。',
                                    '子供たちの幸せのように、両親は怒っています。',
                                    '子供たちが幸せなために、何もしていません。',
                                    '子供たちの幸せだから、寝ています。',
                                ],
                                'correctAnswer' => '子供たちの幸せのために、両親は頑張っています。',
                                'explanation' => '「子供たちの幸せのために」mengungkapkan dedikasi atau tujuan untuk kebahagiaan anak.',
                                'points' => 1,
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}

<?php

namespace Database\Seeders;

use App\Models\CurriculumTrack;
use App\Models\DeckPresentasi;
use App\Models\Flashcard;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\SetFlashcard;
use App\Models\SlidePresentasi;
use App\Models\Soal;
use Illuminate\Database\Seeder;

class KelasDemoSeeder extends Seeder
{
    public const MANDIRI_SLUG = 'jlpt-n3-mingguan';

    public const MENTOR_SLUG = 'jlpt-n3-mentor';

    public function run(): void
    {
        $track = CurriculumTrack::updateOrCreate(
            ['code' => 'jlpt'],
            ['name' => 'JLPT', 'status' => 'active', 'sort_order' => 1]
        );
        $level = LevelPembelajaran::updateOrCreate(
            ['level_name' => 'JLPT N3'],
            ['curriculum_track_id' => $track->id, 'stage' => 3, 'is_premium' => true]
        );
        $globalAdmin = Pengguna::where('email', 'admin@toku-up.com')->first();
        $mentor = Pengguna::where('email', 'admin.kloter@toku-up.com')->first();

        foreach ($this->programs() as $index => $programData) {
            $program = ProgramPembelajaran::updateOrCreate(
                ['slug' => $programData['slug']],
                [
                    'curriculum_track_id' => $track->id,
                    'level_id' => $level->id,
                    'title' => $programData['title'],
                    'description' => $programData['description'],
                    'instructor_name' => $programData['instructor_name'],
                    'thumbnail_url' => $programData['thumbnail_url'],
                    'status' => 'published',
                    'sort_order' => $index + 1,
                ]
            );

            foreach ($this->curriculum() as $weekIndex => $weekData) {
                $module = Modul::updateOrCreate(
                    [
                        'program_pembelajaran_id' => $program->id,
                        'week_number' => $weekIndex + 1,
                    ],
                    [
                        'level_id' => $level->id,
                        'title' => $weekData['title'],
                        'description' => $weekData['description'],
                        'status' => 'published',
                    ]
                );

                $days = collect($weekData['days'])->map(function (array $dayData, int $dayIndex) use ($level, $module) {
                    $day = HariModul::updateOrCreate(
                        ['module_id' => $module->id, 'day_number' => $dayIndex + 1],
                        [
                            'title' => $dayData['title'],
                            'description' => $dayData['description'],
                            'status' => 'published',
                        ]
                    );

                    $set = SetFlashcard::updateOrCreate(
                        ['module_id' => $module->id, 'module_day_id' => $day->id],
                        [
                            'level_id' => $level->id,
                            'title' => 'Repetisi '.$dayData['title'],
                            'description' => 'Materi repetisi sebelum mengerjakan kuis '.$dayData['title'].'.',
                            'source_type' => 'vocabulary',
                            'status' => 'published',
                        ]
                    );

                    $vocabulary = collect($dayData['vocabulary'])->map(function (array $item, int $itemIndex) use ($module, $day, $set) {
                        $word = Kosakata::firstOrNew([
                            'word' => $item['word'],
                            'reading' => $item['reading'],
                        ]);

                        if (! $word->exists) {
                            $word->module_id = $module->id;
                        }

                        $word->fill([
                            'content_type' => $item['content_type'],
                            'meaning_id' => $item['meaning'],
                            'meaning_en' => $item['meaning_en'],
                            'jlpt_level' => 'N3',
                            'category' => $item['category'],
                            'tags' => $item['tags'],
                            'example_sentence' => $item['example_sentence'],
                            'example_reading' => $item['example_reading'],
                            'example_meaning' => $item['example_meaning'],
                            'source_type' => 'demo-seeder',
                            'source_title' => $day->title,
                            'metadata' => $item['metadata'] ?? null,
                            'status' => 'published',
                        ])->save();
                        $word->days()->syncWithoutDetaching([$day->id => ['sort_order' => $itemIndex + 1]]);

                        Flashcard::updateOrCreate(
                            ['flashcard_set_id' => $set->id, 'vocabulary_id' => $word->id],
                            [
                                'front_text' => $word->word,
                                'reading' => $word->reading,
                                'back_text' => $word->meaning_id,
                                'hint' => $word->category,
                                'example_sentence' => $word->example_sentence,
                                'example_meaning' => $word->example_meaning,
                                'audio_url' => null,
                                'order' => $itemIndex + 1,
                            ]
                        );

                        return $word;
                    });

                    $quiz = Kuis::updateOrCreate(
                        ['module_id' => $module->id, 'module_day_id' => $day->id],
                        [
                            'exam_order' => null,
                            'type' => 'multiple_choice',
                            'time_limit' => 420,
                            'passing_score' => 70,
                            'status' => 'published',
                        ]
                    );
                    $this->seedDailyQuestions($quiz, $dayData, $vocabulary->values()->all());
                    $day->update(['checkpoint_quiz_id' => $quiz->id]);

                    return ['day' => $day, 'vocabulary' => $vocabulary];
                })->values();

                $this->seedWeeklyExam($module, $days);
                $this->seedSharedPresentations($module, $weekData, $days, $globalAdmin);

                if ($programData['slug'] === self::MENTOR_SLUG && $weekIndex === 0 && $mentor) {
                    $this->seedMentorPresentation($module, $mentor);
                }
            }
        }
    }

    private function seedDailyQuestions(Kuis $quiz, array $dayData, array $vocabulary): void
    {
        $meanings = collect($vocabulary)->pluck('meaning_id')->values();
        $readings = collect($vocabulary)->pluck('reading')->values();

        foreach ($vocabulary as $index => $word) {
            $askReading = $index % 2 === 1;
            $answer = $askReading ? $word->reading : $word->meaning_id;
            $pool = $askReading ? $readings : $meanings;
            $options = collect([$answer])
                ->merge($pool->reject(fn ($value) => $value === $answer))
                ->take(4)
                ->values()
                ->all();

            Soal::updateOrCreate(
                ['quiz_id' => $quiz->id, 'order' => $index + 1],
                [
                    'type' => 'multiple_choice',
                    'question_text' => $askReading
                        ? "Bagaimana cara membaca {$word->word}?"
                        : "Apa arti {$word->word}?",
                    'correct_answer' => $answer,
                    'options' => $options,
                    'explanation' => "{$word->word} dibaca {$word->reading} dan berarti {$word->meaning_id}.",
                    'points' => 1,
                ]
            );
        }

        Soal::where('quiz_id', $quiz->id)->where('order', '>', count($vocabulary))->delete();
    }

    private function seedWeeklyExam(Modul $module, $days): void
    {
        $exam = Kuis::updateOrCreate(
            ['module_id' => $module->id, 'exam_order' => 1],
            [
                'module_day_id' => null,
                'type' => 'weekly_exam',
                'time_limit' => 900,
                'passing_score' => 70,
                'status' => 'published',
            ]
        );

        $words = $days
            ->flatMap(fn (array $day) => $day['vocabulary']->take(2))
            ->values();
        $meaningPool = $words->pluck('meaning_id')->values();

        $words->each(function (Kosakata $word, int $index) use ($exam, $meaningPool) {
            $options = collect([$word->meaning_id])
                ->merge($meaningPool->reject(fn ($meaning) => $meaning === $word->meaning_id))
                ->take(4)
                ->values()
                ->all();

            Soal::updateOrCreate(
                ['quiz_id' => $exam->id, 'order' => $index + 1],
                [
                    'type' => 'multiple_choice',
                    'question_text' => "Pilih arti yang tepat untuk {$word->word}.",
                    'correct_answer' => $word->meaning_id,
                    'options' => $options,
                    'explanation' => "{$word->word} berarti {$word->meaning_id}.",
                    'points' => 1,
                ]
            );
        });
        Soal::where('quiz_id', $exam->id)->where('order', '>', $words->count())->delete();
    }

    private function seedSharedPresentations(Modul $module, array $weekData, $days, ?Pengguna $creator): void
    {
        $placements = [
            [
                'key' => 'opening',
                'title' => 'Pembuka - '.$weekData['title'],
                'description' => 'Tujuan belajar dan gambaran materi Week.',
                'day_id' => null,
                'sort_order' => 0,
            ],
            [
                'key' => 'after_day',
                'title' => 'Penguatan - '.$weekData['title'],
                'description' => 'Ringkasan materi setelah Day 2.',
                'day_id' => $days[1]['day']->id,
                'sort_order' => 1,
            ],
            [
                'key' => 'closing',
                'title' => 'Penutup - '.$weekData['title'],
                'description' => 'Rangkuman dan tindak lanjut setelah ujian mingguan.',
                'day_id' => null,
                'sort_order' => 2,
            ],
        ];

        foreach ($placements as $placement) {
            $deck = DeckPresentasi::updateOrCreate(
                ['module_id' => $module->id, 'title' => $placement['title']],
                [
                    'level_id' => $module->level_id,
                    'created_by' => $creator?->id,
                    'module_day_id' => $placement['day_id'],
                    'week_slot' => $placement['key'],
                    'sort_order' => $placement['sort_order'],
                    'description' => $placement['description'],
                    'status' => 'published',
                    'audience_scope' => DeckPresentasi::AUDIENCE_SHARED,
                    'source_type' => 'manual',
                ]
            );

            $this->seedSlides($deck, [
                [
                    'title' => $placement['title'],
                    'layout' => 'title',
                    'content' => $placement['description'],
                ],
                [
                    'title' => 'Poin utama',
                    'layout' => 'content',
                    'content' => $weekData['description'].' Fokuskan latihan pada kosakata, pola, dan contoh penggunaannya.',
                ],
            ]);
        }
    }

    private function seedMentorPresentation(Modul $module, Pengguna $mentor): void
    {
        $deck = DeckPresentasi::updateOrCreate(
            ['module_id' => $module->id, 'title' => 'PPT Sesi Mentor - Diskusi Week 1'],
            [
                'level_id' => $module->level_id,
                'created_by' => $mentor->id,
                'module_day_id' => null,
                'week_slot' => 'opening',
                'sort_order' => 0,
                'description' => 'Contoh PPT privat yang dapat disesuaikan mentor sebelum kelas live.',
                'status' => 'draft',
                'audience_scope' => DeckPresentasi::AUDIENCE_MENTOR_SESSION,
                'source_type' => 'manual',
            ]
        );

        $this->seedSlides($deck, [
            [
                'title' => 'Diskusi bersama mentor',
                'layout' => 'title',
                'content' => 'Catat pertanyaan dan bahas contoh penggunaan kosakata bersama mentor.',
            ],
            [
                'title' => 'Papan diskusi',
                'layout' => 'jamboard',
                'content' => 'Gunakan area ini untuk menulis contoh kalimat bersama.',
            ],
        ]);
    }

    private function seedSlides(DeckPresentasi $deck, array $slides): void
    {
        foreach ($slides as $index => $slide) {
            SlidePresentasi::updateOrCreate(
                ['presentation_deck_id' => $deck->id, 'order' => $index + 1],
                [
                    ...$slide,
                    'background' => 'light',
                    'accent_color' => '#E64A19',
                    'speaker_notes' => 'Konten contoh dari seeder demo.',
                ]
            );
        }
        SlidePresentasi::where('presentation_deck_id', $deck->id)
            ->where('order', '>', count($slides))
            ->delete();
    }

    private function programs(): array
    {
        return [
            [
                'slug' => self::MANDIRI_SLUG,
                'title' => 'JLPT N3 Mandiri',
                'description' => 'Belajar mandiri melalui roadmap Week dan Day dengan repetisi, kuis, serta ujian mingguan.',
                'instructor_name' => 'Tim Akademik TOKU-UP',
                'thumbnail_url' => '/images/kelas-n3-mingguan.jpg',
            ],
            [
                'slug' => self::MENTOR_SLUG,
                'title' => 'JLPT N3 Bersama Mentor',
                'description' => 'Kurikulum JLPT N3 dengan pendampingan mentor, kloter, dan sesi kelas live.',
                'instructor_name' => 'Mentor TOKU-UP',
                'thumbnail_url' => '/images/kelas-n3-mingguan.jpg',
            ],
        ];
    }

    private function curriculum(): array
    {
        return [
            [
                'title' => 'Minggu 1 - Lingkungan dan Belanja',
                'description' => 'Memahami tempat umum, transaksi sederhana, dan cara menanyakan lokasi.',
                'days' => [
                    $this->day('Tempat Umum', 'Mengenali kanji dan kosakata tempat di sekitar kita.', [
                        $this->word('駅', 'えき', 'stasiun', 'station', 'kanji', 'tempat', '駅で友達を待ちます。', 'えきでともだちをまちます。', 'Saya menunggu teman di stasiun.', 'エキ', null, '馬', 14),
                        $this->word('病院', 'びょういん', 'rumah sakit', 'hospital', 'kosakata', 'tempat', '病院は駅の近くです。', 'びょういんはえきのちかくです。', 'Rumah sakit berada dekat stasiun.'),
                        $this->word('郵便局', 'ゆうびんきょく', 'kantor pos', 'post office', 'kosakata', 'tempat', '郵便局で荷物を送ります。', 'ゆうびんきょくでにもつをおくります。', 'Saya mengirim paket di kantor pos.'),
                        $this->word('近所', 'きんじょ', 'lingkungan sekitar', 'neighborhood', 'kosakata', 'tempat', '近所に新しい店ができました。', 'きんじょにあたらしいみせができました。', 'Ada toko baru di lingkungan sekitar.'),
                    ]),
                    $this->day('Belanja dan Diskon', 'Berlatih kosakata yang digunakan saat berbelanja.', [
                        $this->word('割引', 'わりびき', 'diskon', 'discount', 'kanji', 'belanja', 'この商品は二割引です。', 'このしょうひんはにわりびきです。', 'Barang ini mendapat diskon dua puluh persen.', 'カツ・イン', 'わり・ひく', '刀・弓', 16),
                        $this->word('半額', 'はんがく', 'setengah harga', 'half price', 'kosakata', 'belanja', '弁当が半額になりました。', 'べんとうがはんがくになりました。', 'Bento menjadi setengah harga.'),
                        $this->word('支払う', 'しはらう', 'membayar', 'to pay', 'kosakata', 'belanja', 'カードで支払います。', 'カードでしはらいます。', 'Saya membayar dengan kartu.'),
                        $this->word('領収書', 'りょうしゅうしょ', 'kuitansi', 'receipt', 'kosakata', 'belanja', '領収書をお願いします。', 'りょうしゅうしょをおねがいします。', 'Tolong berikan kuitansinya.'),
                    ]),
                    $this->day('Menanyakan Lokasi', 'Menggunakan pola sopan untuk bertanya dan memberi arah.', [
                        $this->word('案内', 'あんない', 'panduan', 'guidance', 'kanji', 'arah', '駅まで案内します。', 'えきまであんないします。', 'Saya akan memandu sampai stasiun.', 'アン', 'つくえ', '木', 10),
                        $this->word('曲がる', 'まがる', 'berbelok', 'to turn', 'kosakata', 'arah', '次の角を右に曲がってください。', 'つぎのかどをみぎにまがってください。', 'Silakan belok kanan di sudut berikutnya.'),
                        $this->word('まっすぐ', 'まっすぐ', 'lurus', 'straight', 'kosakata', 'arah', 'この道をまっすぐ進みます。', 'このみちをまっすぐすすみます。', 'Lanjutkan lurus di jalan ini.'),
                        $this->word('どこでしょうか', 'どこでしょうか', 'di manakah', 'where might it be', 'bunpo', 'pola-sopan', '受付はどこでしょうか。', 'うけつけはどこでしょうか。', 'Di manakah bagian resepsionis?'),
                    ]),
                ],
            ],
            [
                'title' => 'Minggu 2 - Rutinitas dan Jadwal',
                'description' => 'Menceritakan kegiatan, jadwal, rencana, dan kewajiban sehari-hari.',
                'days' => [
                    $this->day('Aktivitas Harian', 'Menceritakan kebiasaan dan aktivitas sehari-hari.', [
                        $this->word('運動', 'うんどう', 'olahraga', 'exercise', 'kanji', 'rutinitas', '毎朝公園で運動します。', 'まいあさこうえんでうんどうします。', 'Saya berolahraga di taman setiap pagi.', 'ウン・ドウ', 'はこぶ・うごく', '辶・力', 23),
                        $this->word('準備', 'じゅんび', 'persiapan', 'preparation', 'kosakata', 'rutinitas', '出かける準備をします。', 'でかけるじゅんびをします。', 'Saya bersiap untuk pergi.'),
                        $this->word('続ける', 'つづける', 'melanjutkan', 'to continue', 'kosakata', 'rutinitas', '毎日勉強を続けています。', 'まいにちべんきょうをつづけています。', 'Saya terus belajar setiap hari.'),
                        $this->word('習慣', 'しゅうかん', 'kebiasaan', 'habit', 'kosakata', 'rutinitas', '早起きは良い習慣です。', 'はやおきはよいしゅうかんです。', 'Bangun pagi adalah kebiasaan baik.'),
                    ]),
                    $this->day('Jadwal dan Waktu', 'Memahami perubahan jadwal dan batas waktu.', [
                        $this->word('予定', 'よてい', 'rencana atau jadwal', 'schedule', 'kanji', 'jadwal', '午後の予定を確認します。', 'ごごのよていをかくにんします。', 'Saya memeriksa jadwal sore.', 'ヨ・テイ', 'あらかじめ・さだめる', '亅・宀', 12),
                        $this->word('締切', 'しめきり', 'tenggat', 'deadline', 'kosakata', 'jadwal', '申込の締切は金曜日です。', 'もうしこみのしめきりはきんようびです。', 'Tenggat pendaftaran adalah Jumat.'),
                        $this->word('変更', 'へんこう', 'perubahan', 'change', 'kosakata', 'jadwal', '会議の時間が変更されました。', 'かいぎのじかんがへんこうされました。', 'Waktu rapat telah diubah.'),
                        $this->word('間に合う', 'まにあう', 'tepat waktu', 'to be in time', 'kosakata', 'jadwal', '電車に間に合いました。', 'でんしゃにまにあいました。', 'Saya berhasil mengejar kereta tepat waktu.'),
                    ]),
                    $this->day('Rencana dan Keharusan', 'Mengungkapkan kebutuhan, keputusan, dan kewajiban.', [
                        $this->word('必要', 'ひつよう', 'perlu', 'necessary', 'kanji', 'keharusan', '予約が必要です。', 'よやくがひつようです。', 'Reservasi diperlukan.', 'ヒツ・ヨウ', 'かなめ', '心・襾', 19),
                        $this->word('決める', 'きめる', 'memutuskan', 'to decide', 'kosakata', 'rencana', '旅行の日を決めました。', 'りょこうのひをきめました。', 'Saya sudah menentukan hari perjalanan.'),
                        $this->word('なければならない', 'なければならない', 'harus', 'must', 'bunpo', 'keharusan', '明日までに提出しなければなりません。', 'あしたまでにていしゅつしなければなりません。', 'Harus menyerahkan sebelum besok.'),
                        $this->word('つもり', 'つもり', 'berniat', 'intend to', 'bunpo', 'rencana', '来年日本へ行くつもりです。', 'らいねんにほんへいくつもりです。', 'Saya berniat pergi ke Jepang tahun depan.'),
                    ]),
                ],
            ],
            [
                'title' => 'Minggu 3 - Komunikasi Formal',
                'description' => 'Menggunakan ungkapan formal, meminta izin, dan meninjau materi N3.',
                'days' => [
                    $this->day('Ungkapan Formal', 'Mengenali ungkapan yang umum dalam situasi resmi.', [
                        $this->word('申請', 'しんせい', 'permohonan resmi', 'application', 'kanji', 'formal', 'ビザを申請しました。', 'ビザをしんせいしました。', 'Saya mengajukan permohonan visa.', 'シン・セイ', 'もうす・こう', '田・言', 14),
                        $this->word('確認', 'かくにん', 'konfirmasi', 'confirmation', 'kosakata', 'formal', '内容をご確認ください。', 'ないようをごかくにんください。', 'Silakan periksa isinya.'),
                        $this->word('担当者', 'たんとうしゃ', 'petugas penanggung jawab', 'person in charge', 'kosakata', 'formal', '担当者に連絡します。', 'たんとうしゃにれんらくします。', 'Saya akan menghubungi petugasnya.'),
                        $this->word('承知しました', 'しょうちしました', 'saya mengerti', 'understood', 'kosakata', 'formal', '変更の件、承知しました。', 'へんこうのけん、しょうちしました。', 'Saya mengerti mengenai perubahan tersebut.'),
                    ]),
                    $this->day('Permintaan dan Izin', 'Meminta bantuan dan izin dengan bahasa yang sesuai.', [
                        $this->word('許可', 'きょか', 'izin', 'permission', 'kanji', 'izin', '写真を撮る許可をもらいました。', 'しゃしんをとるきょかをもらいました。', 'Saya mendapat izin mengambil foto.', 'キョ・カ', 'ゆるす', '言・口', 16),
                        $this->word('依頼', 'いらい', 'permintaan', 'request', 'kosakata', 'formal', '先生に確認を依頼しました。', 'せんせいにかくにんをいらいしました。', 'Saya meminta guru untuk memeriksa.'),
                        $this->word('てもよろしいでしょうか', 'てもよろしいでしょうか', 'bolehkah saya', 'may I', 'bunpo', 'izin', 'こちらに座ってもよろしいでしょうか。', 'こちらにすわってもよろしいでしょうか。', 'Bolehkah saya duduk di sini?'),
                        $this->word('ていただけませんか', 'ていただけませんか', 'bisakah Anda', 'could you', 'bunpo', 'permintaan', 'もう一度説明していただけませんか。', 'もういちどせつめいしていただけませんか。', 'Bisakah Anda menjelaskan sekali lagi?'),
                    ]),
                    $this->day('Review N3', 'Meninjau kembali kosakata dan pola penting sebelum ujian.', [
                        $this->word('復習', 'ふくしゅう', 'mengulas pelajaran', 'review', 'kanji', 'belajar', '試験の前に復習します。', 'しけんのまえにふくしゅうします。', 'Saya mengulas pelajaran sebelum ujian.', 'フク・シュウ', 'また・ならう', '彳・羽', 20),
                        $this->word('正解', 'せいかい', 'jawaban benar', 'correct answer', 'kosakata', 'ujian', '正解を確認してください。', 'せいかいをかくにんしてください。', 'Silakan periksa jawaban yang benar.'),
                        $this->word('選択', 'せんたく', 'pilihan', 'selection', 'kosakata', 'ujian', '最も良い答えを選択します。', 'もっともよいこたえをせんたくします。', 'Pilih jawaban yang paling baik.'),
                        $this->word('間違い', 'まちがい', 'kesalahan', 'mistake', 'kosakata', 'ujian', '間違いから学びましょう。', 'まちがいからまなびましょう。', 'Mari belajar dari kesalahan.'),
                    ]),
                ],
            ],
        ];
    }

    private function day(string $title, string $description, array $vocabulary): array
    {
        return compact('title', 'description', 'vocabulary');
    }

    private function word(
        string $word,
        string $reading,
        string $meaning,
        string $meaningEn,
        string $contentType,
        string $category,
        string $exampleSentence,
        string $exampleReading,
        string $exampleMeaning,
        ?string $onyomi = null,
        ?string $kunyomi = null,
        ?string $radicals = null,
        ?int $strokeCount = null,
    ): array {
        return [
            'word' => $word,
            'reading' => $reading,
            'meaning' => $meaning,
            'meaning_en' => $meaningEn,
            'content_type' => $contentType,
            'category' => $category,
            'tags' => ['N3', $category],
            'example_sentence' => $exampleSentence,
            'example_reading' => $exampleReading,
            'example_meaning' => $exampleMeaning,
            'metadata' => array_filter([
                'content_type' => $contentType,
                'onyomi' => $onyomi,
                'kunyomi' => $kunyomi,
                'radicals' => $radicals ? [$radicals] : null,
                'stroke_count' => $strokeCount,
            ], fn ($value) => $value !== null),
        ];
    }
}

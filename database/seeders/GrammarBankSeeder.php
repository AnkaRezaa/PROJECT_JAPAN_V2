<?php

namespace Database\Seeders;

use App\Models\GrammarBank;
use App\Models\LevelPembelajaran;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class GrammarBankSeeder extends Seeder
{
    public function run(): void
    {
        $grammars = $this->data();

        foreach ($grammars as $item) {
            $jlpt = $item['jlpt_level'];
            $levelId = LevelPembelajaran::query()
                ->where('level_name', 'like', "%{$jlpt}%")
                ->value('id');

            GrammarBank::updateOrCreate(
                [
                    'lesson_key' => $item['lesson_key'],
                ],
                [
                    'level_id' => $levelId,
                    'jlpt_level' => $jlpt,
                    'pattern' => $item['pattern'],
                    'title' => $item['title'],
                    'meaning' => $item['meaning'],
                    'formula' => $item['formula'],
                    'explanation' => $item['explanation'],
                    'examples' => $item['examples'],
                    'category' => $item['category'],
                    'tags' => $item['tags'],
                    'status' => 'published',
                ]
            );
        }
    }

    private function data(): array
    {
        return [
            // ======================== JLPT N5 ========================
            [
                'jlpt_level' => 'N5',
                'lesson_key' => 'n5-te-wa-ikemasen',
                'pattern' => '〜てはいけません',
                'title' => 'Larangan Keras (Tidak Boleh)',
                'meaning' => 'Menyatakan larangan keras untuk melakukan suatu tindakan.',
                'formula' => 'Kata Kerja (Bentuk て) + はいけません',
                'explanation' => 'Pola ini digunakan oleh pihak yang memiliki otoritas atau aturan umum (seperti di museum, rumah sakit, kelas) untuk melarang seseorang melakukan sesuatu secara tegas.',
                'category' => 'Larangan & Izin',
                'tags' => ['N5', 'Larangan', 'Bentuk Te'],
                'examples' => [
                    [
                        'japanese' => 'ここで | タバコを吸っては | いけません。',
                        'reading' => 'ここでたばこをすってはいけません。',
                        'translation' => 'Tidak boleh merokok di sini.',
                    ],
                    [
                        'japanese' => '美術館の中で | 写真を撮っては | いけません。',
                        'reading' => 'びじゅつかんのなかでしゃしんをとってはいけません。',
                        'translation' => 'Tidak boleh mengambil foto di dalam museum.',
                    ],
                    [
                        'japanese' => 'テスト中に | 友達と話しては | いけません。',
                        'reading' => 'てすとちゅうにともだちとはなしてはいけません。',
                        'translation' => 'Tidak boleh berbicara dengan teman selama ujian.',
                    ],
                ],
            ],
            [
                'jlpt_level' => 'N5',
                'lesson_key' => 'n5-te-mo-ii-desu',
                'pattern' => '〜てもいいです',
                'title' => 'Pemberian Izin (Boleh)',
                'meaning' => 'Menyatakan izin atau memperbolehkan melakukan suatu tindakan.',
                'formula' => 'Kata Kerja (Bentuk て) + もいいです',
                'explanation' => 'Digunakan untuk memberikan izin kepada lawan bicara, atau jika diakhiri tanda tanya (〜てもいいですか) untuk meminta izin secara sopan.',
                'category' => 'Larangan & Izin',
                'tags' => ['N5', 'Izin', 'Bentuk Te'],
                'examples' => [
                    [
                        'japanese' => 'この部屋で | 休んでも | いいです。',
                        'reading' => 'このへやでやすんでもいいです。',
                        'translation' => 'Boleh beristirahat di ruangan ini.',
                    ],
                    [
                        'japanese' => '辞書を | 使っても | いいですか。',
                        'reading' => 'じしょをつかってもいいですか。',
                        'translation' => 'Bolehkah saya menggunakan kamus?',
                    ],
                    [
                        'japanese' => '宿題を | 明日出しても | いいです。',
                        'reading' => 'しゅくだいをあしただしてもいいです。',
                        'translation' => 'Boleh mengumpulkan PR besok.',
                    ],
                ],
            ],
            [
                'jlpt_level' => 'N5',
                'lesson_key' => 'n5-ta-koto-ga-arimasu',
                'pattern' => '〜たことがあります',
                'title' => 'Pengalaman (Pernah)',
                'meaning' => 'Menyatakan pengalaman di masa lalu yang pernah dilakukan.',
                'formula' => 'Kata Kerja (Bentuk た) + ことがあります',
                'explanation' => 'Digunakan untuk menyatakan bahwa pembicara pernah mengalami atau melakukan suatu hal di masa lampau.',
                'category' => 'Pengalaman',
                'tags' => ['N5', 'Pengalaman', 'Bentuk Ta'],
                'examples' => [
                    [
                        'japanese' => '日本へ | 行ったことが | あります。',
                        'reading' => 'にほんへいったことがあります。',
                        'translation' => 'Saya pernah pergi ke Jepang.',
                    ],
                    [
                        'japanese' => '富士山に | 登ったことが | ありますか。',
                        'reading' => 'ふじさんにのぼったことがありますか。',
                        'translation' => 'Pernahkah Anda mendaki Gunung Fuji?',
                    ],
                    [
                        'japanese' => '納豆を | 食べたことが | ありません。',
                        'reading' => 'なっとうをたべたことがありません。',
                        'translation' => 'Saya belum pernah makan natto.',
                    ],
                ],
            ],

            // ======================== JLPT N4 ========================
            [
                'jlpt_level' => 'N4',
                'lesson_key' => 'n4-nakereba-narimasen',
                'pattern' => '〜なければなりません',
                'title' => 'Keharusan (Harus / Wajib)',
                'meaning' => 'Menyatakan keharusan atau kewajiban melakukan suatu hal.',
                'formula' => 'Kata Kerja (Bentuk ない tanpa い) + ければなりません',
                'explanation' => 'Menunjukkan kewajiban mutlak yang harus dilakukan tanpa memandang kehendak pribadi (tugas, aturan, kesehatan).',
                'category' => 'Keharusan',
                'tags' => ['N4', 'Keharusan', 'Bentuk Nai'],
                'examples' => [
                    [
                        'japanese' => '毎日 | 薬を飲まなければ | なりません。',
                        'reading' => 'まいにちくすりをのまなければなりません。',
                        'translation' => 'Harus minum obat setiap hari.',
                    ],
                    [
                        'japanese' => '明日までに | レポートを | 出さなければなりません。',
                        'reading' => 'あしたまでにれぽーとをださなければなりません。',
                        'translation' => 'Harus mengumpulkan laporan paling lambat besok.',
                    ],
                    [
                        'japanese' => '靴を | 脱がなければ | なりません。',
                        'reading' => 'くつをぬがなければなりません。',
                        'translation' => 'Harus melepas sepatu.',
                    ],
                ],
            ],
            [
                'jlpt_level' => 'N4',
                'lesson_key' => 'n4-tara-dou-desu-ka',
                'pattern' => '〜たらどうですか',
                'title' => 'Memberikan Saran (Bagaimana Kalau)',
                'meaning' => 'Memberikan usulan atau anjuran tindakan kepada lawan bicara.',
                'formula' => 'Kata Kerja (Bentuk たら) + どうですか',
                'explanation' => 'Digunakan saat menyarankan solusi ringan atau ide kepada orang lain yang sedang bingung atau membutuhkan bantuan.',
                'category' => 'Saran',
                'tags' => ['N4', 'Saran', 'Bentuk Tara'],
                'examples' => [
                    [
                        'japanese' => '少し | 休んだら | どうですか。',
                        'reading' => 'すこしやすんだらどうですか。',
                        'translation' => 'Bagaimana kalau beristirahat sebentar?',
                    ],
                    [
                        'japanese' => '先生に | 聞いてみたら | どうですか。',
                        'reading' => 'せんせいにきいてみたらどうですか。',
                        'translation' => 'Bagaimana kalau mencoba bertanya kepada guru?',
                    ],
                    [
                        'japanese' => '病院へ | 行ったら | どうですか。',
                        'reading' => 'びょういんへいったらどうですか。',
                        'translation' => 'Bagaimana kalau pergi ke rumah sakit?',
                    ],
                ],
            ],
            [
                'jlpt_level' => 'N4',
                'lesson_key' => 'n4-kamoshiremasen',
                'pattern' => '〜かもしれません',
                'title' => 'Kemungkinan (Mungkin)',
                'meaning' => 'Menyatakan kemungkinan terjadinya sesuatu sekitar 50%.',
                'formula' => 'Kata Kerja / Kata Sifat / Kata Benda (Bentuk Biasa) + かもしれません',
                'explanation' => 'Digunakan saat pembicara tidak yakin 100% akan suatu kejadian namun menduga hal tersebut berpotensi terjadi.',
                'category' => 'Dugaan',
                'tags' => ['N4', 'Kemungkinan', 'Dugaan'],
                'examples' => [
                    [
                        'japanese' => '午後は | 雨が降る | かもしれません。',
                        'reading' => 'ごごはあめがふるかもしれません。',
                        'translation' => 'Sore nanti mungkin akan turun hujan.',
                    ],
                    [
                        'japanese' => '彼は | 今日遅れる | かもしれません。',
                        'reading' => 'かれはきょうおくれるかもしれません。',
                        'translation' => 'Dia mungkin akan datang terlambat hari ini.',
                    ],
                    [
                        'japanese' => 'この道は | 渋滞している | かもしれません。',
                        'reading' => 'このみちはじゅうたいしているかもしれません。',
                        'translation' => 'Jalan ini mungkin sedang macet.',
                    ],
                ],
            ],

            // ======================== JLPT N3 ========================
            [
                'jlpt_level' => 'N3',
                'lesson_key' => 'n3-ba-hodo',
                'pattern' => '〜ば〜ほど',
                'title' => 'Korelasi Proporsional (Semakin..., Semakin...)',
                'meaning' => 'Menunjukkan bahwa peningkatan suatu kondisi menyebabkan peningkatan kondisi lainnya secara sebanding.',
                'formula' => 'V-ば + V-辞書形 + ほど / A(い)-ければ + A(い)-い + ほど',
                'explanation' => 'Pola gramatikal untuk menyatakan hubungan korelatif positif antara dua hal (contoh: semakin belajar, semakin pandai).',
                'category' => 'Korelasi',
                'tags' => ['N3', 'Kondisional', 'Korelasi'],
                'examples' => [
                    [
                        'japanese' => '勉強すれば | するほど | 日本語が上手になります。',
                        'reading' => 'べんきょうすればするほどにほんごがじょうずになります。',
                        'translation' => 'Semakin banyak belajar, semakin mahir bahasa Jepang.',
                    ],
                    [
                        'japanese' => '早ければ | 早いほど | 準備が楽になります。',
                        'reading' => 'はやければはやいほどじゅんびがらくになります。',
                        'translation' => 'Semakin cepat, persiapannya akan semakin mudah.',
                    ],
                    [
                        'japanese' => '考えれば | 考えるほど | 良いアイデアが浮かびます。',
                        'reading' => 'かんがえればかんがえるほどよいいアイデアがうかびます。',
                        'translation' => 'Semakin dipikirkan, semakin banyak ide bagus yang muncul.',
                    ],
                ],
            ],
            [
                'jlpt_level' => 'N3',
                'lesson_key' => 'n3-wake-ni-wa-ikanai',
                'pattern' => '〜わけにはいかない',
                'title' => 'Tidak Mungkin / Tidak Bisa Karena Alasan Moral atau Sosial',
                'meaning' => 'Menyatakan ketidakmampuan melakukan sesuatu karena tuntutan sosial, etika, atau akal sehat.',
                'formula' => 'Kata Kerja (Bentuk Kamus) + わけにはいかない',
                'explanation' => 'Meskipun secara fisik mampu, pembicara tidak dapat melakukannya karena ada pertimbangan moral, rasa tanggung jawab, atau norma sosial.',
                'category' => 'Kendala Moral',
                'tags' => ['N3', 'Alasan Moral', 'Bentuk Kamus'],
                'examples' => [
                    [
                        'japanese' => '大事な会議だから | 休むわけには | いかない。',
                        'reading' => 'だいじなかいぎだからやすむわけにはいかない。',
                        'translation' => 'Karena rapat penting, saya tidak bisa begitu saja libur.',
                    ],
                    [
                        'japanese' => '友達の秘密を | 他の人に話す | わけにはいかない。',
                        'reading' => 'ともだちのひみつをほかのひとにはなすわけにはいかない。',
                        'translation' => 'Saya tidak mungkin membocorkan rahasia teman kepada orang lain.',
                    ],
                    [
                        'japanese' => '試験の前日だから | 遊んでいるわけには | いかない。',
                        'reading' => 'しけんのぜんじつだからあそんでいるわけにはいかない。',
                        'translation' => 'Karena ini malam sebelum ujian, saya tidak boleh bersantai main-main.',
                    ],
                ],
            ],
            [
                'jlpt_level' => 'N3',
                'lesson_key' => 'n3-ni-chigainai',
                'pattern' => '〜に違いない',
                'title' => 'Kepastian Kuat (Pasti / Tidak Diragukan Lagi)',
                'meaning' => 'Menyatakan keyakinan kuat dari pembicara berdasarkan bukti yang meyakinkan.',
                'formula' => 'Bentuk Biasa (Kata Kerja / Sifat / Benda) + に違いない',
                'explanation' => 'Digunakan saat pembicara sangat yakin akan dugaannya tanpa keraguan.',
                'category' => 'Kepastian',
                'tags' => ['N3', 'Kepastian', 'Keyakinan'],
                'examples' => [
                    [
                        'japanese' => 'あれだけ練習したのだから | 合格するに | 違いない。',
                        'reading' => 'あれだけれんしゅうしたのだからごうかくするにちがいない。',
                        'translation' => 'Karena sudah berlatih sekeras itu, dia pasti akan lulus.',
                    ],
                    [
                        'japanese' => '電気が消えているから | 彼はもう寝たに | 違いない。',
                        'reading' => 'でんきがきえているからかれはもうねたにちがいない。',
                        'translation' => 'Karena lampunya mati, dia pasti sudah tidur.',
                    ],
                    [
                        'japanese' => 'この料理は | 絶対に美味しいに | 違いない。',
                        'reading' => 'このりょうりはぜったいにおいしいにちがいない。',
                        'translation' => 'Masakan ini pastinya enak sekali.',
                    ],
                ],
            ],

            // ======================== JLPT N2 ========================
            [
                'jlpt_level' => 'N2',
                'lesson_key' => 'n2-ni-suginai',
                'pattern' => '〜にすぎない',
                'title' => 'Sekadar / Hanya (Tidak Lebih Dari)',
                'meaning' => 'Menunjukkan bahwa sesuatu hanyalah hal remeh atau tidak lebih dari batas tertentu.',
                'formula' => 'Bentuk Biasa + にすぎない',
                'explanation' => 'Digunakan untuk merendahkan penilaian terhadap suatu hal, menganggapnya bukan hal istimewa.',
                'category' => 'Pembatasan',
                'tags' => ['N2', 'Pembatasan', 'Penilaian'],
                'examples' => [
                    [
                        'japanese' => 'これは | 私の個人的な意見に | すぎません。',
                        'reading' => 'これはわたしのこじんてきないけんにすぎません。',
                        'translation' => 'Ini hanyalah sekadar pendapat pribadi saya.',
                    ],
                    [
                        'japanese' => '彼が言ったことは | 言い訳に | すぎない。',
                        'reading' => 'かれがいったことはいいわけにすぎない。',
                        'translation' => 'Apa yang dia katakan hanyalah sekadar alasan belaka.',
                    ],
                    [
                        'japanese' => '成功したのは | 単なる運に | すぎない。',
                        'reading' => 'せいこうしたのはたんなるうんにすぎない。',
                        'translation' => 'Kesuksesan itu hanyalah sekadar keberuntungan semata.',
                    ],
                ],
            ],
            [
                'jlpt_level' => 'N2',
                'lesson_key' => 'n2-zaru-wo-enai',
                'pattern' => '〜ざるを得ない',
                'title' => 'Terpaksa Harus (Tak Ada Pilihan Lain)',
                'meaning' => 'Menyatakan bahwa pembicara terpaksa melakukan hal yang tidak disukai karena kondisi.',
                'formula' => 'Kata Kerja (Bentuk ない tanpa ない) + ざるを得ない (する -> せざるを得ない)',
                'explanation' => 'Digunakan saat tidak ada opsi lain selain mengambil tindakan tersebut meskipun berat.',
                'category' => 'Keterpaksaan',
                'tags' => ['N2', 'Keterpaksaan', 'Situasional'],
                'examples' => [
                    [
                        'japanese' => 'この状況では | 計画を変更せざるを | 得ない。',
                        'reading' => 'このじょうきょうではけいかくをへんこうせざるをえない。',
                        'translation' => 'Dalam kondisi ini, kami terpaksa harus mengubah rencana.',
                    ],
                    [
                        'japanese' => '証拠がある以上 | 事実を認めざるを | 得ない。',
                        'reading' => 'しょうこがあるいじょうじじつをみとめざるをえない。',
                        'translation' => 'Karena ada bukti, saya terpaksa harus mengakui kenyataan ini.',
                    ],
                    [
                        'japanese' => '台風が接近しているため | 出発を延期せざるを | 得ない。',
                        'reading' => 'たいふうがせっきんしているためしゅっぱつをえんきせざるをえない。',
                        'translation' => 'Karena angin topan mendekat, keberangkatan terpaksa harus ditunda.',
                    ],
                ],
            ],

            // ======================== JLPT N1 ========================
            [
                'jlpt_level' => 'N1',
                'lesson_key' => 'n1-de-are',
                'pattern' => '〜であれ',
                'title' => 'Sekalipun / Walaupun (Bagaimanapun Kondisinya)',
                'meaning' => 'Menyatakan bahwa terlepas dari siapapun atau apapun kondisinya, ketentuannya tetap sama.',
                'formula' => 'Kata Benda + であれ',
                'explanation' => 'Digunakan dalam konteks formal untuk menegaskan prinsip atau aturan yang tidak mengenal pengecualian.',
                'category' => 'Konsesi Formal',
                'tags' => ['N1', 'Formal', 'Konsesi'],
                'examples' => [
                    [
                        'japanese' => 'たとえ | 大統領であれ | 法律に従うべきだ。',
                        'reading' => 'たとえだいとうりょうであれほうりつにしたがうべきだ。',
                        'translation' => 'Sekalipun seorang presiden, ia harus tunduk pada hukum.',
                    ],
                    [
                        'japanese' => '理由が | 何であれ | 暴力は許されない。',
                        'reading' => 'りゆうがなんであれぼうりょくはゆるされない。',
                        'translation' => 'Apapun alasannya, kekerasan tidak dapat dimaafkan.',
                    ],
                    [
                        'japanese' => 'どんな困難で | あれ | 最後までやり遂げる。',
                        'reading' => 'どんなこんなんであれさいごまでやりとげる。',
                        'translation' => 'Sekalipun sesulit apa pun, saya akan menyelesaikannya hingga akhir.',
                    ],
                ],
            ],
            [
                'jlpt_level' => 'N1',
                'lesson_key' => 'n1-wo-yogi-naku-sareru',
                'pattern' => '〜を余儀なくされる',
                'title' => 'Dipaksa Menghadapi Keadaan Sulit',
                'meaning' => 'Menunjukkan bahwa situasi memaksa seseorang berada dalam kondisi yang tidak diinginkan.',
                'formula' => 'Kata Benda + を余儀なくされる',
                'explanation' => 'Sering digunakan dalam bahasa jurnalistik/berita untuk peristiwa besar (bencana, ekonomi, politik) yang memaksa pihak terdampak mengalami kemunduran.',
                'category' => 'Jurnalistik Formal',
                'tags' => ['N1', 'Berita', 'Keterpaksaan Formal'],
                'examples' => [
                    [
                        'japanese' => '地震の影響で | 避難生活を | 余儀なくされた。',
                        'reading' => 'じしんのえいきょうでひなんせいかつをよぎなくされた。',
                        'translation' => 'Akibat gempa bumi, mereka terpaksa harus hidup di pengungsian.',
                    ],
                    [
                        'japanese' => '不況により | 工場の閉鎖を | 余儀なくされた。',
                        'reading' => 'ふきょうによりこうじょうのへいさをよぎなくされた。',
                        'translation' => 'Akibat resesi ekonomi, pabrik terpaksa harus ditutup.',
                    ],
                    [
                        'japanese' => '怪我のため | 試合の欠場を | 余儀なくされた。',
                        'reading' => 'けがのためしあいのけつじょうをよぎなくされた。',
                        'translation' => 'Karena cedera, dia terpaksa harus absen dari pertandingan.',
                    ],
                ],
            ],
        ];
    }
}

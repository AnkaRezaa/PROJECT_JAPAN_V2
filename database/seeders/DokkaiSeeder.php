<?php

namespace Database\Seeders;

use App\Models\DokkaiAttemptAnswer;
use App\Models\DokkaiParagraph;
use App\Models\DokkaiPassage;
use App\Models\DokkaiQuestion;
use App\Models\DokkaiVocabulary;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\Modul;
use App\Models\ProgramPembelajaran;
use App\Services\KuisDokkaiService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DokkaiSeeder extends Seeder
{
    public function __construct(
        private readonly KuisDokkaiService $dokkaiService
    ) {}

    public function run(): void
    {
        // 1. Bersihkan seluruh data dummy kuis dokkai lama
        DB::transaction(function () {
            DokkaiAttemptAnswer::query()->delete();
            DokkaiQuestion::query()->delete();
            DokkaiVocabulary::query()->delete();
            DokkaiParagraph::query()->delete();
            DokkaiPassage::query()->delete();
            Kuis::where('type', 'dokkai')->delete();
        });

        // 2. Ambil modul-modul aktif dari program yang ada
        $programs = ProgramPembelajaran::with(['modules.days'])->get();
        if ($programs->isEmpty()) {
            return;
        }

        $passagesData = $this->realPassagesData();

        foreach ($programs as $program) {
            foreach ($program->modules as $module) {
                $days = $module->days->sortBy('day_number')->values();
                if ($days->isEmpty()) {
                    continue;
                }

                foreach ($passagesData as $idx => $passagePayload) {
                    $day = $days->get($idx) ?? $days->first();
                    if (! $day) {
                        continue;
                    }

                    $quiz = Kuis::create([
                        'module_id' => $module->id,
                        'module_day_id' => $day->id,
                        'type' => 'dokkai',
                        'status' => 'published',
                        'passing_score' => 70,
                        'time_limit' => 300,
                        'available_at' => now(),
                    ]);

                    $this->dokkaiService->sync($quiz, $passagePayload);
                }
            }
        }
    }

    private function realPassagesData(): array
    {
        return [
            // Wacana 1: Food Loss & Budaya Mottainai (Standar JLPT N3)
            [
                'passage' => [
                    'title' => '食品ロスと「もったいない」の知恵',
                    'sub_title' => 'Food Loss Reduction & Japanese Cultural Wisdom: Menghargai makanan melalui kearifan lokal.',
                    'theme_category' => 'Budaya & Tradisi',
                    'jlpt_level' => 'N3',
                    'estimated_reading_time' => 4,
                    'xp_reward' => 80,
                    'audio_url' => null,
                ],
                'paragraphs' => [
                    [
                        'paragraph_number' => 1,
                        'label' => 'Paragraf 1 · Masalah Sampah Makanan di Jepang',
                        'content_raw' => '日本は多くの食料を外国からの輸入に頼っていますが、その一方で、まだ食べられるのに捨てられてしまう「食品ロス」が深刻な社会問題となっています。年間に廃棄される食料の量は数百万人分の食事に匹敵し、環境や資源への負担も懸念されています。',
                    ],
                    [
                        'paragraph_number' => 2,
                        'label' => 'Paragraf 2 · Filosofi Budaya Mottainai',
                        'content_raw' => '古くから日本には、物を無駄にすることを惜しむ「もったいない」という言葉があります。この考え方は仏教の教えや自然を尊ぶ心に根ざしており、食べ物の命に感謝し、一粒の米も大切にする食文化を育ててきました。現代では国際的にも注目を集める環境キーワードとなっています。',
                    ],
                    [
                        'paragraph_number' => 3,
                        'label' => 'Paragraf 3 · Inovasi Modern & Solusi Berkelanjutan',
                        'content_raw' => '現在、自治体や企業は食品ロスを減らすための新しい取り組みを始めています。スーパーでの見切り品販売や消費期限が近い食品の割引、さらには余った食材を福祉施設へ届ける「フードバンク」活動が広がっています。一人ひとりが買い物や食事の習慣を見直すことが、持続可能な社会への第一歩です。',
                    ],
                ],
                'vocabularies' => [
                    [
                        'word' => '食品ロス',
                        'furigana' => 'しょくひんロス',
                        'romaji' => 'shokuhin rosu',
                        'meaning' => 'Sampah/pemborosan makanan yang masih layak konsumsi.',
                        'pitch_accent' => '[5] 平板型',
                        'example_sentence' => '食品ロスを減らすために買いすぎに気をつけます。',
                        'example_translation' => 'Saya berhati-hati agar tidak membeli terlalu banyak demi mengurangi pemborosan makanan.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina',
                    ],
                    [
                        'word' => '輸入',
                        'furigana' => 'ゆにゅう',
                        'romaji' => 'yunyuu',
                        'meaning' => 'Impor (memasukkan barang dari luar negeri).',
                        'pitch_accent' => '[0] 平板型',
                        'example_sentence' => '多くの原材料を海外からの輸入に頼っています。',
                        'example_translation' => 'Bergantung pada impor bahan mentah dari luar negeri.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina / Verba Suru',
                    ],
                    [
                        'word' => '廃棄',
                        'furigana' => 'はいき',
                        'romaji' => 'haiki',
                        'meaning' => 'Pembuangan / pemusnahan barang.',
                        'pitch_accent' => '[1] 頭高型',
                        'example_sentence' => '賞味期限が切れた商品を廃棄しました。',
                        'example_translation' => 'Membuang produk yang telah melewati tanggal kedaluwarsa.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina / Verba Suru',
                    ],
                    [
                        'word' => '深刻',
                        'furigana' => 'しんこく',
                        'romaji' => 'shinkoku',
                        'meaning' => 'Serius / genting / mendalam.',
                        'pitch_accent' => '[0] 平板型',
                        'example_sentence' => '環境破壊は世界中で深刻な問題になっています。',
                        'example_translation' => 'Kerusakan lingkungan telah menjadi persoalan serius di seluruh dunia.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Adjektiva-Na',
                    ],
                    [
                        'word' => '知恵',
                        'furigana' => 'ちえ',
                        'romaji' => 'chie',
                        'meaning' => 'Kearifan / kebijaksanaan / kecerdikan.',
                        'pitch_accent' => '[1] 頭高型',
                        'example_sentence' => '先人の知恵を現代の暮らしに活かします。',
                        'example_translation' => 'Memanfaatkan kearifan para pendahulu dalam kehidupan modern.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina',
                    ],
                    [
                        'word' => '取り組み',
                        'furigana' => 'とりくみ',
                        'romaji' => 'torikumi',
                        'meaning' => 'Inisiatif / upaya / penanganan.',
                        'pitch_accent' => '[0] 平板型',
                        'example_sentence' => '新しい省エネの取り組みが始まりました。',
                        'example_translation' => 'Inisiatif baru hemat energi telah dimulai.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina',
                    ],
                ],
                'questions' => [
                    [
                        'question_number' => 1,
                        'question_text' => '第１段落によると、日本における「食品ロス」の現状として正しいものはどれですか。',
                        'question_translation' => 'Berdasarkan paragraf 1, manakah pernyataan yang benar mengenai kondisi pemborosan makanan di Jepang?',
                        'evidence_paragraph_number' => 1,
                        'evidence_quote' => '食料を外国からの輸入に頼っていますが、その一方で、まだ食べられるのに捨てられてしまう「食品ロス」が深刻な社会問題となっています。',
                        'explanation_correct' => 'Paragraf 1 menyatakan kontradiksi bahwa Jepang mengimpor banyak bahan makanan namun sekaligus membuang makanan yang masih layak santap.',
                        'explanation_distractors' => 'Pilihan lain tidak sesuai karena Jepang tidak mandiri pangan dan jumlah makanan terbuang bukan sedikit.',
                        'options' => [
                            [
                                'option_label' => 'A',
                                'option_text' => '食料の自給率が高いため、食品の廃棄はほとんど問題になっていない。',
                                'option_translation' => 'Karena swasembada pangan tinggi, pembuangan makanan hampir tidak menjadi masalah.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'B',
                                'option_text' => '食料の多くを輸入に頼りながらも、食べられる食料が大量に捨てられている。',
                                'option_translation' => 'Meskipun mengandalkan impor untuk sebagian besar makanan, makanan layak makan dalam jumlah besar tetap dibuang.',
                                'is_correct' => true,
                            ],
                            [
                                'option_label' => 'C',
                                'option_text' => '外国へ輸出する食料が余ってしまい、国内で消費しきれない。',
                                'option_translation' => 'Makanan yang diekspor ke luar negeri berlebih sehingga tidak habis dikonsumsi di dalam negeri.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'D',
                                'option_text' => '環境を守るために、すべての食料輸入を禁止した。',
                                'option_translation' => 'Melarang semua impor makanan demi menjaga lingkungan.',
                                'is_correct' => false,
                            ],
                        ],
                    ],
                    [
                        'question_number' => 2,
                        'question_text' => '「もったいない」という言葉について、本文の説明と合っているものはどれですか。',
                        'question_translation' => 'Mengenai kata "mottainai", manakah penjelasan yang paling tepat menurut teks?',
                        'evidence_paragraph_number' => 2,
                        'evidence_quote' => '物を無駄にすることを惜しむ「もったいない」という言葉があります。この考え方は仏教の教えや自然を尊ぶ心に根ざしており、食べ物の命に感謝し、一粒の米も大切にする食文化を育ててきました。',
                        'explanation_correct' => 'Mottainai berakar dari rasa syukur atas berkah alam dan menolak menyia-nyiakan benda/makanan.',
                        'explanation_distractors' => 'Pilihan lain salah karena mottainai bukan istilah impor dan bukan berarti membeli barang murah saja.',
                        'options' => [
                            [
                                'option_label' => 'A',
                                'option_text' => '安さだけを求めて買い物をする現代の節約志向を表している。',
                                'option_translation' => 'Mencerminkan orientasi berhemat modern yang hanya mengejar harga murah.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'B',
                                'option_text' => '自然や食べ物の命に感謝し、物を無駄にしない日本の伝統的な価値観である。',
                                'option_translation' => 'Nilai tradisional Jepang yang menghargai alam serta berkah makanan dan tidak menyia-nyiakan sesuatu.',
                                'is_correct' => true,
                            ],
                            [
                                'option_label' => 'C',
                                'option_text' => '外国から新しく導入された環境保護のスローガンである。',
                                'option_translation' => 'Slogan pelestarian lingkungan yang baru saja diperkenalkan dari luar negeri.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'D',
                                'option_text' => '使えなくなった物をすぐにゴミ箱へ捨てることを勧める言葉である。',
                                'option_translation' => 'Ungkapan yang menganjurkan segera membuang benda tak terpakai ke tempat sampah.',
                                'is_correct' => false,
                            ],
                        ],
                    ],
                    [
                        'question_number' => 3,
                        'question_text' => '第３段落で紹介されている食品ロス削減の具体的な取り組みはどれですか。',
                        'question_translation' => 'Upaya konkret penanganan food loss apa yang diperkenalkan pada paragraf 3?',
                        'evidence_paragraph_number' => 3,
                        'evidence_quote' => 'スーパーでの見切り品販売や消費期限が近い食品の割引、さらには余った食材を福祉施設へ届ける「フードバンク」活動が広がっています。',
                        'explanation_correct' => 'Paragraf 3 menyebutkan diskon barang mendekati batas konsumsi dan penyaluran lewat food bank.',
                        'explanation_distractors' => 'Pilihan lain tidak disebutkan di paragraf 3.',
                        'options' => [
                            [
                                'option_label' => 'A',
                                'option_text' => '消費期限が近い食品の割引販売や、フードバンクによる余剰食品の提供。',
                                'option_translation' => 'Penjualan diskon makanan mendekati batas waktu dan penyaluran makanan berlebih melalui food bank.',
                                'is_correct' => true,
                            ],
                            [
                                'option_label' => 'B',
                                'option_text' => '家庭での自炊を禁止し、外食のみを推奨する法律の制定。',
                                'option_translation' => 'Pemberlakuan undang-undang yang melarang memasak di rumah dan hanya mewajibkan makan di luar.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'C',
                                'option_text' => '賞味期限の表示をすべて廃止して、客に判断させること。',
                                'option_translation' => 'Menghapus seluruh label tanggal kedaluwarsa dan menyerahkan penilaian ke konsumen.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'D',
                                'option_text' => 'スーパーの営業時間を短縮して買い物を制限すること。',
                                'option_translation' => 'Mempersingkat jam buka supermarket untuk membatasi belanja.',
                                'is_correct' => false,
                            ],
                        ],
                    ],
                ],
            ],

            // Wacana 2: Mengapa Vending Machine Sangat Banyak di Jepang (Standar JLPT N3)
            [
                'passage' => [
                    'title' => '日本で自動販売機が多い理由',
                    'sub_title' => 'Vending Machines & Public Safety: Mengapa mesin penjual otomatis sangat populer di perkotaan Jepang.',
                    'theme_category' => 'Teknologi & Masyarakat',
                    'jlpt_level' => 'N3',
                    'estimated_reading_time' => 4,
                    'xp_reward' => 80,
                    'audio_url' => null,
                ],
                'paragraphs' => [
                    [
                        'paragraph_number' => 1,
                        'label' => 'Paragraf 1 · Kepadatan Jihanki di Jepang',
                        'content_raw' => '日本の街を歩くと、駅のホームや道路沿い、住宅街の路地に至るまで、至る所に自動販売機が並んでいるのが目に入ります。温かい飲み物と冷たい飲み物が同じ機械から手軽に買える便利さは、日本の日常風景の一部として定着しています。',
                    ],
                    [
                        'paragraph_number' => 2,
                        'label' => 'Paragraf 2 · Faktor Keamanan Publik & Kesibukan',
                        'content_raw' => 'これほど普及している大きな理由は、日本の良好な治安にあります。屋外に現金を収めた機械を置いても壊されたり盗まれたりする危険が極めて低いためです。また、忙しい現代人にとって、店に入らずにすぐ飲み物を購入できる点も需要に合致しています。',
                    ],
                    [
                        'paragraph_number' => 3,
                        'label' => 'Paragraf 3 · Fungsi Sosial Saat Bencana Alam',
                        'content_raw' => 'さらに最近では、地震などの自然災害が発生した際に、自動で無料開放されて被災者に飲料を提供する「災害対応型」の販売機も増えています。単なる商業設備にとどまらず、地域の防災インフラとしての役割も果たしているのです。',
                    ],
                ],
                'vocabularies' => [
                    [
                        'word' => '自動販売機',
                        'furigana' => 'じどうはんばいき',
                        'romaji' => 'jidouhanbaiki',
                        'meaning' => 'Mesin penjual otomatis (vending machine / jihanki).',
                        'pitch_accent' => '[6] 中高型',
                        'example_sentence' => '自動販売機で冷たいお茶を買いました。',
                        'example_translation' => 'Saya membeli teh dingin di mesin penjual otomatis.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina',
                    ],
                    [
                        'word' => '治安',
                        'furigana' => 'ちあん',
                        'romaji' => 'chian',
                        'meaning' => 'Keamanan dan ketertiban umum.',
                        'pitch_accent' => '[0] 平板型',
                        'example_sentence' => 'この街は治安が良くて夜も安心して歩けます。',
                        'example_translation' => 'Kota ini keamanannya baik sehingga nyaman jalan malam.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina',
                    ],
                    [
                        'word' => '普及',
                        'furigana' => 'ふきゅう',
                        'romaji' => 'fukyuu',
                        'meaning' => 'Penyebaran luas / kepopuleran.',
                        'pitch_accent' => '[0] 平板型',
                        'example_sentence' => 'スマートフォンの普及によって生活が変わりました。',
                        'example_translation' => 'Kehidupan berubah karena meluasnya penggunaan ponsel pintar.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina / Verba Suru',
                    ],
                    [
                        'word' => '災害',
                        'furigana' => 'さいがい',
                        'romaji' => 'saigai',
                        'meaning' => 'Bencana alam.',
                        'pitch_accent' => '[0] 平板型',
                        'example_sentence' => '地震などの災害に備えて水を用意します。',
                        'example_translation' => 'Menyiapkan air sebagai persiapan menghadapi bencana seperti gempa bumi.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina',
                    ],
                    [
                        'word' => '役割',
                        'furigana' => 'やくわり',
                        'romaji' => 'yakuwari',
                        'meaning' => 'Peran / tugas.',
                        'pitch_accent' => '[3] 中高型',
                        'example_sentence' => '先生は生徒の成長を促す大切な役割を持っています。',
                        'example_translation' => 'Guru memiliki peran penting mendorong pertumbuhan murid.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina',
                    ],
                ],
                'questions' => [
                    [
                        'question_number' => 1,
                        'question_text' => '日本で屋外に多くの自動販売機を設置できる最大の理由は何ですか。',
                        'question_translation' => 'Apa alasan terbesar mesin penjual otomatis dapat dipasang di luar ruangan dalam jumlah banyak di Jepang?',
                        'evidence_paragraph_number' => 2,
                        'evidence_quote' => 'これほど普及している大きな理由は、日本の良好な治安にあります。屋外に現金を収めた機械を置いても壊されたり盗まれたりする危険が極めて低いためです。',
                        'explanation_correct' => 'Tingkat keamanan publik yang baik (chian ga ii) mencegah risiko perusakan dan pencurian mesin.',
                        'explanation_distractors' => 'Pilihan lain salah karena bukan faktor harga listrik atau larangan minimarket.',
                        'options' => [
                            [
                                'option_label' => 'A',
                                'option_text' => 'コンビニエンスストアが法律で禁止されているから。',
                                'option_translation' => 'Karena toserba minimarket dilarang oleh hukum.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'B',
                                'option_text' => '治安が良く、機械が破壊されたり金銭が盗まれたりする恐れが少ないから。',
                                'option_translation' => 'Karena keamanan baik dan kecil risiko mesin dirusak atau uang dicuri.',
                                'is_correct' => true,
                            ],
                            [
                                'option_label' => 'C',
                                'option_text' => '飲み物の価格が世界で最も安いから。',
                                'option_translation' => 'Karena harga minuman paling murah di dunia.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'D',
                                'option_text' => '政府がすべての人に機械の購入を義務づけているから。',
                                'option_translation' => 'Karena pemerintah mewajibkan setiap orang membeli mesin.',
                                'is_correct' => false,
                            ],
                        ],
                    ],
                    [
                        'question_number' => 2,
                        'question_text' => '「災害対応型」の自動販売機の特徴として正しいものはどれですか。',
                        'question_translation' => 'Manakah ciri mesin penjual otomatis tipe tanggap bencana yang benar?',
                        'evidence_paragraph_number' => 3,
                        'evidence_quote' => '自然災害が発生した際に、自動で無料開放されて被災者に飲料を提供する「災害対応型」の販売機も増えています。',
                        'explanation_correct' => 'Saat bencana, mesin dapat menyalurkan minuman secara cuma-cuma kepada warga terdampak.',
                        'explanation_distractors' => 'Mesin tidak berubah menjadi tempat penampungan dan bukan menaikkan harga.',
                        'options' => [
                            [
                                'option_label' => 'A',
                                'option_text' => '災害が起きると飲み物の値段が自動的に高くなる。',
                                'option_translation' => 'Saat bencana terjadi, harga minuman naik secara otomatis.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'B',
                                'option_text' => '緊急時に無料開放され、被災者に飲み物を提供できる。',
                                'option_translation' => 'Digratiskan saat darurat untuk menyuplai minuman bagi korban bencana.',
                                'is_correct' => true,
                            ],
                            [
                                'option_label' => 'C',
                                'option_text' => '地震を感知すると地下深くに隠れる。',
                                'option_translation' => 'Bersembunyi ke bawah tanah saat mendeteksi gempa.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'D',
                                'option_text' => '救急車と同じ速さで走って避難所へ向かう。',
                                'option_translation' => 'Melaju secepat ambulans menuju tempat evakuasi.',
                                'is_correct' => false,
                            ],
                        ],
                    ],
                    [
                        'question_number' => 3,
                        'question_text' => '本文全体から読み取れる、日本における自動販売機の位置づけは何ですか。',
                        'question_translation' => 'Berdasarkan isi teks secara menyeluruh, bagaimana posisi mesin penjual otomatis di Jepang?',
                        'evidence_paragraph_number' => 3,
                        'evidence_quote' => '単なる商業設備にとどまらず、地域の防災インフラとしての役割も果たしているのです。',
                        'explanation_correct' => 'Jihanki bukan sekadar alat dagang, namun telah menjadi bagian infrastruktur sosial dan mitigasi bencana.',
                        'explanation_distractors' => 'Pilihan lain tidak mencerminkan kesimpulan teks.',
                        'options' => [
                            [
                                'option_label' => 'A',
                                'option_text' => '便利さだけでなく、防災や日常を支える社会インフラとなっている。',
                                'option_translation' => 'Bukan hanya praktis, namun menjadi infrastruktur sosial yang menopang mitigasi dan keseharian.',
                                'is_correct' => true,
                            ],
                            [
                                'option_label' => 'B',
                                'option_text' => '景観を損ねるため、早急に撤去すべき邪魔な障害物である。',
                                'option_translation' => 'Rintangan yang merusak pemandangan sehingga harus segera disingkirkan.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'C',
                                'option_text' => '外国人観光客だけが利用する一時的な流行である。',
                                'option_translation' => 'Tren sementara yang hanya digunakan oleh wisatawan asing.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'D',
                                'option_text' => '近いうちにすべて有人店舗に置き換わる予定である。',
                                'option_translation' => 'Direncanakan akan segera diganti seluruhnya oleh toko berpenjaga.',
                                'is_correct' => false,
                            ],
                        ],
                    ],
                ],
            ],

            // Wacana 3: Horenso dalam Budaya Bisnis Jepang (Standar JLPT N3)
            [
                'passage' => [
                    'title' => '日本の職場における「報連相」の重要性',
                    'sub_title' => 'Business Communication & Team Coordination: Tiga pilar komunikasi di perusahaan Jepang.',
                    'theme_category' => 'Budaya Bisnis',
                    'jlpt_level' => 'N3',
                    'estimated_reading_time' => 5,
                    'xp_reward' => 80,
                    'audio_url' => null,
                ],
                'paragraphs' => [
                    [
                        'paragraph_number' => 1,
                        'label' => 'Paragraf 1 · Pengertian Horenso',
                        'content_raw' => '日本の会社で働く上で、最も基本的かつ重要視されるビジネス習慣の一つが「報連相（ほうれんそう）」です。これは「報告」「連絡」「相談」の頭文字を合わせた言葉であり、業務を円滑に進めるための情報共有の基本原則を指しています。',
                    ],
                    [
                        'paragraph_number' => 2,
                        'label' => 'Paragraf 2 · Fungsi Masing-Masing Pilar',
                        'content_raw' => '「報告」は指示された仕事の進捗や結果を上司に伝えること、「連絡」は事実や予定を関係者に漏れなく共有すること、そして「相談」は判断に迷った際に周囲の助言を求めることです。これらを徹底することで、ミスを未然に防ぎ、迅速な意思決定が可能になります。',
                    ],
                    [
                        'paragraph_number' => 3,
                        'label' => 'Paragraf 3 · Kunci Efektivitas di Tempat Kerja',
                        'content_raw' => '効果的な報連相を行うコツは、結論から簡潔に伝えることと、問題が起きた時ほど隠さずに早く伝えることです。個人の独断で判断せず、チーム全体で状況を共有する姿勢が、組織における強い信頼関係を築く土台となります。',
                    ],
                ],
                'vocabularies' => [
                    [
                        'word' => '報告',
                        'furigana' => 'ほうこく',
                        'romaji' => 'houkoku',
                        'meaning' => 'Laporan hasil kerja atau progres.',
                        'pitch_accent' => '[0] 平板型',
                        'example_sentence' => 'プロジェクトの進捗を上司に報告しました。',
                        'example_translation' => 'Melaporkan progres proyek kepada atasan.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina / Verba Suru',
                    ],
                    [
                        'word' => '連絡',
                        'furigana' => 'れんらく',
                        'romaji' => 'renraku',
                        'meaning' => 'Pemberitahuan / kontak informasi.',
                        'pitch_accent' => '[0] 平板型',
                        'example_sentence' => '会議の時間が変更になったので連絡します。',
                        'example_translation' => 'Saya mengabari karena jadwal rapat mengalami perubahan.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina / Verba Suru',
                    ],
                    [
                        'word' => '相談',
                        'furigana' => 'そうだん',
                        'romaji' => 'soudan',
                        'meaning' => 'Konsultasi / meminta saran.',
                        'pitch_accent' => '[0] 平板型',
                        'example_sentence' => 'キャリアについて先輩に相談に乗ってもらいました。',
                        'example_translation' => 'Berkonsultasi dengan senior mengenai rencana karir.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina / Verba Suru',
                    ],
                    [
                        'word' => '進捗',
                        'furigana' => 'しんちょく',
                        'romaji' => 'shinchoku',
                        'meaning' => 'Kemajuan pekerjaan / progres.',
                        'pitch_accent' => '[0] 平板型',
                        'example_sentence' => '業務の進捗状況を確認してください。',
                        'example_translation' => 'Tolong konfirmasi status progres pekerjaan.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Nomina',
                    ],
                    [
                        'word' => '迅速',
                        'furigana' => 'じんそく',
                        'romaji' => 'jinsoku',
                        'meaning' => 'Cepat / sigap / tanggap.',
                        'pitch_accent' => '[0] 平板型',
                        'example_sentence' => 'トラブルに対して迅速に対応しました。',
                        'example_translation' => 'Merespons kendala dengan sigap dan cepat.',
                        'jlpt_level' => 'N3',
                        'part_of_speech' => 'Adjektiva-Na',
                    ],
                ],
                'questions' => [
                    [
                        'question_number' => 1,
                        'question_text' => '「報連相」の「連（連絡）」の役割として最もふさわしいものはどれですか。',
                        'question_translation' => 'Manakah peran dari "Ren (Renraku)" dalam Horenso yang paling tepat?',
                        'evidence_paragraph_number' => 2,
                        'evidence_quote' => '「連絡」は事実や予定を関係者に漏れなく共有すること',
                        'explanation_correct' => 'Renraku adalah membagikan fakta dan jadwal kepada pihak terkait tanpa ada yang terlewat.',
                        'explanation_distractors' => 'Pilihan lain merupakan definisi Houkoku atau Soudan.',
                        'options' => [
                            [
                                'option_label' => 'A',
                                'option_text' => '指示された業務の最終結果だけを上司に報告すること。',
                                'option_translation' => 'Melaporkan hanya hasil akhir pekerjaan instruksi kepada atasan.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'B',
                                'option_text' => '事実や予定などの情報を関係者に漏れなく共有すること。',
                                'option_translation' => 'Membagikan informasi fakta dan rencana ke pihak terkait secara menyeluruh.',
                                'is_correct' => true,
                            ],
                            [
                                'option_label' => 'C',
                                'option_text' => '判断に迷った時に先輩からアドバイスをもらうこと。',
                                'option_translation' => 'Meminta saran dari senior saat bingung mengambil keputusan.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'D',
                                'option_text' => 'ミスが起きた時に自分の責任ではないと言い訳すること。',
                                'option_translation' => 'Beralasan bukan kesalahan pribadi saat terjadi kekeliruan.',
                                'is_correct' => false,
                            ],
                        ],
                    ],
                    [
                        'question_number' => 2,
                        'question_text' => 'トラブルが発生した際、どのように報連相を行うべきだと述べられていますか。',
                        'question_translation' => 'Bagaimana seharusnya melakukan Horenso saat terjadi masalah menurut teks?',
                        'evidence_paragraph_number' => 3,
                        'evidence_quote' => '効果的な報連相を行うコツは、結論から簡潔に伝えることと、問題が起きた時ほど隠さずに早く伝えることです。',
                        'explanation_correct' => 'Paragraf 3 menekankan untuk tidak menyembunyikan masalah dan segera melapor sejak dini.',
                        'explanation_distractors' => 'Menyelesaikan sendiri diam-diam bertentangan dengan prinsip teks.',
                        'options' => [
                            [
                                'option_label' => 'A',
                                'option_text' => '問題が完全に解決するまで誰にも言わずに一人で抱え込む。',
                                'option_translation' => 'Menanggung masalah sendiri tanpa memberi tahu siapa pun sampai tuntas.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'B',
                                'option_text' => '隠そうとせず、結論から簡潔にできるだけ早く伝える。',
                                'option_translation' => 'Tidak berusaha menyembunyikan, dan menyampaikan secepat mungkin mulai dari kesimpulan secara ringkas.',
                                'is_correct' => true,
                            ],
                            [
                                'option_label' => 'C',
                                'option_text' => '上司の機嫌が良くなる日まで数日間待ってから報告する。',
                                'option_translation' => 'Menunggu beberapa hari sampai suasana hati atasan membaik baru melapor.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'D',
                                'option_text' => '自分の意見を１時間以上かけて詳しく説明する。',
                                'option_translation' => 'Menjelaskan opini pribadi selama lebih dari satu jam.',
                                'is_correct' => false,
                            ],
                        ],
                    ],
                    [
                        'question_number' => 3,
                        'question_text' => '職場で報連相を徹底することによって得られる最大のメリットは何ですか。',
                        'question_translation' => 'Apa manfaat terbesar dari penerapan Horenso secara menyeluruh di lingkungan kerja?',
                        'evidence_paragraph_number' => 2,
                        'evidence_quote' => 'これらを徹底することで、ミスを未然に防ぎ、迅速な意思決定が可能になります。',
                        'explanation_correct' => 'Horenso mencegah kesalahan sejak dini dan mempercepat pengambilan keputusan bersama.',
                        'explanation_distractors' => 'Pilihan lain tidak sesuai konteks teks.',
                        'options' => [
                            [
                                'option_label' => 'A',
                                'option_text' => 'ミスを未然に防ぎ、迅速な意思決定と強い信頼関係を築ける。',
                                'option_translation' => 'Mencegah kesalahan sejak dini, mempercepat pengambilan keputusan, dan membangun kepercayaan kokoh.',
                                'is_correct' => true,
                            ],
                            [
                                'option_label' => 'B',
                                'option_text' => '毎日残業をして給料を大幅に増やすことができる。',
                                'option_translation' => 'Bisa lembur setiap hari untuk meningkatkan gaji secara signifikan.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'C',
                                'option_text' => 'チームの仲間と一切会話をせずに仕事ができる。',
                                'option_translation' => 'Bisa bekerja tanpa perlu berbicara sama sekali dengan rekan tim.',
                                'is_correct' => false,
                            ],
                            [
                                'option_label' => 'D',
                                'option_text' => 'すべての責任を上司だけに押し付けることができる。',
                                'option_translation' => 'Bisa melimpahkan seluruh tanggung jawab hanya kepada atasan.',
                                'is_correct' => false,
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}

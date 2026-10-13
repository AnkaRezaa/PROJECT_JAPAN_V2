<?php

namespace Tests\Feature;

use App\Models\HariModul;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class AdminDokkaiSpreadsheetImportTest extends TestCase
{
    use RefreshDatabase;

    private Pengguna $admin;
    private HariModul $day;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = Pengguna::factory()->create([
            'role' => 'admin',
            'admin_scope' => 'global',
        ]);

        $level = LevelPembelajaran::create([
            'level_name' => 'N3',
            'stage' => 1,
            'is_premium' => false,
        ]);

        $program = ProgramPembelajaran::create([
            'level_id' => $level->id,
            'title' => 'JLPT N3 Program',
            'slug' => 'jlpt-n3-program-test',
            'description' => 'Test Program',
            'status' => 'published',
        ]);

        $module = Modul::create([
            'level_id' => $level->id,
            'program_pembelajaran_id' => $program->id,
            'title' => 'Minggu 1',
            'week_number' => 1,
            'status' => 'published',
        ]);

        $this->day = HariModul::create([
            'module_id' => $module->id,
            'day_number' => 1,
            'title' => 'Hari 1',
            'status' => 'published',
        ]);
    }

    public function test_admin_dapat_mengunduh_template_dokkai_xlsx(): void
    {
        $response = $this->actingAs($this->admin)
            ->get(route('admin.dokkai-quizzes.template', ['moduleDay' => $this->day->id, 'format' => 'xlsx']));

        $response->assertOk();
        $this->assertStringContainsString('.xlsx', (string) $response->headers->get('content-disposition'));
    }

    public function test_admin_dapat_mengunduh_template_dokkai_csv_dengan_bom_utf8(): void
    {
        $response = $this->actingAs($this->admin)
            ->get(route('admin.dokkai-quizzes.template', ['moduleDay' => $this->day->id, 'format' => 'csv']));

        $response->assertOk();
        $this->assertStringContainsString('.csv', (string) $response->headers->get('content-disposition'));

        $content = $response->getFile()->getContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('judul_wacana', $content);
        $this->assertStringContainsString('日本のゴミ分別文化', $content);
    }

    public function test_preview_import_dokkai_1sheet_mengelompokkan_wacana_dan_memecah_paragraf(): void
    {
        $csvContent = "\xEF\xBB\xBFjudul_wacana,level,teks_bacaan,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,kunci,pembahasan\n"
            . "\"日本のコンビニ\",N3,\"日本のコンビニはとても便利です。\n\n24時間いつでも買い物や支払いができます。\",\"コンビニの利点は何か。\",\"24時間営業している\",\"値段がとても高い\",\"夜は閉まっている\",\"薬しか売っていない\",A,\"Paragraf 2 menyatakan buka 24 jam.\"\n"
            . ",,,\"夜にできることはどれか。\",\"病院に行く\",\"買い物や支払いができる\",\"銀行で口座を作る\",\"旅行に行く\",B,\"Bisa belanja dan bayar tagihan.\"\n";

        $file = UploadedFile::fake()->createWithContent('dokkai_test.csv', $csvContent);

        $response = $this->actingAs($this->admin)
            ->postJson(route('admin.dokkai-quizzes.import.preview', ['moduleDay' => $this->day->id]), [
                'import_file' => $file,
            ]);

        $response->assertOk();
        $response->assertJson([
            'valid' => true,
            'total_passages' => 1,
            'total_questions' => 2,
        ]);

        $passages = $response->json('passages');
        $this->assertCount(1, $passages);
        $this->assertSame('日本のコンビニ', $passages[0]['passage']['title']);
        $this->assertCount(2, $passages[0]['paragraphs']);
        $this->assertCount(2, $passages[0]['questions']);
        $this->assertSame('A', $passages[0]['questions'][0]['options'][0]['option_label']);
        $this->assertTrue($passages[0]['questions'][0]['options'][0]['is_correct']);
    }

    public function test_commit_import_dokkai_berhasil_menyimpan_kuis_passage_dan_soal(): void
    {
        $csvContent = "\xEF\xBB\xBFjudul_wacana,level,teks_bacaan,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,kunci,pembahasan\n"
            . "\"日本の桜\",N3,\"春になると桜が咲きます。\n\n多くの人がお花見を楽しみます。\",\"桜はいつ咲くか。\",\"春\",\"夏\",\"秋\",\"冬\",A,\"Paragraf 1 menyatakan musim semi.\"\n";

        $file = UploadedFile::fake()->createWithContent('sakura.csv', $csvContent);

        $response = $this->actingAs($this->admin)
            ->postJson(route('admin.dokkai-quizzes.import', ['moduleDay' => $this->day->id]), [
                'import_file' => $file,
            ]);

        $response->assertOk();
        $response->assertJson([
            'imported_count' => 1,
        ]);

        $this->assertDatabaseHas('quizzes', [
            'module_day_id' => $this->day->id,
            'type' => 'dokkai',
            'status' => 'draft',
        ]);

        $this->assertDatabaseHas('dokkai_passages', [
            'title' => '日本の桜',
            'jlpt_level' => 'N3',
        ]);

        $this->assertDatabaseHas('dokkai_paragraphs', [
            'paragraph_number' => 1,
            'content_raw' => '春になると桜が咲きます。',
        ]);

        $this->assertDatabaseHas('dokkai_paragraphs', [
            'paragraph_number' => 2,
            'content_raw' => '多くの人がお花見を楽しみます。',
        ]);

        $this->assertDatabaseHas('dokkai_questions', [
            'question_number' => 1,
            'question_text' => '桜はいつ咲くか。',
        ]);
    }

    public function test_import_menolak_file_dengan_kunci_jawaban_tidak_valid(): void
    {
        $csvContent = "\xEF\xBB\xBFjudul_wacana,level,teks_bacaan,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,kunci,pembahasan\n"
            . "\"Test Title\",N3,\"Ini wacana.\",\"Pertanyaan?\",\"Opsi A\",\"Opsi B\",\"Opsi C\",\"Opsi D\",Z,\"Pembahasan\"\n";

        $file = UploadedFile::fake()->createWithContent('invalid_key.csv', $csvContent);

        $response = $this->actingAs($this->admin)
            ->postJson(route('admin.dokkai-quizzes.import.preview', ['moduleDay' => $this->day->id]), [
                'import_file' => $file,
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'valid' => false,
        ]);

        $errors = $response->json('errors');
        $this->assertNotEmpty($errors);
        $this->assertSame('kunci', $errors[0]['column']);
    }
}

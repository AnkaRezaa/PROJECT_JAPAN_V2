<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Services\ImportKuisDokkaiService;
use App\Services\ImportSpreadsheetService;
use App\Services\KloterBelajarService;
use App\Services\KuisDokkaiService;
use App\Services\TemplateExcelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AdminDokkaiController extends Controller
{
    public function __construct(
        private readonly KloterBelajarService $kloter,
        private readonly KuisDokkaiService $dokkaiService
    ) {}

    public function picker(Request $request): JsonResponse
    {
        $query = Kuis::query()
            ->where('type', 'dokkai')
            ->whereHas('dokkaiPassage')
            ->with([
                'dokkaiPassage.paragraphs',
                'dokkaiPassage.vocabularies',
                'dokkaiPassage.questions',
                'moduleDay.module.programPembelajaran',
            ]);

        if ($request->filled('level') && $request->string('level') !== 'all') {
            $level = (string) $request->string('level');
            $query->whereHas('dokkaiPassage', fn ($q) => $q->where('jlpt_level', $level));
        }

        if ($request->filled('search')) {
            $search = (string) $request->string('search');
            $query->whereHas('dokkaiPassage', fn ($q) => $q->where('title', 'like', "%{$search}%"));
        }

        $items = $query->latest('id')
            ->limit(30)
            ->get()
            ->map(fn (Kuis $quiz) => $this->dokkaiService->payload($quiz, true));

        return response()->json(['data' => $items]);
    }

    public function index(Request $request, HariModul $moduleDay): JsonResponse
    {
        $this->authorizeDay($request, $moduleDay);

        $quizzes = $moduleDay->quizzes()
            ->where('type', 'dokkai')
            ->with(['dokkaiPassage.paragraphs', 'dokkaiPassage.vocabularies', 'dokkaiPassage.questions'])
            ->get()
            ->map(fn (Kuis $quiz) => $this->dokkaiService->payload($quiz, true));

        return response()->json(['lessons' => $quizzes]);
    }

    public function show(Request $request, Kuis $quiz): JsonResponse
    {
        $this->authorizeQuiz($request, $quiz);

        return response()->json(['lesson' => $this->dokkaiService->payload($quiz, true)]);
    }

    public function store(Request $request, HariModul $moduleDay): JsonResponse
    {
        $this->authorizeDay($request, $moduleDay);
        $validated = $this->validatePayload($request);

        $quiz = DB::transaction(function () use ($moduleDay, $validated) {
            $quiz = Kuis::create([
                'module_id' => $moduleDay->module_id,
                'module_day_id' => $moduleDay->id,
                'type' => 'dokkai',
                'time_limit' => $validated['time_limit'] ?? 300,
                'passing_score' => $validated['passing_score'] ?? 70,
                'status' => 'draft',
            ]);

            return $this->dokkaiService->sync($quiz, $validated);
        });

        return response()->json([
            'message' => 'Draf Wacana Dokkai berhasil disimpan.',
            'lesson' => $this->dokkaiService->payload($quiz, true),
        ], 201);
    }

    public function update(Request $request, Kuis $quiz): JsonResponse
    {
        $this->authorizeQuiz($request, $quiz);
        $validated = $this->validatePayload($request);
        $quiz = $this->dokkaiService->sync($quiz, $validated);

        return response()->json([
            'message' => 'Draf Wacana Dokkai berhasil diperbarui.',
            'lesson' => $this->dokkaiService->payload($quiz, true),
        ]);
    }

    public function destroy(Request $request, Kuis $quiz): JsonResponse
    {
        $this->authorizeQuiz($request, $quiz);
        $quiz->delete();

        return response()->json(['message' => 'Wacana Dokkai berhasil dihapus.']);
    }

    public function updateStatus(Request $request, Kuis $quiz): JsonResponse
    {
        $this->authorizeQuiz($request, $quiz);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['draft', 'published'])],
        ]);

        $quiz->update(['status' => $validated['status']]);

        return response()->json([
            'message' => $validated['status'] === 'published'
                ? 'Wacana Dokkai berhasil diterbitkan.'
                : 'Wacana Dokkai dikembalikan menjadi draf.',
            'status' => $quiz->status,
        ]);
    }

    public function template(
        Request $request,
        HariModul $moduleDay,
        TemplateExcelService $excel
    ): BinaryFileResponse {
        $this->authorizeDay($request, $moduleDay);
        $format = strtolower((string) $request->query('format', 'xlsx'));

        $headers = ImportKuisDokkaiService::EXPECTED_HEADERS;

        $sampleRows = [
            [
                '日本のゴミ分別文化',
                'JLPT N3',
                "日本では、ゴミを捨てる時に細かく分別しなければなりません。\n\n例えば、燃えるゴミと燃えないゴミ、そしてペットボトルや空き缶などを分けて決められた曜日に出します。",
                '日本のゴミ捨てについて正しいものはどれか。',
                '何も分別しない',
                '細かく分別する',
                'いつでも捨てられる',
                '分別は有料である',
                'B',
                'Paragraf 1 menyatakan bahwa sampah harus dipilah secara detail sesuai jenisnya.',
            ],
            [
                '',
                '',
                '',
                'ペットボトルを捨てる時の正しい出し方はどれか。',
                'キャップをつけたまま出す',
                '洗わずにそのまま出す',
                '中を洗ってキャップやラベルを外す',
                '燃えないゴミの日に出す',
                'C',
                'Botol plastik harus dicuci dan dipisahkan antara tutup dan labelnya.',
            ],
            [
                '温泉のマナー',
                'JLPT N3',
                "日本の温泉には、みんなが気持ちよく利用するための特別なマナーがあります。\n\nまず、湯船に入る前に必ず体を洗わなければなりません。また、タオルを湯船の中に入れてはいけません。",
                '温泉に入る前に最初にしなければならないことは何か。',
                'すぐに湯船に入って温まる',
                '体をきれいに洗う',
                'タオルを湯船につける',
                '大きな声で挨拶をする',
                'B',
                'Paragraf 2 menyatakan harus membersihkan tubuh terlebih dahulu sebelum masuk ke kolam air panas.',
            ],
        ];

        if ($format === 'csv') {
            $tempPath = tempnam(sys_get_temp_dir(), 'dokkai-csv-');
            $handle = fopen($tempPath, 'w');
            fputs($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $headers);
            foreach ($sampleRows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);

            return response()->download($tempPath, 'template-wacana-dokkai-hari-'.$moduleDay->day_number.'.csv')
                ->deleteFileAfterSend(true);
        }

        $path = $excel->xlsxPath($headers, $sampleRows, 'Dokkai', 'dokkai-template-');

        return response()->download($path, 'template-wacana-dokkai-hari-'.$moduleDay->day_number.'.xlsx')
            ->deleteFileAfterSend(true);
    }

    public function previewImport(
        Request $request,
        HariModul $moduleDay,
        ImportSpreadsheetService $spreadsheets,
        ImportKuisDokkaiService $importer
    ): JsonResponse {
        $this->authorizeDay($request, $moduleDay);
        $validated = $request->validate([
            'import_file' => ['required', 'file', 'mimes:xlsx,csv,txt', 'max:5120'],
        ]);

        $file = $validated['import_file'];
        $extension = strtolower($file->getClientOriginalExtension());
        $rows = $spreadsheets->rows($file->getRealPath(), $extension);
        $preview = $importer->preview($moduleDay, $rows);

        if (! $preview['valid']) {
            return response()->json($preview, 422);
        }

        return response()->json($preview);
    }

    public function import(
        Request $request,
        HariModul $moduleDay,
        ImportSpreadsheetService $spreadsheets,
        ImportKuisDokkaiService $importer
    ): JsonResponse {
        $this->authorizeDay($request, $moduleDay);
        $validated = $request->validate([
            'import_file' => ['required', 'file', 'mimes:xlsx,csv,txt', 'max:5120'],
        ]);

        $file = $validated['import_file'];
        $extension = strtolower($file->getClientOriginalExtension());
        $rows = $spreadsheets->rows($file->getRealPath(), $extension);
        $preview = $importer->preview($moduleDay, $rows);

        if (! $preview['valid']) {
            return response()->json($preview, 422);
        }

        $count = $importer->commit($moduleDay, $preview);

        return response()->json([
            'message' => "{$count} wacana Dokkai berhasil diimpor dan disimpan sebagai draf.",
            'imported_count' => $count,
        ]);
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'passing_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'time_limit' => ['nullable', 'integer', 'min:0'],
            'passage' => ['required', 'array'],
            'passage.title' => ['required', 'string', 'max:255'],
            'passage.sub_title' => ['nullable', 'string', 'max:500'],
            'passage.theme_category' => ['nullable', 'string', 'max:100'],
            'passage.jlpt_level' => ['nullable', 'string', 'max:10'],
            'passage.estimated_reading_time' => ['nullable', 'integer', 'min:1'],
            'passage.xp_reward' => ['nullable', 'integer', 'min:0'],
            'passage.audio_url' => ['nullable', 'string', 'max:500'],
            'paragraphs' => ['nullable', 'array'],
            'paragraphs.*.paragraph_number' => ['nullable', 'integer'],
            'paragraphs.*.label' => ['nullable', 'string', 'max:255'],
            'paragraphs.*.content_raw' => ['required', 'string'],
            'vocabularies' => ['nullable', 'array'],
            'vocabularies.*.word' => ['required', 'string', 'max:255'],
            'vocabularies.*.furigana' => ['required', 'string', 'max:255'],
            'vocabularies.*.romaji' => ['nullable', 'string', 'max:255'],
            'vocabularies.*.meaning' => ['required', 'string'],
            'vocabularies.*.pitch_accent' => ['nullable', 'string', 'max:100'],
            'vocabularies.*.part_of_speech' => ['nullable', 'string', 'max:100'],
            'vocabularies.*.jlpt_level' => ['nullable', 'string', 'max:10'],
            'vocabularies.*.example_sentence' => ['nullable', 'string'],
            'vocabularies.*.example_translation' => ['nullable', 'string'],
            'vocabularies.*.audio_url' => ['nullable', 'string', 'max:500'],
            'questions' => ['nullable', 'array'],
            'questions.*.question_number' => ['nullable', 'integer'],
            'questions.*.question_text' => ['required', 'string'],
            'questions.*.question_translation' => ['nullable', 'string'],
            'questions.*.evidence_paragraph_id' => ['nullable', 'integer'],
            'questions.*.evidence_paragraph_number' => ['nullable', 'integer'],
            'questions.*.evidence_quote' => ['nullable', 'string'],
            'questions.*.explanation_correct' => ['nullable', 'string'],
            'questions.*.explanation_distractors' => ['nullable', 'array'],
            'questions.*.options' => ['required', 'array', 'min:2'],
        ]);
    }

    private function authorizeDay(Request $request, HariModul $moduleDay): void
    {
        $this->kloter->abortJikaModulDiLuarCakupan($request->user(), (int) $moduleDay->module_id);
    }

    private function authorizeQuiz(Request $request, Kuis $quiz): void
    {
        abort_unless($quiz->isDokkai(), 404, 'Kuis Dokkai tidak ditemukan.');
        $this->kloter->abortJikaModulDiLuarCakupan($request->user(), (int) $quiz->module_id);
    }
}

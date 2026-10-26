<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Services\KloterBelajarService;
use App\Services\QuizGenerator\QuizGeneratorDraft;
use App\Services\QuizGenerator\QuizGeneratorManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class AdminQuizGeneratorController extends Controller
{
    public function __invoke(Request $request, string $type, QuizGeneratorManager $generator, KloterBelajarService $scope): JsonResponse
    {
        abort_unless(in_array($type, ['vocab', 'grammar', 'dokkai'], true), 404);
        $validated = $request->validate([
            'operation' => ['required', 'in:generate,regenerate'],
            'quiz_id' => ['nullable', 'integer', 'exists:quizzes,id'],
            'module_day_id' => ['required_without:quiz_id', 'nullable', 'integer', 'exists:module_days,id'],
            'level' => ['required', Rule::in(['N5', 'N4', 'N3', 'N2', 'N1'])],
            'input' => ['required', 'array:source_quiz_id,pattern,title,formula,meaning,explanation,examples,category,mode,status,content_type'],
            'input.source_quiz_id' => [Rule::requiredIf($type === 'dokkai'), 'nullable', 'integer'],
            'input.pattern' => [Rule::requiredIf($type === 'grammar'), 'nullable', 'string', 'max:255'],
            'input.title' => ['nullable', 'string', 'max:255'],
            'input.formula' => ['nullable', 'string', 'max:5000'],
            'input.meaning' => ['nullable', 'string', 'max:5000'],
            'input.explanation' => ['nullable', 'string', 'max:10000'],
            'input.examples' => ['nullable', 'array', 'max:20'],
            'input.examples.*.japanese' => ['required', 'string', 'max:5000'],
            'input.examples.*.reading' => ['nullable', 'string', 'max:5000'],
            'input.examples.*.translation' => ['nullable', 'string', 'max:5000'],
            'input.category' => ['nullable', 'string', 'max:100'],
            'input.mode' => ['nullable', 'in:word_to_meaning,meaning_to_word,reading_to_word'],
            'input.status' => ['nullable', 'in:published,draft,all'],
            'input.content_type' => ['nullable', Rule::in([...Kosakata::contentTypes(), 'all'])],
            'settings' => ['required', 'array:count,counts,difficulty,target_form,useDistractors,autoMeaning'],
            'settings.count' => ['required', 'integer', 'min:1', 'max:15'],
            'settings.counts' => [Rule::requiredIf($type === 'grammar'), 'nullable', 'array:transformation,sentence_builder,context_choice'],
            'settings.counts.transformation' => [Rule::requiredIf($type === 'grammar'), 'nullable', 'integer', 'min:1', 'max:13'],
            'settings.counts.sentence_builder' => [Rule::requiredIf($type === 'grammar'), 'nullable', 'integer', 'min:1', 'max:13'],
            'settings.counts.context_choice' => [Rule::requiredIf($type === 'grammar'), 'nullable', 'integer', 'min:1', 'max:13'],
            'settings.difficulty' => ['nullable', 'in:easy,medium,hard,mixed'],
            'settings.target_form' => ['nullable', 'in:auto,te,ba,nai,ta,dict,stem,potential,passive,causative'],
            'settings.useDistractors' => ['nullable', 'boolean'],
            'settings.autoMeaning' => ['nullable', 'boolean'],
            'question_id' => ['required_if:operation,regenerate', 'nullable', 'string', 'max:100'],
            'existing_questions' => ['required_if:operation,regenerate', 'nullable', 'array', 'max:60'],
            'existing_questions.*' => ['required', 'array'],
            'existing_questions.*.id' => ['required', 'string', 'max:100', 'distinct'],
            'existing_questions.*.source' => ['nullable', 'array'],
            'existing_questions.*.source.id' => ['nullable', 'integer'],
            'existing_questions.*.source.quiz_id' => ['nullable', 'integer'],
            'existing_questions.*.kind' => ['required', 'in:choice,sentence_builder'],
            'existing_questions.*.stage' => [Rule::requiredIf($type === 'grammar' && $request->input('operation') === 'regenerate'), 'nullable', 'in:transformation,sentence_builder,context_choice'],
            'existing_questions.*.prompt' => ['nullable', 'string', 'max:10000'],
            'existing_questions.*.japanese' => ['nullable', 'string', 'max:5000'],
            'existing_questions.*.choices' => ['nullable', 'array', 'max:8'],
            'existing_questions.*.choices.*.text' => ['required', 'string', 'max:5000'],
            'existing_questions.*.choices.*.id' => ['required', 'string', 'max:100'],
            'existing_questions.*.tokens' => ['nullable', 'array', 'max:100'],
            'existing_questions.*.tokens.*.text' => ['required', 'string', 'max:5000'],
            'existing_questions.*.tokens.*.id' => ['required', 'string', 'max:100'],
            'existing_questions.*.answer.choice_id' => ['nullable', 'string', 'max:100'],
            'existing_questions.*.answer' => ['required', 'array'],
            'existing_questions.*.answer.correct_order' => ['nullable', 'array', 'max:100'],
            'existing_questions.*.answer.correct_order.*' => ['required', 'string', 'max:100'],
        ]);
        $quiz = isset($validated['quiz_id']) ? Kuis::with('module')->findOrFail($validated['quiz_id']) : null;
        $day = isset($validated['module_day_id']) ? HariModul::with('module')->findOrFail($validated['module_day_id']) : null;
        if ($quiz) {
            abort_unless($type === 'vocab' ? ! in_array($quiz->type, ['grammar', 'dokkai'], true) : $quiz->type === $type, 422, 'Jenis kuis tujuan tidak sesuai.');
            abort_if($day && $quiz->module_day_id !== $day->id, 422, 'Hari dan kuis tujuan tidak sesuai.');
        }
        $module = $quiz?->module ?? $day?->module;
        abort_unless($module, 404);
        $scope->abortJikaModulDiLuarCakupan($request->user(), $module);
        $quiz ??= new Kuis(['module_id' => $module->id, 'module_day_id' => $day->id, 'type' => $type]);
        if ($type === 'grammar' && (int) array_sum($validated['settings']['counts']) !== (int) $validated['settings']['count']) {
            throw ValidationException::withMessages(['settings.counts' => 'Jumlah tiga tahap harus sama dengan total soal.']);
        }
        $payload = [...$validated, '_quiz' => $quiz, '_user' => $request->user()];
        if ($validated['operation'] === 'regenerate') {
            $existing = $request->input('existing_questions');
            if ($type === 'dokkai') {
                foreach ($existing as $question) {
                    abort_unless((int) ($question['source']['quiz_id'] ?? 0) === (int) $validated['input']['source_quiz_id'], 422, 'Soal harus berasal dari wacana yang sama.');
                }
            }
            $question = $generator->regenerate($type, $validated['question_id'], [
                'payload' => $payload, 'settings' => $validated['settings'], 'existing_questions' => $existing,
            ]);
            $draft = QuizGeneratorDraft::pack($type, $validated['level'], [], [$question]);
        } else {
            $draft = $generator->generate($type, $payload, $validated['settings']);
        }

        return response()->json(['draft' => $draft]);
    }
}

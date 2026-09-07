<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncExamQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return ['questions' => ['present', 'array', 'max:500'], 'questions.*.id' => ['nullable', 'integer'], 'questions.*.source_question_id' => ['nullable', 'exists:questions,id'], 'questions.*.code' => ['nullable', 'string', 'max:80'], 'questions.*.type' => ['required', Rule::in(['multiple_choice', 'fill_blank', 'typing', 'listening', 'sentence_builder'])], 'questions.*.sort_order' => ['required', 'integer', 'distinct', 'min:1', 'max:1000'], 'questions.*.points' => ['required', 'integer', 'min:1', 'max:100'], 'questions.*.question_text' => ['required', 'string', 'max:10000'], 'questions.*.question_reading' => ['nullable', 'string', 'max:10000'], 'questions.*.options' => ['nullable', 'array', 'max:20'], 'questions.*.option_readings' => ['nullable', 'array', 'max:20'], 'questions.*.correct_answer' => ['required', 'string', 'max:10000'], 'questions.*.correct_answer_reading' => ['nullable', 'string', 'max:10000'], 'questions.*.explanation' => ['nullable', 'string', 'max:20000'], 'questions.*.explanation_reading' => ['nullable', 'string', 'max:20000'], 'questions.*.audio_path' => ['nullable', 'string', 'max:500']];
    }
}

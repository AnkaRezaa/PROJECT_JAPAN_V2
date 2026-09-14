<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExamBankQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'superadmin'], true);
    }

    public function rules(): array
    {
        return [
            'exam_question_wrapper_id' => ['nullable', 'exists:exam_question_wrappers,id'],
            'code' => ['nullable', 'string', 'max:80'],
            'type' => ['required', Rule::in(['multiple_choice', 'listening', 'fill_blank', 'sentence_builder'])],
            'points' => ['nullable', 'integer', 'min:1', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'question_text' => ['required', 'string'],
            'question_reading' => ['nullable', 'string'],
            'options' => ['nullable'],
            'option_readings' => ['nullable'],
            'correct_answer' => ['required', 'string'],
            'correct_answer_reading' => ['nullable', 'string'],
            'explanation' => ['nullable', 'string'],
            'explanation_reading' => ['nullable', 'string'],
            'audio_url' => ['nullable', 'string', 'max:500'],
        ];
    }
}

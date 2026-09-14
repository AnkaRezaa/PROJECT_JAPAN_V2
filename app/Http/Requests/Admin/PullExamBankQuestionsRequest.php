<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class PullExamBankQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'superadmin'], true);
    }

    public function rules(): array
    {
        return [
            'bank_question_ids' => ['required', 'array', 'min:1'],
            'bank_question_ids.*' => ['integer', 'exists:exam_bank_questions,id'],
        ];
    }
}

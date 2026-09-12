<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartExamAttemptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'user';
    }

    public function rules(): array
    {
        return ['session_id' => ['required', 'exists:exam_sessions,id'], 'submission_token' => ['required', 'uuid'], 'mode' => ['required', Rule::in(['full', 'section'])], 'section_key' => ['nullable', Rule::in(['vocabulary', 'grammar_reading', 'listening'])], 'agreement_accepted' => ['accepted']];
    }

    public function messages(): array
    {
        return ['agreement_accepted.accepted' => 'Kamu harus menyetujui ketentuan ujian sebelum memulai.'];
    }
}

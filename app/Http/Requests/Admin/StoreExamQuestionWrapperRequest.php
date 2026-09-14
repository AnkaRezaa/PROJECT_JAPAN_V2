<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExamQuestionWrapperRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'superadmin'], true);
    }

    public function rules(): array
    {
        return [
            'wrapper_code' => ['nullable', 'string', 'max:80'],
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::in(['vocabulary', 'grammar', 'reading', 'listening'])],
            'mondai_number' => ['nullable', 'string', 'max:40'],
            'stimulus_text' => ['nullable', 'string'],
            'stimulus_reading' => ['nullable', 'string'],
            'audio_url' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}

<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncExamSectionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return ['sections' => ['required', 'array', 'min:1', 'max:10'], 'sections.*.key' => ['required', 'distinct', Rule::in(['vocabulary', 'grammar_reading', 'listening'])], 'sections.*.title' => ['required', 'string', 'max:255'], 'sections.*.short_title' => ['nullable', 'string', 'max:100'], 'sections.*.sort_order' => ['required', 'integer', 'distinct', 'min:1', 'max:10'], 'sections.*.time_limit_seconds' => ['required', 'integer', 'min:60', 'max:14400'], 'sections.*.estimated_max_score' => ['required', 'integer', 'min:1', 'max:180'], 'sections.*.estimated_pass_score' => ['required', 'integer', 'min:0', 'max:180']];
    }
}

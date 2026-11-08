<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateExamQuestionBankRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'superadmin'], true);
    }

    public function rules(): array
    {
        return [
            'category' => ['prohibited'],
            'ssw_field' => ['prohibited'],
            'level_id' => ['sometimes', Rule::requiredIf(($this->route('bank')?->category ?? 'jlpt') === 'jlpt'), Rule::prohibitedIf(($this->route('bank')?->category ?? 'jlpt') !== 'jlpt'), 'nullable', 'exists:levels,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'required', Rule::in(['draft', 'published', 'archived'])],
        ];
    }
}

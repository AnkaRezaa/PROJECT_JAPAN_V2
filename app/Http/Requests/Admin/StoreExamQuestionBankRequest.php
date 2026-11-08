<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExamQuestionBankRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'superadmin'], true);
    }

    public function rules(): array
    {
        return [
            'category' => ['sometimes', Rule::in(['jlpt', 'jft_basic', 'ssw'])],
            'level_id' => [Rule::requiredIf($this->input('category', 'jlpt') === 'jlpt'), Rule::prohibitedIf($this->input('category', 'jlpt') !== 'jlpt'), 'nullable', 'exists:levels,id'],
            'ssw_field' => [Rule::requiredIf($this->input('category', 'jlpt') === 'ssw'), Rule::prohibitedIf($this->input('category', 'jlpt') !== 'ssw'), 'nullable', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', Rule::in(['draft', 'published', 'archived'])],
        ];
    }
}

<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExamSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:255'], 'starts_at' => ['nullable', 'date'], 'ends_at' => ['nullable', 'date', 'after:starts_at'], 'status' => ['required', Rule::in(['draft', 'scheduled', 'active', 'closed', 'cancelled'])], 'attempt_limit_override' => ['nullable', 'integer', 'min:1', 'max:100'], 'ranking_enabled' => ['boolean'], 'cohort_ids' => ['array', 'max:100'], 'cohort_ids.*' => ['integer', 'distinct', 'exists:kloter_belajar,id']];
    }
}

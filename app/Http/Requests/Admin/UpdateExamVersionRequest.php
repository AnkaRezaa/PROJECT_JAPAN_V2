<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateExamVersionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'superadmin'], true);
    }

    public function rules(): array
    {
        return ['attempt_limit' => ['nullable', 'integer', 'min:1', 'max:100'], 'result_release_policy' => ['required', Rule::in(['immediate', 'after_session', 'manual'])], 'review_policy' => ['required', Rule::in(['none', 'wrong_only', 'full'])], 'ranking_policy' => ['required', Rule::in(['disabled', 'first_attempt'])], 'estimated_total_pass_score' => ['nullable', 'integer', 'min:1', 'max:180']];
    }
}

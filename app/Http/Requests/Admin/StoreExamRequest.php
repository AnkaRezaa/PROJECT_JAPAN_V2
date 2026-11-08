<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'superadmin'], true);
    }

    public function rules(): array
    {
        return ['title' => ['required', 'string', 'max:255'], 'slug' => ['nullable', 'string', 'max:255'], 'description' => ['nullable', 'string', 'max:5000'], 'category' => ['sometimes', Rule::in(['jlpt', 'jft_basic', 'ssw'])], 'level_id' => [Rule::requiredIf($this->input('category', 'jlpt') === 'jlpt'), Rule::prohibitedIf($this->input('category', 'jlpt') !== 'jlpt'), 'nullable', 'exists:levels,id'], 'ssw_field' => [Rule::requiredIf($this->input('category', 'jlpt') === 'ssw'), Rule::prohibitedIf($this->input('category', 'jlpt') !== 'ssw'), 'nullable', 'string', 'max:255'], 'type' => ['required', Rule::in(['practice', 'simulation'])], 'access_type' => ['required', Rule::in(['all', 'premium', 'cohort'])], 'attempt_limit' => ['nullable', 'integer', 'min:1', 'max:100'], 'result_release_policy' => ['nullable', Rule::in(['immediate', 'after_session', 'manual'])], 'review_policy' => ['nullable', Rule::in(['none', 'wrong_only', 'full'])], 'ranking_policy' => ['nullable', Rule::in(['disabled', 'first_attempt'])], 'estimated_total_pass_score' => ['nullable', 'integer', 'min:1', 'max:250']];
    }
}

<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return ['title' => ['required', 'string', 'max:255'], 'slug' => ['nullable', 'string', 'max:255'], 'description' => ['nullable', 'string', 'max:5000'], 'level_id' => ['required', 'exists:levels,id'], 'type' => ['required', Rule::in(['practice', 'simulation'])], 'access_type' => ['required', Rule::in(['all', 'premium', 'cohort'])], 'attempt_limit' => ['nullable', 'integer', 'min:1', 'max:100'], 'result_release_policy' => ['nullable', Rule::in(['immediate', 'after_session', 'manual'])], 'review_policy' => ['nullable', Rule::in(['none', 'wrong_only', 'full'])], 'ranking_policy' => ['nullable', Rule::in(['disabled', 'first_attempt'])], 'estimated_total_pass_score' => ['nullable', 'integer', 'min:1', 'max:180']];
    }
}

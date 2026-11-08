<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncExamSectionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'superadmin'], true);
    }

    public function rules(): array
    {
        $category = $this->route('version')?->exam?->category ?? 'jlpt';
        return self::rulesForCategory($category);
    }

    public static function rulesForCategory(string $category): array
    {
        $keyRules = $category === 'ssw'
            ? ['string', 'max:40', 'regex:/^[a-z][a-z0-9_]*$/']
            : [Rule::in($category === 'jft_basic' ? ['vocabulary', 'conversation', 'listening', 'reading'] : ['vocabulary', 'grammar_reading', 'listening'])];

        return ['sections' => ['required', 'array', 'min:1', 'max:10'], 'sections.*.key' => ['required', 'distinct', ...$keyRules], 'sections.*.title' => ['required', 'string', 'max:255'], 'sections.*.short_title' => ['nullable', 'string', 'max:100'], 'sections.*.sort_order' => ['required', 'integer', 'distinct', 'min:1', 'max:10'], 'sections.*.time_limit_seconds' => ['required', 'integer', 'min:60', 'max:14400'], 'sections.*.estimated_max_score' => ['required', 'integer', 'min:1', 'max:250'], 'sections.*.estimated_pass_score' => ['required', 'integer', 'min:0', 'max:250']];
    }
}

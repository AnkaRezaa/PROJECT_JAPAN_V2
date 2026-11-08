<?php

namespace App\Http\Requests\Admin;

use Illuminate\Validation\Rule;

class UpdateExamRequest extends StoreExamRequest
{
    public function rules(): array
    {
        return [
            ...collect(parent::rules())->map(fn ($rules) => array_merge(['sometimes'], $rules))->all(),
            'category' => ['prohibited'],
            'ssw_field' => ['prohibited'],
            'level_id' => ['sometimes', Rule::requiredIf(($this->route('exam')?->category ?? 'jlpt') === 'jlpt'), Rule::prohibitedIf(($this->route('exam')?->category ?? 'jlpt') !== 'jlpt'), 'nullable', Rule::exists('levels', 'id')],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
        ];
    }
}

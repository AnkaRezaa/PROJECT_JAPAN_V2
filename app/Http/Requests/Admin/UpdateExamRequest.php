<?php

namespace App\Http\Requests\Admin;

use Illuminate\Validation\Rule;

class UpdateExamRequest extends StoreExamRequest
{
    public function rules(): array
    {
        return [
            ...collect(parent::rules())->map(fn ($rules) => array_merge(['sometimes'], $rules))->all(),
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
        ];
    }
}

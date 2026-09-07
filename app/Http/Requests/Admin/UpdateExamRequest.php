<?php

namespace App\Http\Requests\Admin;

class UpdateExamRequest extends StoreExamRequest
{
    public function rules(): array
    {
        return collect(parent::rules())->map(fn ($rules) => array_merge(['sometimes'], $rules))->all();
    }
}

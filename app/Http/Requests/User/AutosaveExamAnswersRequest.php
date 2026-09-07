<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class AutosaveExamAnswersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (int) $this->route('attempt')?->user_id === (int) $this->user()?->id;
    }

    public function rules(): array
    {
        return ['autosave_token' => ['required', 'uuid'], 'client_revision' => ['required', 'integer', 'min:0'], 'answers' => ['required', 'array', 'min:1', 'max:100'], 'answers.*.question_id' => ['required', 'integer', 'distinct'], 'answers.*.answer_text' => ['nullable', 'string', 'max:10000'], 'answers.*.answer_payload' => ['nullable', 'array'], 'answers.*.flagged' => ['boolean']];
    }
}

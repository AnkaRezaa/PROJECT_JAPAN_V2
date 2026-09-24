<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class KuisRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'module_id' => 'required|exists:modules,id',
            'module_day_id' => [
                'required',
                'integer',
                Rule::exists('module_days', 'id')
                    ->where('module_id', $this->integer('module_id')),
            ],
            'type' => 'required|in:multiple_choice,fill_blank,listening',
            'time_limit' => 'nullable|integer|min:0',
            'passing_score' => 'nullable|integer|min:1|max:100',
            'available_at' => 'nullable|date',
            'status' => 'nullable|in:draft,published',
            'stay_on_roadmap' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Pesan error custom Bahasa Indonesia.
     */
    public function messages(): array
    {
        return [
            'module_id.required' => 'Modul mingguan wajib dipilih.',
            'module_id.exists' => 'Modul mingguan yang dipilih tidak valid di sistem.',
            'module_day_id.required' => 'Day wajib dipilih.',
            'module_day_id.integer' => 'Day yang dipilih tidak valid.',
            'module_day_id.exists' => 'Day tidak sesuai dengan modul mingguan yang dipilih.',
            'type.required' => 'Tipe kuis wajib ditentukan.',
            'type.in' => 'Tipe kuis hanya boleh: Pilihan Ganda, Mengetik/Isian, atau Mendengarkan.',
            'time_limit.integer' => 'Batas waktu harus berupa angka bulat (dalam satuan detik).',
            'time_limit.min' => 'Batas waktu minimal adalah 0 (tanpa batas).',
            'passing_score.integer' => 'Nilai lulus harus berupa angka.',
            'passing_score.min' => 'Nilai lulus minimal 1.',
            'passing_score.max' => 'Nilai lulus maksimal 100.',
        ];
    }
}

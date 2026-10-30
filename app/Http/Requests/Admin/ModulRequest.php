<?php

namespace App\Http\Requests\Admin;

use App\Models\LevelPembelajaran;
use App\Models\ProgramPembelajaran;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ModulRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $program = ProgramPembelajaran::find($this->integer('program_pembelajaran_id'));

        if ($program) {
            $this->merge(['level_id' => $program->level_id]);
        }
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Biasanya authorisasi role dihandle oleh middleware role:admin di Route.
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'program_pembelajaran_id' => 'required|exists:program_pembelajaran,id',
            'level_id' => 'nullable|exists:levels,id',
            'title' => 'required|string|max:255',
            'week_number' => 'required|integer|min:1',
            'description' => 'nullable|string',
            'status' => 'nullable|in:draft,published',
        ];
    }

    /**
     * Dapatkan pesan validasi kustom (Bahasa Indonesia).
     */
    public function messages(): array
    {
        return [
            'program_pembelajaran_id.required' => 'Program pembelajaran wajib dipilih.',
            'program_pembelajaran_id.exists' => 'Program pembelajaran tidak valid atau tidak ditemukan.',
            'level_id.exists' => 'LevelPembelajaran tidak valid atau tidak ditemukan di sistem.',
            'title.required' => 'Judul modul tidak boleh kosong.',
            'title.max' => 'Judul modul maksimal 255 karakter.',
            'week_number.required' => 'Nomor urut minggu wajib diisi.',
            'week_number.integer' => 'Nomor urut minggu harus berupa angka bulat.',
            'week_number.min' => 'Nomor urut minggu minimal harus 1.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            $program = ProgramPembelajaran::find($this->integer('program_pembelajaran_id'));
            $level = $this->filled('level_id')
                ? LevelPembelajaran::find($this->integer('level_id'))
                : null;

            if (! $program) {
                return;
            }

            if ($program->level_id) {
                if (! $level) {
                    $validator->errors()->add('level_id', 'Level kelas tidak ditemukan. Periksa pengaturan kelas.');
                    return;
                }

                if ((int) $program->level_id !== (int) $level->id) {
                    $validator->errors()->add('level_id', 'Level Week harus sama dengan level kelas yang dipilih.');
                }
            }

            if ($level && $program->curriculum_track_id && $level->curriculum_track_id
                && (int) $program->curriculum_track_id !== (int) $level->curriculum_track_id) {
                $validator->errors()->add('level_id', 'Level tidak berada pada jalur kurikulum kelas ini.');
            }
        }];
    }
}

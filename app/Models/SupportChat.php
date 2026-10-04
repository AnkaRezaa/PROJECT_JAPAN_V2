<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportChat extends Model
{
    protected $fillable = ['visitor_token_hash', 'name', 'email', 'status', 'last_message_at', 'unread_admin', 'unread_visitor'];

    protected $attributes = [
        'status' => 'open',
        'unread_admin' => 0,
        'unread_visitor' => 0,
    ];

    protected function casts(): array
    {
        return ['last_message_at' => 'datetime'];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportChatMessage::class);
    }
}

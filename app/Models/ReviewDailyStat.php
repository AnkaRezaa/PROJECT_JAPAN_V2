<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReviewDailyStat extends Model
{
    protected $table = 'review_daily_stats';

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'stat_date' => 'date',
        ];
    }
}

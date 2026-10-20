<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AdminUnggahController extends Controller
{
    /**
     * Handle asset upload (image/audio) for admin content building.
     */
    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:jpeg,jpg,png,gif,webp,mp3,wav,m4a,ogg|max:20480', // Limit 20MB
        ]);

        $file = $request->file('file');
        
        $type = str_contains($file->getMimeType(), 'audio') ? 'audio' : 'images';
        $path = $file->store("uploads/content/{$type}", 'public');

        return response()->json([
            'url' => asset("storage/{$path}"),
            'path' => $path,
            'message' => 'Upload berhasil'
        ]);
    }
}

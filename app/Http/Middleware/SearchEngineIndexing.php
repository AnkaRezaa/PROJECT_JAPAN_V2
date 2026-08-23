<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SearchEngineIndexing
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $routeIsPublic = $request->routeIs(...config('seo.indexable_routes', []));

        if (! config('seo.indexing_enabled') || ! $routeIsPublic) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        }

        return $response;
    }
}

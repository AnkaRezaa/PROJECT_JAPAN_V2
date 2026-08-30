<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Auth\LoginSosialController;
use App\Models\DeckPresentasi;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Modul;
use App\Models\PaketPembayaran;
use App\Models\ProgramPembelajaran;
use App\Models\Transaksi;
use App\Services\AksesLanggananService;
use App\Services\AksesPremiumService;
use App\Services\GamifikasiConfigService;
use App\Services\KelasPenggunaPayloadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class HalamanController extends Controller
{
    public function home(KelasPenggunaPayloadService $kelasPayload)
    {
        return Inertia::render('landingPage', [
            'programs' => $this->publicPricingPrograms($kelasPayload),
            'seo' => $this->seo(
                'Belajar Bahasa Jepang Online dengan Kelas dan Latihan Interaktif',
                config('seo.default_description'),
                route('home'),
                structuredData: [$this->websiteSchema()]
            ),
        ]);
    }

    public function about()
    {
        return Inertia::render('About', [
            'seo' => $this->seo(
                'Tentang Platform Belajar Bahasa Jepang',
                'Kenali pendekatan belajar bahasa Jepang yang menghubungkan kelas, roadmap, latihan, evaluasi, dan pendampingan mentor.',
                route('about')
            ),
        ]);
    }

    public function pricing(KelasPenggunaPayloadService $kelasPayload)
    {
        return Inertia::render('Pricing', [
            'programs' => $this->publicPricingPrograms($kelasPayload),
            'seo' => $this->seo(
                'Kelas Bahasa Jepang Online - Mandiri dan Bersama Mentor',
                'Pilih kelas bahasa Jepang online dengan materi terstruktur, latihan interaktif, evaluasi, dan pilihan belajar mandiri atau bersama mentor.',
                route('pricing')
            ),
        ]);
    }

    public function roadmap(Request $request)
    {
        $programs = ProgramPembelajaran::query()
            ->with('level:id,level_name')
            ->withCount([
                'modules as weeks_count' => fn ($query) => $query->where('status', 'published'),
            ])
            ->where('status', 'published')
            ->whereHas('modules', fn ($query) => $query->where('status', 'published'))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $dayCounts = HariModul::query()
            ->selectRaw('modules.program_pembelajaran_id, COUNT(module_days.id) as total')
            ->join('modules', 'modules.id', '=', 'module_days.module_id')
            ->where('modules.status', 'published')
            ->where('module_days.status', 'published')
            ->whereIn('modules.program_pembelajaran_id', $programs->pluck('id'))
            ->groupBy('modules.program_pembelajaran_id')
            ->pluck('total', 'modules.program_pembelajaran_id');

        $roadmapOptions = $programs->map(fn (ProgramPembelajaran $program) => [
            'id' => $program->id,
            'title' => $program->title,
            'slug' => $program->slug,
            'level' => $program->level?->level_name,
            'weeks_count' => (int) $program->weeks_count,
            'days_count' => (int) ($dayCounts[$program->id] ?? 0),
        ])->values();

        $requestedSlug = trim($request->string('kelas')->toString());
        $selectedOption = filled($requestedSlug)
            ? $roadmapOptions->firstWhere('slug', $requestedSlug)
            : $roadmapOptions->first();

        abort_if(filled($requestedSlug) && ! $selectedOption, 404);

        $selectedProgram = $selectedOption
            ? ProgramPembelajaran::query()
                ->with('level:id,level_name')
                ->with(['modules' => fn ($query) => $query
                    ->where('status', 'published')
                    ->with(['days' => fn ($dayQuery) => $dayQuery
                        ->where('status', 'published')
                        ->orderBy('day_number')])
                    ->orderBy('week_number')
                    ->orderBy('id')])
                ->whereKey($selectedOption['id'])
                ->first()
            : null;

        $selectedRoadmap = $selectedProgram ? [
            'id' => $selectedProgram->id,
            'title' => $selectedProgram->title,
            'slug' => $selectedProgram->slug,
            'description' => $selectedProgram->description,
            'level' => $selectedProgram->level?->level_name,
            'weeks_count' => $selectedProgram->modules->count(),
            'days_count' => $selectedProgram->modules->sum(fn ($module) => $module->days->count()),
            'weeks' => $selectedProgram->modules->map(fn ($module) => [
                'id' => $module->id,
                'week_number' => (int) $module->week_number,
                'title' => $module->title,
                'description' => $module->description,
                'days' => $module->days->map(fn ($day) => [
                    'id' => $day->id,
                    'day_number' => (int) $day->day_number,
                    'title' => $day->title,
                    'description' => $day->description,
                ])->values(),
            ])->values(),
        ] : null;

        return Inertia::render('Roadmap', [
            'roadmapOptions' => $roadmapOptions,
            'selectedRoadmap' => $selectedRoadmap,
            'seo' => $this->seo(
                'Roadmap Belajar Bahasa Jepang Terstruktur',
                'Ikuti perjalanan belajar bahasa Jepang secara bertahap melalui materi mingguan, kanji, kosakata, latihan, kuis, dan evaluasi.',
                route('roadmap')
            ),
        ]);
    }

    public function publicClass(string $programSlug, KelasPenggunaPayloadService $kelasPayload)
    {
        $program = $this->publicPricingProgramQuery()
            ->where('slug', $programSlug)
            ->firstOrFail();
        $payload = $this->publicPricingProgramPayload($program, $kelasPayload);
        $description = Str::limit(
            trim((string) $program->description) ?: "Pelajari bahasa Jepang melalui {$program->title} dengan roadmap, latihan, dan evaluasi terstruktur.",
            160,
            ''
        );
        $canonical = route('public.classes.show', $program->slug);
        $image = $this->absoluteSeoImage($kelasPayload->thumbnailUrl($program->thumbnail_url));
        $schemas = [
            [
                '@context' => 'https://schema.org',
                '@type' => 'Course',
                'name' => $program->title,
                'description' => $description,
                'url' => $canonical,
                'inLanguage' => 'id',
                ...($program->level?->level_name ? ['educationalLevel' => $program->level->level_name] : []),
                ...($image ? ['image' => $image] : []),
            ],
            [
                '@context' => 'https://schema.org',
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Beranda', 'item' => route('home')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Kelas', 'item' => route('pricing')],
                    ['@type' => 'ListItem', 'position' => 3, 'name' => $program->title, 'item' => $canonical],
                ],
            ],
        ];

        return Inertia::render('Public/Kelas/Show', [
            'program' => $payload,
            'seo' => $this->seo(
                "{$program->title} - Kelas Bahasa Jepang Online",
                $description,
                $canonical,
                'website',
                $image,
                $schemas
            ),
        ]);
    }

    public function robots()
    {
        $content = config('seo.indexing_enabled')
            ? implode("\n", [
                'User-agent: *',
                'Allow: /',
                'Disallow: /admin/',
                'Disallow: /superadmin/',
                'Disallow: /user/',
                'Disallow: /payments/',
                'Disallow: /profile',
                'Disallow: /dashboard',
                'Sitemap: '.route('sitemap'),
            ])
            : "User-agent: *\nDisallow: /";

        return response($content."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function sitemap()
    {
        abort_unless(config('seo.indexing_enabled'), 404);

        $staticUrls = collect([
            ['loc' => route('home'), 'lastmod' => null],
            ['loc' => route('about'), 'lastmod' => null],
            ['loc' => route('pricing'), 'lastmod' => null],
            ['loc' => route('roadmap'), 'lastmod' => null],
            ['loc' => route('privacy-policy'), 'lastmod' => null],
            ['loc' => route('terms'), 'lastmod' => null],
            ['loc' => route('cookie-policy'), 'lastmod' => null],
        ]);
        $classUrls = $this->publicPricingProgramQuery()
            ->get()
            ->map(fn (ProgramPembelajaran $program) => [
                'loc' => route('public.classes.show', $program->slug),
                'lastmod' => optional($program->updated_at)->toAtomString(),
            ]);

        return response()
            ->view('seo.sitemap', ['urls' => $staticUrls->concat($classUrls)])
            ->header('Content-Type', 'application/xml; charset=UTF-8');
    }

    public function privacyPolicy()
    {
        return Inertia::render('Legal/LegalPage', [
            'title' => 'Kebijakan Privasi',
            'updatedAt' => '18 Juli 2026',
            'intro' => 'Dokumen operasional awal ini menjelaskan bagaimana TOKU-UP mengelola data akun dan aktivitas belajar pengguna.',
            'sections' => [
                [
                    'heading' => 'Data yang Kami Kelola',
                    'body' => 'Kami menyimpan data akun seperti nama, email, role pengguna, status langganan, progress belajar, aktivitas kuis, flashcard, transaksi, dan notifikasi yang diperlukan untuk menjalankan layanan.',
                ],
                [
                    'heading' => 'Penggunaan Data',
                    'body' => 'Data digunakan untuk autentikasi, membuka akses kelas, mencatat progress, mengirim notifikasi penting, memproses pembayaran, dan meningkatkan pengalaman belajar.',
                ],
                [
                    'heading' => 'Keamanan',
                    'body' => 'Akses data dibatasi berdasarkan role. File pembelajaran yang dilindungi tidak dipublikasikan sebagai direct public link dan aksesnya diperiksa melalui otorisasi aplikasi.',
                ],
                [
                    'heading' => 'Kontak',
                    'body' => 'Pertanyaan terkait privasi dapat dikirim melalui kontak resmi TOKU-UP yang tersedia di footer website.',
                ],
            ],
            'seo' => $this->seo(
                'Kebijakan Privasi',
                'Kebijakan privasi penggunaan akun, data pembelajaran, pembayaran, dan layanan kelas bahasa Jepang.',
                route('privacy-policy')
            ),
        ]);
    }

    public function terms()
    {
        return Inertia::render('Legal/LegalPage', [
            'title' => 'Syarat & Ketentuan',
            'updatedAt' => '18 Juli 2026',
            'intro' => 'Dokumen operasional awal ini mengatur penggunaan akun, kelas, konten belajar, dan fitur pembayaran TOKU-UP.',
            'sections' => [
                [
                    'heading' => 'Penggunaan Akun',
                    'body' => 'Pengguna wajib memakai data akun yang benar dan menjaga keamanan aksesnya. Akun tidak boleh digunakan untuk aktivitas yang merusak layanan atau mengganggu pengguna lain.',
                ],
                [
                    'heading' => 'Akses Kelas',
                    'body' => 'Akses kelas diberikan berdasarkan paket aktif, pembayaran yang berhasil, atau access key yang sah. Beberapa materi dapat dibatasi per minggu atau per kloter belajar.',
                ],
                [
                    'heading' => 'Konten Pembelajaran',
                    'body' => 'Materi, PPT, kosakata, flashcard, dan kuis disediakan untuk kebutuhan belajar pengguna. Penyebaran ulang konten tanpa izin tidak diperbolehkan.',
                ],
                [
                    'heading' => 'Pembayaran',
                    'body' => 'Pembayaran diproses melalui Midtrans. Akses akan aktif setelah status pembayaran berhasil diterima dan diproses oleh sistem.',
                ],
            ],
            'seo' => $this->seo(
                'Syarat dan Ketentuan',
                'Syarat penggunaan akun, akses kelas, konten pembelajaran, dan pembayaran layanan belajar bahasa Jepang.',
                route('terms')
            ),
        ]);
    }

    public function cookiePolicy()
    {
        return Inertia::render('Legal/LegalPage', [
            'title' => 'Kebijakan Cookies',
            'updatedAt' => '18 Juli 2026',
            'intro' => 'Dokumen operasional awal ini menjelaskan penggunaan cookie dan penyimpanan lokal untuk menjaga sesi dan preferensi pengguna.',
            'sections' => [
                [
                    'heading' => 'Cookie Sesi',
                    'body' => 'TOKU-UP menggunakan cookie sesi untuk login, keamanan CSRF, dan menjaga pengguna tetap berada pada sesi yang valid.',
                ],
                [
                    'heading' => 'Preferensi Tampilan',
                    'body' => 'Preferensi seperti mode gelap dapat disimpan di browser agar tampilan tetap konsisten saat pengguna kembali membuka website.',
                ],
                [
                    'heading' => 'Pembayaran dan Integrasi',
                    'body' => 'Integrasi pihak ketiga seperti Midtrans atau Google dapat memakai mekanisme sesi atau token sesuai kebutuhan autentikasi dan pembayaran.',
                ],
                [
                    'heading' => 'Kontrol Pengguna',
                    'body' => 'Pengguna dapat menghapus cookie melalui pengaturan browser, tetapi beberapa fitur seperti login dan checkout mungkin tidak berjalan normal tanpa cookie.',
                ],
            ],
            'seo' => $this->seo(
                'Kebijakan Cookies',
                'Penjelasan penggunaan cookie untuk sesi, keamanan akun, preferensi tampilan, autentikasi, dan pembayaran.',
                route('cookie-policy')
            ),
        ]);
    }

    public function userProfile(Request $request, GamifikasiConfigService $gamifikasiConfig)
    {
        $user = Auth::user();
        $googleConfirmationAt = (int) $request->session()->get(
            LoginSosialController::ACCOUNT_DELETION_CONFIRMED_AT,
            0
        );
        $googleConfirmationUserId = (int) $request->session()->get(
            LoginSosialController::ACCOUNT_DELETION_CONFIRMED_USER_ID,
            0
        );

        return Inertia::render('User/Profil/Profil', [
            'deletionAuth' => [
                'password_login_enabled' => $user?->password_login_enabled !== false,
                'google_reauthenticated' => filled($user?->google_id)
                    && $googleConfirmationUserId === (int) $user?->id
                    && $googleConfirmationAt >= now()->subMinutes(5)->timestamp,
                'open_dialog' => (bool) $request->session()->get('reopen_delete_dialog', false),
            ],
            'activeSubscription' => $user?->subscriptions()
                ->with('paymentPlan:id,name')
                ->where('status', 'active')
                ->latest('end_date')
                ->first(),
            'recentTransactions' => Transaksi::query()
                ->with(['paymentPlan:id,name', 'programPembelajaran:id,title'])
                ->where('user_id', $user?->id)
                ->latest()
                ->take(8)
                ->get()
                ->map(fn (Transaksi $transaction) => [
                    'id' => $transaction->id,
                    'code' => $transaction->transaction_code,
                    'plan' => $transaction->paymentPlan?->name ?? 'Akses belajar',
                    'scope_label' => app(AksesLanggananService::class)->labelScope(
                        $transaction->scope_type,
                        $transaction->programPembelajaran?->title
                    ),
                    'amount' => $transaction->amount,
                    'amount_formatted' => 'Rp '.number_format($transaction->amount),
                    'status' => $transaction->status,
                    'status_label' => match ($transaction->status) {
                        'success' => 'Berhasil',
                        'pending' => 'Menunggu',
                        'failed' => 'Gagal',
                        'expired' => 'Kedaluwarsa',
                        'canceled' => 'Dibatalkan',
                        default => ucfirst((string) $transaction->status),
                    },
                    'created_at_label' => optional($transaction->created_at)->format('d M Y H:i'),
                ]),
            'achievements' => $user?->achievements()
                ->latest('user_achievements.unlocked_at')
                ->take(8)
                ->get()
                ->map(fn ($achievement) => [
                    'id' => $achievement->id,
                    'name' => $achievement->name,
                    'description' => $achievement->description,
                    'icon' => $achievement->icon,
                    'xp_reward' => $achievement->xp_reward,
                    'unlocked_at_label' => optional($achievement->pivot?->unlocked_at)->format('d M Y'),
                ]) ?? [],
            'gamificationSettings' => [
                'leagues' => $gamifikasiConfig->leagues(),
            ],
        ]);
    }

    public function userKelas(Request $request, AksesPremiumService $aksesPremium, KelasPenggunaPayloadService $kelasPayload)
    {
        $user = Auth::user();

        $programs = ProgramPembelajaran::with(['level', 'modules' => fn ($query) => $query
            ->where('status', 'published')
            ->withCount(['flashcardSets', 'quizzes'])
            ->orderBy('week_number')
            ->orderBy('id')])
            ->with(['paymentPlans' => fn ($query) => $query
                ->where('is_active', true)
                ->where('price', '>', 0)
                ->whereIn('scope_type', [
                    AksesLanggananService::SCOPE_PROGRAM,
                    AksesLanggananService::SCOPE_KLOTER,
                ])
                ->orderBy('price')])
            ->where('status', 'published')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(function (ProgramPembelajaran $program) use ($user, $aksesPremium, $kelasPayload) {
                $modules = $program->modules;
                $moduleIds = $modules->pluck('id');
                $accessibleCount = $modules->filter(fn (Modul $modul) => $aksesPremium->bolehAksesModul($user, $modul))->count();
                $completedCount = $moduleIds->isEmpty()
                    ? 0
                    : $user->progress()
                        ->whereIn('module_id', $moduleIds)
                        ->whereNotNull('completed_at')
                        ->count();
                $classAccess = $kelasPayload->forProgram($user, $program);

                return [
                    'id' => $program->id,
                    'title' => $program->title,
                    'description' => $program->description,
                    'lessons' => $modules->count(),
                    'completed_lessons' => $completedCount,
                    'accessible_lessons' => $accessibleCount,
                    'progress' => $modules->count() > 0 ? (int) round(($completedCount / $modules->count()) * 100) : 0,
                    'href' => route('user.modul.program', $program->slug),
                    ...$classAccess,
                    'resource_summary' => [
                        'presentations' => DeckPresentasi::whereIn('module_id', $moduleIds)->shared()->where('status', 'published')->count(),
                        'vocabulary' => Kosakata::query()
                            ->where('status', 'published')
                            ->whereHas('flashcards.set', fn ($query) => $query
                                ->whereIn('module_id', $moduleIds)
                                ->where('status', 'published'))
                            ->distinct()
                            ->count('vocabulary_bank.id'),
                        'flashcards' => $modules->sum('flashcard_sets_count'),
                        'quizzes' => $modules->sum('quizzes_count'),
                    ],
                ];
            });

        return Inertia::render('User/Kelas/KelasPage', [
            'programs' => $programs,
        ]);
    }

    public function userCheckout(string $transactionCode)
    {
        $user = Auth::user();
        $transaction = Transaksi::query()
            ->with([
                'paymentPlan:id,name,slug,scope_type,program_pembelajaran_id,description,price,duration_days,features',
                'programPembelajaran:id,title',
                'kloterBelajar:id,nama,kode,tanggal_mulai,admin_id',
                'kloterBelajar.admin:id,username',
                'anggotaKloter:id,transaction_id,status',
            ])
            ->where('user_id', $user?->id)
            ->where('transaction_code', $transactionCode)
            ->firstOrFail();

        return Inertia::render('User/Checkout/Checkout', [
            'transaction' => [
                'transaction_code' => $transaction->transaction_code,
                'amount' => $transaction->amount,
                'amount_formatted' => 'Rp '.number_format($transaction->amount),
                'status' => $transaction->status,
                'access_state' => $this->transactionAccessState($transaction),
                'scope_type' => $transaction->scope_type ?? AksesLanggananService::SCOPE_GLOBAL,
                'scope_label' => app(AksesLanggananService::class)->labelScope($transaction->scope_type, $transaction->programPembelajaran?->title),
                'program' => $transaction->programPembelajaran ? [
                    'id' => $transaction->programPembelajaran->id,
                    'title' => $transaction->programPembelajaran->title,
                ] : null,
                'kloter' => $transaction->kloterBelajar ? [
                    'id' => $transaction->kloterBelajar->id,
                    'nama' => $transaction->kloterBelajar->nama,
                    'kode' => $transaction->kloterBelajar->kode,
                    'admin_name' => $transaction->kloterBelajar->admin?->username,
                    'tanggal_mulai_label' => optional($transaction->kloterBelajar->tanggal_mulai)->format('d M Y'),
                ] : null,
                'created_at' => $transaction->created_at,
                'processed_at' => $transaction->processed_at,
                'payment_plan' => $transaction->paymentPlan ? [
                    'id' => $transaction->paymentPlan->id,
                    'name' => $transaction->paymentPlan->name,
                    'slug' => $transaction->paymentPlan->slug,
                    'scope_type' => $transaction->paymentPlan->scope_type ?? AksesLanggananService::SCOPE_GLOBAL,
                    'program_pembelajaran_id' => $transaction->paymentPlan->program_pembelajaran_id,
                    'description' => $transaction->paymentPlan->description,
                    'duration_days' => $transaction->paymentPlan->duration_days,
                    'features' => $transaction->paymentPlan->features ?? [],
                ] : null,
            ],
            'midtrans' => [
                'clientKey' => config('services.midtrans.client_key'),
                'isProduction' => (bool) config('services.midtrans.is_production'),
            ],
        ]);
    }

    private function transactionAccessState(Transaksi $transaction): string
    {
        if ($transaction->scope_type !== AksesLanggananService::SCOPE_KLOTER) {
            return $transaction->status === 'success' ? 'active' : 'payment_pending';
        }

        return match ($transaction->anggotaKloter?->status) {
            'active' => 'active',
            'paid_pending_approval' => 'pending_approval',
            'rejected' => 'refund_required',
            default => $transaction->status === 'success' ? 'pending_approval' : 'payment_pending',
        };
    }

    public function adminProfile()
    {
        return Inertia::render('Admin/Profil/Profil');
    }

    public function superAdminProfile()
    {
        return Inertia::render('SuperAdmin/Profil/Profil');
    }

    private function publicPricingPrograms(KelasPenggunaPayloadService $kelasPayload)
    {
        return $this->publicPricingProgramQuery()
            ->get()
            ->map(fn (ProgramPembelajaran $program) => $this->publicPricingProgramPayload($program, $kelasPayload));
    }

    private function publicPricingProgramQuery()
    {
        return ProgramPembelajaran::query()
            ->with(['level:id,level_name', 'curriculumTrack:id,code,name'])
            ->with(['modules' => fn ($query) => $query
                ->where('status', 'published')
                ->withCount([
                    'presentationDecks' => fn ($relation) => $relation->shared()->where('status', 'published'),
                    'flashcardSets' => fn ($relation) => $relation->where('status', 'published'),
                    'quizzes' => fn ($relation) => $relation->where('status', 'published'),
                ])
                ->orderBy('week_number')
                ->orderBy('id')])
            ->with(['paymentPlans' => fn ($query) => $query
                ->where('is_active', true)
                ->where('price', '>', 0)
                ->whereIn('scope_type', [
                    AksesLanggananService::SCOPE_PROGRAM,
                    AksesLanggananService::SCOPE_KLOTER,
                ])
                ->orderBy('price')])
            ->where('status', 'published')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    private function publicPricingProgramPayload(ProgramPembelajaran $program, KelasPenggunaPayloadService $kelasPayload): array
    {
        return [
            'id' => $program->id,
            'title' => $program->title,
            'slug' => $program->slug,
            'description' => $program->description,
            'instructor_name' => $program->instructor_name,
            'thumbnail_url' => $kelasPayload->thumbnailUrl($program->thumbnail_url),
            'level' => $program->level?->level_name,
            'curriculum_track' => $program->curriculumTrack?->name,
            'weeks_count' => $program->modules->count(),
            'preview_modules' => $program->modules->map(fn (Modul $module) => [
                'id' => $module->id,
                'week_number' => $module->week_number,
                'title' => $module->title,
                'description' => $module->description,
                'presentations_count' => $module->presentation_decks_count,
                'flashcards_count' => $module->flashcard_sets_count,
                'quizzes_count' => $module->quizzes_count,
            ])->values(),
            'payment_plans' => $program->paymentPlans->map(fn (PaketPembayaran $plan) => [
                'id' => $plan->id,
                'name' => $plan->name,
                'scope_type' => $plan->scope_type,
                'scope_label' => $plan->scope_type === AksesLanggananService::SCOPE_KLOTER
                    ? 'Kelas Mentor'
                    : 'Kelas Mandiri',
                'description' => $plan->description,
                'price' => $plan->price,
                'price_formatted' => 'Rp '.number_format($plan->price),
                'duration_days' => $plan->duration_days,
                'features' => $plan->features ?? [],
            ])->values(),
        ];
    }

    private function seo(
        string $title,
        string $description,
        string $canonical,
        string $type = 'website',
        ?string $image = null,
        array $structuredData = []
    ): array {
        $siteName = config('seo.site_name');

        return [
            'title' => $title,
            'full_title' => Str::contains(Str::lower($title), Str::lower($siteName))
                ? $title
                : "{$title} | {$siteName}",
            'description' => $description,
            'canonical' => $canonical,
            'image' => $image ?: $this->absoluteSeoImage(config('seo.default_image')),
            'robots' => config('seo.indexing_enabled') ? 'index, follow' : 'noindex, nofollow',
            'type' => $type,
            'site_name' => $siteName,
            'google_site_verification' => config('seo.google_site_verification'),
            'structured_data' => $structuredData,
        ];
    }

    private function websiteSchema(): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'WebSite',
            'name' => config('seo.site_name'),
            'url' => route('home'),
            'description' => config('seo.default_description'),
            'inLanguage' => 'id',
        ];
    }

    private function absoluteSeoImage(?string $image): ?string
    {
        if (blank($image)) {
            return null;
        }

        return Str::startsWith($image, ['http://', 'https://']) ? $image : url($image);
    }
}

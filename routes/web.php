<?php

use App\Http\Controllers\Admin\AdminAnalitikController;
use App\Http\Controllers\Admin\AdminBerandaController;
use App\Http\Controllers\Admin\AdminExamPortalController;
use App\Http\Controllers\Admin\AdminFlashcardController;
use App\Http\Controllers\Admin\AdminHariModulController;
use App\Http\Controllers\Admin\AdminKosakataController;
use App\Http\Controllers\Admin\AdminKuisController;
use App\Http\Controllers\Admin\AdminGrammarQuizController;
use App\Http\Controllers\Admin\AdminLevelController;
use App\Http\Controllers\Admin\AdminModulController;
use App\Http\Controllers\Admin\AdminPenggunaController;
use App\Http\Controllers\Admin\AdminPresentasiController;
use App\Http\Controllers\Admin\RuangKelasLiveController as AdminRuangKelasLiveController;
use App\Http\Controllers\Admin\AdminUnggahController;
use App\Http\Controllers\HalamanController;
use App\Http\Controllers\NotifikasiController;
use App\Http\Controllers\PembayaranMidtransController;
use App\Http\Controllers\PengarahDashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UmpanBalikProdukController;
use App\Http\Controllers\SuperAdmin\SuperAdminAktivitasController;
use App\Http\Controllers\SuperAdmin\SuperAdminBerandaController;
use App\Http\Controllers\SuperAdmin\SuperAdminGamifikasiController;
use App\Http\Controllers\SuperAdmin\SuperAdminKloterController;
use App\Http\Controllers\SuperAdmin\SuperAdminKontenController;
use App\Http\Controllers\SuperAdmin\SuperAdminPembayaranController;
use App\Http\Controllers\SuperAdmin\SuperAdminPengelolaAdminController;
use App\Http\Controllers\SuperAdmin\SuperAdminPenggunaController;
use App\Http\Controllers\SuperAdmin\SuperAdminSistemController;
use App\Http\Controllers\User\BerandaController as UserDashboardController;
use App\Http\Controllers\User\BeritaController;
use App\Http\Controllers\User\ExamPortalController;
use App\Http\Controllers\User\FlashcardController;
use App\Http\Controllers\User\ModulController;
use App\Http\Controllers\User\RuangKelasLiveController as UserRuangKelasLiveController;
use App\Http\Controllers\User\PapanPeringkatController;
use App\Http\Controllers\User\PembelajaranController;
use App\Http\Controllers\User\ProgresController;
use App\Http\Controllers\User\QuickQuizController;
use App\Http\Controllers\User\GrammarQuizController;
use App\Http\Controllers\User\ReviewController;
use App\Http\Controllers\User\SertifikatController;
use App\Http\Controllers\User\TargetUjianPenggunaController;
use App\Http\Controllers\User\UmpanBalikPembelajaranController;
use App\Services\AksesPremiumService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/payments/midtrans/notification', [PembayaranMidtransController::class, 'notification'])->name('payments.midtrans.notification');

// Guest Routes
Route::get('/', [HalamanController::class, 'home'])->name('home');
Route::get('/about', [HalamanController::class, 'about'])->name('about');
Route::get('/pricing', [HalamanController::class, 'pricing'])->name('pricing');
Route::get('/roadmap', [HalamanController::class, 'roadmap'])->name('roadmap');
Route::get('/kelas/{programSlug}', [HalamanController::class, 'publicClass'])->name('public.classes.show');
Route::get('/privacy-policy', [HalamanController::class, 'privacyPolicy'])->name('privacy-policy');
Route::get('/terms', [HalamanController::class, 'terms'])->name('terms');
Route::get('/cookie-policy', [HalamanController::class, 'cookiePolicy'])->name('cookie-policy');
Route::get('/robots.txt', [HalamanController::class, 'robots'])->name('robots');
Route::get('/sitemap.xml', [HalamanController::class, 'sitemap'])->name('sitemap');

// Authenticated Routes
Route::middleware(['auth', 'verified'])->group(function () {
    // Profile
    Route::get('/profile', [HalamanController::class, 'userProfile'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile/learning-preferences', [ProfileController::class, 'updateLearningPreferences'])
        ->middleware('role:user')
        ->name('profile.learning-preferences.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])
        ->middleware(['role:user', 'throttle:5,1'])
        ->name('profile.destroy');
    Route::post('/feedback', [UmpanBalikProdukController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('product-feedback.store');
    Route::post('/profile/access-keys/redeem', [UserDashboardController::class, 'redeemAccessKey'])->middleware(['role:user', 'throttle:access-keys'])->name('profile.access-keys.redeem');
    Route::get('/user/access-status', function (Request $request, AksesPremiumService $aksesPremium) {
        return response()->json($aksesPremium->statusAkses($request->user()));
    })->middleware('role:user')->name('user.access-status');

    Route::post('/payments/midtrans/checkout', [PembayaranMidtransController::class, 'checkout'])->middleware('throttle:payments-checkout')->name('payments.midtrans.checkout');
    Route::post('/payments/midtrans/{transactionCode}/snap', [PembayaranMidtransController::class, 'snap'])->middleware('throttle:payments-sync')->name('payments.midtrans.snap');
    Route::post('/payments/midtrans/{transactionCode}/charge', [PembayaranMidtransController::class, 'charge'])->middleware('throttle:payments-checkout')->name('payments.midtrans.charge');
    Route::post('/payments/midtrans/{transactionCode}/sync', [PembayaranMidtransController::class, 'sync'])->middleware('throttle:payments-sync')->name('payments.midtrans.sync');
    Route::post('/payments/midtrans/{transactionCode}/cancel', [PembayaranMidtransController::class, 'cancel'])->middleware('throttle:payments-cancel')->name('payments.midtrans.cancel');
    Route::get('/presentations/{presentationDeck}/content-stream', [AdminPresentasiController::class, 'pdfContent'])
        ->middleware('throttle:30,1')
        ->name('presentations.pdf.content');

    // Notifications
    Route::get('/notifications', [NotifikasiController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/page', [NotifikasiController::class, 'page'])->name('notifications.page');
    Route::redirect('/user/notifications', '/notifications/page')->name('user.notifications.index');
    Route::post('/notifications/{id}/read', [NotifikasiController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotifikasiController::class, 'markAllAsRead'])->name('notifications.readAll');

    Route::get('/dashboard', PengarahDashboardController::class)->name('dashboard');
    // Superadmin Routes
    Route::middleware('role:superadmin')->prefix('superadmin')->name('superadmin.')->group(function () {
        Route::get('/dashboard', SuperAdminBerandaController::class)->name('dashboard');
        Route::get('/users', SuperAdminPenggunaController::class)->name('users');
        Route::get('/users/{user}', [SuperAdminPenggunaController::class, 'show'])->name('users.show');
        Route::patch('/users/{user}/status', [SuperAdminPenggunaController::class, 'updateStatus'])->name('users.status');
        Route::post('/users/{user}/reset-password', [SuperAdminPenggunaController::class, 'resetPassword'])->name('users.reset-password');
        Route::delete('/users/{user}', [SuperAdminPenggunaController::class, 'destroy'])->name('users.destroy');
        Route::post('/users/{user}/anonymize', [SuperAdminPenggunaController::class, 'anonymize'])->name('users.anonymize');
        Route::get('/admins', SuperAdminPengelolaAdminController::class)->name('admins');
        Route::post('/admins', [SuperAdminPengelolaAdminController::class, 'store'])->name('admins.store');
        Route::patch('/admins/{user}/scope', [SuperAdminPengelolaAdminController::class, 'updateScope'])->name('admins.scope');
        Route::patch('/admins/{user}', [SuperAdminPengelolaAdminController::class, 'update'])->name('admins.update');
        Route::patch('/admins/{user}/status', [SuperAdminPengelolaAdminController::class, 'updateStatus'])->name('admins.status');
        Route::post('/admins/{user}/reset-password', [SuperAdminPengelolaAdminController::class, 'resetPassword'])->name('admins.reset-password');
        Route::delete('/admins/{user}', [SuperAdminPengelolaAdminController::class, 'destroy'])->name('admins.destroy');
        Route::post('/admins/{user}/anonymize', [SuperAdminPengelolaAdminController::class, 'anonymize'])->name('admins.anonymize');
        Route::get('/content', SuperAdminKontenController::class)->name('content');
        Route::post('/content/news', [SuperAdminKontenController::class, 'store'])->name('content.news.store');
        Route::put('/content/news/{news}', [SuperAdminKontenController::class, 'update'])->name('content.news.update');
        Route::delete('/content/news/{news}', [SuperAdminKontenController::class, 'destroy'])->name('content.news.destroy');
        Route::post('/content/news/editor-images', [SuperAdminKontenController::class, 'storeEditorImage'])->name('content.news.editor-images.store');
        Route::post('/content/news/{news}/attachments', [SuperAdminKontenController::class, 'storeAttachment'])->name('content.news.attachments.store');
        Route::delete('/content/news/{news}/attachments/{attachment}', [SuperAdminKontenController::class, 'destroyAttachment'])->name('content.news.attachments.destroy');
        Route::post('/content/popups', [SuperAdminKontenController::class, 'storePopup'])->name('content.popups.store');
        Route::post('/content/popups/{popup}', [SuperAdminKontenController::class, 'updatePopup'])->name('content.popups.update');
        Route::patch('/content/popups/{popup}/toggle', [SuperAdminKontenController::class, 'togglePopup'])->name('content.popups.toggle');
        Route::delete('/content/popups/{popup}', [SuperAdminKontenController::class, 'destroyPopup'])->name('content.popups.destroy');
        Route::get('/gamification', SuperAdminGamifikasiController::class)->name('gamification');
        Route::put('/gamification/settings', [SuperAdminGamifikasiController::class, 'updateSettings'])->name('gamification.settings.update');
        Route::post('/gamification/recalculate-achievements', [SuperAdminGamifikasiController::class, 'recalculateAchievements'])->name('gamification.achievements.recalculate');
        Route::post('/gamification/achievements', [SuperAdminGamifikasiController::class, 'storeAchievement'])->name('gamification.achievements.store');
        Route::put('/gamification/achievements/{achievement}', [SuperAdminGamifikasiController::class, 'updateAchievement'])->name('gamification.achievements.update');
        Route::delete('/gamification/achievements/{achievement}', [SuperAdminGamifikasiController::class, 'destroyAchievement'])->name('gamification.achievements.destroy');
        Route::get('/kloters', SuperAdminKloterController::class)->name('kloters');
        Route::post('/kloters', [SuperAdminKloterController::class, 'store'])->name('kloters.store');
        Route::put('/kloters/{kloter}', [SuperAdminKloterController::class, 'update'])->name('kloters.update');
        Route::delete('/kloters/{kloter}', [SuperAdminKloterController::class, 'destroy'])->name('kloters.destroy');
        Route::patch('/kloters/{kloter}/archive', [SuperAdminKloterController::class, 'archive'])->name('kloters.archive');
        Route::post('/kloters/{kloter}/users', [SuperAdminKloterController::class, 'assignUser'])->name('kloters.users.store');
        Route::delete('/kloters/{kloter}/users/{user}', [SuperAdminKloterController::class, 'removeUser'])->name('kloters.users.destroy');
        Route::post('/kloters/{kloter}/access-keys', [SuperAdminKloterController::class, 'generateAccessKey'])->name('kloters.access-keys.store');
        Route::get('/activity', SuperAdminAktivitasController::class)->name('activity');
        Route::patch('/activity/feedback/{feedback}', [SuperAdminAktivitasController::class, 'updateFeedback'])->name('activity.feedback.update');
        Route::get('/activity/feedback-export', [SuperAdminAktivitasController::class, 'exportFeedback'])->name('activity.feedback.export');
        Route::get('/payments', SuperAdminPembayaranController::class)->name('payments');
        Route::post('/payments/plans', [SuperAdminPembayaranController::class, 'storePlan'])->name('payments.plans.store');
        Route::put('/payments/plans/{plan}', [SuperAdminPembayaranController::class, 'updatePlan'])->name('payments.plans.update');
        Route::post('/payments/transactions', [SuperAdminPembayaranController::class, 'storeTransaction'])->name('payments.transactions.store');
        Route::patch('/payments/transactions/{transaction}/approve', [SuperAdminPembayaranController::class, 'approve'])->name('payments.transactions.approve');
        Route::patch('/payments/transactions/{transaction}/reject', [SuperAdminPembayaranController::class, 'reject'])->name('payments.transactions.reject');
        Route::post('/payments/access-keys', [SuperAdminPembayaranController::class, 'storeAccessKey'])->name('payments.access-keys.store');
        Route::delete('/payments/access-keys/{accessKey}', [SuperAdminPembayaranController::class, 'revokeAccessKey'])->name('payments.access-keys.revoke');
        Route::redirect('/pricing', '/superadmin/payments')->name('pricing');
        Route::get('/system', SuperAdminSistemController::class)->name('system');
        Route::post('/system/theme', [SuperAdminSistemController::class, 'updateTheme'])->name('system.theme.update');
        Route::delete('/system/theme', [SuperAdminSistemController::class, 'resetTheme'])->name('system.theme.reset');
        Route::get('/profile', [HalamanController::class, 'superAdminProfile'])->name('profile');
    });

    // Admin Routes
    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/dashboard', [AdminBerandaController::class, 'index'])->name('dashboard');
        Route::get('/exams', [AdminExamPortalController::class, 'index'])->name('exams.index');
        Route::get('/exams/create', [AdminExamPortalController::class, 'create'])->name('exams.create');
        Route::get('/exams/sessions', [AdminExamPortalController::class, 'sessions'])->name('exams.sessions');
        Route::get('/exams/results', [AdminExamPortalController::class, 'results'])->name('exams.results');
        Route::post('/exams', [AdminExamPortalController::class, 'store'])->name('exams.store');
        Route::patch('/exams/{exam}', [AdminExamPortalController::class, 'update'])->name('exams.update');
        Route::post('/exams/{exam}/versions', [AdminExamPortalController::class, 'createVersion'])->name('exams.versions.store');
        Route::patch('/exam-versions/{version}', [AdminExamPortalController::class, 'updateVersion'])->name('exam-versions.update');
        Route::put('/exam-versions/{version}/sections', [AdminExamPortalController::class, 'syncSections'])->name('exam-versions.sections.sync');
        Route::put('/exam-sections/{section}/questions', [AdminExamPortalController::class, 'syncQuestions'])->name('exam-sections.questions.sync');
        Route::post('/exam-versions/{version}/validate', [AdminExamPortalController::class, 'validateVersion'])->name('exam-versions.validate');
        Route::post('/exam-versions/{version}/publish', [AdminExamPortalController::class, 'publish'])->middleware('throttle:exam-admin')->name('exam-versions.publish');
        Route::get('/exam-versions/template/xlsx', [AdminExamPortalController::class, 'template'])->name('exam-versions.template');
        Route::post('/exam-versions/{version}/import/preview', [AdminExamPortalController::class, 'importPreview'])->middleware('throttle:admin-imports')->name('exam-versions.import.preview');
        Route::post('/exam-versions/{version}/import', [AdminExamPortalController::class, 'import'])->middleware('throttle:admin-imports')->name('exam-versions.import');
        Route::post('/exam-versions/{version}/sessions', [AdminExamPortalController::class, 'storeSession'])->name('exam-versions.sessions.store');
        Route::patch('/exam-sessions/{session}', [AdminExamPortalController::class, 'updateSession'])->name('exam-sessions.update');
        Route::get('/exam-sessions/{session}/results', [AdminExamPortalController::class, 'sessionResults'])->name('exam-sessions.results');
        Route::post('/exam-sessions/{session}/close', [AdminExamPortalController::class, 'closeSession'])->middleware('throttle:exam-admin')->name('exam-sessions.close');
        Route::post('/exam-sessions/{session}/release-results', [AdminExamPortalController::class, 'releaseResults'])->middleware('throttle:exam-admin')->name('exam-sessions.release-results');
        Route::post('/exam-attempts/{attempt}/invalidate', [AdminExamPortalController::class, 'invalidate'])->middleware('throttle:exam-admin')->name('exam-attempts.invalidate');
        Route::get('/exams/{exam}/edit', [AdminExamPortalController::class, 'edit'])->name('exams.edit');
        Route::get('/exams/{exam}/preview', [AdminExamPortalController::class, 'preview'])->name('exams.preview');
        Route::get('/users', [AdminPenggunaController::class, 'index'])->name('users');
        Route::get('/users/{user}', [AdminPenggunaController::class, 'show'])->name('users.show');
        Route::patch('/kloters/{kloter}/schedule', [AdminPenggunaController::class, 'updateKloterSchedule'])->name('kloters.schedule.update');
        Route::post('/kloters/{kloter}/users', [AdminPenggunaController::class, 'assignUser'])->name('kloters.users.store');
        Route::delete('/kloters/{kloter}/users/{user}', [AdminPenggunaController::class, 'removeUser'])->name('kloters.users.destroy');
        Route::patch('/kloters/{kloter}/enrollments/{membership}/approve', [AdminPenggunaController::class, 'approveEnrollment'])->name('kloters.enrollments.approve');
        Route::patch('/kloters/{kloter}/enrollments/{membership}/reject', [AdminPenggunaController::class, 'rejectEnrollment'])->name('kloters.enrollments.reject');
        Route::get('/analytics', AdminAnalitikController::class)->name('analytics');
        Route::get('/vocabulary', [AdminKosakataController::class, 'index'])->name('vocabulary.index');
        Route::get('/vocabulary/picker', [AdminKosakataController::class, 'picker'])->name('vocabulary.picker');
        Route::post('/vocabulary', [AdminKosakataController::class, 'store'])->name('vocabulary.store');
        Route::put('/vocabulary/{vocabulary}', [AdminKosakataController::class, 'update'])->name('vocabulary.update');
        Route::delete('/vocabulary/{vocabulary}', [AdminKosakataController::class, 'destroy'])->name('vocabulary.destroy');
        Route::post('/vocabulary/import', [AdminKosakataController::class, 'import'])->middleware('throttle:admin-imports')->name('vocabulary.import');
        Route::get('/vocabulary/template/{format?}', [AdminKosakataController::class, 'template'])->name('vocabulary.template');
        Route::get('/flashcards', static fn () => redirect()->route('admin.programs.index'))->name('flashcards.index');
        Route::post('/flashcards', [AdminFlashcardController::class, 'store'])->name('flashcards.store');
        Route::put('/flashcards/{flashcardSet}', [AdminFlashcardController::class, 'update'])->name('flashcards.update');
        Route::delete('/flashcards/{flashcardSet}', [AdminFlashcardController::class, 'destroy'])->name('flashcards.destroy');
        Route::get('/flashcards/{flashcardSet}/builder', [AdminFlashcardController::class, 'builder'])->name('flashcards.builder');
        Route::post('/flashcards/{flashcardSet}/builder', [AdminFlashcardController::class, 'updateCards'])->name('flashcards.builder.update');
        Route::get('/flashcards/{flashcardSet}/template/{format?}', [AdminFlashcardController::class, 'downloadImportTemplate'])->name('flashcards.template');
        Route::post('/flashcards/{flashcardSet}/import', [AdminFlashcardController::class, 'importCards'])->middleware('throttle:admin-imports')->name('flashcards.import');
        Route::post('/flashcards/{flashcardSet}/generate-quiz', [AdminFlashcardController::class, 'generateQuiz'])->name('flashcards.generate-quiz');
        Route::get('/presentations', static fn () => redirect()->route('admin.programs.index'))->name('presentations.index');
        Route::post('/presentations', [AdminPresentasiController::class, 'store'])->name('presentations.store');
        Route::put('/presentations/{presentationDeck}', [AdminPresentasiController::class, 'update'])->name('presentations.update');
        Route::delete('/presentations/{presentationDeck}', [AdminPresentasiController::class, 'destroy'])->name('presentations.destroy');
        Route::get('/modules/{module}/presentations/builder', [AdminPresentasiController::class, 'workspace'])->name('modules.presentations.builder');
        Route::patch('/modules/{module}/presentations/reorder', [AdminPresentasiController::class, 'reorder'])->name('modules.presentations.reorder');
        Route::get('/presentations/{presentationDeck}/builder', [AdminPresentasiController::class, 'builder'])->name('presentations.builder');
        Route::post('/presentations/{presentationDeck}/builder', [AdminPresentasiController::class, 'updateSlides'])->name('presentations.builder.update');
        Route::post('/presentations/{presentationDeck}/import/pptx', [AdminPresentasiController::class, 'importPptx'])->middleware('throttle:admin-imports')->name('presentations.import.pptx');
        Route::post('/presentations/{presentationDeck}/import/pdf', [AdminPresentasiController::class, 'importPdf'])->middleware('throttle:admin-imports')->name('presentations.import.pdf');
        Route::post('/presentations/{presentationDeck}/import/images', [AdminPresentasiController::class, 'importImages'])->middleware('throttle:admin-imports')->name('presentations.import.images');
        Route::post('/presentations/{presentationDeck}/background-image', [AdminPresentasiController::class, 'uploadBackgroundImage'])->middleware('throttle:admin-uploads')->name('presentations.background.upload');
        Route::post('/presentations/{presentationDeck}/media', [AdminPresentasiController::class, 'uploadMedia'])->middleware('throttle:admin-uploads')->name('presentations.media.upload');
        Route::post('/presentations/{presentationDeck}/slides/{presentationSlide}/jamboard', [AdminPresentasiController::class, 'saveSlideBoard'])->name('presentations.slides.jamboard.save');
        Route::get('/presentations/{presentationDeck}/presenter', [AdminPresentasiController::class, 'presenter'])->name('presentations.presenter');
        Route::get('/live-classes/create', [AdminRuangKelasLiveController::class, 'create'])->name('live-classes.create');
        Route::post('/live-classes', [AdminRuangKelasLiveController::class, 'store'])->middleware('throttle:live-room-create')->name('live-classes.store');
        Route::get('/live-classes/{liveClassSession}', [AdminRuangKelasLiveController::class, 'show'])->name('live-classes.show');
        Route::post('/live-classes/{liveClassSession}/start', [AdminRuangKelasLiveController::class, 'start'])->middleware('throttle:live-room-control')->name('live-classes.start');
        Route::delete('/live-classes/{liveClassSession}', [AdminRuangKelasLiveController::class, 'cancel'])->middleware('throttle:live-room-control')->name('live-classes.cancel');
        Route::post('/live-classes/{liveClassSession}/token', [AdminRuangKelasLiveController::class, 'token'])->middleware('throttle:live-room-token')->name('live-classes.token');
        Route::patch('/live-classes/{liveClassSession}/state', [AdminRuangKelasLiveController::class, 'state'])->middleware('throttle:live-room-state')->name('live-classes.state');
        Route::patch('/live-classes/{liveClassSession}/participants/{user}', [AdminRuangKelasLiveController::class, 'updateParticipant'])->middleware('throttle:live-room-control')->name('live-classes.participants.update');
        Route::delete('/live-classes/{liveClassSession}/participants/{user}', [AdminRuangKelasLiveController::class, 'kick'])->middleware('throttle:live-room-control')->name('live-classes.participants.kick');
        Route::post('/live-classes/{liveClassSession}/mute-all', [AdminRuangKelasLiveController::class, 'muteAll'])->middleware('throttle:live-room-control')->name('live-classes.mute-all');
        Route::post('/live-classes/{liveClassSession}/end', [AdminRuangKelasLiveController::class, 'end'])->middleware('throttle:live-room-control')->name('live-classes.end');
        Route::get('/boards', static fn () => redirect()->route('admin.programs.index'))->name('boards.index');
        Route::any('/gamification/{path?}', static fn () => abort(403))->where('path', '.*')->name('gamification.legacy');
        Route::any('/achievements/{path?}', static fn () => abort(403))->where('path', '.*')->name('achievements.legacy');
        Route::redirect('/subscriptions', '/admin/dashboard')->name('subscriptions.index');
        Route::redirect('/vouchers', '/admin/dashboard')->name('vouchers.index');
        Route::get('/quizzes/{quiz}/builder', [AdminKuisController::class, 'builder'])->name('quizzes.builder');
        Route::post('/quizzes/{quiz}/builder', [AdminKuisController::class, 'updateQuestions'])->name('quizzes.builder.update');
        Route::get('/quizzes/{quiz}/questions/template/{format}', [AdminKuisController::class, 'downloadImportTemplate'])->name('quizzes.questions.template');
        Route::post('/quizzes/{quiz}/questions/import/preview', [AdminKuisController::class, 'previewImportQuestions'])->middleware('throttle:admin-imports')->name('quizzes.questions.import.preview');
        Route::post('/quizzes/{quiz}/questions/import', [AdminKuisController::class, 'importQuestions'])->middleware('throttle:admin-imports')->name('quizzes.questions.import');
        Route::post('/quizzes/{quiz}/questions/generate-vocabulary', [AdminKuisController::class, 'generateVocabularyQuestions'])->name('quizzes.questions.generate-vocabulary');
        Route::post('/quizzes/{quiz}/questions/generate-vocabulary/preview', [AdminKuisController::class, 'previewVocabularyQuestions'])->name('quizzes.questions.generate-vocabulary.preview');
        Route::get('/module-days/{moduleDay}/grammar-quizzes', [AdminGrammarQuizController::class, 'index'])->name('grammar-quizzes.index');
        Route::post('/module-days/{moduleDay}/grammar-quizzes', [AdminGrammarQuizController::class, 'store'])->name('grammar-quizzes.store');
        Route::get('/grammar-quizzes/{quiz}', [AdminGrammarQuizController::class, 'show'])->name('grammar-quizzes.show');
        Route::put('/grammar-quizzes/{quiz}', [AdminGrammarQuizController::class, 'update'])->name('grammar-quizzes.update');
        Route::patch('/grammar-quizzes/{quiz}/status', [AdminGrammarQuizController::class, 'updateStatus'])->name('grammar-quizzes.status');
        Route::delete('/grammar-quizzes/{quiz}', [AdminGrammarQuizController::class, 'destroy'])->name('grammar-quizzes.destroy');
        Route::get('/programs/{program}/grammar-quizzes/template', [AdminGrammarQuizController::class, 'template'])->name('grammar-quizzes.template');
        Route::post('/programs/{program}/grammar-quizzes/import/preview', [AdminGrammarQuizController::class, 'previewImport'])->middleware('throttle:admin-imports')->name('grammar-quizzes.import.preview');
        Route::post('/programs/{program}/grammar-quizzes/import', [AdminGrammarQuizController::class, 'import'])->middleware('throttle:admin-imports')->name('grammar-quizzes.import');

        // LevelPembelajaran CRUD
        Route::apiResource('/levels', AdminLevelController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::post('/curriculum-tracks', [AdminLevelController::class, 'storeTrack'])->name('curriculum-tracks.store');
        Route::put('/curriculum-tracks/{curriculumTrack}', [AdminLevelController::class, 'updateTrack'])->name('curriculum-tracks.update');
        Route::delete('/curriculum-tracks/{curriculumTrack}', [AdminLevelController::class, 'destroyTrack'])->name('curriculum-tracks.destroy');

        // Upload Endpoint
        Route::post('/upload', [AdminUnggahController::class, 'store'])->middleware('throttle:admin-uploads')->name('upload');

        // Quizzes CRUD (home/index untuk daftar kuis)
        Route::get('/quizzes', static fn () => redirect()->route('admin.programs.index'))->name('quizzes.index');
        Route::post('/quizzes', [AdminKuisController::class, 'store'])->name('quizzes.store');
        Route::put('/quizzes/{quiz}', [AdminKuisController::class, 'update'])->name('quizzes.update');
        Route::patch('/quizzes/{quiz}/status', [AdminKuisController::class, 'updateStatus'])->name('quizzes.status');
        Route::delete('/quizzes/{quiz}', [AdminKuisController::class, 'destroy'])->name('quizzes.destroy');

        // Kelas/Program CRUD
        Route::get('/programs', [AdminModulController::class, 'programsIndex'])->name('programs.index');
        Route::post('/programs', [AdminModulController::class, 'storeProgram'])->name('programs.store');
        Route::put('/programs/{program}', [AdminModulController::class, 'updateProgram'])->name('programs.update');
        Route::delete('/programs/{program}', [AdminModulController::class, 'destroyProgram'])->name('programs.destroy');

        // Modul CRUD
        Route::get('/modules', [AdminModulController::class, 'index'])->name('modules.index');
        Route::post('/modules', [AdminModulController::class, 'store'])->name('modules.store');
        Route::put('/modules/{module}', [AdminModulController::class, 'update'])->name('modules.update');
        Route::delete('/modules/{module}', [AdminModulController::class, 'destroy'])->name('modules.destroy');
        Route::post('/modules/{module}/days', [AdminHariModulController::class, 'store'])->name('module-days.store');
        Route::put('/module-days/{moduleDay}', [AdminHariModulController::class, 'update'])->name('module-days.update');
        Route::delete('/module-days/{moduleDay}', [AdminHariModulController::class, 'destroy'])->name('module-days.destroy');
        Route::put('/module-days/{moduleDay}/vocabulary', [AdminHariModulController::class, 'syncVocabulary'])->name('module-days.vocabulary.sync');

        // Soal lama diarahkan ke Builder Kuis agar tidak ada dua jalur edit soal.
        Route::get('/questions', [AdminKuisController::class, 'legacyQuestionsIndex'])->name('questions.index');
        Route::get('/questions/create', [AdminKuisController::class, 'legacyQuestionsIndex'])->name('questions.create');
        Route::get('/questions/{question}/edit', [AdminKuisController::class, 'legacyQuestionEdit'])->name('questions.edit');
        Route::post('/questions', [AdminKuisController::class, 'legacyQuestionsGone'])->name('questions.store');
        Route::put('/questions/{question}', [AdminKuisController::class, 'legacyQuestionsGone'])->name('questions.update');
        Route::delete('/questions/{question}', [AdminKuisController::class, 'legacyQuestionsGone'])->name('questions.destroy');
        Route::post('/questions/reorder', [AdminKuisController::class, 'legacyQuestionsGone'])->name('questions.reorder');

        Route::get('/profile', [HalamanController::class, 'adminProfile'])->name('profile');
    });

    // Pengguna Routes
    Route::middleware('role:user')->prefix('user')->name('user.')->group(function () {
        Route::get('/dashboard', [UserDashboardController::class, 'index'])->name('dashboard');
        Route::get('/kelas', [HalamanController::class, 'userKelas'])->name('kelas.index');
        Route::get('/checkout/{transactionCode}', [HalamanController::class, 'userCheckout'])->name('checkout');

        // Modul Mingguan
        Route::redirect('/modul', '/user/kelas')->name('modul.index');
        Route::get('/modul/program/{program:slug}', [ModulController::class, 'program'])->name('modul.program');
        Route::put('/modul/program/{program:slug}/exam-target', [TargetUjianPenggunaController::class, 'update'])->name('modul.program.exam-target.update');
        Route::delete('/modul/program/{program:slug}/exam-target', [TargetUjianPenggunaController::class, 'destroy'])->name('modul.program.exam-target.destroy');
        Route::get('/modul/program/{program:slug}/kosakata', [ModulController::class, 'kosakata'])->name('modul.program.kosakata');
        Route::get('/modul/program/{program:slug}/presentasi', [ModulController::class, 'presentasi'])->name('modul.program.presentasi');
        Route::get('/modul/{week}', [ModulController::class, 'lesson'])->name('modul.lesson');
        Route::get('/modul/{week}/quiz', [ModulController::class, 'quiz'])->name('modul.quiz');
        Route::post('/questions/{question}/check', [ModulController::class, 'checkQuestion'])->middleware('throttle:learning-actions')->name('questions.check');
        Route::post('/access-keys/redeem', [UserDashboardController::class, 'redeemAccessKey'])->middleware('throttle:access-keys')->name('access-keys.redeem');
        Route::get('/news', [BeritaController::class, 'index'])->name('news.index');
        Route::get('/news/{news}', [BeritaController::class, 'show'])->name('news.show');
        Route::get('/live-classes/{session:join_code}', [UserRuangKelasLiveController::class, 'show'])->name('live-classes.show');
        Route::post('/live-classes/{session:join_code}/token', [UserRuangKelasLiveController::class, 'token'])->middleware('throttle:live-room-user-token')->name('live-classes.token');
        Route::post('/live-classes/{session:join_code}/leave', [UserRuangKelasLiveController::class, 'leave'])->middleware('throttle:live-room-control')->name('live-classes.leave');

        Route::get('/quizzes', [PembelajaranController::class, 'quizLobby'])->name('quizzes.index');
        Route::get('/quizzes/{quiz}', [PembelajaranController::class, 'showQuiz'])->name('quizzes.show');
        Route::get('/module-days/{moduleDay}/grammar-quizzes', [GrammarQuizController::class, 'index'])->name('grammar-quizzes.index');
        Route::get('/grammar-quizzes/{quiz}', [GrammarQuizController::class, 'show'])->name('grammar-quizzes.show');
        Route::get('/exams', [ExamPortalController::class, 'index'])->name('exams.index');
        Route::get('/exams/library', [ExamPortalController::class, 'library'])->name('exams.library');
        Route::get('/exams/ranking', [ExamPortalController::class, 'ranking'])->middleware('throttle:exam-ranking')->name('exams.ranking');
        Route::get('/exams/history', [ExamPortalController::class, 'history'])->name('exams.history');
        Route::post('/exams/{exam}/attempts', [ExamPortalController::class, 'start'])->middleware('throttle:exam-start')->name('exams.attempts.start');
        Route::get('/exam-attempts/{attempt}', [ExamPortalController::class, 'attempt'])->name('exam-attempts.show');
        Route::put('/exam-attempts/{attempt}/answers', [ExamPortalController::class, 'autosave'])->middleware('throttle:exam-autosave')->name('exam-attempts.answers');
        Route::post('/exam-attempts/{attempt}/submit', [ExamPortalController::class, 'submit'])->middleware('throttle:exam-submit')->name('exam-attempts.submit');
        Route::get('/exam-attempts/{attempt}/result', [ExamPortalController::class, 'result'])->name('exam-attempts.result');
        Route::get('/exams/{exam}', [ExamPortalController::class, 'show'])->name('exams.show');
        Route::post('/quick-quiz/start', [QuickQuizController::class, 'start'])->middleware('throttle:quick-quiz')->name('quick-quiz.start');
        Route::get('/quick-quiz/{session}', [QuickQuizController::class, 'show'])->name('quick-quiz.show');
        Route::post('/quick-quiz/{session}/answer', [QuickQuizController::class, 'answer'])->middleware('throttle:quick-quiz')->name('quick-quiz.answer');
        Route::post('/quick-quiz/reset', [QuickQuizController::class, 'reset'])->middleware('throttle:quick-quiz')->name('quick-quiz.reset');
        Route::get('/review', [ReviewController::class, 'index'])->name('review.index');
        Route::delete('/review/history', [ReviewController::class, 'purge'])->middleware('throttle:learning-actions')->name('review.history.purge');
        Route::delete('/review/state', [ReviewController::class, 'reset'])->middleware('throttle:learning-actions')->name('review.state.reset');
        Route::post('/quizzes/{quiz}/feedback', [UmpanBalikPembelajaranController::class, 'store'])->middleware('throttle:learning-actions')->name('quizzes.feedback.store');
        Route::get('/flashcards/{flashcardSet}', [FlashcardController::class, 'show'])->name('flashcards.show');
        Route::post('/flashcards/review/{flashcard}', [FlashcardController::class, 'review'])->middleware('throttle:learning-actions')->name('flashcards.review');

        Route::get('/leaderboard', PapanPeringkatController::class)->name('leaderboard');
        Route::get('/certificates', [SertifikatController::class, 'index'])->name('certificates');
        Route::get('/certificates/{certificate}/download', [SertifikatController::class, 'download'])->name('certificates.download');
        Route::get('/progress', [ProgresController::class, 'index'])->name('progress');

        Route::post('/attempts', [ProgresController::class, 'storeAttempt'])->middleware('throttle:learning-actions')->name('attempts.store');
        Route::post('/quizzes/{quiz}/attempts/start', [ProgresController::class, 'startAttempt'])->middleware('throttle:learning-actions')->name('attempts.start');
        Route::post('/attempts/{attempt}/answers/first', [ProgresController::class, 'storeFirstAnswer'])->middleware('throttle:learning-actions')->name('attempts.answers.first');
        Route::post('/modules/complete', [ProgresController::class, 'completeModule'])->name('modules.complete');
    });
});

require __DIR__.'/auth.php';

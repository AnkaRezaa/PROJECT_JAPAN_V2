/**
 * Deteksi apakah browser klien berjalan di dalam In-App Browser (WebView aplikasi chat/sosial media)
 * seperti WhatsApp, Telegram, Instagram, Facebook, Line, dll.
 * WebView sering kali membatasi akses WebRTC (mikrofon/kamera) dan isolasi session cookie.
 */
export function isInAppBrowser() {
    if (typeof window === 'undefined') return false;

    const ua = navigator.userAgent || navigator.vendor || window.opera || '';

    // Deteksi WhatsApp, Facebook, Instagram, Telegram, Line, Twitter/X, Snapchat, WeChat
    const inAppPatterns = /FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|Twitter|Telegram|MicroMessenger/i;
    if (inAppPatterns.test(ua)) return true;

    // Deteksi Android WebView umum
    if (/Android/i.test(ua) && (/wv/.test(ua) || /Version\/[\d.]+.*Chrome/i.test(ua) && !/Mobile Safari/i.test(ua))) {
        return true;
    }

    // Deteksi iOS WebView (bukan Safari asli)
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isWebKit = /WebKit/i.test(ua);
    const isSafari = /Safari/i.test(ua);
    if (isIOS && isWebKit && !isSafari) {
        return true;
    }

    return false;
}

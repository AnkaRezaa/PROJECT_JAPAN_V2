const CONSENT_KEY = 'toku-up:analytics-consent';
const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{1,39}$/;

let initialized = false;

export function analyticsConfig() {
    return window.__TOKU_UP_ANALYTICS__ || { enabled: false, id: null };
}

export function getAnalyticsConsent() {
    try {
        return window.localStorage.getItem(CONSENT_KEY);
    } catch {
        return null;
    }
}

export function setAnalyticsConsent(value) {
    try {
        window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
        // Analytics remains optional when storage is unavailable.
    }
}

export function initializeAnalytics() {
    const { enabled, id } = analyticsConfig();
    if (initialized || !enabled || !/^GTM-[A-Z0-9]+$/.test(String(id || '')) || getAnalyticsConsent() !== 'granted') {
        return false;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
    script.dataset.tokuUpGtm = id;
    document.head.appendChild(script);
    initialized = true;

    return true;
}

export function pushAnalyticsEvent(event, parameters = {}) {
    if (!initialized || !EVENT_NAME_PATTERN.test(String(event))) return;

    const safeParameters = Object.fromEntries(
        Object.entries(parameters)
            .filter(([key, value]) => /^[a-z][a-z0-9_]{0,39}$/.test(key)
                && !/(email|name|phone|token|answer|comment|message|user_id|context_id|attempt_id)/i.test(key)
                && ['string', 'number', 'boolean'].includes(typeof value))
            .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 100) : value]),
    );

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...safeParameters });
}

export function pushPageView() {
    pushAnalyticsEvent('page_view', {
        page_path: window.location.pathname,
        page_title: document.title,
    });
}

import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { installInterfaceSoundEffects } from '@/Components/UI/SoundEffects';
import { applyThemeVariables } from '@/Components/theme/themes';
import AnalyticsConsentBanner from '@/Components/Features/Feedback/AnalyticsConsentBanner';
import AppErrorBoundary from '@/Components/Errors/AppErrorBoundary';
import { getAnalyticsConsent, initializeAnalytics, pushPageView } from '@/lib/analytics';
import { resetScrollLock } from '@/lib/scrollLock';
import * as Sentry from '@sentry/react';

const seoSiteName = import.meta.env.VITE_SEO_SITE_NAME || 'TOKU-UP';

applyThemeVariables();

const analyticsReady = getAnalyticsConsent() === 'granted' && initializeAnalytics();
router.on('navigate', () => {
    resetScrollLock();
    pushPageView();
});

const sentryEnabled = import.meta.env.VITE_SENTRY_ENABLED === 'true' && Boolean(import.meta.env.VITE_SENTRY_DSN);
if (sentryEnabled) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
        sendDefaultPii: false,
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.05),
        beforeSend(event) {
            delete event.user;
            if (event.request) {
                delete event.request.cookies;
                delete event.request.data;
                delete event.request.query_string;
            }
            return event;
        },
    });
}

createInertiaApp({
    title: (title) => {
        if (!title) return seoSiteName;
        return title.toLowerCase().includes(seoSiteName.toLowerCase())
            ? title
            : `${title} | ${seoSiteName}`;
    },
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        const isUser = props.initialPage?.props?.auth?.user?.role === 'user';
        const removeInterfaceSoundEffects = isUser
            ? installInterfaceSoundEffects(el)
            : () => {};

        const content = <><App {...props} /><AnalyticsConsentBanner /></>;
        const reportRenderError = sentryEnabled
            ? (error, errorInfo) => Sentry.captureException(error, {
                contexts: { react: { componentStack: errorInfo.componentStack } },
            })
            : undefined;

        root.render(
            <AppErrorBoundary onError={reportRenderError}>
                {content}
            </AppErrorBoundary>,
        );

        if (analyticsReady) window.requestAnimationFrame(pushPageView);

        if (import.meta.hot) {
            import.meta.hot.dispose(removeInterfaceSoundEffects);
        }
    },
    progress: {
        color: '#15803D',
    },
});

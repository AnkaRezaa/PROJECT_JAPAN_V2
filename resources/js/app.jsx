import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { installInterfaceSoundEffects } from '@/Components/UI/SoundEffects';

const seoSiteName = import.meta.env.VITE_SEO_SITE_NAME || 'Belajar Bahasa Jepang';

createInertiaApp({
    title: (title) => {
        if (!title) return seoSiteName;
        return title.includes(seoSiteName) ? title : `${title} | ${seoSiteName}`;
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

        root.render(<App {...props} />);

        if (import.meta.hot) {
            import.meta.hot.dispose(removeInterfaceSoundEffects);
        }
    },
    progress: {
        color: '#DC2626',
    },
});

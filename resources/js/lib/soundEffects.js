export const SOUND_EFFECTS_PREFERENCE_KEY = 'toku-up.soundEffectsEnabled';

const SOUND_EFFECTS = {
    correct: { src: '/audio/sfx/Audio/confirmation_001.ogg', volume: 0.26 },
    incorrect: { src: '/audio/sfx/Audio/error_001.ogg', volume: 0.22 },
    complete: { src: '/audio/sfx/Audio/maximize_001.ogg', volume: 0.3 },
    open: { src: '/audio/sfx/Audio/open_001.ogg', volume: 0.14 },
    close: { src: '/audio/sfx/Audio/close_001.ogg', volume: 0.12 },
    select: { src: '/audio/sfx/Audio/select_001.ogg', volume: 0.13 },
    click: { src: '/audio/sfx/Audio/click_002.ogg', volume: 0.08 },
    navigate: { src: '/audio/sfx/Audio/select_003.ogg', volume: 0.1 },
    toggle: { src: '/audio/sfx/Audio/switch_002.ogg', volume: 0.11 },
    confirm: { src: '/audio/sfx/Audio/confirmation_002.ogg', volume: 0.2 },
    notification: { src: '/audio/sfx/Audio/pluck_001.ogg', volume: 0.16 },
    warning: { src: '/audio/sfx/Audio/question_001.ogg', volume: 0.16 },
};

const players = new Map();
let lastPlayedAt = 0;

export function areSoundEffectsEnabled() {
    if (typeof window === 'undefined') return true;

    return window.localStorage.getItem(SOUND_EFFECTS_PREFERENCE_KEY) !== 'false';
}

export function setSoundEffectsEnabled(enabled) {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(SOUND_EFFECTS_PREFERENCE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('toku-up:sound-effects-changed'));
}

export function playSoundEffect(name, { deduplicate = false } = {}) {
    if (!areSoundEffectsEnabled() || typeof Audio === 'undefined') return;

    const effect = SOUND_EFFECTS[name];
    if (!effect) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (deduplicate && now - lastPlayedAt < 80) return;
    lastPlayedAt = now;

    let player = players.get(name);
    if (!player) {
        player = new Audio(effect.src);
        player.preload = 'auto';
        player.volume = effect.volume;
        players.set(name, player);
    }

    player.currentTime = 0;
    player.play().catch(() => {
        // Browsers may block audio until the user has interacted with the page.
    });
}

function isUnavailable(element) {
    return element.matches(':disabled, [aria-disabled="true"]')
        || Boolean(element.closest('[inert], [data-sound="none"]'));
}

function resolveSound(target) {
    const soundElement = target.closest('[data-sound]');
    if (soundElement) {
        const sound = soundElement.getAttribute('data-sound');
        return sound && sound !== 'none' ? sound : null;
    }

    const interactive = target.closest('button, a, input[type="button"], input[type="submit"], [role="button"], [role="tab"]');
    if (!interactive || isUnavailable(interactive)) return null;

    if (interactive.matches('input[type="checkbox"], input[type="radio"], [role="switch"]')) {
        return 'toggle';
    }

    if (interactive.matches('a, [role="tab"]')) {
        return 'navigate';
    }

    return 'click';
}

export function installInterfaceSoundEffects(root = (typeof document !== 'undefined' ? document : null)) {
    if (!root?.addEventListener) return () => {};

    const handleClick = (event) => {
        if (!event.isTrusted || !(event.target instanceof Element)) return;

        const element = event.target.closest([
            '[data-sound]',
            'button',
            'a[href]',
            'summary',
            '[role="button"]',
            '[role="tab"]',
            '[role="switch"]',
            'input[type="checkbox"]',
            'input[type="radio"]',
        ].join(','));

        if (!element || isUnavailable(element)) return;
        const sound = resolveSound(element);
        if (sound) {
            playSoundEffect(sound, { deduplicate: true });
        }
    };

    const handleChange = (event) => {
        if (!event.isTrusted || !(event.target instanceof Element)) return;
        if (!event.target.matches('select, input[type="range"], input[type="color"]')) return;
        if (isUnavailable(event.target)) return;

        playSoundEffect(event.target.matches('input[type="range"]') ? 'toggle' : 'select', { deduplicate: true });
    };

    root.addEventListener('click', handleClick, true);
    root.addEventListener('change', handleChange, true);

    return () => {
        root.removeEventListener('click', handleClick, true);
        root.removeEventListener('change', handleChange, true);
    };
}

export function attachSoundEffects() {
    installInterfaceSoundEffects();
}

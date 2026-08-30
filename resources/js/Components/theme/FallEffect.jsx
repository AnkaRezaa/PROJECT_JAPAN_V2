import React, { useEffect, useRef } from 'react';
import { ACTIVE_THEME } from '@/Components/theme/themes';

// ── Petal SVG paths per tema ──────────────────────────────────
const petalSVGs = {
    spring: (color) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30">
      <g opacity="0.85">
        <ellipse cx="15" cy="10" rx="6" ry="10" fill="${color}" transform="rotate(0 15 15)"/>
        <ellipse cx="15" cy="10" rx="6" ry="10" fill="${color}" transform="rotate(72 15 15)"/>
        <ellipse cx="15" cy="10" rx="6" ry="10" fill="${color}" transform="rotate(144 15 15)"/>
        <ellipse cx="15" cy="10" rx="6" ry="10" fill="${color}" transform="rotate(216 15 15)"/>
        <ellipse cx="15" cy="10" rx="6" ry="10" fill="${color}" transform="rotate(288 15 15)"/>
        <circle cx="15" cy="15" r="3" fill="#fff8f9" opacity="0.6"/>
      </g>
    </svg>`,
    autumn: (color) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <path d="M16 2 C10 8 4 10 4 18 C4 24 10 28 16 28 C22 28 28 24 28 18 C28 10 22 8 16 2Z"
        fill="${color}" opacity="0.9"/>
      <path d="M16 2 L16 28" stroke="#a0522d" stroke-width="1" opacity="0.4"/>
      <path d="M16 10 C12 14 10 16 8 20" stroke="#a0522d" stroke-width="0.8" opacity="0.3" fill="none"/>
      <path d="M16 10 C20 14 22 16 24 20" stroke="#a0522d" stroke-width="0.8" opacity="0.3" fill="none"/>
    </svg>`,
    winter: (color) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <line x1="16" y1="2" x2="16" y2="30" stroke="${color}" stroke-width="1.5"/>
      <line x1="2" y1="16" x2="30" y2="16" stroke="${color}" stroke-width="1.5"/>
      <line x1="6" y1="6" x2="26" y2="26" stroke="${color}" stroke-width="1.5"/>
      <line x1="26" y1="6" x2="6" y2="26" stroke="${color}" stroke-width="1.5"/>
      <line x1="16" y1="2" x2="12" y2="8" stroke="${color}" stroke-width="1"/>
      <line x1="16" y1="2" x2="20" y2="8" stroke="${color}" stroke-width="1"/>
      <line x1="16" y1="30" x2="12" y2="24" stroke="${color}" stroke-width="1"/>
      <line x1="16" y1="30" x2="20" y2="24" stroke="${color}" stroke-width="1"/>
      <line x1="2" y1="16" x2="8" y2="12" stroke="${color}" stroke-width="1"/>
      <line x1="2" y1="16" x2="8" y2="20" stroke="${color}" stroke-width="1"/>
      <line x1="30" y1="16" x2="24" y2="12" stroke="${color}" stroke-width="1"/>
      <line x1="30" y1="16" x2="24" y2="20" stroke="${color}" stroke-width="1"/>
    </svg>`,
    summer: () => null,
};

// Tema utama tetap memakai bunga jatuh yang sama seperti desain sebelumnya.
petalSVGs.tokuup = petalSVGs.spring;

// ── Theme particle configs ────────────────────────────────────
const themeConfigs = {
    spring: {
        count: 18,
        colors: ['#ffb7c5', '#ff8fab', '#ffd1dc', '#ffacc7', '#ff6b9d', '#fce4ec'],
        minSize: 10, maxSize: 20,
        minSpeed: 1.5, maxSpeed: 3,
        minRotSpeed: 20, maxRotSpeed: 60,
        swayRange: 50,
        opacity: [0.3, 0.6],
    },
    autumn: {
        count: 40,
        colors: ['#d2691e', '#ff6b35', '#b8430a', '#e07b39', '#8b2500', '#cc5500'],
        minSize: 12, maxSize: 22,
        minSpeed: 1.5, maxSpeed: 3,
        minRotSpeed: 15, maxRotSpeed: 60,
        swayRange: 70,
        opacity: [0.3, 0.6],
    },
    winter: {
        count: 60,
        colors: ['#bae6fd', '#e0f2fe', '#93c5fd', '#dbeafe', '#cffafe'],
        minSize: 8, maxSize: 18,
        minSpeed: 1, maxSpeed: 2.5,
        minRotSpeed: 8, maxRotSpeed: 35,
        swayRange: 25,
        opacity: [0.3, 0.6],
    },
    summer: {
        count: 0,
        colors: [],
        minSize: 0, maxSize: 0,
        minSpeed: 0, maxSpeed: 0,
        minRotSpeed: 0, maxRotSpeed: 0,
        swayRange: 0,
        opacity: [0, 0],
    },
};

themeConfigs.tokuup = {
    ...themeConfigs.spring,
    count: 18,
    colors: ['#F6B8C8', '#F8CAD5', '#F2A9BD', '#FFDDE5', '#EFA1B7'],
};

// ── Seeded PRNG ───────────────────────────────────────────────
function prng(seed) {
    let s = seed;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

// ── SVG → data URL (memoized outside component) ───────────────
const svgCache = {};
function getSvgUrl(theme, color) {
    const key = theme + color;
    if (svgCache[key]) return svgCache[key];
    const fn = petalSVGs[theme];
    if (!fn) return null;
    const svg = fn(color);
    if (!svg) return null;
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg.trim())));
    svgCache[key] = url;
    return url;
}

// ── Main component ────────────────────────────────────────────
export default function FallEffect() {
    const containerRef = useRef(null);
    const cfg = themeConfigs[ACTIVE_THEME] ?? themeConfigs.spring;

    useEffect(() => {
        if (!cfg.count || ACTIVE_THEME === 'summer') return;
        const container = containerRef.current;
        if (!container) return;

        const particles = [];
        const rand = prng(42);

        const lerp = (a, b, t) => a + (b - a) * t;

        for (let i = 0; i < cfg.count; i++) {
            const r = () => rand();

            const color = cfg.colors[Math.floor(r() * cfg.colors.length)];
            const size = lerp(cfg.minSize, cfg.maxSize, r());
            const url = getSvgUrl(ACTIVE_THEME, color);
            if (!url) continue;

            const el = document.createElement('img');
            el.src = url;
            el.style.cssText = `
        position: fixed;
        pointer-events: none;
        width: ${size}px;
        height: ${size}px;
        opacity: ${lerp(cfg.opacity[0], cfg.opacity[1], r())};
        left: ${r() * 110 - 5}%;
        top: ${-size - r() * 20}px;
        z-index: 30;
        will-change: transform;
      `;

            const speed = lerp(cfg.minSpeed, cfg.maxSpeed, r());
            const rotSpeed = lerp(cfg.minRotSpeed, cfg.maxRotSpeed, r()) * (r() > 0.5 ? 1 : -1);
            const swayAmp = cfg.swayRange * (0.3 + r() * 0.7);
            const swaySpeed = 1.5 + r() * 2;
            const phaseX = r() * Math.PI * 2;
            const phaseY = r() * Math.PI * 2;
            const tiltX = (r() - 0.5) * 40;

            let y = -(size + r() * window.innerHeight);
            let rot = r() * 360;
            let lastTime = null;

            const tick = (t) => {
                if (lastTime === null) lastTime = t;
                const dt = Math.min((t - lastTime) / 1000, 0.05);
                lastTime = t;

                y += speed * dt * 60;
                rot += rotSpeed * dt;
                const sway = Math.sin(t / 1000 * swaySpeed + phaseX) * swayAmp;
                const tilt = Math.sin(t / 1000 * swaySpeed * 0.7 + phaseY) * tiltX;

                el.style.transform = `translate(${sway}px, ${y}px) rotate(${rot}deg) rotateX(${tilt}deg)`;

                if (y > window.innerHeight + size + 50) {
                    y = -(size + Math.random() * 30);
                    el.style.left = `${Math.random() * 110 - 5}%`;
                }

                p.raf = requestAnimationFrame(tick);
            };

            const p = { el, raf: requestAnimationFrame(tick) };
            particles.push(p);
            container.appendChild(el);
        }

        return () => {
            particles.forEach(p => {
                cancelAnimationFrame(p.raf);
                p.el.remove();
            });
        };
    }, []);

    // Summer: Firefly / kunang-kunang
    if (ACTIVE_THEME === 'summer') {
        const r = prng(77);
        const flies = Array.from({ length: 10 }, (_, i) => ({
            left: `${r() * 95}%`,
            top: `${r() * 90}%`,
            size: r() * 5 + 4,
            color: `rgba(${Math.floor(r() * 40 + 180)}, ${Math.floor(r() * 30 + 220)}, ${Math.floor(r() * 20 + 50)}, 0.9)`,
            glowR: Math.floor(r() * 40 + 160),
            glowG: Math.floor(r() * 30 + 220),
            blinkDur: `${r() * 2 + 1.5}s`,
            moveDur: `${r() * 8 + 6}s`,
            blinkDel: `${r() * 3}s`,
            moveDel: `${r() * 5}s`,
            dx: `${(r() - 0.5) * 120}px`,
            dy: `${(r() - 0.5) * 120}px`,
        }));

        return (
            <>
                <style>{`
          @keyframes firefly-blink {
            0%, 100% { opacity: 0.1; transform: scale(0.7); }
            50%       { opacity: 1;   transform: scale(1.2); }
          }
          @keyframes firefly-move {
            0%   { translate: 0px 0px; }
            25%  { translate: var(--dx) calc(var(--dy) * 0.5); }
            50%  { translate: calc(var(--dx) * -0.5) var(--dy); }
            75%  { translate: var(--dx) calc(var(--dy) * -0.3); }
            100% { translate: 0px 0px; }
          }
        `}</style>
                <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 5 }} aria-hidden="true">
                    {flies.map((f, i) => (
                        <div key={i} style={{
                            position: 'fixed',
                            left: f.left,
                            top: f.top,
                            width: `${f.size}px`,
                            height: `${f.size}px`,
                            borderRadius: '50%',
                            backgroundColor: f.color,
                            boxShadow: `0 0 ${f.size * 2}px ${f.size}px rgba(${f.glowR},${f.glowG},80,0.5)`,
                            animation: `firefly-blink ${f.blinkDur} ease-in-out ${f.blinkDel} infinite, firefly-move ${f.moveDur} ease-in-out ${f.moveDel} infinite`,
                            '--dx': f.dx,
                            '--dy': f.dy,
                            pointerEvents: 'none',
                        }} />
                    ))}
                </div>
            </>
        );
    }

    return (
        <div
            ref={containerRef}
            className="pointer-events-none fixed inset-0 overflow-hidden"
            style={{ zIndex: 5 }}
            aria-hidden="true"
        />
    );
}

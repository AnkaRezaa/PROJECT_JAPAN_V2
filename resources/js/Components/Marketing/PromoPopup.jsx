import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@inertiajs/react';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CampaignIcon from '@mui/icons-material/Campaign';

export default function PromoPopup({
    popup,
    show,
    onClose,
    autoShow = true,
    delay = 1500,
    storageKey,
    cooldownDays = 1,
    badge,
    title,
    description,
    image,
    primaryAction,
    secondaryAction,
    showDoNotShowAgain = true,
    children,
}) {
    const popupId = popup?.id;
    const finalTitle = popup?.title || title;
    const finalDescription = popup?.description || description;
    const defaultBadge = popup?.type === 'promo' ? 'Promo Spesial' : (popup?.type === 'announcement' ? 'Pengumuman' : (popup?.type === 'event' ? 'Event Spesial' : 'Pemberitahuan'));
    const finalBadge = popup?.badge || badge || (popup ? defaultBadge : 'Promo Spesial');
    const finalImage = popup?.image || image;
    const finalPrimaryAction = popup?.cta_label && popup?.cta_url 
        ? { label: popup.cta_label, href: popup.cta_url } 
        : primaryAction;
    const finalStorageKey = storageKey || (popupId ? `popup_${popupId}` : 'default_promo');

    const [internalShow, setInternalShow] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const isOpen = show !== undefined ? show : internalShow;

    useEffect(() => {
        if (!finalTitle && !children) return;

        // Anti-reload check: jika sudah pernah dilihat pada sesi ini, jangan muncul lagi
        if (finalStorageKey) {
            try {
                if (sessionStorage.getItem(`seen_${finalStorageKey}`)) {
                    return;
                }
                const savedTimestamp = localStorage.getItem(`promo_popup_${finalStorageKey}`);
                if (savedTimestamp) {
                    const elapsed = Date.now() - parseInt(savedTimestamp, 10);
                    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
                    if (elapsed < cooldownMs) return;
                }
            } catch {
                // ignore
            }
        }

        if (autoShow && show === undefined) {
            const timer = setTimeout(() => {
                setInternalShow(true);
                if (finalStorageKey) {
                    try {
                        sessionStorage.setItem(`seen_${finalStorageKey}`, 'true');
                    } catch {
                        // ignore
                    }
                }
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [autoShow, finalStorageKey, delay, cooldownDays, show, finalTitle, children]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') handleDismiss();
        };

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleDismiss = () => {
        if (finalStorageKey) {
            try {
                sessionStorage.setItem(`seen_${finalStorageKey}`, 'true');
                if (dontShowAgain) {
                    localStorage.setItem(`promo_popup_${finalStorageKey}`, Date.now().toString());
                }
            } catch {
                // ignore
            }
        }
        setInternalShow(false);
        onClose?.();
    };

    if (!finalTitle && !children) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleDismiss}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        aria-hidden="true"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`relative z-10 flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden ${
                            finalImage
                                ? 'w-auto max-w-[90vw] sm:max-w-md md:max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800'
                                : 'w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800'
                        }`}
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={handleDismiss}
                            aria-label="Tutup iklan"
                            className="absolute right-3.5 top-3.5 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-md"
                        >
                            <CloseIcon sx={{ fontSize: 18 }} />
                        </button>

                        {finalImage ? (
                            /* Gambar / Poster Iklan Mode */
                            <div className="flex flex-col items-center overflow-hidden">
                                {finalPrimaryAction?.href ? (
                                    <Link
                                        href={finalPrimaryAction.href}
                                        onClick={handleDismiss}
                                        className="group block w-full cursor-pointer overflow-hidden transition-opacity hover:opacity-95"
                                    >
                                        <img
                                            src={finalImage}
                                            alt={finalTitle || 'Iklan'}
                                            className="h-auto max-h-[75vh] w-full object-contain"
                                        />
                                    </Link>
                                ) : (
                                    <img
                                        src={finalImage}
                                        alt={finalTitle || 'Iklan'}
                                        className="h-auto max-h-[75vh] w-full object-contain"
                                    />
                                )}

                                {/* Bar Tombol Aksi di Bawah Poster */}
                                {finalPrimaryAction?.label && (
                                    <div className="w-full border-t border-gray-100 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-900">
                                        {finalPrimaryAction.href ? (
                                            <Link
                                                href={finalPrimaryAction.href}
                                                onClick={handleDismiss}
                                                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-center text-sm font-black text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-700"
                                            >
                                                {finalPrimaryAction.label}
                                                <ArrowForwardIcon sx={{ fontSize: 16 }} />
                                            </Link>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    finalPrimaryAction.onClick?.();
                                                    handleDismiss();
                                                }}
                                                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-center text-sm font-black text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-700"
                                            >
                                                {finalPrimaryAction.label}
                                                <ArrowForwardIcon sx={{ fontSize: 16 }} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Fallback Tanpa Gambar */
                            <div className="overflow-y-auto">
                                <div className="relative bg-gradient-to-br from-brand-600 to-indigo-800 px-6 py-8 text-white">
                                    {finalBadge && (
                                        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-black backdrop-blur-md">
                                            <CampaignIcon sx={{ fontSize: 14 }} />
                                            <span>{finalBadge}</span>
                                        </div>
                                    )}
                                    <h3 className="text-xl font-black leading-tight sm:text-2xl">{finalTitle}</h3>
                                </div>

                                <div className="space-y-4 p-6 sm:p-7">
                                    {finalDescription && (
                                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                            {finalDescription}
                                        </p>
                                    )}

                                    {children}

                                    {(finalPrimaryAction || secondaryAction) && (
                                        <div className="mt-6 flex flex-col gap-2.5 pt-2 sm:flex-row sm:items-center">
                                            {finalPrimaryAction && (
                                                finalPrimaryAction.href ? (
                                                    <Link
                                                        href={finalPrimaryAction.href}
                                                        onClick={handleDismiss}
                                                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-center text-sm font-black text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-700"
                                                    >
                                                        {finalPrimaryAction.label}
                                                        <ArrowForwardIcon sx={{ fontSize: 16 }} />
                                                    </Link>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            finalPrimaryAction.onClick?.();
                                                            handleDismiss();
                                                        }}
                                                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-center text-sm font-black text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-700"
                                                    >
                                                        {finalPrimaryAction.label}
                                                        <ArrowForwardIcon sx={{ fontSize: 16 }} />
                                                    </button>
                                                )
                                            )}

                                            {secondaryAction && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        secondaryAction.onClick?.();
                                                        handleDismiss();
                                                    }}
                                                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                                >
                                                    {secondaryAction.label || 'Nanti Saja'}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {showDoNotShowAgain && storageKey && (
                                        <div className="pt-2">
                                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300">
                                                <input
                                                    type="checkbox"
                                                    checked={dontShowAgain}
                                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
                                                />
                                                <span>Jangan tampilkan lagi hari ini</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

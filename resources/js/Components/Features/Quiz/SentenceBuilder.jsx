import React, { useMemo } from 'react';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';

const THEME_STYLES = {
    sky: {
        trayBorder: 'border-sky-300 dark:border-sky-800',
        trayBg: 'bg-sky-50/60 dark:bg-sky-950/25',
        chipSelectedBorder: 'border-sky-300 dark:border-sky-700',
        chipSelectedShadow: 'shadow-[0_2px_0_#bae6fd] dark:shadow-[0_2px_0_#0369a1]',
        badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
        poolHoverBorder: 'hover:border-sky-400 hover:bg-sky-50/40 dark:hover:border-sky-600',
    },
    amber: {
        trayBorder: 'border-amber-300 dark:border-amber-800',
        trayBg: 'bg-amber-50/60 dark:bg-amber-950/25',
        chipSelectedBorder: 'border-amber-300 dark:border-amber-700',
        chipSelectedShadow: 'shadow-[0_2px_0_#fde68a] dark:shadow-[0_2px_0_#b45309]',
        badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
        poolHoverBorder: 'hover:border-amber-400 hover:bg-amber-50/40 dark:hover:border-amber-600',
    },
    violet: {
        trayBorder: 'border-violet-300 dark:border-violet-800',
        trayBg: 'bg-violet-50/60 dark:bg-violet-950/25',
        chipSelectedBorder: 'border-violet-300 dark:border-violet-700',
        chipSelectedShadow: 'shadow-[0_2px_0_#ddd6fe] dark:shadow-[0_2px_0_#6d28d9]',
        badgeBg: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
        poolHoverBorder: 'hover:border-violet-400 hover:bg-violet-50/40 dark:hover:border-violet-600',
    },
    emerald: {
        trayBorder: 'border-emerald-300 dark:border-emerald-800',
        trayBg: 'bg-emerald-50/60 dark:bg-emerald-950/25',
        chipSelectedBorder: 'border-emerald-300 dark:border-emerald-700',
        chipSelectedShadow: 'shadow-[0_2px_0_#a7f3d0] dark:shadow-[0_2px_0_#047857]',
        badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
        poolHoverBorder: 'hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:border-emerald-600',
    },
};

export default function SentenceBuilder({
    tokens = [],
    selectedIds = [],
    onChange,
    disabled = false,
    theme = 'amber',
    placeholderText = 'Ketuk potongan kata di bawah untuk menyusun kalimat.',
    showClearButton = true,
}) {
    const selected = Array.isArray(selectedIds) ? selectedIds : [];
    const tStyle = THEME_STYLES[theme] || THEME_STYLES.amber;

    // Lookup token O(1)
    const tokenMap = useMemo(() => {
        const map = new Map();
        tokens.forEach((t) => map.set(t.id, t));
        return map;
    }, [tokens]);

    const selectedTokens = useMemo(() => {
        return selected.map((id) => tokenMap.get(id)).filter(Boolean);
    }, [selected, tokenMap]);

    const availableTokens = useMemo(() => {
        const selectedSet = new Set(selected);
        return tokens.filter((t) => !selectedSet.has(t.id));
    }, [tokens, selected]);

    const handleSelectToken = (tokenId) => {
        if (disabled) return;
        onChange([...selected, tokenId]);
    };

    const handleRemoveToken = (tokenId) => {
        if (disabled) return;
        onChange(selected.filter((id) => id !== tokenId));
    };

    const handleClearAll = () => {
        if (disabled) return;
        onChange([]);
    };

    return (
        <div className="space-y-4 w-full select-none" role="region" aria-label="Latihan Susun Kata">
            {/* Assembly Tray */}
            <div
                className={`min-h-[105px] sm:min-h-[115px] rounded-3xl border-2 border-dashed p-3.5 sm:p-4 transition-colors flex flex-col justify-center ${tStyle.trayBorder} ${tStyle.trayBg}`}
            >
                {selectedTokens.length === 0 ? (
                    <p className="text-center text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 py-3 leading-relaxed">
                        {placeholderText}
                    </p>
                ) : (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        {selectedTokens.map((token, index) => (
                            <button
                                key={`selected-${token.id}`}
                                type="button"
                                disabled={disabled}
                                onClick={() => handleRemoveToken(token.id)}
                                aria-label={`Hapus ${token.text} dari susunan`}
                                className={`group min-h-[44px] sm:min-h-[46px] inline-flex items-center gap-2 rounded-2xl border bg-white px-3 sm:px-3.5 py-1.5 sm:py-2 text-sm sm:text-base font-black text-slate-900 transition-all active:scale-95 hover:border-rose-300 hover:bg-rose-50/70 dark:bg-slate-900 dark:text-white dark:hover:border-rose-700 dark:hover:bg-rose-950/40 ${tStyle.chipSelectedBorder} ${tStyle.chipSelectedShadow}`}
                            >
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black group-hover:bg-rose-200 group-hover:text-rose-800 transition ${tStyle.badgeBg}`}>
                                    {index + 1}
                                </span>
                                <JapaneseReading
                                    japanese={token.text}
                                    reading={token.reading}
                                    forcePreferences={{ showRomaji: false, showTranslation: false }}
                                    className="items-center text-sm sm:text-base font-black font-japanese text-slate-900 dark:text-white"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Sub-bar Action */}
            {selectedTokens.length > 0 && showClearButton && !disabled && (
                <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {selectedTokens.length} dari {tokens.length} kata terpasang
                    </span>
                    <button
                        type="button"
                        onClick={handleClearAll}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                    >
                        <BackspaceOutlinedIcon sx={{ fontSize: 16 }} />
                        <span>Kosongkan susunan</span>
                    </button>
                </div>
            )}

            {/* Token Bank Pool */}
            <div className="flex min-h-[64px] sm:min-h-[70px] flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-1">
                {availableTokens.map((token) => (
                    <button
                        key={`bank-${token.id}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleSelectToken(token.id)}
                        aria-label={`Pilih kata ${token.text}`}
                        className={`min-h-[44px] sm:min-h-[46px] rounded-2xl border border-slate-200 bg-white px-3.5 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-black text-slate-900 shadow-[0_3px_0_#e2e8f0] transition-all hover:-translate-y-0.5 active:translate-y-1 active:shadow-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-[0_3px_0_#1e293b] ${tStyle.poolHoverBorder}`}
                    >
                        <JapaneseReading
                            japanese={token.text}
                            reading={token.reading}
                            forcePreferences={{ showRomaji: false, showTranslation: false }}
                            className="items-center font-japanese text-slate-900 dark:text-white"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}

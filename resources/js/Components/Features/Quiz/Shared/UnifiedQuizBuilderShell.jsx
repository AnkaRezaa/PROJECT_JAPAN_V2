import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/scrollLock';
import QuizBuilderHeader from './QuizBuilderHeader';

export default function UnifiedQuizBuilderShell({
    open = true,
    isModal = true,
    title = 'Builder Kuis',
    subtitle = '',
    categoryBadge = '',
    status = 'draft',
    savedAt = '',
    saving = false,
    hasUnsavedChanges = false,
    onBack,
    onSave,
    onToggleStatus,
    onPreview,
    onImport,
    importLabel = 'Import XLSX / CSV',
    centerContent,
    extraActions,
    tabs = [],
    activeTab,
    onTabChange,
    sidebarContent,
    children,
    extraModals,
    className = '',
    subHeader = null,
    unstyled = false,
}) {
    useScrollLock(isModal && open);

    useEffect(() => {
        if (!isModal || !open) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && onBack) {
                onBack();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModal, open, onBack]);

    if (isModal && (!open || typeof document === 'undefined')) {
        return null;
    }

    const content = (
        <div
            role={isModal ? 'dialog' : 'region'}
            aria-modal={isModal ? 'true' : undefined}
            aria-label={title}
            className={`flex flex-col bg-[#f8faf9] text-gray-900 dark:bg-gray-950 dark:text-gray-100 ${
                isModal ? 'fixed inset-0 z-[140]' : 'min-h-screen'
            } ${className}`}
        >
            {/* 1. Header Bar Universal */}
            <QuizBuilderHeader
                title={title}
                subtitle={subtitle}
                categoryBadge={categoryBadge}
                status={status}
                savedAt={savedAt}
                saving={saving}
                hasUnsavedChanges={hasUnsavedChanges}
                onBack={onBack}
                onSave={onSave}
                onToggleStatus={onToggleStatus}
                onPreview={onPreview}
                onImport={onImport}
                importLabel={importLabel}
                centerContent={centerContent}
                extraActions={extraActions}
            />

            {/* Sub Header / Action Strip (Opsional) */}
            {subHeader}

            {/* 2. Top Navigation Tabs (Jika Tersedia) */}
            {tabs.length > 0 && (
                <div className="shrink-0 border-b border-gray-200 bg-white px-3 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
                    <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto sm:gap-6">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => onTabChange?.(tab.id)}
                                    className={`flex items-center gap-2 border-b-2 py-3 text-xs font-black transition ${
                                        isActive
                                            ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                >
                                    {Icon && <Icon sx={{ fontSize: 18 }} />}
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                            {tab.count}
                                        </span>
                                    )}
                                    {tab.badge && (
                                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. Main Workspace Area */}
            <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
                <div className="mx-auto max-w-7xl">
                    {sidebarContent ? (
                        <div className="grid gap-6 lg:grid-cols-12 items-start">
                            {/* Kolom Kiri: Sidebar Navigator (4 cols) */}
                            <div className="lg:col-span-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                                {sidebarContent}
                            </div>

                            {/* Kolom Kanan: Canvas Editor In-Place (8 cols) */}
                            <div className="lg:col-span-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                                {children}
                            </div>
                        </div>
                    ) : unstyled ? (
                        children
                    ) : (
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                            {children}
                        </div>
                    )}
                </div>
            </main>

            {/* 4. Extra Modals / Dialog Helpers (Jika Ada) */}
            {extraModals}
        </div>
    );

    return isModal ? createPortal(content, document.body) : content;
}

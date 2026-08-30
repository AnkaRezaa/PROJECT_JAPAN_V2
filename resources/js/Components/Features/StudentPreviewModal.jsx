import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import LessonArticle from '@/Components/Features/Lesson/LessonArticle';

const normalizeDocumentPath = (path) => {
    if (!path) return null;

    return String(path)
        .replaceAll('\\', '/')
        .replaceAll('%2F', '/')
        .replace(/^.*\/lesson-documents-download\//, '')
        .replace(/^.*\/lesson-documents\//, '')
        .replace(/^\/storage\//, '');
};

const buildLessonDocumentUrls = (lesson) => {
    const normalizedPath = normalizeDocumentPath(lesson?.file_url);

    if (!normalizedPath || /^https?:\/\//i.test(normalizedPath)) {
        return lesson;
    }

    return {
        ...lesson,
        file_preview_url: lesson.file_preview_url || `/lesson-documents/${normalizedPath}`,
        file_download_url: lesson.file_download_url || `/lesson-documents-download/${normalizedPath}`,
    };
};

export default function StudentPreviewModal({ show, onClose, lessons, moduleTitle }) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm lg:p-8">
            <div className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] border border-white/20 bg-[#F8F9FA] shadow-2xl dark:border-gray-800 dark:bg-gray-950">
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 dark:border-gray-800 dark:bg-gray-900 sm:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-full bg-brand-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                            Student Preview Mode
                        </div>
                        <span className="hidden text-gray-300 dark:text-gray-700 sm:inline">/</span>
                        <h3 className="truncate text-sm font-bold text-gray-900 dark:text-white">{moduleTitle}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                        <CloseIcon />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10">
                    <div className="mx-auto max-w-4xl space-y-8">
                        {lessons.map((lesson, index) => {
                            const previewLesson = buildLessonDocumentUrls(lesson);

                            return (
                                <LessonArticle
                                    key={lesson._clientKey || lesson.id || index}
                                    lesson={previewLesson}
                                    moduleTitle={moduleTitle}
                                    progressLabel={`Blok ${index + 1} dari ${lessons.length}`}
                                    previewMode
                                />
                            );
                        })}

                        <div className="pb-12 text-center">
                            <button
                                onClick={onClose}
                                className="h-12 rounded-xl bg-gray-900 px-8 font-bold text-white shadow-xl shadow-gray-900/20 transition-all hover:bg-black active:scale-95 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                            >
                                Tutup Preview & Kembali Edit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

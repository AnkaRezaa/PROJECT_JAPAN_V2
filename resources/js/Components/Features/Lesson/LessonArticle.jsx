import React, { useMemo, useState } from 'react';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import SchoolIcon from '@mui/icons-material/School';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import SlideshowIcon from '@mui/icons-material/Slideshow';

const normalizeDocumentUrl = (url) => {
    if (!url) return null;

    return String(url)
        .replaceAll('%2F', '/')
        .replaceAll('%5C', '/')
        .replaceAll('\\', '/');
};

const getPublicFileUrl = (lesson) => {
    if (lesson?.file_preview_url) return normalizeDocumentUrl(lesson.file_preview_url);
    if (lesson?.file_uploaded) return URL.createObjectURL(lesson.file_uploaded);
    if (!lesson?.file_url) return null;
    if (/^https?:\/\//i.test(lesson.file_url)) return lesson.file_url;
    if (lesson.file_url.startsWith('/storage/')) return `/lesson-documents/${normalizeDocumentUrl(lesson.file_url.replace('/storage/', ''))}`;

    return `/lesson-documents/${normalizeDocumentUrl(lesson.file_url)}`;
};

const getDownloadFileUrl = (lesson, fileUrl) => {
    if (lesson?.file_download_url) return normalizeDocumentUrl(lesson.file_download_url);
    if (lesson?.file_uploaded || lesson?.file_preview_url) return fileUrl;
    if (!lesson?.file_url) return fileUrl;
    if (/^https?:\/\//i.test(lesson.file_url)) return fileUrl;
    if (lesson.file_url.startsWith('/storage/')) return `/lesson-documents-download/${normalizeDocumentUrl(lesson.file_url.replace('/storage/', ''))}`;

    return `/lesson-documents-download/${normalizeDocumentUrl(lesson.file_url)}`;
};

const getExtension = (lesson, fileUrl) => {
    const source = lesson?.file_uploaded?.name || lesson?.file_url || fileUrl || '';
    return source.split('?')[0].split('.').pop()?.toLowerCase() || '';
};

const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return match && match[2]?.length === 11 ? `https://www.youtube.com/embed/${match[2]}` : url;
};

export default function LessonArticle({
    lesson,
    moduleTitle,
    isCompleted = false,
    progressLabel = null,
    previewMode = false,
}) {
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const fileUrl = useMemo(() => getPublicFileUrl(lesson), [lesson]);
    const downloadUrl = useMemo(() => getDownloadFileUrl(lesson, fileUrl), [lesson, fileUrl]);
    const extension = getExtension(lesson, fileUrl);
    const isPdf = extension === 'pdf';
    const isDoc = ['doc', 'docx'].includes(extension);
    const isPresentation = ['ppt', 'pptx'].includes(extension);
    const embedUrl = getYouTubeEmbedUrl(lesson?.video_url);
    const documentLabel = isPdf ? 'PDF Viewer' : isPresentation ? 'PowerPoint Viewer' : isDoc ? 'Dokumen Word' : 'Lampiran Materi';

    return (
        <article className="overflow-hidden rounded-[2rem] border border-brand-200 bg-brand-50/50 shadow-md dark:border-gray-800 dark:bg-gray-900">
            <style>{`
                .jl-ppt-slide {
                    border: 1px solid #fed7aa;
                    border-radius: 1.25rem;
                    padding: 1.25rem;
                    margin: 1rem 0;
                    background: #fff7ed;
                }
                .dark .jl-ppt-slide {
                    border-color: #374151;
                    background: rgba(17, 24, 39, 0.55);
                }
            `}</style>
            <header className="relative overflow-hidden border-b border-brand-300 bg-gradient-to-br from-brand-100 to-brand-400 px-6 py-10 text-ink-900 dark:border-gray-800 dark:from-gray-800 dark:to-gray-900 dark:text-white sm:px-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.2),_transparent_34%),linear-gradient(135deg,_rgba(255,255,255,0.08),_transparent)]" />
                <div className="relative">
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-brand-50">
                            {previewMode ? 'Student Preview' : 'Lesson Article'}
                        </span>
                        {moduleTitle && (
                            <span className="rounded-full bg-brand-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-brand-100">
                                {moduleTitle}
                            </span>
                        )}
                        {isCompleted && (
                            <span className="rounded-full bg-green-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-green-100">
                                Selesai
                            </span>
                        )}
                    </div>
                    <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-5xl">{lesson?.title || 'Untitled Lesson'}</h1>
                    <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-brand-50">
                        {lesson?.duration_minutes && <span>{lesson.duration_minutes} menit baca</span>}
                        {lesson?.type && <span>{lesson.type}</span>}
                        {progressLabel && <span>{progressLabel}</span>}
                    </div>
                </div>
            </header>

            {lesson?.video_url && (
                <section className="border-b border-gray-100 bg-black dark:border-gray-800">
                    <div className="aspect-video w-full">
                        {embedUrl ? (
                            <iframe
                                src={embedUrl}
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={lesson.title}
                            />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3 text-white/70">
                                <PlayCircleFilledIcon sx={{ fontSize: 64 }} />
                                <p className="text-sm font-bold">URL video belum valid.</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <section className="px-6 py-8 sm:px-10 sm:py-10">
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
                        <SchoolIcon />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-700 dark:text-brand-400">Materi Pelajaran</p>
                        <h2 className="text-xl font-black text-brand-950 dark:text-brand-50">Konten Utama</h2>
                    </div>
                </div>

                {lesson?.content ? (
                    <div
                        className="prose prose-emerald max-w-none text-brand-950 prose-headings:font-black prose-headings:text-brand-900 prose-p:leading-8 prose-a:text-brand-700 prose-strong:text-brand-900 dark:prose-invert dark:text-gray-200 dark:prose-headings:text-white dark:prose-strong:text-white"
                        dangerouslySetInnerHTML={{ __html: lesson.content }}
                    />
                ) : (
                    <p className="rounded-2xl border border-dashed border-brand-300 bg-brand-100 p-6 text-sm font-bold italic text-brand-800 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-500">
                        Konten teks belum tersedia.
                    </p>
                )}
            </section>

            {(fileUrl || lesson?.type === 'file') && (
                <section className="border-t border-brand-200 bg-brand-100/50 px-6 py-8 dark:border-gray-800 dark:bg-gray-950/40 sm:px-10">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                {isPdf ? <PictureAsPdfIcon /> : isPresentation ? <SlideshowIcon /> : <InsertDriveFileIcon />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-700 dark:text-gray-400">Dokumen Pendukung</p>
                                <h3 className="font-black text-brand-950 dark:text-white">{documentLabel}</h3>
                            </div>
                        </div>
                        {fileUrl && (
                            <div className="flex flex-wrap gap-2">
                            {isPdf && (
                                <button
                                    type="button"
                                    onClick={() => setShowPdfViewer(true)}
                                    className="inline-flex h-11 items-center justify-center rounded-xl bg-gray-900 px-5 text-sm font-black text-white shadow-lg shadow-gray-900/20 transition-colors hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                                >
                                    Lihat Fullscreen
                                </button>
                            )}
                            <a
                                href={downloadUrl || fileUrl}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--toku-primary)] px-5 text-sm font-black text-white shadow-md transition-colors hover:bg-[var(--toku-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--toku-focus)]"
                            >
                                <DownloadIcon sx={{ fontSize: 18 }} />
                                Download
                            </a>
                            </div>
                        )}
                    </div>

                    {fileUrl && isPdf ? (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center shadow-sm dark:border-blue-900/40 dark:bg-gray-900">
                            <PictureAsPdfIcon className="text-blue-700 dark:text-blue-300" sx={{ fontSize: 56 }} />
                            <h4 className="mt-3 text-lg font-black text-gray-950 dark:text-white">PDF siap dibaca</h4>
                            <p className="mx-auto mt-2 max-w-md text-sm font-medium text-blue-800 dark:text-gray-400">
                                Buka viewer fullscreen agar fokus membaca konten. Tombol download tetap tersedia untuk menyimpan file.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowPdfViewer(true)}
                                className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-gray-900 px-6 text-sm font-black text-white shadow-lg shadow-gray-900/20 transition-colors hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                            >
                                Buka PDF Fullscreen
                            </button>
                        </div>
                    ) : fileUrl ? (
                        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                            {isPresentation ? <SlideshowIcon className="text-blue-600" sx={{ fontSize: 52 }} /> : <InsertDriveFileIcon className="text-blue-600" sx={{ fontSize: 52 }} />}
                            <h4 className="mt-3 text-lg font-black text-brand-950 dark:text-white">Preview inline tidak tersedia untuk format ini.</h4>
                            <p className="mt-2 text-sm font-medium text-brand-800 dark:text-gray-400">
                                DOCX/PPTX yang di-import akan tampil sebagai konten teks di atas. Gunakan tombol download untuk menyimpan file asli.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-8 text-center text-sm font-bold text-brand-800 dark:border-gray-700 dark:bg-gray-900">
                            Belum ada dokumen yang diupload.
                        </div>
                    )}
                </section>
            )}

            {showPdfViewer && fileUrl && isPdf && (
                <div className="fixed inset-0 z-[120] flex flex-col bg-gray-950">
                    <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-gray-950 px-4 text-white">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black">{lesson?.title || 'PDF Viewer'}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Fullscreen PDF Viewer</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={downloadUrl || fileUrl}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="hidden h-9 items-center rounded-lg bg-white px-4 text-xs font-black text-gray-950 sm:inline-flex"
                            >
                                Download
                            </a>
                            <button
                                type="button"
                                onClick={() => setShowPdfViewer(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
                            >
                                <CloseIcon sx={{ fontSize: 20 }} />
                            </button>
                        </div>
                    </div>
                    <iframe src={fileUrl} title={lesson?.title || 'PDF Viewer'} className="h-full w-full flex-1 bg-white" />
                </div>
            )}

            {lesson?.audio_url && (
                <section className="border-t border-gray-100 px-6 py-8 dark:border-gray-800 sm:px-10">
                    <div className="rounded-2xl bg-rose-50 p-6 dark:bg-rose-900/20">
                        <div className="mb-4 flex items-center gap-3 text-rose-700 dark:text-rose-300">
                            <VolumeUpIcon />
                            <h3 className="font-black">Audio Lesson</h3>
                        </div>
                        <audio controls className="w-full">
                            <source src={lesson.audio_url} type="audio/mpeg" />
                            Browser Anda tidak mendukung pemutar audio.
                        </audio>
                    </div>
                </section>
            )}
        </article>
    );
}

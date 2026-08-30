import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LinkIcon from '@mui/icons-material/Link';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';

const toolbarButton = (active = false) => `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
    active
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
}`;

export default function NewsEditor({ value, onChange, uploadImageUrl }) {
    const imageInputRef = useRef(null);
    const [imageFile, setImageFile] = useState(null);
    const [imageAlt, setImageAlt] = useState('');
    const [imageCaption, setImageCaption] = useState('');
    const [isImagePanelOpen, setIsImagePanelOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
            }),
            Image.configure({ allowBase64: false }),
            Placeholder.configure({
                placeholder: 'Tulis isi berita. Gunakan heading untuk membagi artikel menjadi bagian yang mudah dibaca.',
            }),
        ],
        content: value || '',
        editorProps: {
            attributes: {
                class: 'prose prose-gray max-w-none px-4 py-5 text-sm leading-7 outline-none dark:prose-invert sm:px-6 sm:py-6',
            },
        },
        onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '', false);
        }
    }, [editor, value]);

    const setLink = () => {
        if (!editor) return;

        const previousUrl = editor.getAttributes('link').href || 'https://';
        const url = window.prompt('Masukkan URL tautan', previousUrl);

        if (url === null) return;
        if (url === '') {
            editor.chain().focus().unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const uploadImage = async () => {
        if (!editor || !imageFile || !uploadImageUrl || !imageAlt.trim()) return;

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            const response = await window.axios.post(uploadImageUrl, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data?.url) {
                editor.chain().focus().setImage({ src: response.data.url, alt: imageAlt.trim() }).run();

                if (imageCaption.trim()) {
                    editor.chain().focus().insertContent({
                        type: 'paragraph',
                        content: [{
                            type: 'text',
                            marks: [{ type: 'italic' }],
                            text: imageCaption.trim(),
                        }],
                    }).run();
                }
            }

            setImageFile(null);
            setImageAlt('');
            setImageCaption('');
            setIsImagePanelOpen(false);
        } finally {
            setIsUploading(false);
        }
    };

    if (!editor) {
        return <div className="min-h-[420px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />;
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
            <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50 px-2 py-2 dark:border-gray-700 dark:bg-gray-900">
                <select
                    value={editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
                    onChange={(event) => {
                        const value = event.target.value;
                        if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                        else if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
                        else editor.chain().focus().setParagraph().run();
                    }}
                    aria-label="Format paragraf"
                    className="mr-1 h-10 shrink-0 rounded-lg border-0 bg-transparent px-2 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-red-500 dark:text-gray-200"
                >
                    <option value="p">Paragraf</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                </select>
                <button type="button" aria-label="Tebal" className={toolbarButton(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}><FormatBoldIcon sx={{ fontSize: 20 }} /></button>
                <button type="button" aria-label="Miring" className={toolbarButton(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}><FormatItalicIcon sx={{ fontSize: 20 }} /></button>
                <button type="button" aria-label="Daftar poin" className={toolbarButton(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}><FormatListBulletedIcon sx={{ fontSize: 21 }} /></button>
                <button type="button" aria-label="Daftar bernomor" className={toolbarButton(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><FormatListNumberedIcon sx={{ fontSize: 21 }} /></button>
                <button type="button" aria-label="Kutipan" className={toolbarButton(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><FormatQuoteIcon sx={{ fontSize: 21 }} /></button>
                <button type="button" aria-label="Tautan" className={toolbarButton(editor.isActive('link'))} onClick={setLink}><LinkIcon sx={{ fontSize: 19 }} /></button>
                <button type="button" aria-label="Gambar" className={toolbarButton(isImagePanelOpen)} onClick={() => setIsImagePanelOpen((open) => !open)}><ImageOutlinedIcon sx={{ fontSize: 20 }} /></button>
                <button type="button" aria-label="Undo" className={toolbarButton()} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><UndoIcon sx={{ fontSize: 20 }} /></button>
                <button type="button" aria-label="Redo" className={toolbarButton()} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><RedoIcon sx={{ fontSize: 20 }} /></button>
            </div>

            {isImagePanelOpen && (
                <div className="grid gap-3 border-b border-gray-200 bg-brand-50/60 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end dark:border-gray-700 dark:bg-brand-950/20">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">
                        Gambar
                        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} className="mt-1 block w-full text-xs" />
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">Alt text<input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Deskripsikan isi gambar" className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900" /></label>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">Caption opsional<input value={imageCaption} onChange={(event) => setImageCaption(event.target.value)} placeholder="Keterangan gambar" className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900" /></label>
                    </div>
                    <button type="button" disabled={!imageFile || !imageAlt.trim() || isUploading} onClick={uploadImage} className="min-h-11 rounded-lg bg-[var(--toku-primary)] px-4 text-sm font-black text-white transition hover:bg-[var(--toku-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--toku-focus)] disabled:opacity-50">{isUploading ? 'Mengunggah...' : 'Sisipkan'}</button>
                </div>
            )}

            <EditorContent editor={editor} />
        </div>
    );
}

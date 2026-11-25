import React from 'react';
import { useForm } from '@inertiajs/react';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import FormField, { formInputClass } from '@/Components/UI/FormField';
import { socialChannels } from '@/Components/Marketing/SocialLinks';

export default function SocialLinksForm({ links = {}, instagramFeed = [] }) {
    const form = useForm({
        links: Object.fromEntries(socialChannels.map(({ key }) => [key, links[key] || ''])),
        instagram_feed: instagramFeed.map((item) => item.url).join('\n'),
    });
    const submit = (event) => {
        event.preventDefault();
        if (form.processing) return;
        form.put(route('superadmin.system.social-links.update'), { preserveScroll: true });
    };
    return <section aria-labelledby="social-links-title" className="border-y border-gray-200 py-6 dark:border-gray-800">
        <h2 id="social-links-title" className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Medsos</h2>
        <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                {socialChannels.map(({ key, label }) => (
                    <FormField key={key} label={label} tooltip="Kosongkan untuk menyembunyikan." error={form.errors[`links.${key}`]}>
                        <input type="url" aria-label={label} value={form.data.links[key]} maxLength={500} placeholder="https://"
                            disabled={form.processing} autoComplete="off"
                            onChange={(event) => {
                                form.setData('links', { ...form.data.links, [key]: event.target.value });
                                form.clearErrors(`links.${key}`);
                            }} className={formInputClass(Boolean(form.errors[`links.${key}`]))} />
                    </FormField>
                ))}
            </div>
            {form.errors.links && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{form.errors.links}</p>}
            <FormField
                label="Feed Postingan Instagram (@toku.up)"
                tooltip="Tempel link postingan atau reels Instagram (1 link per baris, maksimal 100) untuk ditampilkan di halaman depan."
                error={form.errors.instagram_feed}
            >
                <textarea
                    rows={6}
                    value={form.data.instagram_feed}
                    disabled={form.processing}
                    placeholder={'https://www.instagram.com/p/...\nhttps://www.instagram.com/reel/...'}
                    onChange={(event) => {
                        form.setData('instagram_feed', event.target.value);
                        form.clearErrors('instagram_feed');
                    }}
                    className={`${formInputClass(Boolean(form.errors.instagram_feed))} h-auto py-2.5`}
                />
            </FormField>
            <button type="submit" disabled={form.processing} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50">
                <SaveOutlinedIcon sx={{ fontSize: 18 }} />{form.processing ? 'Menyimpan...' : 'Simpan'}
            </button>
        </form>
    </section>;
}

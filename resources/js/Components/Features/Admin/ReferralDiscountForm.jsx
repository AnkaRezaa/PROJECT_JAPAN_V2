import React from 'react';
import { useForm } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import FormField, { formInputClass } from '@/Components/UI/FormField';

export default function ReferralDiscountForm({ settings = {} }) {
    const form = useForm({
        enabled: settings.enabled ?? true,
        inviter_percent_per_referral: settings.inviter_percent_per_referral ?? 5,
        invitee_percent: settings.invitee_percent ?? 5,
        max_discount_percent: settings.max_discount_percent ?? 50,
        min_payable_amount: settings.min_payable_amount ?? 10000,
    });

    const submit = (event) => {
        event.preventDefault();
        form.put(route('superadmin.system.referral-discount.update'), { preserveScroll: true });
    };

    return (
        <Card>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">Referral & Promo</p>
                    <h2 className="mt-1 text-lg font-black text-gray-900 dark:text-white">Diskon Referral Checkout</h2>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Atur persentase potongan harga untuk pengundang (termasuk beta tester) dan akun baru yang diundang. Berlaku untuk 1 transaksi pertama.
                    </p>
                </div>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold text-gray-800 dark:text-gray-100">
                    <input
                        type="checkbox"
                        role="switch"
                        aria-label="Aktifkan diskon referral"
                        checked={Boolean(form.data.enabled)}
                        onChange={(e) => form.setData('enabled', e.target.checked)}
                        className="peer sr-only"
                    />
                    <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-gray-300 transition-colors after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-emerald-600 peer-checked:after:translate-x-5 dark:bg-gray-600" />
                    <span>{form.data.enabled ? 'Aktif' : 'Nonaktif'}</span>
                </label>
            </div>

            <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField label="Pengundang / Orang (%)" error={form.errors.inviter_percent_per_referral}>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.data.inviter_percent_per_referral}
                        onChange={(e) => form.setData('inviter_percent_per_referral', Number(e.target.value))}
                        className={formInputClass(Boolean(form.errors.inviter_percent_per_referral))}
                    />
                </FormField>
                <FormField label="Akun Diundang (%)" error={form.errors.invitee_percent}>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.data.invitee_percent}
                        onChange={(e) => form.setData('invitee_percent', Number(e.target.value))}
                        className={formInputClass(Boolean(form.errors.invitee_percent))}
                    />
                </FormField>
                <FormField label="Batas Maksimal (%)" error={form.errors.max_discount_percent}>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.data.max_discount_percent}
                        onChange={(e) => form.setData('max_discount_percent', Number(e.target.value))}
                        className={formInputClass(Boolean(form.errors.max_discount_percent))}
                    />
                </FormField>
                <FormField label="Minimum Bayar (Rp)" error={form.errors.min_payable_amount}>
                    <input
                        type="number"
                        min="0"
                        step="1000"
                        value={form.data.min_payable_amount}
                        onChange={(e) => form.setData('min_payable_amount', Number(e.target.value))}
                        className={formInputClass(Boolean(form.errors.min_payable_amount))}
                    />
                </FormField>
                <div className="flex justify-end sm:col-span-2 lg:col-span-4">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="min-h-11 rounded-xl bg-brand-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
                    >
                        {form.processing ? 'Menyimpan...' : 'Simpan Diskon Referral'}
                    </button>
                </div>
            </form>
        </Card>
    );
}

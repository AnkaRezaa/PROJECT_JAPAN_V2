import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import StatCard from '@/Components/Features/Dashboard/StatCard';
import ChartCard from '@/Components/Features/Dashboard/ChartCard';
import ChartPeriodSelect from '@/Components/Features/Dashboard/ChartPeriodSelect';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import AdminDialog from '@/Components/UI/AdminDialog';
import SearchableSelect from '@/Components/UI/SearchableSelect';
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartEmpty, ChartTooltip, ChartTooltipContent } from '@/Components/UI/Chart';

const emptyPlan = {
    name: '',
    slug: '',
    description: '',
    price: '',
    duration_days: 30,
    scope_type: 'program',
    program_pembelajaran_id: '',
    features: '',
    is_active: true,
};

const emptyTransaction = {
    user_id: '',
    payment_plan_id: '',
    kloter_belajar_id: '',
    amount: '',
    payment_method: 'manual',
    status: 'pending',
    notes: '',
    proof_of_payment: null,
};

const emptyAccessKey = {
    name: '',
    payment_plan_id: '',
    duration_days: 30,
    max_uses: 1,
    scope_type: 'program',
    program_pembelajaran_id: '',
    expires_at: '',
    notes: '',
};

const accessStateMeta = {
    active: { label: 'Akses aktif', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
    pending_approval: { label: 'Menunggu mentor', className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300' },
    refund_required: { label: 'Perlu refund', className: 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' },
    payment_pending: { label: 'Belum dibayar', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' },
    inactive: { label: 'Tidak aktif', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

export default function Pemasukan({
    stats = [],
    transactions = { data: [], links: [] },
    plans = [],
    users = [],
    programs = [],
    kloters = [],
    accessKeys = [],
    filters = {},
    revenueSeries = [],
    transactionStatusDistribution = [],
    paymentMethodDistribution = [],
}) {
    const [showPlanForm, setShowPlanForm] = useState(false);
    const [showTransactionForm, setShowTransactionForm] = useState(false);
    const [showAccessKeyForm, setShowAccessKeyForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [rejectionNotes, setRejectionNotes] = useState('');
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    const planForm = useForm({ ...emptyPlan });
    const transactionForm = useForm({ ...emptyTransaction });
    const accessKeyForm = useForm({ ...emptyAccessKey });
    const filterForm = useForm({
        search: filters.search || '',
        status: filters.status || 'all',
        payment_method: filters.payment_method || 'all',
    });

    const items = transactions?.data || [];
    const availablePlans = plans.filter((plan) => plan.is_active && !plan.is_legacy);
    const accessKeyPlans = availablePlans.filter((plan) => plan.scope_type === 'program');
    const selectedTransactionPlan = plans.find((plan) => String(plan.id) === String(transactionForm.data.payment_plan_id));
    const selectedTransactionKloters = kloters.filter((kloter) => String(kloter.program_id) === String(selectedTransactionPlan?.program_pembelajaran_id));

    const submitFilters = (e) => {
        e.preventDefault();
        router.get(route('superadmin.payments'), filterForm.data, { preserveState: true, preserveScroll: true });
    };

    const submitPlan = (e) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setShowPlanForm(false);
                setEditingPlan(null);
                planForm.reset();
            },
        };

        if (editingPlan) {
            planForm.put(route('superadmin.payments.plans.update', editingPlan.id), options);
            return;
        }

        planForm.post(route('superadmin.payments.plans.store'), options);
    };

    const openPlanCreateForm = () => {
        setEditingPlan(null);
        planForm.reset();
        setShowPlanForm(true);
    };

    const openPlanEditForm = (plan) => {
        setEditingPlan(plan);
        planForm.setData({
            name: plan.name || '',
            slug: plan.slug || '',
            description: plan.description || '',
            price: plan.price ?? '',
            duration_days: plan.duration_days || 30,
            scope_type: plan.scope_type === 'global' ? 'program' : plan.scope_type,
            program_pembelajaran_id: plan.program_pembelajaran_id || '',
            features: plan.features || '',
            is_active: Boolean(plan.is_active),
        });
        setShowPlanForm(true);
    };

    const closePlanForm = () => {
        setShowPlanForm(false);
        setEditingPlan(null);
        planForm.reset();
    };

    const submitTransaction = (e) => {
        e.preventDefault();
        transactionForm.post(route('superadmin.payments.transactions.store'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setShowTransactionForm(false);
                transactionForm.reset();
            },
        });
    };

    const submitAccessKey = (e) => {
        e.preventDefault();
        accessKeyForm.post(route('superadmin.payments.access-keys.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setShowAccessKeyForm(false);
                accessKeyForm.reset();
            },
        });
    };

    const approve = (transactionId) => {
        router.patch(route('superadmin.payments.transactions.approve', transactionId), {
            notes: approvalNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => setApprovalNotes(''),
            onFinish: closeConfirm,
        });
    };

    const reject = () => {
        router.patch(route('superadmin.payments.transactions.reject', rejectTarget.id), {
            notes: rejectionNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setRejectTarget(null);
                setRejectionNotes('');
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Superadmin - Pemasukan" />

            <div className="mx-auto w-full max-w-[1600px] space-y-5 px-3 py-4 sm:px-5 sm:py-6 lg:px-6 2xl:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">Superadmin</p>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Pemasukan</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            Monitoring transaksi manual dan Midtrans, approve/reject, access key, dan akses belajar.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">
                        <button onClick={openPlanCreateForm} className="min-h-11 w-full rounded-xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-700 dark:border-gray-700 dark:text-gray-300 xl:w-auto">
                            Buat Plan
                        </button>
                        <button onClick={() => setShowAccessKeyForm(true)} className="min-h-11 w-full rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-black text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300 xl:w-auto">
                            Buat Access Key
                        </button>
                        <button onClick={() => setShowTransactionForm(true)} className="min-h-11 w-full rounded-xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-brand-500/20 hover:bg-brand-700 sm:col-span-2 xl:col-auto xl:w-auto">
                            Buat Transaksi
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                    {stats.map((item) => <StatCard key={item.title} {...item} />)}
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                    <ChartCard className="min-w-0 p-4 sm:p-6" title="Pendapatan Berhasil" subtitle="Hanya transaksi berstatus success" action={<ChartPeriodSelect routeName="superadmin.payments" filters={filters} />}>
                        {revenueSeries.some((item) => item.revenue > 0) ? (
                            <ChartContainer config={{ revenue: { label: 'Pendapatan', theme: { light: '#15803d', dark: '#4ade80' } }, transactions: { label: 'Transaksi', theme: { light: '#1d4ed8', dark: '#60a5fa' } } }}>
                                <AreaChart data={revenueSeries} margin={{ top: 8, right: 4, left: 8, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revenue-gradient" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} className="fill-gray-400 text-xs" />
                                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${Number(value).toLocaleString('id-ID')}`} width={78} className="fill-gray-400 text-xs" />
                                    <ChartTooltip content={<ChartTooltipContent valueFormatter={(value, entry) => entry.dataKey === 'revenue' ? `Rp${Number(value).toLocaleString('id-ID')}` : Number(value).toLocaleString('id-ID')} />} />
                                    <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke="var(--color-revenue)" fill="url(#revenue-gradient)" strokeWidth={2.5} />
                                </AreaChart>
                            </ChartContainer>
                        ) : <ChartEmpty>Belum ada pendapatan berhasil pada periode ini.</ChartEmpty>}
                    </ChartCard>

                    <ChartCard className="min-w-0 p-4 sm:p-6" title="Status Transaksi" subtitle="Semua transaksi tercatat">
                        {transactionStatusDistribution.some((item) => item.value > 0) ? (
                            <ChartContainer config={{ success: { color: '#10b981' }, pending: { color: '#f59e0b' }, failed: { color: '#dc2626' } }}>
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                                    <Pie data={transactionStatusDistribution} dataKey="value" nameKey="label" innerRadius={55} outerRadius={84} paddingAngle={3}>
                                        {transactionStatusDistribution.map((item) => <Cell key={item.label} fill={item.fill} />)}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                        ) : <ChartEmpty>Belum ada transaksi.</ChartEmpty>}
                    </ChartCard>
                </div>

                <ChartCard className="min-w-0 p-4 sm:p-6" title="Metode Pembayaran" subtitle="Metode yang paling sering dipakai">
                    {paymentMethodDistribution.some((item) => item.value > 0) ? (
                        <ChartContainer config={Object.fromEntries(paymentMethodDistribution.map((item) => [item.chart_key, { color: item.color }]))}>
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                                <Pie data={paymentMethodDistribution} dataKey="value" nameKey="label" innerRadius={52} outerRadius={80} paddingAngle={3}>
                                    {paymentMethodDistribution.map((item) => <Cell key={item.label} fill={item.fill} />)}
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                    ) : <ChartEmpty>Belum ada metode pembayaran yang tercatat.</ChartEmpty>}
                </ChartCard>

                <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
                    <Card className="min-w-0 p-4 sm:p-6">
                        <form onSubmit={submitFilters} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_160px_110px]">
                            <input
                                value={filterForm.data.search}
                                onChange={(e) => filterForm.setData('search', e.target.value)}
                                placeholder="Cari transaksi atau user..."
                                className="h-11 min-w-0 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                            <select value={filterForm.data.status} onChange={(e) => filterForm.setData('status', e.target.value)} className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-900 dark:text-white">
                                <option value="all">Semua status</option>
                                <option value="pending">Pending</option>
                                <option value="success">Success</option>
                                <option value="failed">Failed</option>
                                <option value="expired">Expired</option>
                            </select>
                            <select value={filterForm.data.payment_method} onChange={(e) => filterForm.setData('payment_method', e.target.value)} className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-900 dark:text-white">
                                <option value="all">Semua metode</option>
                                <option value="manual">Manual</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="e-wallet">E-Wallet</option>
                                <option value="credit_card">Credit Card</option>
                                <option value="midtrans">Midtrans</option>
                            </select>
                            <button className="min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-black text-white dark:bg-white dark:text-gray-900">Filter</button>
                        </form>

                        <div className="mt-5 overflow-x-auto">
                            <table className="min-w-[900px] w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3">Kode</th>
                                        <th className="px-4 py-3">User</th>
                                        <th className="px-4 py-3">Plan</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3">Method</th>
                                        <th className="px-4 py-3">Pembayaran</th>
                                        <th className="px-4 py-3">Akses</th>
                                        <th className="px-4 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="px-4 py-10 text-center text-sm font-bold text-gray-400">Belum ada transaksi.</td>
                                        </tr>
                                    )}
                                    {items.map((item) => (
                                        <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
                                            <td className="px-4 py-4 font-bold text-gray-900 dark:text-white">{item.transaction_code}</td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-gray-900 dark:text-white">{item.user_name}</div>
                                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.user_email}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-gray-700 dark:text-gray-200">{item.plan_name}</div>
                                                <div className="mt-1 text-xs font-semibold text-gray-400">{item.scope_label}</div>
                                            </td>
                                            <td className="px-4 py-4 font-bold text-gray-900 dark:text-white">{item.amount_formatted}</td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{item.payment_method}</td>
                                            <td className="px-4 py-4">
                                                <span className={`rounded-full px-3 py-1 text-xs font-black ${item.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : item.status === 'pending' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`rounded-full px-3 py-1 text-xs font-black ${accessStateMeta[item.access_state]?.className || accessStateMeta.inactive.className}`}>
                                                    {accessStateMeta[item.access_state]?.label || accessStateMeta.inactive.label}
                                                </span>
                                                {item.kloter_name && <div className="mt-1 max-w-32 truncate text-[11px] font-semibold text-gray-400">{item.kloter_name}</div>}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    {item.proof_url && (
                                                        <a href={item.proof_url} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-black text-gray-700 dark:text-gray-300">
                                                            Bukti
                                                        </a>
                                                    )}
                                                    {item.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => openConfirm({
                                                                    variant: 'success',
                                                                    title: 'Approve Transaksi?',
                                                                    message: 'Transaksi akan disetujui dan akses belajar user akan diproses.',
                                                                    confirmLabel: 'Iya, Approve',
                                                                    details: [
                                                                        { label: 'Kode', value: item.transaction_code },
                                                                        { label: 'User', value: item.user_name },
                                                                        { label: 'Nominal', value: item.amount_formatted },
                                                                    ],
                                                                    onConfirm: () => approve(item.id),
                                                                })}
                                                                className="rounded-lg border border-emerald-100 dark:border-emerald-900/30 px-3 py-2 text-xs font-black text-emerald-700 dark:text-emerald-400"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button onClick={() => setRejectTarget(item)} className="rounded-lg border border-red-100 dark:border-red-900/30 px-3 py-2 text-xs font-black text-red-600 dark:text-red-400">
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4">
                            <textarea value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} rows={2} placeholder="Catatan approval opsional" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white" />
                        </div>

                        {transactions?.links && transactions.links.length > 3 && (
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {transactions.links.map((link, index) => (
                                    <Link
                                        key={`${link.label}-${index}`}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-xl px-4 py-2 text-sm font-bold ${link.active ? 'bg-brand-600 text-white' : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                    />
                                ))}
                            </div>
                        )}
                    </Card>

                    <div className="min-w-0 space-y-5">
                        <Card className="min-w-0 p-4 sm:p-6">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Plan Aktif</h2>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
                                {plans.map((plan) => (
                                    <div key={plan.id} className="min-w-0 rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{plan.name}</p>
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>
                                            </div>
                                            <span className={`rounded-full px-3 py-1 text-xs font-black ${plan.is_active ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                                {plan.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-1 gap-2 text-center sm:grid-cols-3 2xl:grid-cols-1">
                                            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">{plan.price_formatted}</span>
                                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">{plan.duration_days} hari</span>
                                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-900/20 dark:text-sky-300">{plan.scope_label}</span>
                                        </div>
                                        {plan.is_legacy ? (
                                            <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-300">Legacy, hanya dipertahankan sampai akses lama berakhir.</p>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => openPlanEditForm(plan)}
                                                className="mt-3 rounded-lg border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-900/40 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
                                            >
                                                Edit Harga
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="min-w-0 p-4 sm:p-6">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Access Key</h2>
                            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">Kode akses manual untuk demo, kloter, atau akses kelas dari superadmin.</p>
                            <div className="mt-4 space-y-3">
                                {accessKeys.length === 0 && (
                                    <p className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm font-bold text-gray-400 dark:border-gray-700">Belum ada access key.</p>
                                )}
                                {accessKeys.map((item) => (
                                    <div key={item.id} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-mono text-sm font-black tracking-widest text-gray-900 dark:text-white">{item.code}</p>
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.name || item.plan_name} - {item.duration_days} hari - {item.usage}</p>
                                                <p className="mt-1 text-[11px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-300">{item.scope_label}</p>
                                                {item.expires_at && <p className="mt-1 text-[11px] font-bold text-amber-600 dark:text-amber-300">Expired: {item.expires_at}</p>}
                                            </div>
                                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        {item.status === 'active' && (
                                            <button
                                                type="button"
                                                onClick={() => openConfirm({
                                                    variant: 'danger',
                                                    title: 'Revoke Access Key?',
                                                    message: 'Kode tidak bisa dipakai lagi setelah dicabut.',
                                                    confirmLabel: 'Iya, Revoke',
                                                    details: [
                                                        { label: 'Kode', value: item.code },
                                                        { label: 'Nama', value: item.name || item.plan_name || 'Access Key' },
                                                        { label: 'Pemakaian', value: item.usage },
                                                    ],
                                                    onConfirm: () => router.delete(route('superadmin.payments.access-keys.revoke', item.id), {
                                                        preserveScroll: true,
                                                        onFinish: closeConfirm,
                                                    }),
                                                })}
                                                className="mt-3 rounded-lg border border-brand-100 px-3 py-2 text-xs font-black text-brand-600 dark:border-brand-900/40 dark:text-brand-400"
                                            >
                                                Revoke
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {showPlanForm && (
                <AdminDialog open onClose={closePlanForm} eyebrow="Harga dan Akses" title={editingPlan ? 'Edit Payment Plan' : 'Buat Payment Plan'} description={editingPlan ? 'Perubahan harga berlaku untuk checkout dan transaksi baru.' : 'Plan ini akan dipakai sebagai sumber harga pada halaman pricing.'} maxWidth="max-w-lg">
                        <form onSubmit={submitPlan} className="space-y-4">
                            <input value={planForm.data.name} onChange={(e) => planForm.setData('name', e.target.value)} placeholder="Nama plan" className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm" />
                            <input value={planForm.data.slug} onChange={(e) => planForm.setData('slug', e.target.value)} placeholder="Slug" className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm" />
                            <input value={planForm.data.description} onChange={(e) => planForm.setData('description', e.target.value)} placeholder="Deskripsi" className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm" />
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <input type="number" value={planForm.data.price} onChange={(e) => planForm.setData('price', e.target.value)} placeholder="Harga" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                                <input type="number" value={planForm.data.duration_days} onChange={(e) => planForm.setData('duration_days', e.target.value)} placeholder="Durasi hari" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <select
                                    value={planForm.data.scope_type}
                                    onChange={(e) => {
                                        planForm.setData({
                                            ...planForm.data,
                                            scope_type: e.target.value,
                                            program_pembelajaran_id: planForm.data.program_pembelajaran_id,
                                        });
                                    }}
                                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-900"
                                >
                                    <option value="program">Kelas Mandiri</option>
                                    <option value="kloter">Kelas Mentor</option>
                                </select>
                                <SearchableSelect
                                    value={planForm.data.program_pembelajaran_id}
                                    onChange={(programId) => planForm.setData('program_pembelajaran_id', programId)}
                                    disabled={!['program', 'kloter'].includes(planForm.data.scope_type)}
                                    placeholder="Pilih kelas"
                                    searchPlaceholder="Cari kelas..."
                                    options={programs.map((program) => ({ value: program.id, label: program.title }))}
                                />
                            </div>
                            <textarea value={planForm.data.features} onChange={(e) => planForm.setData('features', e.target.value)} rows={4} placeholder="Satu fitur per baris" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm" />
                            <label className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold">
                                <input type="checkbox" checked={planForm.data.is_active} onChange={(e) => planForm.setData('is_active', e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-focus" />
                                Aktif
                            </label>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button type="button" onClick={closePlanForm} className="min-h-11 w-full rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold dark:border-gray-700 sm:w-auto">Batal</button>
                                <button disabled={planForm.processing} className="min-h-11 w-full rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-black text-white sm:w-auto">{planForm.processing ? 'Menyimpan...' : editingPlan ? 'Update Plan' : 'Simpan Plan'}</button>
                            </div>
                        </form>
                </AdminDialog>
            )}

            {showTransactionForm && (
                <AdminDialog open onClose={() => { setShowTransactionForm(false); transactionForm.reset(); }} eyebrow="Pemasukan" title="Buat Transaksi Manual" description="Simpan bukti pembayaran terlebih dahulu. Akses baru aktif setelah transaksi disetujui." maxWidth="max-w-2xl">
                        <form onSubmit={submitTransaction} className="space-y-4">
                            <SearchableSelect value={transactionForm.data.user_id} onChange={(userId) => transactionForm.setData('user_id', userId)} placeholder="Pilih siswa" searchPlaceholder="Cari nama atau email siswa..." options={users.map((user) => ({ value: user.id, label: user.label }))} />
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <SearchableSelect
                                    value={transactionForm.data.payment_plan_id}
                                    onChange={(planId) => {
                                        const selectedPlan = plans.find((plan) => String(plan.id) === String(planId));
                                        transactionForm.setData({
                                            ...transactionForm.data,
                                            payment_plan_id: planId,
                                            amount: selectedPlan ? selectedPlan.price : transactionForm.data.amount,
                                            kloter_belajar_id: '',
                                        });
                                    }}
                                    placeholder="Pilih plan"
                                    searchPlaceholder="Cari nama plan atau kelas..."
                                    options={availablePlans.map((plan) => ({ value: plan.id, label: plan.name, description: `${plan.scope_label} - ${plan.price_formatted}` }))}
                                />
                                <input type="number" value={transactionForm.data.amount} onChange={(e) => transactionForm.setData('amount', e.target.value)} placeholder="Nominal" className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm" />
                            </div>
                            {selectedTransactionPlan?.scope_type === 'kloter' && (
                                <SearchableSelect
                                    value={transactionForm.data.kloter_belajar_id}
                                    onChange={(kloterId) => transactionForm.setData('kloter_belajar_id', kloterId)}
                                    placeholder="Pilih kloter mentor"
                                    searchPlaceholder="Cari kloter atau mentor..."
                                    options={selectedTransactionKloters.map((kloter) => ({ value: kloter.id, label: kloter.name, description: kloter.mentor_name }))}
                                />
                            )}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <select value={transactionForm.data.payment_method} onChange={(e) => transactionForm.setData('payment_method', e.target.value)} className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm">
                                    <option value="manual">Manual</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="e-wallet">E-Wallet</option>
                                    <option value="credit_card">Credit Card</option>
                                <option value="midtrans">Midtrans</option>
                                </select>
                                <select value={transactionForm.data.status} onChange={(e) => transactionForm.setData('status', e.target.value)} className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm">
                                    <option value="pending">Pending</option>
                                    <option value="success">Success</option>
                                    <option value="failed">Failed</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </div>
                            <textarea value={transactionForm.data.notes} onChange={(e) => transactionForm.setData('notes', e.target.value)} rows={3} placeholder="Catatan transaksi" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm" />
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => transactionForm.setData('proof_of_payment', e.target.files[0] || null)} className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-3 file:text-sm file:font-black file:text-brand-600" />
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button type="button" onClick={() => setShowTransactionForm(false)} className="min-h-11 w-full rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold dark:border-gray-700 sm:w-auto">Batal</button>
                                <button disabled={transactionForm.processing} className="min-h-11 w-full rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-black text-white sm:w-auto">{transactionForm.processing ? 'Menyimpan...' : 'Simpan Transaksi'}</button>
                            </div>
                        </form>
                </AdminDialog>
            )}

            {showAccessKeyForm && (
                <AdminDialog open onClose={() => { setShowAccessKeyForm(false); accessKeyForm.reset(); }} eyebrow="Akses Manual" title="Buat Access Key" description="Kode dibuat otomatis untuk demo, promo, atau pemberian akses manual." maxWidth="max-w-lg">
                        <form onSubmit={submitAccessKey} className="space-y-4">
                            <input value={accessKeyForm.data.name} onChange={(e) => accessKeyForm.setData('name', e.target.value)} placeholder="Nama campaign / kelas" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                            <SearchableSelect value={accessKeyForm.data.payment_plan_id} onChange={(planId) => accessKeyForm.setData('payment_plan_id', planId)} placeholder="Pakai plan Access Key Premium" searchPlaceholder="Cari plan..." allowClear clearLabel="Pakai plan Access Key Premium" options={accessKeyPlans.map((plan) => ({ value: plan.id, label: plan.name, description: plan.scope_label }))} />
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <select
                                    value={accessKeyForm.data.scope_type}
                                    onChange={(e) => {
                                        accessKeyForm.setData({
                                            ...accessKeyForm.data,
                                            scope_type: e.target.value,
                                            program_pembelajaran_id: accessKeyForm.data.program_pembelajaran_id,
                                        });
                                    }}
                                    disabled={Boolean(accessKeyForm.data.payment_plan_id)}
                                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
                                >
                                    <option value="program">Per kelas</option>
                                </select>
                                <SearchableSelect
                                    value={accessKeyForm.data.program_pembelajaran_id}
                                    onChange={(programId) => accessKeyForm.setData('program_pembelajaran_id', programId)}
                                    disabled={Boolean(accessKeyForm.data.payment_plan_id)}
                                    placeholder="Pilih kelas"
                                    searchPlaceholder="Cari kelas..."
                                    options={programs.map((program) => ({ value: program.id, label: program.title }))}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <input type="number" min="1" max="366" value={accessKeyForm.data.duration_days} onChange={(e) => accessKeyForm.setData('duration_days', e.target.value)} placeholder="Durasi hari" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                                <input type="number" min="1" max="500" value={accessKeyForm.data.max_uses} onChange={(e) => accessKeyForm.setData('max_uses', e.target.value)} placeholder="Maks pemakaian" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                            </div>
                            <input type="datetime-local" value={accessKeyForm.data.expires_at} onChange={(e) => accessKeyForm.setData('expires_at', e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                            <textarea value={accessKeyForm.data.notes} onChange={(e) => accessKeyForm.setData('notes', e.target.value)} rows={3} placeholder="Catatan internal" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button type="button" onClick={() => setShowAccessKeyForm(false)} className="min-h-11 w-full rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold dark:border-gray-700 sm:w-auto">Batal</button>
                                <button disabled={accessKeyForm.processing} className="min-h-11 w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-gray-950 disabled:opacity-50 sm:w-auto">{accessKeyForm.processing ? 'Membuat...' : 'Buat Key'}</button>
                            </div>
                        </form>
                </AdminDialog>
            )}

            {rejectTarget && (
                <ConfirmActionDialog
                    show
                    variant="danger"
                    title="Reject Transaksi?"
                    message="Transaksi akan ditolak. Isi alasan agar riwayat audit jelas."
                    confirmLabel="Iya, Reject"
                    details={[
                        { label: 'Kode', value: rejectTarget.transaction_code },
                        { label: 'User', value: rejectTarget.user_name },
                        { label: 'Nominal', value: rejectTarget.amount_formatted },
                    ]}
                    onCancel={() => setRejectTarget(null)}
                    onConfirm={reject}
                >
                    <textarea value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} rows={4} placeholder="Alasan penolakan" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                </ConfirmActionDialog>
            )}
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}

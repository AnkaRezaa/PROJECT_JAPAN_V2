import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import StatCard from '@/Components/Features/Dashboard/StatCard';
import ChartCard from '@/Components/Features/Dashboard/ChartCard';
import ChartPeriodSelect from '@/Components/Features/Dashboard/ChartPeriodSelect';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import AdminDialog from '@/Components/UI/AdminDialog';
import SearchableSelect from '@/Components/UI/SearchableSelect';
import FormField, { formInputClass } from '@/Components/UI/FormField';
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
    const { flash = {} } = usePage().props;
    const [showPlanForm, setShowPlanForm] = useState(false);
    const [showTransactionForm, setShowTransactionForm] = useState(false);
    const [showAccessKeyForm, setShowAccessKeyForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [rejectionNotes, setRejectionNotes] = useState('');
    const [newKeyModalData, setNewKeyModalData] = useState(null);
    const [copied, setCopied] = useState(false);
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    useEffect(() => {
        if (flash.created_access_key) {
            setNewKeyModalData(flash.created_access_key);
        }
    }, [flash.created_access_key]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                                                className="mt-3 w-full sm:w-auto rounded-lg border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-900/40 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
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
                                                <p className="font-mono text-sm font-black tracking-widest text-gray-900 dark:text-white break-all">{item.code}</p>
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
                                                className="mt-3 w-full sm:w-auto rounded-lg border border-brand-100 px-3 py-2 text-xs font-black text-brand-600 dark:border-brand-900/40 dark:text-brand-400"
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
                        <FormField label="Nama Plan" required error={planForm.errors.name} tooltip="Nama paket langganan yang tampil di katalog.">
                            <input
                                value={planForm.data.name}
                                onChange={(e) => {
                                    planForm.setData('name', e.target.value);
                                    planForm.clearErrors('name');
                                }}
                                placeholder="Contoh: Paket Belajar Mandiri N5"
                                className={formInputClass(planForm.errors.name)}
                            />
                        </FormField>
                        <FormField label="Slug URL" required error={planForm.errors.slug} tooltip="Pengenal unik berbasis URL untuk paket.">
                            <input
                                value={planForm.data.slug}
                                onChange={(e) => {
                                    planForm.setData('slug', e.target.value);
                                    planForm.clearErrors('slug');
                                }}
                                placeholder="Contoh: mandiri-n5"
                                className={formInputClass(planForm.errors.slug)}
                            />
                        </FormField>
                        <FormField label="Deskripsi" error={planForm.errors.description} tooltip="Ringkasan benefit paket untuk calon siswa.">
                            <input
                                value={planForm.data.description}
                                onChange={(e) => {
                                    planForm.setData('description', e.target.value);
                                    planForm.clearErrors('description');
                                }}
                                placeholder="Deskripsi singkat paket"
                                className={formInputClass(planForm.errors.description)}
                            />
                        </FormField>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Harga (Rp)" required error={planForm.errors.price} tooltip="Nominal tarif langganan dalam Rupiah.">
                                <input
                                    type="number"
                                    value={planForm.data.price}
                                    onChange={(e) => {
                                        planForm.setData('price', e.target.value);
                                        planForm.clearErrors('price');
                                    }}
                                    placeholder="Contoh: 150000"
                                    className={formInputClass(planForm.errors.price)}
                                />
                            </FormField>
                            <FormField label="Durasi (Hari)" required error={planForm.errors.duration_days} tooltip="Masa aktif hak akses belajar siswa setelah pembayaran diverifikasi.">
                                <input
                                    type="number"
                                    value={planForm.data.duration_days}
                                    onChange={(e) => {
                                        planForm.setData('duration_days', e.target.value);
                                        planForm.clearErrors('duration_days');
                                    }}
                                    placeholder="Contoh: 30"
                                    className={formInputClass(planForm.errors.duration_days)}
                                />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Tipe Akses" required error={planForm.errors.scope_type} tooltip="Pilih apakah akses mandiri atau dengan pendampingan mentor.">
                                <select
                                    value={planForm.data.scope_type}
                                    onChange={(e) => {
                                        planForm.setData({
                                            ...planForm.data,
                                            scope_type: e.target.value,
                                            program_pembelajaran_id: planForm.data.program_pembelajaran_id,
                                        });
                                        planForm.clearErrors('scope_type');
                                    }}
                                    className={formInputClass(planForm.errors.scope_type)}
                                >
                                    <option value="program">Kelas Mandiri</option>
                                    <option value="kloter">Kelas Mentor</option>
                                </select>
                            </FormField>
                            <FormField label="Program Pembelajaran" required error={planForm.errors.program_pembelajaran_id} tooltip="Pilih program/kelas materi yang di-unlock.">
                                <SearchableSelect
                                    value={planForm.data.program_pembelajaran_id}
                                    onChange={(programId) => {
                                        planForm.setData('program_pembelajaran_id', programId);
                                        planForm.clearErrors('program_pembelajaran_id');
                                    }}
                                    disabled={!['program', 'kloter'].includes(planForm.data.scope_type)}
                                    placeholder="Pilih kelas"
                                    searchPlaceholder="Cari kelas..."
                                    options={programs.map((program) => ({ value: program.id, label: program.title }))}
                                />
                            </FormField>
                        </div>
                        <FormField label="Fitur / Benefit" error={planForm.errors.features} tooltip="Daftar keunggulan paket. Tulis satu fitur per baris.">
                            <textarea
                                value={planForm.data.features}
                                onChange={(e) => {
                                    planForm.setData('features', e.target.value);
                                    planForm.clearErrors('features');
                                }}
                                rows={4}
                                placeholder="Satu fitur per baris"
                                className={formInputClass(planForm.errors.features)}
                            />
                        </FormField>
                        <FormField label="Status" tooltip="Aktifkan agar paket muncul di pilihan transaksi/pricing.">
                            <label className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-bold">
                                <input
                                    type="checkbox"
                                    checked={planForm.data.is_active}
                                    onChange={(e) => planForm.setData('is_active', e.target.checked)}
                                    className="rounded border-gray-300 text-brand-600 focus:ring-focus"
                                />
                                Aktifkan Paket Ini
                            </label>
                        </FormField>
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
                        <FormField label="Siswa" required error={transactionForm.errors.user_id} tooltip="Pilih akun pengguna/siswa yang bertransaksi.">
                            <SearchableSelect
                                value={transactionForm.data.user_id}
                                onChange={(userId) => {
                                    transactionForm.setData('user_id', userId);
                                    transactionForm.clearErrors('user_id');
                                }}
                                placeholder="Pilih siswa"
                                searchPlaceholder="Cari nama atau email siswa..."
                                options={users.map((user) => ({ value: user.id, label: user.label }))}
                            />
                        </FormField>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Paket Pembayaran" required error={transactionForm.errors.payment_plan_id} tooltip="Paket langganan yang dibeli oleh siswa.">
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
                                        transactionForm.clearErrors('payment_plan_id');
                                    }}
                                    placeholder="Pilih plan"
                                    searchPlaceholder="Cari nama plan atau kelas..."
                                    options={availablePlans.map((plan) => ({ value: plan.id, label: plan.name, description: `${plan.scope_label} - ${plan.price_formatted}` }))}
                                />
                            </FormField>
                            <FormField label="Nominal (Rp)" required error={transactionForm.errors.amount} tooltip="Total uang yang dibayarkan siswa.">
                                <input
                                    type="number"
                                    value={transactionForm.data.amount}
                                    onChange={(e) => {
                                        transactionForm.setData('amount', e.target.value);
                                        transactionForm.clearErrors('amount');
                                    }}
                                    placeholder="Nominal"
                                    className={formInputClass(transactionForm.errors.amount)}
                                />
                            </FormField>
                        </div>
                        {selectedTransactionPlan?.scope_type === 'kloter' && (
                            <FormField label="Kloter Mentor" required error={transactionForm.errors.kloter_belajar_id} tooltip="Pilih kloter belajar yang dipandu mentor.">
                                <SearchableSelect
                                    value={transactionForm.data.kloter_belajar_id}
                                    onChange={(kloterId) => {
                                        transactionForm.setData('kloter_belajar_id', kloterId);
                                        transactionForm.clearErrors('kloter_belajar_id');
                                    }}
                                    placeholder="Pilih kloter mentor"
                                    searchPlaceholder="Cari kloter atau mentor..."
                                    options={selectedTransactionKloters.map((kloter) => ({ value: kloter.id, label: kloter.name, description: kloter.mentor_name }))}
                                />
                            </FormField>
                        )}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Metode Pembayaran" required error={transactionForm.errors.payment_method}>
                                <select
                                    value={transactionForm.data.payment_method}
                                    onChange={(e) => {
                                        transactionForm.setData('payment_method', e.target.value);
                                        transactionForm.clearErrors('payment_method');
                                    }}
                                    className={formInputClass(transactionForm.errors.payment_method)}
                                >
                                    <option value="manual">Manual</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="e-wallet">E-Wallet</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="midtrans">Midtrans</option>
                                </select>
                            </FormField>
                            <FormField label="Status Transaksi" required error={transactionForm.errors.status}>
                                <select
                                    value={transactionForm.data.status}
                                    onChange={(e) => {
                                        transactionForm.setData('status', e.target.value);
                                        transactionForm.clearErrors('status');
                                    }}
                                    className={formInputClass(transactionForm.errors.status)}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="success">Success</option>
                                    <option value="failed">Failed</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </FormField>
                        </div>
                        <FormField label="Catatan Transaksi" error={transactionForm.errors.notes} tooltip="Catatan referensi tambahan untuk pembayaran ini.">
                            <textarea
                                value={transactionForm.data.notes}
                                onChange={(e) => {
                                    transactionForm.setData('notes', e.target.value);
                                    transactionForm.clearErrors('notes');
                                }}
                                rows={3}
                                placeholder="Catatan transaksi..."
                                className={formInputClass(transactionForm.errors.notes)}
                            />
                        </FormField>
                        <FormField label="Bukti Pembayaran (File)" error={transactionForm.errors.proof_of_payment} tooltip="Format gambar JPG, PNG, atau dokumen PDF.">
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => {
                                    transactionForm.setData('proof_of_payment', e.target.files[0] || null);
                                    transactionForm.clearErrors('proof_of_payment');
                                }}
                                className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-3 file:text-sm file:font-black file:text-brand-600"
                            />
                        </FormField>
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
                        <FormField label="Nama Campaign / Keterangan Key" required error={accessKeyForm.errors.name} tooltip="Keterangan peruntukan kode akses ini (misal: Promo Early Bird, Demo Guru).">
                            <input
                                value={accessKeyForm.data.name}
                                onChange={(e) => {
                                    accessKeyForm.setData('name', e.target.value);
                                    accessKeyForm.clearErrors('name');
                                }}
                                placeholder="Contoh: Promo Early Bird, Akses Demo Sensei"
                                className={formInputClass(accessKeyForm.errors.name)}
                            />
                        </FormField>

                        <FormField label="Paket Langganan Terkait" error={accessKeyForm.errors.payment_plan_id} tooltip="Opsional: hubungkan langsung dengan paket yang ada.">
                            <SearchableSelect
                                value={accessKeyForm.data.payment_plan_id}
                                onChange={(planId) => {
                                    const found = accessKeyPlans.find((plan) => String(plan.id) === String(planId));
                                    accessKeyForm.setData((prev) => ({
                                        ...prev,
                                        payment_plan_id: planId || '',
                                        program_pembelajaran_id: found ? found.program_pembelajaran_id : prev.program_pembelajaran_id,
                                        duration_days: found ? (found.duration_days || 30) : prev.duration_days,
                                    }));
                                    accessKeyForm.clearErrors('payment_plan_id');
                                }}
                                placeholder="Pilih paket langganan (opsional)"
                                searchPlaceholder="Cari paket langganan..."
                                allowClear
                                clearLabel="Gunakan pengaturan manual di bawah"
                                options={accessKeyPlans.map((plan) => ({ value: plan.id, label: plan.name, description: plan.scope_label }))}
                            />
                        </FormField>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Cakupan Akses" error={accessKeyForm.errors.scope_type} tooltip="Cakupan level akses materi.">
                                <select
                                    value={accessKeyForm.data.scope_type}
                                    onChange={(e) => {
                                        accessKeyForm.setData('scope_type', e.target.value);
                                        accessKeyForm.clearErrors('scope_type');
                                    }}
                                    disabled={Boolean(accessKeyForm.data.payment_plan_id)}
                                    className={formInputClass(accessKeyForm.errors.scope_type)}
                                >
                                    <option value="program">Per Kelas / Program</option>
                                </select>
                            </FormField>
                            <FormField label="Pilih Kelas" required error={accessKeyForm.errors.program_pembelajaran_id} tooltip="Kelas yang akan terbuka saat key digunakan.">
                                <SearchableSelect
                                    value={accessKeyForm.data.program_pembelajaran_id}
                                    onChange={(programId) => {
                                        accessKeyForm.setData('program_pembelajaran_id', programId);
                                        accessKeyForm.clearErrors('program_pembelajaran_id');
                                    }}
                                    disabled={Boolean(accessKeyForm.data.payment_plan_id)}
                                    placeholder="Pilih kelas"
                                    searchPlaceholder="Cari kelas..."
                                    options={programs.map((program) => ({ value: program.id, label: program.title }))}
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Masa Aktif (Hari)" required error={accessKeyForm.errors.duration_days} tooltip="Masa berlaku akses setelah kode diklaim oleh siswa.">
                                <input
                                    type="number"
                                    min="1"
                                    max="366"
                                    value={accessKeyForm.data.duration_days}
                                    onChange={(e) => {
                                        accessKeyForm.setData('duration_days', e.target.value);
                                        accessKeyForm.clearErrors('duration_days');
                                    }}
                                    placeholder="Contoh: 30"
                                    className={formInputClass(accessKeyForm.errors.duration_days)}
                                />
                            </FormField>
                            <FormField label="Maksimal Pemakaian (Siswa)" required error={accessKeyForm.errors.max_uses} tooltip="Jumlah maksimal siswa yang bisa menggunakan kode ini.">
                                <input
                                    type="number"
                                    min="1"
                                    max="500"
                                    value={accessKeyForm.data.max_uses}
                                    onChange={(e) => {
                                        accessKeyForm.setData('max_uses', e.target.value);
                                        accessKeyForm.clearErrors('max_uses');
                                    }}
                                    placeholder="Contoh: 1"
                                    className={formInputClass(accessKeyForm.errors.max_uses)}
                                />
                            </FormField>
                        </div>

                        <FormField label="Batas Waktu Kedaluwarsa Klaim" error={accessKeyForm.errors.expires_at} tooltip="Batas akhir waktu kode ini dapat diaktivasi.">
                            <input
                                type="datetime-local"
                                value={accessKeyForm.data.expires_at}
                                onChange={(e) => {
                                    accessKeyForm.setData('expires_at', e.target.value);
                                    accessKeyForm.clearErrors('expires_at');
                                }}
                                className={formInputClass(accessKeyForm.errors.expires_at)}
                            />
                        </FormField>

                        <FormField label="Catatan Internal Admin" error={accessKeyForm.errors.notes} tooltip="Catatan internal pengelola sistem.">
                            <textarea
                                value={accessKeyForm.data.notes}
                                onChange={(e) => {
                                    accessKeyForm.setData('notes', e.target.value);
                                    accessKeyForm.clearErrors('notes');
                                }}
                                rows={2}
                                placeholder="Tuliskan catatan peruntukan kode akses ini..."
                                className={formInputClass(accessKeyForm.errors.notes)}
                            />
                        </FormField>

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
            {newKeyModalData && (
                <AdminDialog
                    open={Boolean(newKeyModalData)}
                    onClose={() => setNewKeyModalData(null)}
                    eyebrow="Access Key Berhasil Dibuat"
                    title="Kode Akses Baru"
                    description="Kode akses siap dibagikan kepada pengguna untuk membuka kelas."
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4">
                        <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-xs dark:border-gray-800 dark:bg-gray-800/50">
                            {newKeyModalData.name && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-500 dark:text-gray-400">Campaign / Nama:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{newKeyModalData.name}</span>
                                </div>
                            )}
                            {newKeyModalData.program && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-500 dark:text-gray-400">Kelas / Program:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{newKeyModalData.program}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-500 dark:text-gray-400">Masa Aktif:</span>
                                <span className="font-bold text-gray-900 dark:text-white">{newKeyModalData.duration_days} Hari</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-500 dark:text-gray-400">Maks Pemakaian:</span>
                                <span className="font-bold text-gray-900 dark:text-white">{newKeyModalData.max_uses} Siswa</span>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Kode Akses
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={newKeyModalData.code || ''}
                                    className="h-11 flex-1 rounded-xl border border-amber-200 bg-amber-50/50 px-3 font-mono text-base font-black text-amber-900 select-all dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(newKeyModalData.code || '')}
                                    className="h-11 rounded-xl border border-amber-400 bg-amber-500 px-4 text-xs font-black text-white hover:bg-amber-600"
                                >
                                    {copied ? 'Tersalin!' : 'Salin'}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-3">
                            <button
                                type="button"
                                onClick={() => setNewKeyModalData(null)}
                                className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </AdminDialog>
            )}

            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}

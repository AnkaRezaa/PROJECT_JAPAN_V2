import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { playSoundEffect } from '@/Components/UI/SoundEffects';

const loadSnapScript = (midtrans) => new Promise((resolve, reject) => {
  if (window.snap) {
    resolve();
    return;
  }

  if (!midtrans?.clientKey) {
    reject(new Error('Midtrans client key belum dikonfigurasi.'));
    return;
  }

  const existing = document.getElementById('midtrans-snap-script');
  if (existing) {
    existing.addEventListener('load', resolve, { once: true });
    existing.addEventListener('error', reject, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.id = 'midtrans-snap-script';
  script.src = midtrans.isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';
  script.setAttribute('data-client-key', midtrans.clientKey);
  script.onload = resolve;
  script.onerror = reject;
  document.body.appendChild(script);
});

const statusPresentation = {
  pending: {
    label: 'Menunggu pembayaran',
    description: 'Selesaikan pembayaran di Midtrans untuk mengaktifkan akses belajar.',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
    iconClass: 'bg-amber-50 text-amber-700',
    Icon: HourglassTopIcon,
  },
  success: {
    label: 'Pembayaran berhasil',
    description: 'Akses belajar kamu sudah aktif.',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconClass: 'bg-emerald-50 text-emerald-700',
    Icon: CheckCircleIcon,
  },
  pending_approval: {
    label: 'Menunggu persetujuan mentor',
    description: 'Pembayaran berhasil. Mentor akan meninjau pendaftaran kloter sebelum akses kelas diaktifkan.',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
    iconClass: 'bg-amber-50 text-amber-700',
    Icon: HourglassTopIcon,
  },
  refund_required: {
    label: 'Refund sedang ditindaklanjuti',
    description: 'Pendaftaran mentor ditolak. Tim TOKU-UP akan menindaklanjuti pengembalian pembayaran.',
    badgeClass: 'border-red-200 bg-red-50 text-red-800',
    iconClass: 'bg-red-50 text-red-700',
    Icon: ErrorOutlineIcon,
  },
  failed: {
    label: 'Pembayaran gagal',
    description: 'Pembayaran belum berhasil diproses. Kamu dapat membuat pesanan baru.',
    badgeClass: 'border-red-200 bg-red-50 text-red-800',
    iconClass: 'bg-red-50 text-red-700',
    Icon: ErrorOutlineIcon,
  },
  expired: {
    label: 'Pembayaran kedaluwarsa',
    description: 'Waktu pembayaran untuk pesanan ini telah berakhir.',
    badgeClass: 'border-red-200 bg-red-50 text-red-800',
    iconClass: 'bg-red-50 text-red-700',
    Icon: ErrorOutlineIcon,
  },
  refunded: {
    label: 'Pembayaran dikembalikan',
    description: 'Pembayaran untuk pesanan ini telah dibatalkan atau dikembalikan.',
    badgeClass: 'border-red-200 bg-red-50 text-red-800',
    iconClass: 'bg-red-50 text-red-700',
    Icon: ErrorOutlineIcon,
  },
  canceled: {
    label: 'Pembayaran dibatalkan',
    description: 'Pesanan ini dibatalkan. Kamu dapat membuat pesanan baru bila masih membutuhkan akses.',
    badgeClass: 'border-red-200 bg-red-50 text-red-800',
    iconClass: 'bg-red-50 text-red-700',
    Icon: ErrorOutlineIcon,
  },
};

const formatDate = (value) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export default function Checkout({ transaction, midtrans }) {
  const [status, setStatus] = useState(transaction.status);
  const [accessState, setAccessState] = useState(transaction.access_state || 'payment_pending');
  const [snapToken, setSnapToken] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [kloter, setKloter] = useState(transaction.kloter || null);
  const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
  const playedPaymentSuccessRef = useRef(transaction.status === 'success');

  const isDone = status === 'success' && accessState === 'active';
  const isPendingApproval = status === 'success' && accessState === 'pending_approval';
  const isRefundRequired = status === 'success' && accessState === 'refund_required';
  const isPending = status === 'pending';
  const shouldRestartCheckout = ['failed', 'expired', 'refunded', 'canceled'].includes(status);
  const storageKey = `midtrans:${transaction.transaction_code}`;
  const presentationKey = status === 'success' && ['pending_approval', 'refund_required'].includes(accessState)
    ? accessState
    : status;
  const presentation = statusPresentation[presentationKey] || statusPresentation.pending;
  const StatusIcon = presentation.Icon;

  useEffect(() => {
    if (status !== 'success' || playedPaymentSuccessRef.current) return;

    playedPaymentSuccessRef.current = true;
    playSoundEffect('complete');
  }, [status]);

  const syncStatus = async (successMessage = '') => {
    setError('');
    setIsSyncing(true);

    try {
      const response = await window.axios.post(route('payments.midtrans.sync', transaction.transaction_code));
      const nextStatus = response.data?.status || status;
      setStatus(nextStatus);
      const nextAccessState = response.data?.access_state || accessState;
      setAccessState(nextAccessState);

      if (nextStatus === 'success') {
        setKloter(response.data?.kloter || null);
        window.sessionStorage?.removeItem(storageKey);
        setNotice(nextAccessState === 'pending_approval'
          ? 'Pembayaran berhasil divalidasi. Pendaftaran sedang menunggu persetujuan mentor.'
          : successMessage || 'Pembayaran berhasil divalidasi. Akses belajar sudah aktif.');
        router.reload({ only: ['auth'] });
        return;
      }

      if (nextStatus === 'pending') {
        setNotice(response.data?.message || 'Pembayaran masih menunggu konfirmasi. Coba periksa lagi beberapa saat setelah pembayaran selesai.');
        return;
      }

      setNotice('Status pesanan telah diperbarui.');
    } catch (syncError) {
      setError(syncError.response?.data?.message || 'Gagal memeriksa status pembayaran.');
    } finally {
      setIsSyncing(false);
    }
  };

  const prepareSnapToken = async () => {
    if (snapToken) return snapToken;

    const response = await window.axios.post(route('payments.midtrans.snap', transaction.transaction_code));
    setSnapToken(response.data.snap_token);
    window.sessionStorage?.setItem(storageKey, JSON.stringify({
      snapToken: response.data.snap_token,
      redirectUrl: response.data.redirect_url,
    }));

    return response.data.snap_token;
  };

  const openMidtrans = async () => {
    setError('');
    setNotice('');
    setIsOpening(true);

    try {
      await loadSnapScript(midtrans);
      const token = await prepareSnapToken();

      window.snap.pay(token, {
        onSuccess: async () => syncStatus('Pembayaran berhasil. Status akses kelas sudah diperbarui.'),
        onPending: async () => syncStatus(),
        onError: () => setError('Pembayaran gagal diproses. Kamu dapat mencoba lagi dari Midtrans.'),
        onClose: () => setNotice('Pembayaran belum diselesaikan. Kamu dapat melanjutkannya kapan saja dari halaman ini.'),
      });
    } catch (openError) {
      if (openError.response?.status === 410) {
        window.sessionStorage?.removeItem(storageKey);
        await syncStatus('');
        return;
      }

      setError(openError.response?.data?.message || openError.message || 'Gagal membuka Midtrans.');
    } finally {
      setIsOpening(false);
    }
  };

  const cancelPayment = async () => {
    setError('');
    setNotice('');
    setIsCanceling(true);
    setConfirmProcessing(true);

    try {
      const response = await window.axios.post(route('payments.midtrans.cancel', transaction.transaction_code));
      const nextStatus = response.data?.status || status;
      setStatus(nextStatus);

      if (['failed', 'expired', 'refunded', 'canceled'].includes(nextStatus)) {
        window.sessionStorage?.removeItem(storageKey);
      }

      setNotice(response.data?.message || 'Status pesanan telah diperbarui.');
      closeConfirm();
    } catch (cancelError) {
      setError(cancelError.response?.data?.message || 'Gagal membatalkan pesanan.');
      closeConfirm();
    } finally {
      setConfirmProcessing(false);
      setIsCanceling(false);
    }
  };

  const confirmCancelPayment = () => {
    openConfirm({
      variant: 'warning',
      title: 'Batalkan pesanan?',
      message: 'Pembayaran untuk pesanan ini akan dibatalkan di Midtrans dan tidak dapat dilanjutkan kembali.',
      details: [{ label: 'Nomor pesanan', value: transaction.transaction_code }],
      confirmLabel: 'Batalkan pesanan',
      cancelLabel: 'Kembali',
      onConfirm: cancelPayment,
    });
  };

  return (
    <>
      <Head title={`Checkout ${transaction.transaction_code} - TOKU-UP`} />

      <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={route('user.kelas.index')}
                aria-label="Kembali ke daftar kelas"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:px-3"
              >
                <ArrowBackIcon sx={{ fontSize: 19 }} />
                <span className="hidden sm:inline">Kembali</span>
              </Link>
              <Link href={route('home')} className="truncate text-lg font-black text-slate-950">
                TOKU-UP
              </Link>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <VerifiedUserIcon sx={{ fontSize: 17 }} className="text-slate-600" />
              <span>Pembayaran aman melalui Midtrans</span>
            </div>
          </header>

          <section className="mt-5 grid overflow-hidden border border-slate-200 bg-white lg:mt-8 lg:grid-cols-[0.82fr_1.18fr]">
            <aside className="order-2 border-t border-slate-200 bg-slate-50 p-5 lg:order-1 lg:border-r lg:border-t-0 lg:p-8">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                <ReceiptLongIcon sx={{ fontSize: 18 }} />
                Ringkasan pesanan
              </div>

              <h1 className="mt-5 break-words text-xl font-black text-slate-950 sm:text-2xl">
                {transaction.payment_plan?.name || 'Akses TOKU-UP'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {transaction.payment_plan?.description || 'Akses untuk membuka konten belajar lanjutan.'}
              </p>

              <dl className="mt-7 divide-y divide-slate-200 border-y border-slate-200 text-sm">
                <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr] lg:grid-cols-1">
                  <dt className="font-medium text-slate-500">Akses</dt>
                  <dd className="font-bold text-slate-900">{transaction.scope_label || 'Semua kelas'}</dd>
                </div>
                <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr] lg:grid-cols-1">
                  <dt className="font-medium text-slate-500">Nomor pesanan</dt>
                  <dd className="break-all font-bold text-slate-900">{transaction.transaction_code}</dd>
                </div>
                <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr] lg:grid-cols-1">
                  <dt className="font-medium text-slate-500">Tanggal dibuat</dt>
                  <dd className="font-semibold text-slate-800">{formatDate(transaction.created_at)}</dd>
                </div>
                <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr] lg:grid-cols-1">
                  <dt className="font-medium text-slate-500">Total</dt>
                  <dd className="text-xl font-black text-slate-950">{transaction.amount_formatted}</dd>
                </div>
              </dl>

              {status === 'success' && kloter && (
                <div className="mt-6 border-l-2 border-slate-300 pl-4 text-sm leading-6 text-slate-600">
                  <p className="font-bold text-slate-800">Kelas kamu</p>
                  <p className="mt-1">
                    Kloter {kloter.nama}. Mulai {kloter.tanggal_mulai_label || '-'}
                    {kloter.admin_name ? ` bersama ${kloter.admin_name}` : ''}.
                  </p>
                </div>
              )}
            </aside>

            <section className="order-1 p-5 sm:p-8 lg:order-2 lg:p-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-bold ${presentation.badgeClass}`}>
                    {presentation.label}
                  </span>
                  <h2 className="mt-5 text-2xl font-black text-slate-950 sm:text-3xl">{presentation.label}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                    {presentation.description}
                  </p>
                </div>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${presentation.iconClass}`}>
                  <StatusIcon sx={{ fontSize: 25 }} />
                </div>
              </div>

              <div className="mt-8 border-y border-slate-200 py-5">
                <p className="text-sm font-medium text-slate-500">Total pembayaran</p>
                <p className="mt-1 break-words text-3xl font-black text-slate-950 sm:text-4xl">
                  {transaction.amount_formatted}
                </p>
              </div>

              {(notice || error) && (
                <div
                  role={error ? 'alert' : 'status'}
                  className={`mt-6 flex items-start gap-3 border-l-2 px-4 py-3 text-sm leading-6 ${error
                    ? 'border-red-500 bg-red-50 text-red-800'
                    : 'border-slate-400 bg-slate-50 text-slate-700'
                    }`}
                >
                  {error ? <ErrorOutlineIcon sx={{ fontSize: 20 }} /> : <HourglassTopIcon sx={{ fontSize: 20 }} />}
                  <span>{error || notice}</span>
                </div>
              )}

              <div className="mt-8 space-y-3">
                {isPending && (
                  <>
                    <button
                      type="button"
                      onClick={openMidtrans}
                      disabled={isOpening || isSyncing || isCanceling}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#c33d4b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#a9323f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <OpenInNewIcon sx={{ fontSize: 19 }} />
                      {isOpening ? 'Membuka Midtrans...' : 'Lanjutkan ke Midtrans'}
                    </button>
                    <button
                      type="button"
                      onClick={() => syncStatus()}
                      disabled={isOpening || isSyncing || isCanceling}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <HourglassTopIcon sx={{ fontSize: 19 }} />
                      {isSyncing ? 'Memeriksa status...' : 'Periksa status pembayaran'}
                    </button>
                    <button
                      type="button"
                      onClick={confirmCancelPayment}
                      disabled={isOpening || isSyncing || isCanceling}
                      className="inline-flex min-h-11 w-full items-center justify-center px-5 py-2 text-sm font-semibold text-slate-500 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCanceling ? 'Membatalkan pesanan...' : 'Batalkan pesanan'}
                    </button>
                  </>
                )}

                {isDone && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                      href={route('user.kelas.index')}
                      className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#c33d4b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#a9323f]"
                    >
                      Mulai belajar
                    </Link>
                    <Link
                      href={route('user.dashboard')}
                      className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                    >
                      Ke dashboard
                    </Link>
                  </div>
                )}

                {isPendingApproval && (
                  <div className="space-y-3">
                    <Link
                      href={route('user.kelas.index')}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#c33d4b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#a9323f]"
                    >
                      Lihat status kelas
                    </Link>
                    <p className="text-center text-xs leading-5 text-slate-500">
                      Kamu akan menerima notifikasi dan email setelah mentor mengambil keputusan.
                    </p>
                  </div>
                )}

                {isRefundRequired && (
                  <div className="space-y-3">
                    <Link
                      href={route('user.kelas.index')}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                    >
                      Kembali ke daftar kelas
                    </Link>
                    <p className="text-center text-xs leading-5 text-slate-500">
                      Status transaksi tetap tersimpan sebagai pembayaran berhasil sampai refund selesai diproses melalui Midtrans.
                    </p>
                  </div>
                )}

                {shouldRestartCheckout && (
                  <Link
                    href={route('pricing')}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#c33d4b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#a9323f]"
                  >
                    Pilih paket lagi
                  </Link>
                )}
              </div>

              {isPending && (
                <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-slate-500">
                  <VerifiedUserIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0" />
                  Pembayaran diproses oleh Midtrans. Akses hanya aktif setelah status pembayaran dikonfirmasi.
                </p>
              )}
            </section>
          </section>
        </div>
      </main>
      <ConfirmActionDialog
        {...confirmState}
        onCancel={closeConfirm}
      />
    </>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CloseIcon from '@mui/icons-material/Close';
import { playSoundEffect } from '@/Components/UI/SoundEffects';

import PaymentMethodSelector from './Components/PaymentMethodSelector';
import VirtualAccountView from './Components/VirtualAccountView';
import QrisView from './Components/QrisView';
import EWalletView from './Components/EWalletView';

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
  const [paymentChannel, setPaymentChannel] = useState(transaction.payment_channel || '');
  const [paymentPayload, setPaymentPayload] = useState(transaction.payment_payload || null);
  const [isCharging, setIsCharging] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [threeDsUrl, setThreeDsUrl] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [kloter, setKloter] = useState(transaction.kloter || null);
  const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
  const playedPaymentSuccessRef = useRef(transaction.status === 'success');

  const isDone = status === 'success' && accessState === 'active';
  const isPendingApproval = status === 'success' && accessState === 'pending_approval';
  const isRefundRequired = status === 'success' && accessState === 'refund_required';
  const isPending = status === 'pending';
  const hasActivePaymentInstruction = Boolean(
    paymentPayload &&
    (paymentPayload.va_number ||
      paymentPayload.bill_key ||
      paymentPayload.qr_url ||
      paymentPayload.deeplink_url ||
      paymentPayload.redirect_url)
  );
  const shouldRestartCheckout = ['failed', 'expired', 'refunded', 'canceled'].includes(status);
  const presentationKey = status === 'success' && ['pending_approval', 'refund_required'].includes(accessState)
    ? accessState
    : status;
  const presentation = statusPresentation[presentationKey] || statusPresentation.pending;
  const StatusIcon = presentation.Icon;

  // Sound effect on payment success
  useEffect(() => {
    if (status !== 'success' || playedPaymentSuccessRef.current) return;

    playedPaymentSuccessRef.current = true;
    playSoundEffect('complete');
  }, [status]);

  // Status Synchronization Handler
  const syncStatus = async (silent = false) => {
    if (!silent) {
      setError('');
      setIsSyncing(true);
    }

    try {
      const response = await window.axios.post(route('payments.midtrans.sync', transaction.transaction_code));
      const nextStatus = response.data?.status || status;
      setStatus(nextStatus);
      const nextAccessState = response.data?.access_state || accessState;
      setAccessState(nextAccessState);

      if (response.data?.payment_channel) {
        setPaymentChannel(response.data.payment_channel);
      }
      if (response.data?.payment_payload) {
        setPaymentPayload(response.data.payment_payload);
      }

      if (nextStatus === 'success') {
        setKloter(response.data?.kloter || null);
        setThreeDsUrl('');
        setNotice(nextAccessState === 'pending_approval'
          ? 'Pembayaran berhasil divalidasi. Pendaftaran sedang menunggu persetujuan mentor.'
          : 'Pembayaran berhasil divalidasi. Akses belajar sudah aktif.');
        router.reload({ only: ['auth'] });
        return;
      }

      if (!silent) {
        if (nextStatus === 'pending') {
          setNotice(response.data?.message || 'Pembayaran masih menunggu konfirmasi. Lakukan transfer sesuai petunjuk di atas.');
        } else {
          setNotice('Status pesanan telah diperbarui.');
        }
      }
    } catch (syncError) {
      if (!silent) {
        setError(syncError.response?.data?.message || 'Gagal memeriksa status pembayaran.');
      }
    } finally {
      if (!silent) {
        setIsSyncing(false);
      }
    }
  };

  // Background Auto-Polling (Runs every 4s while payment instruction is active)
  useEffect(() => {
    if (!isPending || !hasActivePaymentInstruction) return;

    const interval = setInterval(() => {
      syncStatus(true);
    }, 4500);

    return () => clearInterval(interval);
  }, [isPending, hasActivePaymentInstruction]);

  // Submit Core API Charge
  const handleCharge = async (channel, cardToken = null) => {
    setError('');
    setNotice('');
    setIsCharging(true);

    try {
      const response = await window.axios.post(
        route('payments.midtrans.charge', transaction.transaction_code),
        {
          payment_channel: channel,
          card_token: cardToken,
        }
      );

      const chargedPayload = response.data?.payment_payload || null;
      setPaymentChannel(channel);
      setPaymentPayload(chargedPayload);

      // Handle 3DS verification for Credit Card
      if (channel === 'credit_card' && chargedPayload?.redirect_url) {
        setThreeDsUrl(chargedPayload.redirect_url);
      }

      // Check if immediately settled or captured
      if (response.data?.status === 'success') {
        setStatus('success');
        await syncStatus();
      }
    } catch (chargeError) {
      setError(chargeError.response?.data?.message || 'Gagal memproses metode pembayaran. Silakan coba metode lain.');
    } finally {
      setIsCharging(false);
    }
  };

  // Switch/Reset payment method
  const handleChangeMethod = () => {
    setPaymentPayload(null);
    setPaymentChannel('');
    setError('');
    setNotice('');
  };

  // Cancel order handler
  const cancelPayment = async () => {
    setError('');
    setNotice('');
    setIsCanceling(true);
    setConfirmProcessing(true);

    try {
      const response = await window.axios.post(route('payments.midtrans.cancel', transaction.transaction_code));
      const nextStatus = response.data?.status || status;
      setStatus(nextStatus);
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

      <main className="min-h-screen bg-slate-50 px-3 py-3 text-slate-900 sm:px-6 sm:py-5 lg:py-6">
        <div className="mx-auto max-w-4xl">
          {/* Top Header */}
          <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 sm:pb-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={route('user.kelas.index')}
                aria-label="Kembali ke daftar kelas"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:h-10 sm:px-3 sm:text-sm"
              >
                <ArrowBackIcon sx={{ fontSize: 18 }} />
                <span className="hidden sm:inline">Kembali</span>
              </Link>
              <Link href={route('home')} className="truncate text-base font-black text-slate-950 sm:text-lg">
                TOKU-UP
              </Link>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 sm:text-xs">
              <VerifiedUserIcon sx={{ fontSize: 16 }} className="text-slate-600" />
              <span>Pembayaran Aman Midtrans Core API</span>
            </div>
          </header>

          {/* Main Grid: Split Layout */}
          <section className="mt-3.5 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mt-5 lg:mt-6 lg:grid-cols-[1.2fr_0.8fr]">
            
            {/* Left Column: Interactive Payment Area */}
            <div className="order-1 p-3.5 sm:p-5 lg:p-6">
              {/* Header Status Badge & Compact Bar */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${presentation.badgeClass}`}>
                      {presentation.label}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      #{transaction.transaction_code}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-1 sm:text-sm">
                    {presentation.description}
                  </p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${presentation.iconClass} sm:h-10 sm:w-10 sm:rounded-xl`}>
                  <StatusIcon sx={{ fontSize: 20 }} />
                </div>
              </div>

              {/* Mobile Quick Order Strip (Only shown on mobile) */}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs lg:hidden">
                <div className="min-w-0 pr-3">
                  <p className="truncate font-bold text-slate-800">{transaction.payment_plan?.name || 'Akses TOKU-UP'}</p>
                  <p className="text-[11px] text-slate-500">{transaction.scope_label || 'Akses Belajar'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-[10px] font-semibold text-slate-400">Total</span>
                  <span className="text-sm font-black text-[#c33d4b]">{transaction.amount_formatted}</span>
                </div>
              </div>

              {/* Alert / Notice Banner */}
              {(notice || error) && (
                <div
                  role={error ? 'alert' : 'status'}
                  className={`mt-3 flex items-start gap-2.5 rounded-xl border-l-4 px-3.5 py-2.5 text-xs leading-5 sm:text-sm ${
                    error
                      ? 'border-red-500 bg-red-50 text-red-800'
                      : 'border-slate-500 bg-slate-50 text-slate-700'
                  }`}
                >
                  {error ? <ErrorOutlineIcon sx={{ fontSize: 18 }} /> : <HourglassTopIcon sx={{ fontSize: 18 }} />}
                  <span>{error || notice}</span>
                </div>
              )}

              {/* State 1: Fresh Pending - Method Selection */}
              {isPending && !hasActivePaymentInstruction && (
                <div className="mt-4 sm:mt-6">
                  <PaymentMethodSelector
                    selectedChannel={paymentChannel}
                    onSelectChannel={setPaymentChannel}
                    onSubmitCharge={handleCharge}
                    processing={isCharging}
                    error={error}
                    midtrans={midtrans}
                    amount={transaction.amount}
                  />
                </div>
              )}

              {/* State 2: Pending with Charge Payload (Instruction State) */}
              {isPending && hasActivePaymentInstruction && (
                <div className="mt-4 sm:mt-6">
                  {paymentChannel === 'qris' ? (
                    <QrisView
                      payload={paymentPayload}
                      amountFormatted={transaction.amount_formatted}
                      onChangeMethod={handleChangeMethod}
                      isChanging={isCharging}
                    />
                  ) : ['bca_va', 'mandiri_bill', 'bni_va', 'bri_va', 'permata_va'].includes(paymentChannel) ? (
                    <VirtualAccountView
                      payload={paymentPayload}
                      channel={paymentChannel}
                      amountFormatted={transaction.amount_formatted}
                      onChangeMethod={handleChangeMethod}
                      isChanging={isCharging}
                    />
                  ) : ['gopay', 'shopeepay'].includes(paymentChannel) ? (
                    <EWalletView
                      payload={paymentPayload}
                      channel={paymentChannel}
                      amountFormatted={transaction.amount_formatted}
                      onChangeMethod={handleChangeMethod}
                      isChanging={isCharging}
                    />
                  ) : paymentChannel === 'credit_card' ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center">
                      <p className="text-xs font-bold text-slate-800 sm:text-sm">
                        Memproses verifikasi kartu kredit...
                      </p>
                      <p className="text-xs text-slate-500">
                        Jika jendela 3D Secure tidak terbuka otomatis, klik tombol di bawah untuk menyelesaikan OTP bank.
                      </p>
                      {threeDsUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(threeDsUrl, '_blank', 'width=600,height=700')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#c33d4b] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm"
                        >
                          <OpenInNewIcon sx={{ fontSize: 15 }} />
                          Buka Halaman OTP Bank
                        </button>
                      )}
                    </div>
                  ) : null}

                  {/* Actions under instruction */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 sm:mt-6 sm:pt-4">
                    <button
                      type="button"
                      onClick={() => syncStatus()}
                      disabled={isSyncing || isCanceling}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:text-sm"
                    >
                      <RefreshIcon sx={{ fontSize: 17 }} className={isSyncing ? 'animate-spin' : ''} />
                      {isSyncing ? 'Memeriksa status...' : 'Cek Status Pembayaran'}
                    </button>
                    <button
                      type="button"
                      onClick={confirmCancelPayment}
                      disabled={isSyncing || isCanceling}
                      className="inline-flex w-full items-center justify-center py-1.5 text-xs font-medium text-slate-400 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCanceling ? 'Membatalkan pesanan...' : 'Batalkan pesanan'}
                    </button>
                  </div>
                </div>
              )}

              {/* State 3: Payment Finished (Success / Active) */}
              {isDone && (
                <div className="mt-8 space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                    <CheckCircleIcon sx={{ fontSize: 48 }} className="text-emerald-600" />
                    <h2 className="mt-3 text-lg font-black text-emerald-950">Akses Kamu Sudah Aktif!</h2>
                    <p className="mt-1 text-xs text-emerald-800">
                      Selamat belajar di TOKU-UP. Materi kelas sudah bisa kamu akses sekarang.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                      href={route('user.kelas.index')}
                      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#c33d4b] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a9323f]"
                    >
                      Mulai Belajar
                    </Link>
                    <Link
                      href={route('user.dashboard')}
                      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                    >
                      Ke Dashboard
                    </Link>
                  </div>
                </div>
              )}

              {/* State 4: Pending Approval for Mentor Class */}
              {isPendingApproval && (
                <div className="mt-8 space-y-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 text-center">
                    <HourglassTopIcon sx={{ fontSize: 48 }} className="text-amber-600" />
                    <h2 className="mt-3 text-lg font-black text-amber-950">Menunggu Verifikasi Mentor</h2>
                    <p className="mt-1 text-xs text-amber-800">
                      Pembayaran kamu telah kami terima. Mentor akan meninjau dan mengonfirmasi pendaftaran kloter.
                    </p>
                  </div>

                  <Link
                    href={route('user.kelas.index')}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#c33d4b] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a9323f]"
                  >
                    Lihat Status Kelas
                  </Link>
                </div>
              )}

              {/* State 5: Restart Checkout for Failed / Expired / Canceled */}
              {shouldRestartCheckout && (
                <div className="mt-8 pt-4">
                  <Link
                    href={route('pricing')}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#c33d4b] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a9323f]"
                  >
                    Pilih Paket Pembayaran Baru
                  </Link>
                </div>
              )}
            </div>

            {/* Right Column: Order Summary (Sticky) */}
            <aside className="order-2 border-t border-slate-200 bg-slate-50/70 p-4 sm:p-6 lg:order-2 lg:border-l lg:border-t-0 lg:p-8">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <ReceiptLongIcon sx={{ fontSize: 17 }} />
                Ringkasan Pesanan
              </div>

              <h2 className="mt-2.5 break-words text-lg font-black text-slate-950 sm:text-xl">
                {transaction.payment_plan?.name || 'Akses TOKU-UP'}
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">
                {transaction.payment_plan?.description || 'Akses untuk membuka konten belajar lanjutan.'}
              </p>

              <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-200 text-xs sm:text-sm">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="font-medium text-slate-500">Cakupan Akses</dt>
                  <dd className="font-bold text-slate-900">{transaction.scope_label || 'Semua kelas'}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="font-medium text-slate-500">Nomor Pesanan</dt>
                  <dd className="font-mono font-bold text-slate-900">{transaction.transaction_code}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="font-medium text-slate-500">Tanggal Pesanan</dt>
                  <dd className="font-semibold text-slate-700">{formatDate(transaction.created_at)}</dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="font-bold text-slate-900">Total Tagihan</dt>
                  <dd className="text-lg font-black text-[#c33d4b] sm:text-xl">{transaction.amount_formatted}</dd>
                </div>
              </dl>

              {status === 'success' && kloter && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
                  <p className="font-bold text-slate-900">Kloter Belajar</p>
                  <p className="mt-1">
                    {kloter.nama} - Mulai {kloter.tanggal_mulai_label || '-'}
                    {kloter.admin_name ? ` bersama ${kloter.admin_name}` : ''}.
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-center sm:p-4">
                <VerifiedUserIcon sx={{ fontSize: 20 }} className="mx-auto text-slate-400" />
                <p className="mt-1.5 text-xs font-bold text-slate-700">Garansi Keamanan Pembayaran</p>
                <p className="mt-0.5 text-[10px] leading-4 text-slate-500 sm:text-[11px]">
                  Enkripsi SSL 256-bit standar PCI-DSS melalui payment gateway Midtrans.
                </p>
              </div>
            </aside>
          </section>
        </div>
      </main>

      {/* 3DS Secure Modal Dialog (For Credit Card OTP) */}
      {threeDsUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="relative flex h-[620px] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-xs font-bold text-slate-700">Verifikasi 3D Secure (OTP Bank)</span>
              <button
                type="button"
                onClick={() => setThreeDsUrl('')}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <CloseIcon sx={{ fontSize: 20 }} />
              </button>
            </div>
            <iframe
              src={threeDsUrl}
              title="3D Secure Verification"
              className="h-full w-full border-0"
            />
            <div className="border-t border-slate-200 bg-slate-50 p-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setThreeDsUrl('');
                  syncStatus();
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Saya Sudah Memasukkan OTP
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionDialog
        {...confirmState}
        onCancel={closeConfirm}
      />
    </>
  );
}

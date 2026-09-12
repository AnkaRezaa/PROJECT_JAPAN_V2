import React, { useState } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockIcon from '@mui/icons-material/Lock';
import CreditCardForm from './CreditCardForm';
import {
  QrisLogo,
  BcaLogo,
  MandiriLogo,
  BniLogo,
  BriLogo,
  PermataLogo,
  JcbLogo,
  VisaLogo,
  MastercardLogo,
  GopayLogo,
  DanaLogo,
  ShopeePayLogo,
  OvoLogo,
} from './PaymentLogos';

export const PAYMENT_CHANNELS = [
  {
    category: 'QRIS & E-Wallet (Scan & Aplikasi)',
    items: [
      {
        id: 'qris',
        name: 'QRIS (Semua Pembayaran & M-Banking)',
        desc: 'Scan barcode via GoPay, DANA, OVO, ShopeePay, BCA, Livin, dll.',
        badge: 'Rekomendasi',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        qrisLogos: true,
      },
      {
        id: 'gopay',
        name: 'GoPay (Aplikasi Gojek)',
        desc: 'Buka aplikasi Gojek otomatis di HP atau scan QR di komputer.',
        Logo: GopayLogo,
      },
      {
        id: 'shopeepay',
        name: 'ShopeePay (Aplikasi Shopee)',
        desc: 'Buka aplikasi Shopee otomatis di HP atau scan QR di komputer.',
        Logo: ShopeePayLogo,
      },
    ],
  },
  {
    category: 'Transfer Virtual Account (Verifikasi Otomatis)',
    items: [
      {
        id: 'bca_va',
        name: 'BCA Virtual Account',
        desc: 'Bayar via m-BCA, KlikBCA, atau ATM BCA',
        Logo: BcaLogo,
      },
      {
        id: 'mandiri_bill',
        name: 'Mandiri Bill Payment',
        desc: 'Bayar via Livin by Mandiri atau ATM Mandiri',
        Logo: MandiriLogo,
      },
      {
        id: 'bni_va',
        name: 'BNI Virtual Account',
        desc: 'Bayar via BNI Mobile Banking atau ATM BNI',
        Logo: BniLogo,
      },
      {
        id: 'bri_va',
        name: 'BRI Virtual Account (BRIVA)',
        desc: 'Bayar via BRImo atau ATM BRI',
        Logo: BriLogo,
      },
      {
        id: 'permata_va',
        name: 'Permata Virtual Account',
        desc: 'Bayar via PermataMobile X atau ATM Permata',
        Logo: PermataLogo,
      },
    ],
  },
  {
    category: 'Kartu Kredit / Debit Internasional & Domestik',
    items: [
      {
        id: 'credit_card',
        name: 'Kartu Kredit / Debit (JCB, Visa, Mastercard)',
        desc: 'Mendukung kartu debit/kredit Jepang (JCB/Rakuten/SMBC) & global.',
        badge: 'Jepang & Global',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        customLogos: true,
      },
    ],
  },
];

export default function PaymentMethodSelector({
  selectedChannel,
  onSelectChannel,
  onSubmitCharge,
  processing,
  error,
  midtrans,
  amount,
}) {
  const [activeChannel, setActiveChannel] = useState(selectedChannel || 'qris');

  const handleChannelClick = (channelId) => {
    setActiveChannel(channelId);
    onSelectChannel?.(channelId);
  };

  const handleProceed = () => {
    if (activeChannel === 'credit_card') return;
    onSubmitCharge(activeChannel);
  };

  const handleCardTokenSubmit = (tokenId) => {
    onSubmitCharge('credit_card', tokenId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-950 sm:text-xl">
          Pilih Metode Pembayaran
        </h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Semua transaksi diproses aman dan terverifikasi otomatis oleh Midtrans.
        </p>
      </div>

      <div className="space-y-5">
        {PAYMENT_CHANNELS.map((group) => (
          <div key={group.category} className="space-y-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              {group.category}
            </h3>

            <div className="space-y-2">
              {group.items.map((item) => {
                const isSelected = activeChannel === item.id;
                const LogoComponent = item.Logo;

                return (
                  <div key={item.id} className="transition-all">
                    <label
                      onClick={() => handleChannelClick(item.id)}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                        isSelected
                          ? 'border-[#c33d4b] bg-rose-50/40 ring-2 ring-[#c33d4b]/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                            isSelected
                              ? 'border-[#c33d4b] bg-[#c33d4b] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {item.name}
                            </span>
                            {item.badge && (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${item.badgeColor}`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {item.qrisLogos ? (
                          <div className="flex items-center gap-1.5">
                            <QrisLogo className="h-6" />
                            <GopayLogo className="hidden h-4 sm:inline-block" />
                            <DanaLogo className="hidden h-4 sm:inline-block" />
                          </div>
                        ) : item.customLogos ? (
                          <div className="flex items-center gap-1.5">
                            <JcbLogo className="h-4" />
                            <VisaLogo className="h-4" />
                            <MastercardLogo className="h-4" />
                          </div>
                        ) : LogoComponent ? (
                          <LogoComponent className="h-6 w-auto max-w-[80px]" />
                        ) : null}
                      </div>
                    </label>

                    {/* Integrated Form for Credit Card */}
                    {isSelected && item.id === 'credit_card' && (
                      <CreditCardForm
                        midtrans={midtrans}
                        amount={amount}
                        onSubmit={handleCardTokenSubmit}
                        processing={processing}
                        error={error}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {activeChannel !== 'credit_card' && (
        <div className="pt-2">
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleProceed}
            disabled={processing}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c33d4b] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a9323f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? (
              'Membuat Instruksi Pembayaran...'
            ) : (
              <>
                Lanjutkan Pembayaran
                <ArrowForwardIcon sx={{ fontSize: 18 }} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

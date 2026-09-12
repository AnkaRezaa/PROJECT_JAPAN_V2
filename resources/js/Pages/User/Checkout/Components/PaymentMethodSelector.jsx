import React, { useState } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockIcon from '@mui/icons-material/Lock';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CreditCardForm from './CreditCardForm';
import {
  QrisLogo,
  BcaLogo,
  MandiriLogo,
  BniLogo,
  BriLogo,
  PermataLogo,
  CimbLogo,
  JcbLogo,
  VisaLogo,
  MastercardLogo,
  GopayLogo,
  DanaLogo,
  ShopeePayLogo,
  OvoLogo,
  AkulakuLogo,
  KredivoLogo,
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
        id: 'cimb_va',
        name: 'CIMB Niaga Virtual Account',
        desc: 'Bayar via OCTO Mobile, OCTO Clicks, atau ATM CIMB',
        Logo: CimbLogo,
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
    category: 'PayLater (Cicilan & Bayar Nanti)',
    items: [
      {
        id: 'akulaku',
        name: 'Akulaku PayLater',
        desc: 'Bayar dalam 30 hari atau cicilan via akun Akulaku.',
        Logo: AkulakuLogo,
      },
      {
        id: 'kredivo',
        name: 'Kredivo PayLater',
        desc: 'Bayar dalam 30 hari atau cicilan via akun Kredivo.',
        Logo: KredivoLogo,
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
  const [activeTab, setActiveTab] = useState(selectedChannel === 'credit_card' ? 'card' : 'domestic');
  const [activeChannel, setActiveChannel] = useState(selectedChannel || 'qris');

  const handleChannelClick = (channelId) => {
    setActiveChannel(channelId);
    onSelectChannel?.(channelId);
  };

  const handleProceed = () => {
    if (activeTab === 'card' || activeChannel === 'credit_card') return;
    onSubmitCharge(activeChannel);
  };

  const handleCardTokenSubmit = (tokenId) => {
    onSubmitCharge('credit_card', tokenId);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-black text-slate-950 sm:text-lg">
          Pilih Metode Pembayaran
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Semua transaksi aman dan terverifikasi otomatis oleh Midtrans.
        </p>
      </div>

      {/* Minimalist Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-6 sm:gap-8">
        <button
          type="button"
          onClick={() => {
            setActiveTab('domestic');
            if (activeChannel === 'credit_card') {
              setActiveChannel('qris');
              onSelectChannel?.('qris');
            }
          }}
          className={`-mb-px pb-2 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'domestic'
              ? 'border-[#c33d4b] text-slate-950 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <AccountBalanceWalletIcon sx={{ fontSize: 16 }} />
          <span>Pembayaran Domestik</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('card');
            setActiveChannel('credit_card');
            onSelectChannel?.('credit_card');
          }}
          className={`-mb-px pb-2 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'card'
              ? 'border-[#c33d4b] text-slate-950 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CreditCardIcon sx={{ fontSize: 16 }} />
          <span>Kartu Kredit / Internasional</span>
        </button>
      </div>

      {/* Tab 1: Domestic / Instant Payment Methods */}
      {activeTab === 'domestic' && (
        <div className="space-y-3.5">
          {PAYMENT_CHANNELS.map((group) => (
            <div key={group.category} className="space-y-1.5">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {group.category}
              </h3>

              <div className={group.items.length > 1 ? 'grid grid-cols-1 gap-1.5 sm:grid-cols-2' : 'space-y-1.5'}>
                {group.items.map((item) => {
                  const isSelected = activeChannel === item.id;
                  const LogoComponent = item.Logo;
                  const isFullSpan = item.id === 'qris';

                  return (
                    <div key={item.id} className={`transition-all ${isFullSpan ? 'sm:col-span-2' : ''}`}>
                      <label
                        onClick={() => handleChannelClick(item.id)}
                        className={`flex h-full cursor-pointer items-center justify-between gap-2 rounded-xl border p-2.5 transition ${
                          isSelected
                            ? 'border-[#c33d4b] bg-rose-50/40 ring-1.5 ring-[#c33d4b]/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition sm:h-4.5 sm:w-4.5 ${
                              isSelected
                                ? 'border-[#c33d4b] bg-[#c33d4b] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="truncate text-xs font-bold text-slate-900">
                                {item.name}
                              </span>
                              {item.badge && (
                                <span
                                  className={`rounded-full border px-1.5 py-0.2 text-[9px] font-extrabold ${item.badgeColor}`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[10px] text-slate-500 line-clamp-1">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 pl-1">
                          {item.qrisLogos ? (
                            <div className="flex items-center gap-1.5">
                              <QrisLogo className="h-5" />
                              <GopayLogo className="h-3.5" />
                              <DanaLogo className="h-3.5" />
                              <OvoLogo className="h-3.5" />
                              <ShopeePayLogo className="h-3.5" />
                            </div>
                          ) : LogoComponent ? (
                            <LogoComponent className="h-5 sm:h-6 w-auto max-w-[80px]" />
                          ) : null}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-1">
            {error && (
              <p className="mb-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleProceed}
              disabled={processing}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#c33d4b] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#a9323f] disabled:cursor-not-allowed disabled:opacity-60 sm:h-12"
            >
              {processing ? (
                'Membuat Instruksi Pembayaran...'
              ) : (
                <>
                  Lanjutkan Pembayaran
                  <ArrowForwardIcon sx={{ fontSize: 17 }} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Credit / Debit Card (Global & Japan) */}
      {activeTab === 'card' && (
        <div className="space-y-3.5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 sm:p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2">
                <CreditCardIcon sx={{ fontSize: 16 }} className="text-slate-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Kartu Kredit & Debit Internasional
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <JcbLogo className="h-3.5" />
                <VisaLogo className="h-3.5" />
                <MastercardLogo className="h-3.5" />
              </div>
            </div>

            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              Mendukung kartu perbankan Jepang (JCB, Rakuten, SMBC, MUFG) serta Visa & Mastercard internasional dengan proteksi 3D Secure Midtrans.
            </p>
          </div>

          <CreditCardForm
            midtrans={midtrans}
            amount={amount}
            onSubmit={handleCardTokenSubmit}
            processing={processing}
            error={error}
          />
        </div>
      )}
    </div>
  );
}

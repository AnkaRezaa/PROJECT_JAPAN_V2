import React from 'react';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { GopayLogo, ShopeePayLogo } from './PaymentLogos';

export default function EWalletView({
  payload,
  channel,
  amountFormatted,
  onChangeMethod,
  isChanging,
}) {
  const isGopay = channel === 'gopay';
  const name = isGopay ? 'GoPay' : 'ShopeePay';
  const Logo = isGopay ? GopayLogo : ShopeePayLogo;
  const appName = isGopay ? 'Gojek' : 'Shopee';

  const deeplinkUrl = payload?.deeplink_url;
  const qrUrl = payload?.qr_url
    || (deeplinkUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deeplinkUrl)}` : null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Metode Pembayaran
          </span>
          <h2 className="text-lg font-black text-slate-950 sm:text-xl">
            {name} (Direct E-Wallet)
          </h2>
        </div>
        <Logo className="h-7 w-auto max-w-[100px]" />
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Deeplink / Web Payment Button */}
        {deeplinkUrl && (
          <div className="w-full max-w-sm text-center">
            <a
              href={deeplinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-white shadow-sm transition ${
                isGopay ? 'bg-[#00AED6] hover:bg-[#0096B9]' : 'bg-[#EE4D2D] hover:bg-[#D63F20]'
              }`}
            >
              <OpenInNewIcon sx={{ fontSize: 19 }} />
              Buka {appName} / Bayar Sekarang
            </a>
            <p className="mt-2 text-center text-xs text-slate-500">
              Di ponsel: membuka aplikasi {appName}. Di komputer: membuka tab pembayaran baru.
            </p>
          </div>
        )}

        {/* QR Code for Desktop & Scan Fallback */}
        {qrUrl && (
          <div className={`flex flex-col items-center text-center ${deeplinkUrl ? 'mt-6 border-t border-slate-100 pt-5' : ''}`}>
            <span className="text-xs font-bold text-slate-500">
              Scan QR {name} melalui kamera atau aplikasi ponsel:
            </span>
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
              <img
                src={qrUrl}
                alt={`QR Code ${name}`}
                className="h-48 w-48 object-contain sm:h-56 sm:w-56"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Arahkan kamera HP atau pemindai {appName} ke kode QR di atas.
            </p>
          </div>
        )}

        <div className="mt-5 text-center">
          <p className="text-xs font-medium text-slate-500">Total Nominal Pembayaran</p>
          <p className="mt-0.5 text-xl font-black text-slate-950">{amountFormatted}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs leading-5 text-slate-600">
        <p className="font-bold text-slate-800">Petunjuk Pembayaran {name}:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Jika di HP, klik tombol <strong>"Buka Aplikasi {appName}"</strong> untuk membuka halaman konfirmasi.</li>
          <li>Jika di laptop/komputer, buka aplikasi {appName} di ponsel Anda lalu scan kode QR di atas.</li>
          <li>Periksa rincian pembayaran, lalu masukkan PIN atau autentikasi biometrik Anda.</li>
          <li>Halaman ini akan otomatis diperbarui begitu pembayaran berhasil.</li>
        </ol>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onChangeMethod}
          disabled={isChanging}
          className="text-xs font-bold text-slate-500 transition hover:text-slate-900"
        >
          ← Pilih metode pembayaran lain
        </button>
      </div>
    </div>
  );
}

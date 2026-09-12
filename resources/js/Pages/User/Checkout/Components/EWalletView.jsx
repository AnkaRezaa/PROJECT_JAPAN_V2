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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Metode Pembayaran
          </span>
          <h2 className="text-base font-black text-slate-950 sm:text-lg">
            {name} (Direct E-Wallet)
          </h2>
        </div>
        <Logo className="h-6 w-auto max-w-[80px]" />
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        {/* Deeplink / Web Payment Button */}
        {deeplinkUrl && (
          <div className="w-full max-w-sm text-center">
            <a
              href={deeplinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-white shadow-sm transition sm:h-12 ${
                isGopay ? 'bg-[#00AED6] hover:bg-[#0096B9]' : 'bg-[#EE4D2D] hover:bg-[#D63F20]'
              }`}
            >
              <OpenInNewIcon sx={{ fontSize: 18 }} />
              Buka {appName} / Bayar Sekarang
            </a>
            <p className="mt-1.5 text-center text-[11px] text-slate-500">
              Di ponsel: membuka aplikasi {appName}. Di komputer: membuka tab pembayaran baru.
            </p>
          </div>
        )}

        {/* QR Code for Desktop & Scan Fallback */}
        {qrUrl && (
          <div className={`flex flex-col items-center text-center ${deeplinkUrl ? 'mt-4 border-t border-slate-100 pt-4' : ''}`}>
            <span className="text-[11px] font-bold text-slate-500">
              Scan QR {name} melalui ponsel:
            </span>
            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-inner">
              <img
                src={qrUrl}
                alt={`QR Code ${name}`}
                className="h-36 w-36 object-contain sm:h-44 sm:w-44"
              />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">
              Arahkan kamera HP atau pemindai {appName} ke kode di atas.
            </p>
          </div>
        )}

        <div className="mt-3.5 flex w-full items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
          <span className="font-medium text-slate-500">Total Nominal</span>
          <span className="text-base font-black text-slate-950">{amountFormatted}</span>
        </div>
      </div>

      {/* Collapsible Instructions */}
      <details className="group rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-600">
        <summary className="flex cursor-pointer items-center justify-between p-3 font-bold text-slate-700 select-none hover:text-slate-900">
          <span>Petunjuk Pembayaran {name}</span>
          <span className="text-xs text-slate-400 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="border-t border-slate-200/60 px-3.5 pb-3 pt-2 text-xs leading-5">
          <ol className="list-decimal space-y-1 pl-4">
            <li>Di HP: klik tombol <strong>"Buka {appName}"</strong> untuk langsung ke menu pembayaran.</li>
            <li>Di laptop: buka aplikasi {appName} di HP lalu scan QR di atas.</li>
            <li>Periksa rincian tagihan, masukkan PIN Anda.</li>
            <li>Halaman akan otomatis terupdate setelah pembayaran selesai.</li>
          </ol>
        </div>
      </details>

      <div>
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

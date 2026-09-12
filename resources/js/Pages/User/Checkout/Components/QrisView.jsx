import React from 'react';
import DownloadIcon from '@mui/icons-material/Download';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  QrisLogo,
  GopayLogo,
  DanaLogo,
  OvoLogo,
  ShopeePayLogo,
  BcaLogo,
  MandiriLogo,
} from './PaymentLogos';

export default function QrisView({
  payload,
  amountFormatted,
  onChangeMethod,
  isChanging,
}) {
  const qrUrl = payload?.qr_url;
  const qrString = payload?.qr_string;

  const qrImageSrc =
    qrUrl ||
    (qrString
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`
      : null);

  const handleDownload = () => {
    if (!qrImageSrc) return;
    const link = document.createElement('a');
    link.href = qrImageSrc;
    link.download = `QRIS-Payment-${Date.now()}.png`;
    link.target = '_blank';
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Metode Pembayaran
          </span>
          <h2 className="text-base font-black text-slate-950 sm:text-lg">
            QRIS (Quick Response Code)
          </h2>
        </div>
        <QrisLogo className="h-6 w-auto max-w-[80px]" />
      </div>

      {/* QR Code Container */}
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-inner">
          {qrImageSrc ? (
            <img
              src={qrImageSrc}
              alt="QRIS Code"
              className="h-40 w-40 object-contain sm:h-52 sm:w-52"
            />
          ) : (
            <div className="flex h-40 w-40 flex-col items-center justify-center text-slate-400 sm:h-52 sm:w-52">
              <QrCode2Icon sx={{ fontSize: 44 }} />
              <p className="mt-1 text-[11px] font-semibold">Memuat Kode QRIS...</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex w-full items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
          <span className="font-medium text-slate-500">Total Nominal</span>
          <span className="text-base font-black text-slate-950">{amountFormatted}</span>
        </div>

        {qrImageSrc && (
          <button
            type="button"
            onClick={handleDownload}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
          >
            <DownloadIcon sx={{ fontSize: 15 }} />
            Unduh Gambar QRIS
          </button>
        )}

        {/* E-Wallet & Bank Badges */}
        <div className="mt-3.5 w-full border-t border-slate-100 pt-2.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Dapat dibayar melalui:
          </p>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
            <GopayLogo className="h-4" />
            <DanaLogo className="h-4" />
            <OvoLogo className="h-4" />
            <ShopeePayLogo className="h-4" />
            <BcaLogo className="h-4" />
            <MandiriLogo className="h-4" />
          </div>
        </div>
      </div>

      {/* Collapsible Instructions */}
      <details className="group rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-600">
        <summary className="flex cursor-pointer items-center justify-between p-3 font-bold text-slate-700 select-none hover:text-slate-900">
          <span>Cara Pembayaran QRIS</span>
          <span className="text-xs text-slate-400 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="border-t border-slate-200/60 px-3.5 pb-3 pt-2 text-xs leading-5">
          <ol className="list-decimal space-y-1 pl-4">
            <li>Buka m-Banking (BCA, Livin, BRI, BNI) atau e-Wallet (GoPay, DANA, OVO, ShopeePay).</li>
            <li>Pilih menu <strong>Scan / Bayar QRIS</strong>.</li>
            <li>Arahkan kamera ke QR code di atas, atau unggah gambar jika diunduh.</li>
            <li>Periksa nominal dan konfirmasi dengan PIN Anda.</li>
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

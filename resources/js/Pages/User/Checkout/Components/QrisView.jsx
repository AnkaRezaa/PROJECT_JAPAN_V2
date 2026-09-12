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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Metode Pembayaran
          </span>
          <h2 className="text-lg font-black text-slate-950 sm:text-xl">
            QRIS (Quick Response Code)
          </h2>
        </div>
        <QrisLogo className="h-7 w-auto max-w-[90px]" />
      </div>

      {/* QR Code Container */}
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
          {qrImageSrc ? (
            <img
              src={qrImageSrc}
              alt="QRIS Code"
              className="h-56 w-56 object-contain sm:h-64 sm:w-64"
            />
          ) : (
            <div className="flex h-56 w-56 flex-col items-center justify-center text-slate-400 sm:h-64 sm:w-64">
              <QrCode2Icon sx={{ fontSize: 60 }} />
              <p className="mt-2 text-xs font-semibold">Memuat Kode QRIS...</p>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs font-medium text-slate-500">Total Nominal Pembayaran</p>
          <p className="mt-0.5 text-xl font-black text-slate-950">{amountFormatted}</p>
        </div>

        {qrImageSrc && (
          <button
            type="button"
            onClick={handleDownload}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
          >
            <DownloadIcon sx={{ fontSize: 16 }} />
            Unduh Gambar QRIS
          </button>
        )}

        {/* E-Wallet & Bank Badges */}
        <div className="mt-6 w-full border-t border-slate-100 pt-4 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Dapat dibayar melalui aplikasi apa saja:
          </p>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <GopayLogo className="h-5" />
            <DanaLogo className="h-5" />
            <OvoLogo className="h-5" />
            <ShopeePayLogo className="h-5" />
            <BcaLogo className="h-5" />
            <MandiriLogo className="h-5" />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs leading-5 text-slate-600">
        <p className="font-bold text-slate-800">Cara Pembayaran QRIS:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau e-Wallet (GoPay, DANA, OVO, ShopeePay).</li>
          <li>Pilih menu <strong>Scan / Bayar QRIS</strong>.</li>
          <li>Arahkan kamera ke QR code di atas, atau pilih dari galeri jika Anda mengunduh QR.</li>
          <li>Pastikan nominal pembayaran sesuai, lalu konfirmasi dengan PIN Anda.</li>
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

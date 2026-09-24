import React, { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { IndomaretLogo, AlfamartLogo } from './PaymentLogos';

export default function ConvenienceStoreView({
  payload,
  channel,
  amountFormatted,
  onChangeMethod,
  isChanging,
}) {
  const [copied, setCopied] = useState(false);

  const isIndomaret = channel === 'indomaret';
  const storeName = isIndomaret ? 'Indomaret' : 'Alfamart';
  const Logo = isIndomaret ? IndomaretLogo : AlfamartLogo;
  const paymentCode = payload?.payment_code || '-';
  const pdfUrl = payload?.pdf_url;

  const handleCopyCode = async () => {
    if (!paymentCode || paymentCode === '-') return;
    try {
      await navigator.clipboard.writeText(paymentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Metode Pembayaran
          </span>
          <h2 className="text-base font-black text-slate-950 sm:text-lg">
            Gerai Retail ({storeName})
          </h2>
        </div>
        <Logo className="h-6 w-auto max-w-[90px]" />
      </div>

      {/* Main Payment Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold">Kode Pembayaran Kasir</span>
          <span className="flex items-center gap-1 font-medium text-slate-600">
            <StorefrontIcon sx={{ fontSize: 16 }} />
            {storeName}
          </span>
        </div>

        {/* Big Code & Copy Button */}
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 sm:p-3.5">
          <span className="font-mono text-lg font-black tracking-wider text-slate-900 sm:text-2xl">
            {paymentCode}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Salin Kode Pembayaran"
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-sm ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            {copied ? (
              <>
                <CheckIcon sx={{ fontSize: 15 }} />
                Tersalin
              </>
            ) : (
              <>
                <ContentCopyIcon sx={{ fontSize: 15 }} />
                Salin Kode
              </>
            )}
          </button>
        </div>

        <p className="mt-2 text-center text-[11px] text-slate-500">
          Tunjukkan kode ini kepada kasir {storeName} saat melakukan pembayaran.
        </p>

        {pdfUrl && (
          <div className="mt-3 text-center">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
            >
              <PictureAsPdfIcon sx={{ fontSize: 16 }} />
              Unduh Dokumen Panduan / Struk
            </a>
          </div>
        )}

        {/* Total Price */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <span className="font-medium text-slate-500">Total Tagihan</span>
          <span className="text-base font-black text-slate-950">{amountFormatted}</span>
        </div>
      </div>

      {/* Collapsible Cashier Instructions */}
      <details className="group rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-600">
        <summary className="flex cursor-pointer items-center justify-between p-3 font-bold text-slate-700 select-none hover:text-slate-900">
          <span>Petunjuk Pembayaran di Kasir {storeName}</span>
          <span className="text-xs text-slate-400 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="border-t border-slate-200/60 px-3.5 pb-3 pt-2 text-xs leading-5">
          <ol className="list-decimal space-y-1 pl-4">
            <li>Kunjungi gerai <strong>{storeName}</strong> terdekat {isIndomaret ? '(atau Ceriamart)' : '(atau Alfamidi / Dan+Dan)'}.</li>
            <li>Beritahu kasir bahwa Anda ingin melakukan pembayaran merchant <strong>Midtrans / TOKU-UP</strong>.</li>
            <li>Tunjukkan <strong>Kode Pembayaran</strong> di atas kepada kasir.</li>
            <li>Bayar sesuai total nominal tagihan dan minta struk pembayaran resmi.</li>
            <li>Simpan struk sebagai bukti pembayaran yang sah. Status akan terupdate otomatis.</li>
          </ol>
        </div>
      </details>

      {/* Change Method Button */}
      <div>
        <button
          type="button"
          onClick={onChangeMethod}
          disabled={isChanging}
          className="inline-flex w-full items-center justify-center py-2 text-xs font-bold text-slate-600 transition hover:text-[#c33d4b] disabled:opacity-50"
        >
          {isChanging ? 'Memuat...' : '← Ganti Metode Pembayaran Lain'}
        </button>
      </div>
    </div>
  );
}

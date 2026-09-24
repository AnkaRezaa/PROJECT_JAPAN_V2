import React from 'react';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CreditScoreIcon from '@mui/icons-material/CreditScore';
import { AkulakuLogo, KredivoLogo } from './PaymentLogos';

export default function PayLaterView({
  payload,
  channel,
  amountFormatted,
  onChangeMethod,
  isChanging,
}) {
  const isAkulaku = channel === 'akulaku';
  const name = isAkulaku ? 'Akulaku' : 'Kredivo';
  const Logo = isAkulaku ? AkulakuLogo : KredivoLogo;
  const redirectUrl = payload?.redirect_url;
  const brandBg = isAkulaku ? 'bg-[#E5232A] hover:bg-[#c9181e]' : 'bg-[#F58220] hover:bg-[#dc6e11]';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Metode Pembayaran
          </span>
          <h2 className="text-base font-black text-slate-950 sm:text-lg">
            {name} PayLater
          </h2>
        </div>
        <Logo className="h-6 w-auto max-w-[90px]" />
      </div>

      {/* Main Payment Box */}
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <CreditScoreIcon sx={{ fontSize: 26 }} />
        </div>

        <h3 className="mt-2.5 text-center text-sm font-black text-slate-900 sm:text-base">
          Selesaikan Transaksi di {name}
        </h3>
        <p className="mt-1 max-w-sm text-center text-xs text-slate-500">
          Klik tombol di bawah untuk login ke akun {name} Anda dan mengonfirmasi cicilan atau opsi pembayaran 30 hari.
        </p>

        {/* Redirect CTA Button */}
        {redirectUrl && (
          <div className="mt-4 w-full max-w-sm text-center">
            <a
              href={redirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-white shadow-sm transition sm:h-12 ${brandBg}`}
            >
              <OpenInNewIcon sx={{ fontSize: 18 }} />
              Buka Halaman Pembayaran {name}
            </a>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">
              Jendela baru akan terbuka. Setelah menyelesaikan konfirmasi, kembali ke halaman ini.
            </p>
          </div>
        )}

        {/* Total Price */}
        <div className="mt-4 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <span className="font-medium text-slate-500">Total Tagihan</span>
          <span className="text-base font-black text-slate-950">{amountFormatted}</span>
        </div>
      </div>

      {/* Collapsible PayLater Instructions */}
      <details className="group rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-600">
        <summary className="flex cursor-pointer items-center justify-between p-3 font-bold text-slate-700 select-none hover:text-slate-900">
          <span>Petunjuk Pembayaran {name}</span>
          <span className="text-xs text-slate-400 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="border-t border-slate-200/60 px-3.5 pb-3 pt-2 text-xs leading-5">
          <ol className="list-decimal space-y-1 pl-4">
            <li>Klik tombol <strong>"Buka Halaman Pembayaran {name}"</strong> di atas.</li>
            <li>Masuk dengan nomor ponsel dan PIN akun {name} Anda.</li>
            <li>Pilih skema pembayaran: <em>Bayar 30 Hari</em> atau <em>Cicilan Ringan</em>.</li>
            <li>Konfirmasi transaksi dengan memasukkan kode OTP yang dikirimkan via SMS/WhatsApp.</li>
            <li>Setelah selesai, status pembayaran pada halaman ini akan otomatis diperbarui.</li>
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

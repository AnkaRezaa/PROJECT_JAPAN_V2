import React, { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import {
  BcaLogo,
  MandiriLogo,
  BniLogo,
  BriLogo,
  PermataLogo,
  CimbLogo,
} from './PaymentLogos';

const bankGuides = {
  bca_va: {
    name: 'BCA Virtual Account',
    Logo: BcaLogo,
    instructions: [
      {
        title: 'm-BCA (BCA Mobile)',
        steps: [
          'Buka aplikasi BCA mobile dan pilih menu m-BCA.',
          'Pilih menu m-Transfer, lalu pilih BCA Virtual Account.',
          'Masukkan Nomor BCA Virtual Account di atas dan klik Kirim.',
          'Pastikan nama dan nominal pembayaran sudah sesuai, lalu masukkan PIN m-BCA.',
          'Transaksi selesai. Simpan bukti transfer Anda.',
        ],
      },
      {
        title: 'KlikBCA (Internet Banking)',
        steps: [
          'Login ke KlikBCA Individual.',
          'Pilih menu Transfer Dana > Transfer ke BCA Virtual Account.',
          'Masukkan nomor BCA Virtual Account di atas.',
          'Pastikan informasi tagihan sesuai, lalu masukkan respon KeyBCA Appli 1.',
          'Transaksi selesai.',
        ],
      },
      {
        title: 'ATM BCA',
        steps: [
          'Masukkan Kartu ATM dan PIN BCA Anda.',
          'Pilih menu Transaksi Lainnya > Transfer > Ke Rek BCA Virtual Account.',
          'Masukkan nomor BCA Virtual Account, lalu pilih Benar.',
          'Periksa detail pembayaran di layar, jika sesuai pilih Ya.',
        ],
      },
    ],
  },
  mandiri_bill: {
    name: 'Mandiri Bill Payment',
    Logo: MandiriLogo,
    instructions: [
      {
        title: 'Livin by Mandiri (Kuning)',
        steps: [
          'Login ke aplikasi Livin by Mandiri.',
          'Pilih menu Bayar > Buat Pembayaran Baru.',
          'Pilih PLN / Multipayment / Cari Midtrans.',
          'Masukkan Kode Perusahaan / Biller Code di atas.',
          'Masukkan Nomor Bill Key / Nomor Tagihan di atas, lalu lanjutkan.',
          'Konfirmasi pembayaran dan masukkan PIN Livin Anda.',
        ],
      },
      {
        title: 'ATM Mandiri',
        steps: [
          'Masukkan kartu ATM Mandiri dan PIN Anda.',
          'Pilih menu Bayar/Beli > Lainnya > Lainnya > Multi Payment.',
          'Masukkan Kode Perusahaan (Biller Code) lalu tekan Benar.',
          'Masukkan Nomor Pembayaran / Bill Key lalu tekan Benar.',
          'Konfirmasi tagihan di layar lalu tekan Ya.',
        ],
      },
    ],
  },
  bni_va: {
    name: 'BNI Virtual Account',
    Logo: BniLogo,
    instructions: [
      {
        title: 'BNI Mobile Banking',
        steps: [
          'Buka aplikasi BNI Mobile Banking dan login.',
          'Pilih menu Pembayaran > Virtual Account Billing.',
          'Pilih tab Input Baru, lalu masukkan Nomor Virtual Account.',
          'Periksa nominal dan nama penerima di layar konfirmasi.',
          'Masukkan Password Transaksi Anda dan klik Lanjut.',
        ],
      },
      {
        title: 'ATM BNI',
        steps: [
          'Masukkan kartu ATM BNI dan PIN Anda.',
          'Pilih Menu Lainnya > Transfer > Jenis Rekening: Tabungan.',
          'Pilih Virtual Account Billing, masukkan nomor VA di atas.',
          'Konfirmasi rincian pembayaran, lalu pilih Ya.',
        ],
      },
    ],
  },
  bri_va: {
    name: 'BRI Virtual Account (BRIVA)',
    Logo: BriLogo,
    instructions: [
      {
        title: 'BRImo (Mobile Banking)',
        steps: [
          'Buka aplikasi BRImo dan login akun Anda.',
          'Pilih menu Tagihan > BRIVA.',
          'Pilih Tambah Transaksi Baru dan masukkan nomor BRIVA di atas.',
          'Pastikan nominal dan nama tertera sesuai.',
          'Klik Bayar dan masukkan PIN BRImo Anda.',
        ],
      },
      {
        title: 'ATM BRI',
        steps: [
          'Masukkan kartu ATM BRI dan PIN Anda.',
          'Pilih menu Transaksi Lain > Pembayaran > Lainnya > BRIVA.',
          'Masukkan nomor BRIVA di atas dan tekan Benar.',
          'Konfirmasi pembayaran lalu tekan Ya.',
        ],
      },
    ],
  },
  permata_va: {
    name: 'Permata Virtual Account',
    Logo: PermataLogo,
    instructions: [
      {
        title: 'PermataMobile X',
        steps: [
          'Login ke aplikasi PermataMobile X.',
          'Pilih menu Bayar Tagihan > Virtual Account.',
          'Masukkan nomor Permata Virtual Account di atas.',
          'Pastikan detail pembayaran sesuai, lalu konfirmasi dengan PIN Anda.',
        ],
      },
    ],
  },
  cimb_va: {
    name: 'CIMB Niaga Virtual Account',
    Logo: CimbLogo,
    instructions: [
      {
        title: 'OCTO Mobile by CIMB Niaga',
        steps: [
          'Login ke aplikasi OCTO Mobile.',
          'Pilih menu Pembayaran Tagihan / Transfer > Virtual Account.',
          'Masukkan nomor CIMB Virtual Account di atas.',
          'Periksa detail tagihan dan masukkan PIN OCTO Mobile Anda.',
        ],
      },
      {
        title: 'OCTO Clicks (Internet Banking)',
        steps: [
          'Login ke OCTO Clicks.',
          'Pilih menu Bayar Tagihan > Virtual Account.',
          'Masukkan nomor CIMB Virtual Account di atas dan konfirmasi pembayaran.',
        ],
      },
      {
        title: 'ATM CIMB Niaga',
        steps: [
          'Masukkan kartu ATM dan PIN CIMB Niaga Anda.',
          'Pilih menu Pembayaran > Lanjut > Virtual Account.',
          'Masukkan nomor CIMB Virtual Account di atas lalu pilih Proses.',
        ],
      },
    ],
  },
};

export default function VirtualAccountView({
  payload,
  channel,
  amountFormatted,
  onChangeMethod,
  isChanging,
}) {
  const [copiedVA, setCopiedVA] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [openGuide, setOpenGuide] = useState(-1);

  const guide = bankGuides[channel] || bankGuides.bca_va;
  const Logo = guide.Logo;
  const isMandiri = channel === 'mandiri_bill';

  const vaNumber = payload?.va_number || '-';
  const billerCode = payload?.biller_code || '-';
  const billKey = payload?.bill_key || '-';

  const copyToClipboard = (text, type) => {
    navigator.clipboard?.writeText(text);
    if (type === 'va') {
      setCopiedVA(true);
      setTimeout(() => setCopiedVA(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Metode Pembayaran
          </span>
          <h2 className="text-base font-black text-slate-950 sm:text-lg">
            {guide.name}
          </h2>
        </div>
        <Logo className="h-6 w-auto max-w-[80px]" />
      </div>

      {/* VA Number Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        {isMandiri ? (
          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-bold text-slate-500">Kode Perusahaan (Biller Code)</span>
              <div className="mt-1 flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                <span className="font-mono text-base font-black text-slate-950 sm:text-lg">{billerCode}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(billerCode, 'biller')}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                  Salin
                </button>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500">Nomor Tagihan (Bill Key)</span>
              <div className="mt-1 flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                <span className="font-mono text-base font-black text-slate-950 sm:text-lg">{billKey}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(billKey, 'va')}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  {copiedVA ? <CheckIcon sx={{ fontSize: 14 }} className="text-emerald-600" /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                  {copiedVA ? 'Disalin!' : 'Salin'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <span className="text-[11px] font-bold text-slate-500">Nomor Virtual Account</span>
            <div className="mt-1 flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span className="break-all font-mono text-base font-black tracking-wider text-slate-950 sm:text-xl">
                {vaNumber}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(vaNumber, 'va')}
                className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                {copiedVA ? (
                  <>
                    <CheckIcon sx={{ fontSize: 14 }} className="text-emerald-400" />
                    Tersalin
                  </>
                ) : (
                  <>
                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                    Salin
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
          <span className="font-medium text-slate-500">Total Nominal</span>
          <span className="text-base font-black text-slate-950">{amountFormatted}</span>
        </div>
      </div>

      {/* Guide Accordions */}
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Petunjuk Pembayaran (Klik untuk buka)
        </h3>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {guide.instructions.map((inst, index) => {
            const isOpen = openGuide === index;
            return (
              <div key={inst.title}>
                <button
                  type="button"
                  onClick={() => setOpenGuide(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between p-2.5 text-left text-xs font-bold text-slate-800 hover:bg-slate-50 sm:p-3"
                >
                  <span>{inst.title}</span>
                  <ExpandMoreIcon
                    sx={{ fontSize: 16 }}
                    className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-3 text-xs leading-5 text-slate-600">
                    <ol className="list-decimal space-y-1 pl-4">
                      {inst.steps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

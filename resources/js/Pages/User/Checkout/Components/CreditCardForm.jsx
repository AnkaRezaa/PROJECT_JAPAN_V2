import React, { useEffect, useState } from 'react';
import LockIcon from '@mui/icons-material/Lock';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { JcbLogo, VisaLogo, MastercardLogo, AmexLogo } from './PaymentLogos';

const loadMidtransScript = (midtrans) => new Promise((resolve, reject) => {
  if (window.MidtransNew3ds) {
    resolve();
    return;
  }

  const existing = document.getElementById('midtrans-new3ds-script');
  if (existing) {
    existing.addEventListener('load', resolve, { once: true });
    existing.addEventListener('error', reject, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.id = 'midtrans-new3ds-script';
  script.src = midtrans.isProduction
    ? 'https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js'
    : 'https://api.sandbox.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js';
  script.setAttribute('data-environment', midtrans.isProduction ? 'production' : 'sandbox');
  script.setAttribute('data-client-key', midtrans.clientKey || '');
  script.onload = resolve;
  script.onerror = reject;
  document.body.appendChild(script);
});

export default function CreditCardForm({ midtrans, amount, onSubmit, processing, error: externalError }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardBrand, setCardBrand] = useState('unknown');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    loadMidtransScript(midtrans).catch(() => {
      setLocalError('Gagal memuat sistem keamanan kartu Midtrans.');
    });
  }, [midtrans]);

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);

    // Detect card brand
    if (raw.startsWith('35')) {
      setCardBrand('jcb');
    } else if (raw.startsWith('4')) {
      setCardBrand('visa');
    } else if (/^(5[1-5]|2[2-7])/.test(raw)) {
      setCardBrand('mastercard');
    } else if (/^3[47]/.test(raw)) {
      setCardBrand('amex');
    } else {
      setCardBrand('unknown');
    }
  };

  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setExpiry(raw);
    }
  };

  const handleCvvChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvv(raw);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (cleanNumber.length < 15) {
      setLocalError('Nomor kartu kredit/debit belum lengkap.');
      return;
    }

    const [month, year] = expiry.split('/');
    if (!month || !year || Number(month) < 1 || Number(month) > 12) {
      setLocalError('Masa berlaku kartu (MM/YY) tidak valid.');
      return;
    }

    if (cvv.length < 3) {
      setLocalError('CVV harus 3 atau 4 digit angka.');
      return;
    }

    if (!window.MidtransNew3ds) {
      setLocalError('Modul keamanan Midtrans belum siap. Coba muat ulang halaman.');
      return;
    }

    const fullYear = year.length === 2 ? `20${year}` : year;

    const cardDetails = {
      card_number: cleanNumber,
      card_exp_month: month.padStart(2, '0'),
      card_exp_year: fullYear,
      card_cvv: cvv,
      gross_amount: Number(amount),
    };

    window.MidtransNew3ds.getCardToken(cardDetails, {
      onSuccess: function (response) {
        if (response.token_id) {
          onSubmit(response.token_id);
        } else {
          setLocalError('Gagal mendapatkan token kartu dari Midtrans.');
        }
      },
      onFailure: function (response) {
        setLocalError(response.validation_messages?.[0] || 'Validasi kartu ditolak oleh Midtrans.');
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <CreditCardIcon sx={{ fontSize: 20 }} className="text-slate-600" />
          <span className="text-xs font-bold text-slate-800">Kartu Kredit / Debit Internasional</span>
        </div>
        <div className="flex items-center gap-1.5">
          <JcbLogo className={`h-4 transition-opacity ${cardBrand === 'jcb' ? 'opacity-100' : 'opacity-40'}`} />
          <VisaLogo className={`h-4 transition-opacity ${cardBrand === 'visa' ? 'opacity-100' : 'opacity-40'}`} />
          <MastercardLogo className={`h-4 transition-opacity ${cardBrand === 'mastercard' ? 'opacity-100' : 'opacity-40'}`} />
          <AmexLogo className={`h-4 transition-opacity ${cardBrand === 'amex' ? 'opacity-100' : 'opacity-40'}`} />
        </div>
      </div>

      <div className="mt-3.5 space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-700">
            Nomor Kartu
          </label>
          <div className="relative mt-1">
            <input
              type="text"
              inputMode="numeric"
              value={cardNumber}
              onChange={handleCardNumberChange}
              placeholder="4000 0000 0000 0000 / 3528 0000..."
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold tracking-wider text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            {cardBrand === 'jcb' && (
              <span className="absolute right-2.5 top-2.5 rounded bg-blue-900 px-1.5 py-0.5 text-[10px] font-black text-white">
                JCB Japan
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Masa Berlaku (MM/YY)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={expiry}
              onChange={handleExpiryChange}
              placeholder="MM/YY"
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">
              CVV / CVC
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={cvv}
              onChange={handleCvvChange}
              placeholder="3 atau 4 digit"
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>

        {(localError || externalError) && (
          <p className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700">
            {localError || externalError}
          </p>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={processing}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#c33d4b] px-4 text-sm font-bold text-white transition hover:bg-[#a9323f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LockIcon sx={{ fontSize: 17 }} />
            {processing ? 'Memproses Kartu...' : 'Bayar dengan Kartu'}
          </button>
        </div>

        <p className="text-center text-[11px] leading-4 text-slate-500">
          Transaksi diproteksi oleh 3D Secure (OTP SMS). Data kartu dienkripsi langsung oleh Midtrans tanpa disimpan di server kami.
        </p>
      </div>
    </form>
  );
}

import React, { useEffect, useState } from 'react';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import AlarmIcon from '@mui/icons-material/Alarm';

export default function PaymentCountdownTimer({ expiryTime, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiryTime) return;

    // Normalisasi waktu Midtrans ("YYYY-MM-DD HH:mm:ss" atau ISO)
    const normalized = expiryTime.includes('T')
      ? expiryTime
      : expiryTime.replace(' ', 'T');

    const targetDate = new Date(normalized).getTime();

    if (isNaN(targetDate)) return;

    const calculateTime = () => {
      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft(0);
        if (!isExpired) {
          setIsExpired(true);
          onExpire?.();
        }
        return;
      }

      setTimeLeft(Math.floor(diff / 1000));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [expiryTime, isExpired]);

  if (timeLeft === null) return null;

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  const isUrgent = timeLeft > 0 && timeLeft < 300; // Kurang dari 5 menit

  return (
    <div
      className={`mb-3.5 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs transition sm:px-3.5 sm:py-2.5 ${
        timeLeft <= 0
          ? 'border-red-300 bg-red-50 text-red-800'
          : isUrgent
          ? 'border-rose-300 bg-rose-50/80 text-rose-900 animate-pulse'
          : 'border-amber-200 bg-amber-50/70 text-amber-900'
      }`}
    >
      <div className="flex items-center gap-2">
        {isUrgent ? (
          <AlarmIcon sx={{ fontSize: 17 }} className="text-rose-600" />
        ) : (
          <HourglassTopIcon sx={{ fontSize: 16 }} className="text-amber-700" />
        )}
        <div className="leading-tight">
          <span className="font-bold">
            {timeLeft <= 0
              ? 'Waktu pembayaran berakhir'
              : 'Selesaikan pembayaran dalam'}
          </span>
          <span className="hidden text-slate-500 sm:inline">
            {timeLeft <= 0
              ? ' — Segera buat pesanan baru jika ingin melanjutkan.'
              : ' — Sebelum tagihan kedaluwarsa otomatis.'}
          </span>
        </div>
      </div>

      <div
        className={`font-mono text-xs font-black tracking-wider sm:text-sm ${
          timeLeft <= 0
            ? 'text-red-700'
            : isUrgent
            ? 'text-rose-700'
            : 'text-amber-950'
        }`}
      >
        {timeLeft <= 0 ? (
          '00:00:00'
        ) : hours > 0 ? (
          `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
        ) : (
          `${formattedMinutes}:${formattedSeconds}`
        )}
      </div>
    </div>
  );
}

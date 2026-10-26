import { useEffect, useState } from 'react';

function paymentQrImageUrl(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl) return null;

  try {
    const url = new URL(imageUrl, globalThis.location?.href);
    // Old invoices may still contain the retired third-party fallback URL.
    if (url.hostname === 'qrserver.com' || url.hostname.endsWith('.qrserver.com')) return null;
    return ['https:', 'http:'].includes(url.protocol) ? imageUrl : null;
  } catch {
    return null;
  }
}

export default function usePaymentQr(imageUrl, value) {
  const remoteUrl = paymentQrImageUrl(imageUrl);
  const [failedUrl, setFailedUrl] = useState(null);
  const [generated, setGenerated] = useState(null);
  const remoteSrc = remoteUrl && remoteUrl !== failedUrl ? remoteUrl : null;
  const hasValue = typeof value === 'string' && value.length > 0;

  useEffect(() => {
    if (remoteSrc || !hasValue) return undefined;

    let cancelled = false;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(value, { width: 300, margin: 4 }))
      .then((src) => {
        if (!cancelled) setGenerated({ value, src });
      })
      .catch(() => {
        if (!cancelled) setGenerated({ value, src: null });
      });

    return () => { cancelled = true; };
  }, [remoteSrc, hasValue, value]);

  const current = generated?.value === value ? generated : null;
  const src = remoteSrc || current?.src || null;
  const isLoading = !remoteSrc && hasValue && !current;
  const error = !src && !isLoading ? 'Kode QR tidak tersedia. Pilih metode pembayaran lain.' : null;

  const onError = () => {
    if (remoteSrc) setFailedUrl(remoteSrc);
    else setGenerated({ value, src: null });
  };

  return { src, isLoading, error, onError };
}

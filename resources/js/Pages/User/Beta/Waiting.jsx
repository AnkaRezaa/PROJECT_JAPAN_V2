import React from 'react';
import { Head } from '@inertiajs/react';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BetaPage from '@/Components/Features/Beta/BetaPage';

export default function Waiting({ beta }) {
    const date = beta.opens_at ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(beta.opens_at)) : null;
    return <BetaPage>
        <Head title="Menunggu Pembukaan" />
        <h1 className="text-2xl font-bold sm:text-3xl">Pendaftaran berhasil</h1>
        <p className="mt-4 max-w-md text-base leading-7 text-[#486052]">Kamu sudah terdaftar sebagai peserta beta. Akses belajar belum dibuka.</p>
        <p className="mt-6 flex items-start justify-center gap-2 text-sm font-semibold"><ScheduleIcon fontSize="small" />{date ? `Dibuka ${date} WIB` : 'Jadwal pembukaan segera diumumkan.'}</p>
    </BetaPage>;
}

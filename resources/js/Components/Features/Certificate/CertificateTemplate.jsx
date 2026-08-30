import TranslateIcon from '@mui/icons-material/Translate';
import React from 'react';

export default function CertificateTemplate({ certificate, user }) {
    const levelLabel = [
        certificate?.level?.curriculum_track?.name,
        certificate?.level?.level_name,
    ].filter(Boolean).join(' ') || 'Program TOKU-UP';

    return (
        <div id="certificate-content" className="w-full max-w-3xl mx-auto bg-white border-4 border-amber-400 rounded-3xl p-12 relative overflow-hidden shadow-2xl" style={{ fontFamily: "'Noto Serif JP', 'Georgia', serif" }}>
            
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>

            {/* Corner Ornaments */}
            <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-amber-300 rounded-tl-2xl"></div>
            <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-amber-300 rounded-tr-2xl"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-amber-300 rounded-bl-2xl"></div>
            <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-amber-300 rounded-br-2xl"></div>

            {/* Header */}
            <div className="text-center relative z-10 mb-8">
                <div className="text-5xl mb-4">🏯</div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">SERTIFIKAT KELULUSAN</h1>
                <div className="flex items-center justify-center gap-3">
                    <div className="w-16 h-0.5 bg-amber-400"></div>
                    <span className="text-sm font-black text-amber-600 tracking-[0.3em] uppercase">TOKU-UP Academy</span>
                    <div className="w-16 h-0.5 bg-amber-400"></div>
                </div>
            </div>

            {/* Body */}
            <div className="text-center relative z-10 mb-10">
                <p className="text-gray-500 text-sm mb-4 font-medium">Dengan ini menyatakan bahwa</p>
                <h2 className="text-3xl font-black text-gray-900 mb-4 border-b-2 border-amber-200 pb-3 inline-block px-8">
                    {user?.username || 'Nama Peserta'}
                </h2>
                <p className="text-gray-600 text-base mt-4 leading-relaxed max-w-lg mx-auto">
                    Telah berhasil menyelesaikan seluruh program pembelajaran <strong className="text-brand-700">{levelLabel}</strong> pada platform TOKU-UP dengan dedikasi dan ketekunan yang luar biasa.
                </p>
            </div>

            {/* Details */}
            <div className="flex justify-center gap-12 mb-10 relative z-10">
                <div className="text-center">
                    <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">Nomor Sertifikat</p>
                    <p className="font-black text-gray-900 text-sm">{certificate?.certificate_number || 'CERT-XXXX-XXXXX'}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">Tanggal Terbit</p>
                    <p className="font-black text-gray-900 text-sm">
                        {certificate?.issued_at ? new Date(certificate.issued_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">Level</p>
                    <p className="font-black text-brand-700 text-sm">{levelLabel}</p>
                </div>
            </div>

            {/* Signature Line */}
            <div className="flex justify-between items-end px-8 relative z-10 pt-6 border-t border-amber-100">
                <div className="text-center">
                    <div className="w-32 h-0.5 bg-gray-300 mb-2"></div>
                    <p className="text-xs font-bold text-gray-500">Instruktur</p>
                </div>
                <div className="text-4xl"><TranslateIcon className="w-6 h-6 inline-block" /></div>
                <div className="text-center">
                    <div className="w-32 h-0.5 bg-gray-300 mb-2"></div>
                    <p className="text-xs font-bold text-gray-500">Direktur Akademik</p>
                </div>
            </div>
        </div>
    );
}

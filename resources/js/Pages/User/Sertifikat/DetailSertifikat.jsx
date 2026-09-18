import PrintIcon from '@mui/icons-material/Print';
import React from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CertificateTemplate from '@/Components/Features/Certificate/CertificateTemplate';

export default function DetailSertifikat({ certificate, user }) {
    return (
        <AuthenticatedLayout header={<h2 className="font-extrabold text-2xl text-gray-900 leading-tight tracking-tight">Sertifikat</h2>}>
            <Head title={`Sertifikat - ${certificate?.certificate_number}`} />

            <div className="py-6 sm:py-12 min-h-screen bg-gray-100">
                <div className="max-w-4xl mx-auto px-3 sm:px-4">
                    <div className="mb-6 text-center">
                        <button
                            onClick={() => window.print()}
                            className="px-8 py-3 bg-gray-900 text-white font-black rounded-2xl hover:bg-gray-800 transition-all shadow-lg print:hidden"
                        >
                            <PrintIcon className="w-5 h-5 inline-block" /> Cetak / Simpan PDF
                        </button>
                    </div>

                    <CertificateTemplate certificate={certificate} user={user} />
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html:`
                @media print {
                    body * { visibility: hidden; }
                    #certificate-content, #certificate-content * { visibility: visible; }
                    #certificate-content { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}} />
        </AuthenticatedLayout>
    );
}

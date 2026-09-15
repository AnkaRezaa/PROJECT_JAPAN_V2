import React from 'react';

export default class AppErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.props.onError?.(error, errorInfo);
    }

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <main className="grid min-h-screen place-items-center bg-gray-50 px-5 py-12 text-gray-950 dark:bg-gray-950 dark:text-white">
                <section role="alert" className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                    <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">Terjadi kendala</p>
                    <h1 className="mt-2 text-2xl font-black">Halaman belum dapat ditampilkan</h1>
                    <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                        Muat ulang halaman untuk mencoba kembali. Jika kendala berlanjut, kembali ke beranda.
                    </p>
                    <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
                        <a href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 px-5 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                            Kembali ke Beranda
                        </a>
                        <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-lg bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700">
                            Muat Ulang Halaman
                        </button>
                    </div>
                </section>
            </main>
        );
    }
}

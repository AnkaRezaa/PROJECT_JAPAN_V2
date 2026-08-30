import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';

const categoryDetails = {
    payment: { label: 'Pembayaran', icon: ReceiptLongOutlinedIcon },
    access: { label: 'Akses kelas', icon: LockOpenOutlinedIcon },
    content: { label: 'Materi', icon: MenuBookOutlinedIcon },
    progress: { label: 'Progress', icon: EmojiEventsOutlinedIcon },
    system: { label: 'Sistem', icon: InfoOutlinedIcon },
};

function NotificationItem({ notification }) {
    const category = categoryDetails[notification.category] || categoryDetails.system;
    const CategoryIcon = category.icon;
    const isUnread = !notification.read_at;
    const destination = notification.data?.url;

    const markAsRead = (openDestination = false) => {
        if (!isUnread) {
            if (openDestination && destination) router.visit(destination);
            return;
        }

        router.post(route('notifications.read', notification.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                if (openDestination && destination) router.visit(destination);
            },
        });
    };

    return (
        <article className={`relative border-b border-gray-200 px-4 py-4 last:border-b-0 sm:px-5 dark:border-gray-800 ${isUnread ? 'bg-brand-50/50 dark:bg-brand-950/10' : 'bg-white dark:bg-gray-950'}`}>
            {isUnread && <span className="absolute left-0 top-0 h-full w-1 bg-brand-600" aria-hidden="true" />}
            <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    <CategoryIcon sx={{ fontSize: 20 }} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300">{category.label}</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">{notification.created_at}</span>
                        {isUnread && <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Belum dibaca" />}
                    </div>
                    <h2 className="mt-1 text-sm font-bold text-gray-950 sm:text-base dark:text-white">
                        {notification.data?.title || 'Pemberitahuan sistem'}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-300">
                        {notification.data?.message || 'Silakan periksa pembaruan terbaru pada akun Anda.'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {destination && (
                            <button
                                type="button"
                                onClick={() => markAsRead(true)}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-gray-950 px-3 text-xs font-bold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:bg-white dark:text-gray-950 dark:hover:bg-brand-200"
                            >
                                Buka
                                <ArrowForwardOutlinedIcon sx={{ fontSize: 16 }} />
                            </button>
                        )}
                        {isUnread && (
                            <button
                                type="button"
                                onClick={() => markAsRead(false)}
                                className="min-h-10 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-700 transition-colors hover:border-gray-500 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                            >
                                Tandai dibaca
                            </button>
                        )}
                        {!isUnread && !destination && <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sudah dibaca</span>}
                    </div>
                </div>
            </div>
        </article>
    );
}

export default function NotificationIndex({ notifications, unreadCount = 0, filters = {} }) {
    const { auth } = usePage().props;
    const activeFilter = filters.filter || 'all';
    const hasNotifications = notifications.data?.length > 0;
    const notificationContext = {
        user: {
            eyebrow: 'Pusat pembaruan',
            title: 'Notifikasi',
            emptyTitle: 'Belum ada notifikasi',
            emptyDescription: 'Pembaruan pembayaran, akses kelas, materi, dan progress akan muncul di sini.',
        },
        admin: {
            eyebrow: 'Operasional kelas',
            title: 'Aktivitas Kelas',
            emptyTitle: 'Belum ada aktivitas kelas',
            emptyDescription: 'Peserta menunggu persetujuan dan perubahan anggota kloter akan muncul di sini.',
        },
        superadmin: {
            eyebrow: 'Operasional platform',
            title: 'Aktivitas Operasional',
            emptyTitle: 'Belum ada aktivitas operasional',
            emptyDescription: 'Pembayaran, access key, kloter, dan tindakan yang perlu diperiksa akan muncul di sini.',
        },
    }[auth?.user?.role] || {
        eyebrow: 'Pusat pembaruan',
        title: 'Notifikasi',
        emptyTitle: 'Belum ada notifikasi',
        emptyDescription: 'Pembaruan terbaru akan muncul di sini.',
    };

    const fallbackDashboard = {
        admin: '/admin/dashboard',
        superadmin: '/superadmin/dashboard',
        user: '/user/dashboard',
    }[auth?.user?.role] || '/';

    const goBack = () => {
        if (window.history.length > 1) {
            window.history.back();
            return;
        }

        router.visit(fallbackDashboard);
    };

    const markAllAsRead = () => {
        router.post(route('notifications.readAll'), {}, { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title={notificationContext.title} />

            <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
                <button
                    type="button"
                    onClick={goBack}
                    className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                    <ArrowBackOutlinedIcon sx={{ fontSize: 18 }} />
                    Kembali
                </button>

                <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-gray-800">
                    <div>
                        <p className="text-xs font-bold uppercase text-brand-600 dark:text-brand-400">{notificationContext.eyebrow}</p>
                        <h1 className="mt-1 text-2xl font-black text-gray-950 sm:text-3xl dark:text-white">{notificationContext.title}</h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {unreadCount > 0 ? `${unreadCount} pemberitahuan belum dibaca.` : 'Semua pemberitahuan sudah dibaca.'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={markAllAsRead}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900"
                        >
                            <DoneAllOutlinedIcon sx={{ fontSize: 19 }} />
                            Tandai semua dibaca
                        </button>
                    )}
                </header>

                <div className="mt-5 flex w-full rounded-lg bg-gray-100 p-1 sm:w-fit dark:bg-gray-900" role="tablist" aria-label="Filter notifikasi">
                    {[
                        ['all', 'Semua'],
                        ['unread', `Belum dibaca${unreadCount > 0 ? ` (${unreadCount})` : ''}`],
                    ].map(([value, label]) => (
                        <Link
                            key={value}
                            href={route('notifications.page', { filter: value })}
                            preserveScroll
                            className={`flex min-h-10 flex-1 items-center justify-center rounded-md px-4 text-sm font-bold transition-colors sm:flex-none ${activeFilter === value ? 'bg-white text-gray-950 shadow-sm dark:bg-gray-800 dark:text-white' : 'text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white'}`}
                            role="tab"
                            aria-selected={activeFilter === value}
                        >
                            {label}
                        </Link>
                    ))}
                </div>

                <section className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                    {hasNotifications ? (
                        notifications.data.map((notification) => (
                            <NotificationItem key={notification.id} notification={notification} />
                        ))
                    ) : (
                        <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                                <NotificationsOutlinedIcon />
                            </div>
                            <h2 className="mt-4 text-base font-bold text-gray-950 dark:text-white">
                                {activeFilter === 'unread' ? 'Tidak ada aktivitas yang belum dibaca' : notificationContext.emptyTitle}
                            </h2>
                            <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-300">
                                {notificationContext.emptyDescription}
                            </p>
                        </div>
                    )}
                </section>

                {(notifications.prev_page_url || notifications.next_page_url) && (
                    <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Navigasi halaman notifikasi">
                        {notifications.prev_page_url ? (
                            <Link href={notifications.prev_page_url} preserveScroll className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900">Sebelumnya</Link>
                        ) : <span />}
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Halaman {notifications.current_page} dari {notifications.last_page}</span>
                        {notifications.next_page_url ? (
                            <Link href={notifications.next_page_url} preserveScroll className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900">Berikutnya</Link>
                        ) : <span />}
                    </nav>
                )}
            </main>
        </AuthenticatedLayout>
    );
}

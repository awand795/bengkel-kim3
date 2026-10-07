import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { api } from './api/client';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { LoginPage } from './views/LoginPage';
import { UnverifiedEmailView } from './views/UnverifiedEmailView';
import { DeactivatedAccountView } from './views/DeactivatedAccountView';
import { WebFleetCustomerView } from './views/WebFleetCustomerView';
import { ToastContainer } from './components/common/Toast';
import { ApprovalAutoPopup } from './components/common/ApprovalAutoPopup';

export const App: React.FC = () => {
  const {
    activeTab,
    isLoggedIn,
    authUser,
    isVerifyingSession,
    setIsVerifyingSession,
    logout,
  } = useAppStore();

  // Validasi sesi aktif dari database saat web dibuka atau di-refresh (F5)
  useEffect(() => {
    const token = localStorage.getItem('bengkel_jwt_token');
    if (!token) {
      setIsVerifyingSession(false);
      if (isLoggedIn) logout();
      return;
    }

    let isMounted = true;
    api
      .getMe()
      .then((me) => {
        if (!isMounted) return;
        useAppStore.setState({
          authUser: me,
          currentUser: me.nama_lengkap,
          currentRole: 'Customer Fleet',
          isLoggedIn: true,
          isVerifyingSession: false,
        });
        localStorage.setItem('bengkel_auth_user', JSON.stringify(me));
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Sesi tidak valid atau pengguna telah dihapus dari database:', err);
        logout();
        setIsVerifyingSession(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Jika sedang memverifikasi sesi pada reload, cegah flash antarmuka internal
  if (isVerifyingSession) {
    return (
      <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
          <div className="text-xs font-semibold text-teal-100/80 tracking-wide">
            Memverifikasi Sesi Web Fleet Bengkel KIM 3...
          </div>
        </div>
      </div>
    );
  }

  // Jika user belum login atau sesi tidak valid, langsung arahkan ke halaman login
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  // Jika akun user dinonaktifkan (status_no_aktif === true atau status_aktif === false), blokir akses ke Web Fleet
  if (authUser && (authUser.status_no_aktif === true || authUser.status_aktif === false)) {
    return (
      <DeactivatedAccountView
        email={authUser.email}
        namaLengkap={authUser.nama_lengkap}
        onLogout={logout}
      />
    );
  }

  // Jika email user belum terverifikasi, tampilkan layar blank putih dengan pemberitahuan warning
  if (authUser && authUser.email_verifikasi === false) {
    return <UnverifiedEmailView email={authUser.email} onLogout={logout} />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'fleet-booking':
        return <WebFleetCustomerView initialMenu="booking" />;
      case 'fleet-history':
        return <WebFleetCustomerView initialMenu="history" />;
      case 'fleet-kendaraan':
        return <WebFleetCustomerView initialMenu="kendaraan" />;
      case 'fleet-dokumen':
        return <WebFleetCustomerView initialMenu="dokumen" />;
      case 'fleet-profil':
        return <WebFleetCustomerView initialMenu="profil" />;
      case 'fleet-dashboard':
      default:
        return <WebFleetCustomerView initialMenu="dashboard" />;
    }
  };

  return (
    <div className="app-layout min-h-screen bg-surface flex flex-col font-sans text-ink pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      {/* Top App Header */}
      <Navbar />

      <div className="flex flex-1 w-full overflow-hidden">
        {/* Left Navigation Sidebar for Desktop */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="dashboard-page flex-1 overflow-y-auto max-h-[calc(100vh-60px)] bg-surface">
          <div className="max-w-[1400px] mx-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div key={activeTab} className="app-page-transition w-full">
              {renderActiveView()}
            </div>
          </div>
        </main>
      </div>

      {/* Floating Bottom Nav for Smartphone Viewport (< 768px) */}
      <MobileBottomNav />

      {/* Global Toast Notification System */}
      <ToastContainer />

      {/* Watcher approval realtime */}
      <ApprovalAutoPopup />
    </div>
  );
};

export default App;

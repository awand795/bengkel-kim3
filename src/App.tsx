import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { api } from './api/client';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';

// Views
import { LoginPage } from './views/LoginPage';
import { DashboardView } from './views/DashboardView';
import { SecurityView } from './views/SecurityView';
import { ServiceAdvisorView } from './views/ServiceAdvisorView';
import { ForemanView } from './views/ForemanView';
import { MekanikView } from './views/MekanikView';
import { PurchasingView } from './views/PurchasingView';
import { BeliPartView } from './views/BeliPartView';
import { KasirInvoiceView } from './views/KasirInvoiceView';
import { WebFleetCustomerView } from './views/WebFleetCustomerView';
import { PicTerkaitView } from './views/PicTerkaitView';
import { AdminPanelView } from './views/AdminPanelView';

export const App: React.FC = () => {
  const {
    activeTab,
    isLoggedIn,
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
          currentRole: me.peran,
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
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-sky-400/20 border-t-sky-400 rounded-full animate-spin" />
          <div className="text-xs font-semibold text-slate-300 tracking-wide">
            Memverifikasi Sesi Bengkel KIM 3...
          </div>
        </div>
      </div>
    );
  }

  // Jika user belum login atau sesi tidak valid, langsung arahkan ke halaman login
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'admin-panel':
        return <AdminPanelView />;
      case 'dashboard':
        return <DashboardView />;
      case 'security':
      case 'security-dashboard':
        return <SecurityView initialTab="dashboard" />;
      case 'security-checkin':
        return <SecurityView initialTab="checkin" />;
      case 'security-booking':
        return <SecurityView initialTab="booking" />;
      case 'security-onprogress':
        return <SecurityView initialTab="onprogress" />;
      case 'security-selesai':
        return <SecurityView initialTab="selesai" />;
      case 'security-memo':
        return <SecurityView initialTab="memo" />;
      case 'sa':
        return <ServiceAdvisorView />;
      case 'foreman':
        return <ForemanView />;
      case 'mekanik':
        return <MekanikView />;
      case 'purchasing':
        return <PurchasingView />;
      case 'beli-part':
        return <BeliPartView />;
      case 'kasir':
        return <KasirInvoiceView />;
      // Customer Fleet Sub-menus
      case 'fleet-dashboard':
        return <WebFleetCustomerView initialMenu="dashboard" />;
      case 'fleet-booking':
        return <WebFleetCustomerView initialMenu="booking" />;
      case 'fleet-status':
        return <WebFleetCustomerView initialMenu="status" />;
      case 'fleet-history':
        return <WebFleetCustomerView initialMenu="history" />;
      case 'fleet-kendaraan':
        return <WebFleetCustomerView initialMenu="kendaraan" />;
      case 'fleet-dokumen':
        return <WebFleetCustomerView initialMenu="dokumen" />;
      case 'fleet-profil':
        return <WebFleetCustomerView initialMenu="profil" />;

      // PIC Terkait (Konfirmasi kunjungan tamu dari Pos Security)
      case 'pic-terkait':
        return <PicTerkaitView />;

      // Fallbacks
      case 'fleet':
        return <WebFleetCustomerView initialMenu="dashboard" />;
      case 'dokumen':
        return <WebFleetCustomerView initialMenu="dokumen" />;
      case 'kendaraan':
        return <WebFleetCustomerView initialMenu="kendaraan" />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F5] flex flex-col font-sans text-[#1B2126] pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      {/* Top App Header */}
      <Navbar />

      <div className="flex flex-1 w-full max-w-[1600px] mx-auto overflow-hidden">
        {/* Left Navigation Sidebar for Desktop */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-3.5rem)] md:max-h-[calc(100vh-4rem)]">
          <div key={activeTab} className="app-page-transition w-full">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Floating Bottom Nav for Smartphone Viewport (< 768px) */}
      <MobileBottomNav />
    </div>
  );
};

export default App;

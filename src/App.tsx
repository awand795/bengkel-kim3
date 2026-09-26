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
import { KunjunganModuleView } from './views/KunjunganModuleView';
import { AdminPanelView } from './views/AdminPanelView';
import { ToastContainer } from './components/common/Toast';

export const App: React.FC = () => {
  const {
    activeTab,
    currentRole,
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
      <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
          <div className="text-xs font-semibold text-teal-100/80 tracking-wide">
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
    // ── ROLE-BASED ACCESS CONTROL (RBAC) GUARD ──────────────────────────────
    // Mencegah kebocoran modul internal ke role yang tidak berhak (misal: Customer Fleet masuk ke menu SA/SPK)
    if (currentRole === 'Customer Fleet') {
      if (activeTab === 'fleet-booking') return <WebFleetCustomerView initialMenu="booking" />;
      if (activeTab === 'fleet-status') return <WebFleetCustomerView initialMenu="status" />;
      if (activeTab === 'fleet-history') return <WebFleetCustomerView initialMenu="history" />;
      if (activeTab === 'fleet-kendaraan') return <WebFleetCustomerView initialMenu="kendaraan" />;
      if (activeTab === 'fleet-dokumen') return <WebFleetCustomerView initialMenu="dokumen" />;
      if (activeTab === 'fleet-profil') return <WebFleetCustomerView initialMenu="profil" />;
      return <WebFleetCustomerView initialMenu="dashboard" />;
    }

    if (currentRole === 'Security') {
      if (activeTab === 'security-checkin') return <SecurityView initialTab="checkin" />;
      if (activeTab === 'security-booking') return <SecurityView initialTab="booking" />;
      if (activeTab === 'security-onprogress') return <SecurityView initialTab="onprogress" />;
      if (activeTab === 'security-selesai') return <SecurityView initialTab="selesai" />;
      if (activeTab === 'security-memo') return <SecurityView initialTab="memo" />;
      if (activeTab === 'dashboard') return <DashboardView />;
      return <SecurityView initialTab="dashboard" />;
    }

    if (currentRole === 'SA') {
      if (activeTab === 'sa-penerimaan' || activeTab === 'sa-baru') return <ServiceAdvisorView initialTab="penerimaan" />;
      if (activeTab === 'sa' || activeTab === 'sa-list') return <ServiceAdvisorView initialTab="spk-list" />;
      if (activeTab === 'dashboard') return <DashboardView />;
      // Sidebar SA Kotak Merah (PR) + notif link_tab 'purchasing' / 'sa-kotak-merah':
      if (activeTab === 'purchasing' || activeTab === 'sa-kotak-merah') return <ServiceAdvisorView initialTab="estimasi-pr" />;
      // Penjualan Part Langsung: satu modul modal-driven di dalam ServiceAdvisorView.
      // 'beli-part-estimasi' = sidebar "Estimasi Baru (POS)" → langsung buka modal POS.
      if (
        activeTab === 'beli-part' ||
        activeTab === 'beli-part-transaksi' ||
        activeTab === 'sa-penjualan-part'
      ) {
        return <ServiceAdvisorView initialTab="penjualan-part" />;
      }
      if (activeTab === 'beli-part-estimasi') {
        return <ServiceAdvisorView initialTab="penjualan-part-pos" />;
      }
      if (activeTab === 'kunjungan') return <KunjunganModuleView />;
      return <ServiceAdvisorView initialTab="spk-list" />;
    }

    if (currentRole === 'Foreman') {
      if (activeTab === 'foreman-cek') return <ForemanView initialTab="hasil-pengecekan" />;
      if (activeTab === 'foreman-qc') return <ForemanView initialTab="qc-fir" />;
      if (activeTab === 'foreman' || activeTab === 'foreman-tugas') return <ForemanView initialTab="dashboard" />;
      if (activeTab === 'mekanik') return <MekanikView />;
      if (activeTab === 'kunjungan') return <KunjunganModuleView />;
      if (activeTab === 'dashboard') return <DashboardView />;
      return <ForemanView initialTab="dashboard" />;
    }

    if (currentRole === 'Mekanik') {
      if (activeTab === 'mekanik') return <MekanikView />;
      if (activeTab === 'kunjungan') return <KunjunganModuleView />;
      if (activeTab === 'dashboard') return <DashboardView />;
      return <MekanikView />;
    }

    if (currentRole === 'Admin Purchasing') {
      if (activeTab === 'purchasing') return <PurchasingView />;
      if (activeTab === 'beli-part-estimasi') return <BeliPartView initialTab="estimasi" />;
      if (activeTab === 'beli-part-picking') return <BeliPartView initialTab="picking" />;
      if (activeTab === 'beli-part' || activeTab === 'beli-part-transaksi') return <BeliPartView initialTab="transaksi" />;
      if (activeTab === 'kunjungan') return <KunjunganModuleView />;
      if (activeTab === 'dashboard') return <DashboardView />;
      return <PurchasingView />;
    }

    if (currentRole === 'Admin Invoice') {
      if (activeTab === 'kasir') return <KasirInvoiceView />;
      if (activeTab === 'beli-part-estimasi') return <BeliPartView initialTab="estimasi" />;
      if (activeTab === 'beli-part-picking') return <BeliPartView initialTab="picking" />;
      if (activeTab === 'beli-part' || activeTab === 'beli-part-transaksi') return <BeliPartView initialTab="transaksi" />;
      if (activeTab === 'kunjungan') return <KunjunganModuleView />;
      if (activeTab === 'dashboard') return <DashboardView />;
      return <KasirInvoiceView />;
    }

    if (currentRole === 'Warehouse') {
      if (activeTab === 'beli-part-estimasi') return <BeliPartView initialTab="estimasi" />;
      if (activeTab === 'beli-part-picking') return <BeliPartView initialTab="picking" />;
      if (activeTab === 'kunjungan') return <KunjunganModuleView />;
      return <BeliPartView initialTab="transaksi" />;
    }

    if (currentRole === 'PIC Terkait') {
      if (activeTab === 'pic-terkait') return <PicTerkaitView />;
      if (activeTab === 'dashboard') return <DashboardView />;
      return <PicTerkaitView />;
    }

    // Super Admin: Akses penuh ke seluruh modul sistem
    switch (activeTab) {
      case 'admin-panel':
      case 'admin-users':
        return <AdminPanelView initialTab="users" />;
      case 'admin-ppn':
        return <AdminPanelView initialTab="ppn" />;
      case 'admin-print':
        return <AdminPanelView initialTab="print-templates" />;
      case 'admin-settings':
      case 'pengaturan':
        return <AdminPanelView initialTab="settings" />;
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
      case 'sa-list':
        return <ServiceAdvisorView initialTab="spk-list" />;
      case 'sa-penerimaan':
      case 'sa-baru':
        return <ServiceAdvisorView initialTab="penerimaan" />;
      case 'sa-kotak-merah':
        return <ServiceAdvisorView initialTab="estimasi-pr" />;
      case 'sa-penjualan-part':
        return <ServiceAdvisorView initialTab="penjualan-part" />;
      case 'foreman':
      case 'foreman-tugas':
        return <ForemanView initialTab="dashboard" />;
      case 'foreman-cek':
        return <ForemanView initialTab="hasil-pengecekan" />;
      case 'foreman-qc':
        return <ForemanView initialTab="qc-fir" />;
      case 'mekanik':
        return <MekanikView />;
      case 'purchasing':
        return <PurchasingView />;
      case 'beli-part':
      case 'beli-part-transaksi':
        return <BeliPartView initialTab="transaksi" />;
      case 'beli-part-estimasi':
        return <BeliPartView initialTab="estimasi" />;
      case 'beli-part-picking':
        return <BeliPartView initialTab="picking" />;
      case 'kasir':
        return <KasirInvoiceView />;
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
      case 'pic-terkait':
        return <PicTerkaitView />;
      case 'kunjungan':
        return <KunjunganModuleView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-ink pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      {/* Top App Header */}
      <Navbar />

      <div className="flex flex-1 w-full max-w-[1600px] mx-auto overflow-hidden">
        {/* Left Navigation Sidebar for Desktop */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-3.5rem)] md:max-h-[calc(100vh-4rem)]">
          <div
            key={
              activeTab.startsWith('security-')
                ? 'module-security'
                : activeTab.startsWith('fleet-')
                ? 'module-fleet'
                : activeTab
            }
            className="app-page-transition w-full"
          >
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Floating Bottom Nav for Smartphone Viewport (< 768px) */}
      <MobileBottomNav />

      {/* Global Toast Notification System */}
      <ToastContainer />
    </div>
  );
};

export default App;

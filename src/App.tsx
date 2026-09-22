import React from 'react';
import { useAppStore } from './store/useAppStore';
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

export const App: React.FC = () => {
  const { activeTab, isLoggedIn } = useAppStore();

  // If user is not logged in, enforce Login Page first
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'security':
        return <SecurityView />;
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
      case 'fleet':
        return <WebFleetCustomerView initialMenu="status" />;
      case 'dokumen':
        return <WebFleetCustomerView initialMenu="dokumen" />;
      case 'kendaraan':
        return <WebFleetCustomerView initialMenu="kendaraan" />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-20 lg:pb-0">
      {/* Top App Header */}
      <Navbar />

      <div className="flex flex-1 w-full max-w-[1600px] mx-auto overflow-hidden">
        {/* Left Navigation Sidebar for Desktop */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {renderActiveView()}
        </main>
      </div>

      {/* Floating Bottom Nav for Smartphone Viewport */}
      <MobileBottomNav />
    </div>
  );
};

export default App;

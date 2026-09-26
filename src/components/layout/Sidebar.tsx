import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  ClipboardList, 
  Wrench, 
  ShoppingBag, 
  Receipt, 
  Package, 
  Truck, 
  FileText, 
  Clock, 
  Car, 
  Calendar, 
  Building2, 
  UserCheck, 
  LogOut, 
  PlusCircle, 
  Settings,
  Activity,
  ChevronDown,
  Users,
  Percent,
  Printer,
  PackageCheck,
  CheckCircle2
} from 'lucide-react';
import { PeranUser } from '../../types';

export interface NavSubItem {
  id: string;
  label: string;
  icon: any;
}

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  roles: PeranUser[];
  children?: NavSubItem[];
  defaultTab?: string;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, bumpNav, currentRole } = useAppStore();

  const allNavigationItems: NavItem[] = [
    // =========================================================================
    // 1. SUPER ADMIN (Full Master Access)
    // =========================================================================
    {
      id: 'admin-panel-group',
      label: 'Admin Panel & Sistem',
      icon: Settings,
      roles: ['Super Admin'],
      defaultTab: 'admin-users',
      children: [
        { id: 'admin-users', label: 'Manajemen Pengguna', icon: Users },
        { id: 'admin-ppn', label: 'Pengaturan PPN', icon: Percent },
        { id: 'admin-print', label: 'Template Kop & Cetak', icon: Printer },
        { id: 'admin-settings', label: 'Profil Bengkel & Rek.', icon: Building2 },
      ],
    },
    { id: 'dashboard', label: 'Monitoring Operasional', icon: LayoutDashboard, roles: ['Super Admin'] },
    {
      id: 'security-group',
      label: 'Pos Gerbang Security',
      icon: ShieldCheck,
      roles: ['Super Admin'],
      defaultTab: 'security-dashboard',
      children: [
        { id: 'security-dashboard', label: 'Dashboard Pos', icon: LayoutDashboard },
        { id: 'security-checkin', label: 'Check In Masuk', icon: PlusCircle },
        { id: 'security-booking', label: 'List Nopol Booking', icon: Calendar },
        { id: 'security-onprogress', label: 'Nopol di Bengkel', icon: Clock },
        { id: 'security-selesai', label: 'Telah Keluar', icon: LogOut },
        { id: 'security-memo', label: 'Memo Keluar Resmi', icon: FileText },
      ],
    },
    {
      id: 'sa-group',
      label: 'Service Advisor (SPK)',
      icon: ClipboardList,
      roles: ['Super Admin'],
      defaultTab: 'sa-list',
      children: [
        { id: 'sa-list', label: 'Daftar SPK Aktif', icon: ClipboardList },
        { id: 'sa-baru', label: 'Buat SPK Baru', icon: PlusCircle },
        { id: 'sa-kotak-merah', label: 'Kotak Merah (PR)', icon: ShoppingBag },
      ],
    },
    {
      id: 'foreman-group',
      label: 'Foreman (QC Workshop)',
      icon: Wrench,
      roles: ['Super Admin'],
      defaultTab: 'foreman-tugas',
      children: [
        { id: 'foreman-tugas', label: 'Tugas Mekanik & SPK', icon: Wrench },
        { id: 'foreman-cek', label: 'Input Hasil Cek', icon: PlusCircle },
        { id: 'foreman-qc', label: 'Quality Control (FIR)', icon: CheckCircle2 },
      ],
    },
    { id: 'purchasing', label: 'Purchasing & Part', icon: ShoppingBag, roles: ['Super Admin'] },
    { id: 'kasir', label: 'Kasir & Faktur Tagihan', icon: Receipt, roles: ['Super Admin'] },
    {
      id: 'beli-part-group',
      label: 'Penjualan Part Langsung',
      icon: Package,
      roles: ['Super Admin'],
      defaultTab: 'beli-part-transaksi',
      children: [
        { id: 'beli-part-transaksi', label: 'Daftar Transaksi', icon: FileText },
        { id: 'beli-part-estimasi', label: 'Estimasi & POS Baru', icon: PlusCircle },
        { id: 'beli-part-picking', label: 'Warehouse Picking', icon: PackageCheck },
      ],
    },
    {
      id: 'fleet-group',
      label: 'Portal Armada Fleet',
      icon: Truck,
      roles: ['Super Admin'],
      defaultTab: 'fleet-dashboard',
      children: [
        { id: 'fleet-dashboard', label: 'Dashboard Armada', icon: LayoutDashboard },
        { id: 'fleet-booking', label: 'Booking Servis Baru', icon: Calendar },
        { id: 'fleet-status', label: 'Status & Pelacakan Unit', icon: Clock },
        { id: 'fleet-history', label: 'Histori Servis & Faktur', icon: Receipt },
        { id: 'fleet-kendaraan', label: 'Daftar Armada Truk', icon: Car },
        { id: 'fleet-dokumen', label: 'Dokumen STNK & KIR', icon: FileText },
        { id: 'fleet-profil', label: 'Profil Customer & Kontak', icon: Building2 },
      ],
    },

    // =========================================================================
    // 2. DASHBOARD PER PERAN (Single Tab Dashboard)
    // =========================================================================
    { id: 'dashboard', label: 'Dashboard SA', icon: LayoutDashboard, roles: ['SA'] },
    { id: 'kunjungan', label: 'Kunjungan untuk Saya', icon: UserCheck, roles: ['SA'] },
    { id: 'dashboard', label: 'Dashboard Foreman', icon: LayoutDashboard, roles: ['Foreman'] },
    { id: 'kunjungan', label: 'Kunjungan untuk Saya', icon: UserCheck, roles: ['Foreman'] },
    { id: 'dashboard', label: 'Dashboard Mekanik', icon: LayoutDashboard, roles: ['Mekanik'] },
    { id: 'kunjungan', label: 'Kunjungan untuk Saya', icon: UserCheck, roles: ['Mekanik'] },
    { id: 'dashboard', label: 'Dashboard Purchasing', icon: LayoutDashboard, roles: ['Admin Purchasing'] },
    { id: 'kunjungan', label: 'Kunjungan untuk Saya', icon: UserCheck, roles: ['Admin Purchasing'] },
    { id: 'dashboard', label: 'Dashboard Kasir', icon: LayoutDashboard, roles: ['Admin Invoice'] },
    { id: 'kunjungan', label: 'Kunjungan untuk Saya', icon: UserCheck, roles: ['Admin Invoice'] },
    { id: 'dashboard', label: 'Dashboard Kunjungan', icon: LayoutDashboard, roles: ['PIC Terkait'] },

    // =========================================================================
    // 3. SECURITY
    // =========================================================================
    {
      id: 'security-group',
      label: 'Pos Gerbang Security',
      icon: ShieldCheck,
      roles: ['Security'],
      defaultTab: 'security-dashboard',
      children: [
        { id: 'security-dashboard', label: 'Dashboard Pos', icon: LayoutDashboard },
        { id: 'security-checkin', label: 'Check In Masuk', icon: PlusCircle },
        { id: 'security-booking', label: 'List Nopol Booking', icon: Calendar },
        { id: 'security-onprogress', label: 'Nopol di Bengkel', icon: Clock },
        { id: 'security-selesai', label: 'Telah Keluar', icon: LogOut },
        { id: 'security-memo', label: 'Memo Keluar Resmi', icon: FileText },
      ],
    },

    // =========================================================================
    // 4. SERVICE ADVISOR (SA)
    // =========================================================================
    {
      id: 'sa-group',
      label: 'Service Advisor (SPK)',
      icon: ClipboardList,
      roles: ['SA'],
      defaultTab: 'sa-list',
      children: [
        { id: 'sa-list', label: 'Daftar SPK Aktif', icon: ClipboardList },
        { id: 'sa-baru', label: 'Buat SPK Baru', icon: PlusCircle },
        { id: 'sa-kotak-merah', label: 'Kotak Merah (PR)', icon: ShoppingBag },
      ],
    },
    {
      id: 'beli-part-group',
      label: 'Penjualan Part Langsung',
      icon: Package,
      roles: ['SA'],
      defaultTab: 'beli-part-transaksi',
      children: [
        { id: 'beli-part-transaksi', label: 'Daftar Transaksi', icon: FileText },
        { id: 'beli-part-estimasi', label: 'Estimasi Baru (POS)', icon: PlusCircle },
      ],
    },

    // =========================================================================
    // 5. FOREMAN
    // =========================================================================
    {
      id: 'foreman-group',
      label: 'Foreman (QC Workshop)',
      icon: Wrench,
      roles: ['Foreman'],
      defaultTab: 'foreman-tugas',
      children: [
        { id: 'foreman-tugas', label: 'Tugas Mekanik & SPK', icon: Wrench },
        { id: 'foreman-cek', label: 'Input Hasil Cek', icon: PlusCircle },
        { id: 'foreman-qc', label: 'Quality Control (FIR)', icon: CheckCircle2 },
      ],
    },
    { id: 'mekanik', label: 'Live Monitoring Mekanik', icon: Clock, roles: ['Foreman'] },

    // =========================================================================
    // 6. MEKANIK
    // =========================================================================
    { id: 'mekanik', label: 'Pekerjaan Saya (Stopwatch)', icon: Clock, roles: ['Mekanik'] },

    // =========================================================================
    // 7. ADMIN PURCHASING
    // =========================================================================
    { id: 'purchasing', label: 'PR, PO & Kotak Merah', icon: ShoppingBag, roles: ['Admin Purchasing'] },
    {
      id: 'beli-part-group',
      label: 'Penjualan Part Langsung',
      icon: Package,
      roles: ['Admin Purchasing'],
      defaultTab: 'beli-part-transaksi',
      children: [
        { id: 'beli-part-transaksi', label: 'Daftar Transaksi', icon: FileText },
        { id: 'beli-part-estimasi', label: 'Estimasi & POS Baru', icon: PlusCircle },
        { id: 'beli-part-picking', label: 'Warehouse Picking', icon: PackageCheck },
      ],
    },

    // =========================================================================
    // 8. ADMIN INVOICE (KASIR)
    // =========================================================================
    { id: 'kasir', label: 'Kasir & Faktur Tagihan', icon: Receipt, roles: ['Admin Invoice'] },
    {
      id: 'beli-part-group',
      label: 'Penjualan Part Langsung',
      icon: Package,
      roles: ['Admin Invoice'],
      defaultTab: 'beli-part-transaksi',
      children: [
        { id: 'beli-part-transaksi', label: 'Daftar Transaksi', icon: FileText },
        { id: 'beli-part-estimasi', label: 'Estimasi & POS Baru', icon: PlusCircle },
        { id: 'beli-part-picking', label: 'Warehouse Picking', icon: PackageCheck },
      ],
    },

    // =========================================================================
    // 9. WAREHOUSE
    // =========================================================================
    { id: 'dashboard', label: 'Dashboard Warehouse', icon: LayoutDashboard, roles: ['Warehouse'] },
    { id: 'kunjungan', label: 'Kunjungan untuk Saya', icon: UserCheck, roles: ['Warehouse'] },
    {
      id: 'beli-part-group',
      label: 'Penjualan Part Langsung',
      icon: Package,
      roles: ['Warehouse'],
      defaultTab: 'beli-part-transaksi',
      children: [
        { id: 'beli-part-transaksi', label: 'Daftar Transaksi', icon: FileText },
        { id: 'beli-part-estimasi', label: 'Estimasi & POS Baru', icon: PlusCircle },
        { id: 'beli-part-picking', label: 'Warehouse Picking', icon: PackageCheck },
      ],
    },

    // =========================================================================
    // 10. CUSTOMER FLEET
    // =========================================================================
    {
      id: 'fleet-group',
      label: 'Portal Armada Fleet',
      icon: Truck,
      roles: ['Customer Fleet'],
      defaultTab: 'fleet-dashboard',
      children: [
        { id: 'fleet-dashboard', label: 'Dashboard Armada', icon: LayoutDashboard },
        { id: 'fleet-booking', label: 'Booking Servis Baru', icon: Calendar },
        { id: 'fleet-status', label: 'Status & Pelacakan Unit', icon: Clock },
        { id: 'fleet-history', label: 'Histori Servis & Faktur', icon: Receipt },
        { id: 'fleet-kendaraan', label: 'Daftar Armada Truk', icon: Car },
        { id: 'fleet-dokumen', label: 'Dokumen STNK & KIR', icon: FileText },
        { id: 'fleet-profil', label: 'Profil Customer & Kontak', icon: Building2 },
      ],
    },

    // =========================================================================
    // 11. PIC TERKAIT
    // =========================================================================
    { id: 'pic-terkait', label: 'Konfirmasi Tamu (PIC)', icon: UserCheck, roles: ['PIC Terkait'] },
  ];

  // Filter menu strictly by active user role
  const roleMenus = allNavigationItems.filter((item) => item.roles.includes(currentRole));

  // State untuk collapsible accordion groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Helper: check if a tab ID is active (handling aliases)
  const isTabActive = (tabId: string) => {
    if (activeTab === tabId) return true;
    if (activeTab.startsWith(`${tabId}-`)) return true;
    if (tabId === 'sa-list' && (activeTab === 'sa' || activeTab === 'sa-list')) return true;
    if (tabId === 'sa-baru' && (activeTab === 'sa-penerimaan' || activeTab === 'sa-baru')) return true;
    if (tabId === 'sa-kotak-merah' && (activeTab === 'sa-kotak-merah' || (currentRole === 'SA' && activeTab === 'purchasing'))) return true;
    if (tabId === 'beli-part-transaksi' && (activeTab === 'beli-part' || activeTab === 'beli-part-transaksi')) return true;
    if (tabId === 'foreman-tugas' && (activeTab === 'foreman' || activeTab === 'foreman-tugas')) return true;
    if (tabId === 'admin-users' && (activeTab === 'admin-panel' || activeTab === 'admin-users')) return true;
    if (tabId === 'admin-settings' && activeTab === 'pengaturan') return true;
    return false;
  };

  // Auto-expand group if any of its children is currently active
  useEffect(() => {
    roleMenus.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((c) => isTabActive(c.id));
        if (hasActiveChild) {
          setOpenGroups((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }));
        }
      }
    });
  }, [activeTab, roleMenus]);

  const handleToggleGroup = (item: NavItem) => {
    const isCurrentlyOpen = openGroups[item.id] ?? false;
    setOpenGroups((prev) => ({ ...prev, [item.id]: !isCurrentlyOpen }));

    // If opening from closed state and no child is active, navigate to defaultTab
    if (!isCurrentlyOpen && item.children && item.children.length > 0) {
      const hasActiveChild = item.children.some((c) => isTabActive(c.id));
      if (!hasActiveChild) {
        setActiveTab(item.defaultTab || item.children[0].id);
        bumpNav();
      }
    }
  };

  return (
    <aside className="w-64 bg-surface-raised border-r border-border hidden md:flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] p-3 font-sans overflow-y-auto">
      <div>
        <div className="px-2 mb-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
            Menu {currentRole}
          </p>
        </div>
        <nav className="space-y-1">
          {roleMenus.map((item) => {
            const Icon = item.icon;

            // Jika menu memiliki sub-menu (Collapsible Group)
            if (item.children && item.children.length > 0) {
              const isOpen = openGroups[item.id] ?? false;
              const hasActiveChild = item.children.some((c) => isTabActive(c.id));

              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(item)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-all cursor-pointer ${
                      hasActiveChild
                        ? 'bg-accent-subtle text-accent font-bold'
                        : 'text-ink-muted hover:text-ink hover:bg-surface font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${hasActiveChild ? 'text-accent' : 'text-ink-subtle'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-accent' : 'text-ink-subtle'
                      }`}
                    />
                  </button>

                  {/* Sub-menu accordion items */}
                  {isOpen && (
                    <div className="ml-3.5 pl-3 border-l-2 border-border space-y-0.5 pt-0.5">
                      {item.children.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = isTabActive(sub.id);

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(sub.id);
                              bumpNav();
                            }}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                              isSubActive
                                ? 'bg-accent text-white font-bold shadow-2xs'
                                : 'text-ink-muted hover:text-ink hover:bg-surface font-medium'
                            }`}
                          >
                            <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-white' : 'text-ink-subtle'}`} />
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Menu tunggal biasa (Single Item)
            const isActive = isTabActive(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  bumpNav();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-accent text-white font-semibold shadow-2xs'
                    : 'text-ink-muted hover:text-ink hover:bg-accent-subtle/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-ink-subtle'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Workshop System Indicator Footer */}
      <div className="border-t border-border pt-3 px-2 mt-4">
        <div className="flex items-center gap-2 text-[10px] text-ink-subtle font-mono">
          <Activity className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">KIM3 Workshop Shell</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

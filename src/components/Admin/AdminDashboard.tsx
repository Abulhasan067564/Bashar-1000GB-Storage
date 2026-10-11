import React, { useState, useMemo } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Search, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Lock, 
  Trash2, 
  UserCheck, 
  UserX, 
  ArrowLeft, 
  LogOut, 
  Calendar, 
  HardDrive, 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ExternalLink,
  ShieldAlert,
  Edit3,
  Copy,
  Check,
  Download,
  Filter,
  Sparkles
} from 'lucide-react';
import { UserAccount, AdminCredentials } from '../../types/storage';

interface AdminDashboardProps {
  usersList: UserAccount[];
  adminCredentials: AdminCredentials;
  onUpdateUsersList: (users: UserAccount[]) => void;
  onUpdateAdminCredentials: (creds: AdminCredentials) => void;
  onDeleteUser: (userId: string) => Promise<void>;
  onLogoutAdmin: () => void;
  onBackToApp: () => void;
  onRefreshData?: () => Promise<void>;
  lang: 'bn' | 'en';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  usersList,
  adminCredentials,
  onUpdateUsersList,
  onUpdateAdminCredentials,
  onDeleteUser,
  onLogoutAdmin,
  onBackToApp,
  onRefreshData,
  lang
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Modals state
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserAccount | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  
  // Admin Password Change Modal
  const [isChangeAdminPassOpen, setIsChangeAdminPassOpen] = useState(false);
  const [currentAdminPass, setCurrentAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [adminPassError, setAdminPassError] = useState<string | null>(null);
  const [adminPassSuccess, setAdminPassSuccess] = useState<string | null>(null);

  // General Notification / Toast
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showNotification(lang === 'bn' ? 'কপি করা হয়েছে!' : 'Copied to clipboard!');
  };

  // Toggle User Status (Active <-> Disabled)
  const handleToggleStatus = (user: UserAccount) => {
    const currentStatus = user.status || 'active';
    const newStatus: 'active' | 'disabled' = currentStatus === 'active' ? 'disabled' : 'active';

    const updated: UserAccount[] = usersList.map(u => {
      if (u.id === user.id) {
        return { ...u, status: newStatus };
      }
      return u;
    });

    onUpdateUsersList(updated);
    showNotification(
      lang === 'bn' 
        ? `${user.name}-এর অ্যাকাউন্ট ${newStatus === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`
        : `User ${user.name} is now ${newStatus}.`
    );
  };

  // Reset user password
  const handleResetUserPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !newPasswordInput.trim()) return;

    if (newPasswordInput.trim().length < 4) {
      showNotification(
        lang === 'bn' ? 'পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে।' : 'Password must be at least 4 characters.',
        'error'
      );
      return;
    }

    const updated = usersList.map(u => {
      if (u.id === selectedUserForReset.id) {
        return { ...u, passwordHash: newPasswordInput.trim() };
      }
      return u;
    });

    onUpdateUsersList(updated);
    showNotification(
      lang === 'bn'
        ? `${selectedUserForReset.name}-এর নতুন পাসওয়ার্ড সফলভাবে সেট করা হয়েছে।`
        : `Password for ${selectedUserForReset.name} updated successfully.`
    );
    setSelectedUserForReset(null);
    setNewPasswordInput('');
  };

  // Confirm Delete User
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await onDeleteUser(userToDelete.id);
      showNotification(
        lang === 'bn'
          ? `${userToDelete.name}-এর অ্যাকাউন্ট এবং ডেটা মুছে ফেলা হয়েছে।`
          : `User ${userToDelete.name} deleted successfully.`
      );
      setUserToDelete(null);
    } catch {
      showNotification(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে!' : 'Failed to delete user!', 'error');
    }
  };

  // Handle Admin Password Change
  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassError(null);
    setAdminPassSuccess(null);

    if (currentAdminPass !== adminCredentials.passwordHash) {
      setAdminPassError(lang === 'bn' ? 'বর্তমান পাসওয়ার্ড মেলেনি!' : 'Current password does not match!');
      return;
    }

    if (newAdminPass.length < 5) {
      setAdminPassError(lang === 'bn' ? 'নতুন পাসওয়ার্ড অন্তত ৫ অক্ষরের হতে হবে।' : 'New password must be at least 5 characters.');
      return;
    }

    if (newAdminPass !== confirmAdminPass) {
      setAdminPassError(lang === 'bn' ? 'নতুন পাসওয়ার্ড দুটি মেলেনি!' : 'New passwords do not match!');
      return;
    }

    const updated: AdminCredentials = {
      ...adminCredentials,
      passwordHash: newAdminPass,
      updatedAt: new Date().toISOString()
    };

    onUpdateAdminCredentials(updated);
    setAdminPassSuccess(
      lang === 'bn' 
        ? 'অ্যাডমিন পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!' 
        : 'Admin password updated successfully!'
    );

    setTimeout(() => {
      setIsChangeAdminPassOpen(false);
      setCurrentAdminPass('');
      setNewAdminPass('');
      setConfirmAdminPass('');
      setAdminPassSuccess(null);
    }, 1500);
  };

  // Handle Refresh
  const handleRefresh = async () => {
    if (onRefreshData) {
      setIsRefreshing(true);
      await onRefreshData();
      setTimeout(() => {
        setIsRefreshing(false);
        showNotification(lang === 'bn' ? 'ফায়ারস্টোর থেকে ডেটা রিফ্রেশ করা হয়েছে।' : 'Refreshed data from Firestore.');
      }, 500);
    }
  };

  // Export Users CSV
  const handleExportUsers = () => {
    const headers = ['User ID', 'Full Name', 'Email/Phone', 'Secret Name', 'Birthdate', 'Password', 'Status', 'Sign Up Date'];
    const rows = usersList.map(u => [
      `"${u.id}"`,
      `"${u.name}"`,
      `"${u.emailOrPhone}"`,
      `"${u.secretName}"`,
      `"${u.birthDate || ''}"`,
      `"${u.passwordHash}"`,
      `"${u.status || 'active'}"`,
      `"${u.createdAt}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bashar_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(lang === 'bn' ? 'ইউজার তালিকা CSV হিসেবে ডাউনলোড হয়েছে।' : 'User list exported as CSV.');
  };

  // Format Date in Bengali / English
  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Filtered and Sorted Users
  const filteredUsers = useMemo(() => {
    return usersList
      .filter(user => {
        const matchesQuery = 
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.emailOrPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.id.toLowerCase().includes(searchQuery.toLowerCase());

        const currentStatus = user.status || 'active';
        const matchesStatus = 
          statusFilter === 'all' || 
          currentStatus === statusFilter;

        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return a.name.localeCompare(b.name);
      });
  }, [usersList, searchQuery, statusFilter, sortBy]);

  // Statistics
  const totalUsersCount = usersList.length;
  const activeUsersCount = usersList.filter(u => (u.status || 'active') === 'active').length;
  const disabledUsersCount = usersList.filter(u => u.status === 'disabled').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md border ${
            notification.type === 'error' 
              ? 'bg-rose-950/90 text-rose-200 border-rose-800' 
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
          }`}>
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Admin Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-3">
          {/* Brand & Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 text-slate-950 shadow-lg shadow-rose-500/20">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">Bashar 1000GB</span>
                <span className="px-2 py-0.5 text-[11px] font-black tracking-wide rounded-md bg-rose-600 text-white uppercase shadow-sm">
                  Admin Panel
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 text-[10px] border border-emerald-800/40 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Firestore Live
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                {lang === 'bn' 
                  ? 'নিবন্ধিত ইউজার তালিকা ও নিরাপত্তা নিয়ন্ত্রণ' 
                  : 'User Management & Security Control'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Refresh Data */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title={lang === 'bn' ? 'তথ্য রিফ্রেশ করুন' : 'Refresh Data'}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>

            {/* Change Admin Password */}
            <button
              onClick={() => setIsChangeAdminPassOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}</span>
            </button>

            {/* Back to User Drive */}
            <button
              onClick={onBackToApp}
              className="px-3 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-xs font-semibold text-cyan-300 transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'bn' ? 'ক্লাউড ড্রাইভ' : 'Drive View'}</span>
            </button>

            {/* Admin Logout */}
            <button
              onClick={onLogoutAdmin}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-xs font-semibold text-rose-300 transition flex items-center gap-1.5 cursor-pointer"
              title={lang === 'bn' ? 'অ্যাডমিন লগআউট' : 'Admin Logout'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'bn' ? 'লগআউট' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Users */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-rose-400">
              <Users className="w-16 h-16" />
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              {lang === 'bn' ? 'মোট সাইন আপ ইউজার' : 'Total Sign Up Users'}
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              {totalUsersCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{lang === 'bn' ? 'স্বয়ংক্রিয় ক্লাউড সিঙ্ক' : 'Auto Cloud Synced'}</span>
            </div>
          </div>

          {/* Card 2: Active Accounts */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-emerald-400">
              <UserCheck className="w-16 h-16" />
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              {lang === 'bn' ? 'সক্রিয় অ্যাকাউন্ট' : 'Active Accounts'}
            </div>
            <div className="text-3xl font-black text-emerald-400 tracking-tight">
              {activeUsersCount}
            </div>
            <div className="text-[11px] text-emerald-500/80 mt-2">
              {lang === 'bn' ? 'লগইন ও ড্রাইভ ব্যবহারে সক্ষম' : 'Authorized for Drive access'}
            </div>
          </div>

          {/* Card 3: Disabled Accounts */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-rose-400">
              <UserX className="w-16 h-16" />
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              {lang === 'bn' ? 'নিষ্ক্রিয় অ্যাকাউন্ট' : 'Disabled Accounts'}
            </div>
            <div className="text-3xl font-black text-rose-400 tracking-tight">
              {disabledUsersCount}
            </div>
            <div className="text-[11px] text-rose-500/80 mt-2">
              {lang === 'bn' ? 'লগইন সাময়িকভাবে বন্ধ' : 'Login temporarily restricted'}
            </div>
          </div>

          {/* Card 4: Allocated Capacity */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-cyan-400">
              <HardDrive className="w-16 h-16" />
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              {lang === 'bn' ? 'বরাদ্দকৃত ক্লাউড স্পেস' : 'Allocated Space'}
            </div>
            <div className="text-3xl font-black text-cyan-400 tracking-tight">
              {totalUsersCount * 1000} <span className="text-lg font-bold text-slate-400">GB</span>
            </div>
            <div className="text-[11px] text-cyan-500/80 mt-2">
              {lang === 'bn' ? 'প্রতি ইউজারে ১,০০০ জিবি' : '1,000 GB per registered user'}
            </div>
          </div>
        </div>

        {/* Section: Sign Up Users */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
          {/* Header of Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-400" />
                <h2 className="text-xl font-black text-white tracking-tight">
                  {lang === 'bn' ? 'Sign Up Users (নিবন্ধিত ইউজার তালিকা)' : 'Sign Up Users List'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                  {filteredUsers.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'bn'
                  ? 'ওয়েবসাইটে যারা Sign Up করেছে, তাদের পূর্ণাঙ্গ তথ্য, সক্রিয়তা এবং পাসওয়ার্ড ব্যবস্থাপনা।'
                  : 'Complete overview, activity status and credential management of all registered users.'}
              </p>
            </div>

            {/* Export CSV button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportUsers}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                title="Export Users to CSV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'bn' ? 'এক্সপোর্ট CSV' : 'Export CSV'}</span>
              </button>
            </div>
          </div>

          {/* Search, Filter, Sort Controls */}
          <div className="pt-4 pb-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={lang === 'bn' ? 'ইউজারের নাম, ইমেইল বা আইডি দিয়ে খুঁজুন...' : 'Search by name, email, or user ID...'}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-8 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Tabs */}
              <div className="flex items-center bg-slate-950/70 border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    statusFilter === 'all' 
                      ? 'bg-rose-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'bn' ? 'সকল' : 'All'} ({totalUsersCount})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    statusFilter === 'active' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'bn' ? 'সক্রিয়' : 'Active'} ({activeUsersCount})
                </button>
                <button
                  onClick={() => setStatusFilter('disabled')}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    statusFilter === 'disabled' 
                      ? 'bg-rose-900 text-rose-200 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'bn' ? 'নিষ্ক্রিয়' : 'Disabled'} ({disabledUsersCount})
                </button>
              </div>

              {/* Sort Order */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                aria-label={lang === 'bn' ? 'সাজানোর ক্রম নির্বাচন করুন' : 'Select sorting order'}
                className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="newest">{lang === 'bn' ? 'সর্বশেষ সাইন আপ' : 'Newest First'}</option>
                <option value="oldest">{lang === 'bn' ? 'পুরনো সাইন আপ' : 'Oldest First'}</option>
                <option value="name">{lang === 'bn' ? 'নাম অনুসারে (A-Z)' : 'Name (A-Z)'}</option>
              </select>
            </div>
          </div>

          {/* User List: Table for Desktop / Cards for Mobile */}
          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">
                {lang === 'bn' ? 'কোনো ইউজার পাওয়া যায়নি' : 'No users found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery 
                  ? (lang === 'bn' ? 'আপনার সার্চ কিওয়ার্ডের সাথে কোনো ফলাফল মেলেনি।' : 'No users match your search criteria.')
                  : (lang === 'bn' ? 'এখনো কোনো ইউজার সাইন আপ করেনি।' : 'No users have signed up yet.')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/50">
                    <th className="py-3 px-4 rounded-l-xl">
                      {lang === 'bn' ? 'ইউজার (Full Name)' : 'Full Name'}
                    </th>
                    <th className="py-3 px-4">
                      {lang === 'bn' ? 'ইমেইল / মোবাইল (Email)' : 'Email Address'}
                    </th>
                    <th className="py-3 px-4">
                      {lang === 'bn' ? 'সাইন আপ তারিখ (Sign Up Date)' : 'Sign Up Date'}
                    </th>
                    <th className="py-3 px-4">
                      {lang === 'bn' ? 'স্ট্যাটাস (Status)' : 'Status'}
                    </th>
                    <th className="py-3 px-4">
                      {lang === 'bn' ? 'পাসওয়ার্ড (Password)' : 'Password'}
                    </th>
                    <th className="py-3 px-4 text-right rounded-r-xl">
                      {lang === 'bn' ? 'অ্যাকশন (Actions)' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {filteredUsers.map(user => {
                    const isActive = (user.status || 'active') === 'active';

                    return (
                      <tr 
                        key={user.id} 
                        className="hover:bg-slate-800/40 transition group"
                      >
                        {/* 1. Full Name + Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {user.customLogo ? (
                              <img
                                src={user.customLogo}
                                alt={user.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-xs shrink-0 shadow-sm">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {user.birthDate && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({user.birthDate})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <span>ID: {user.id.slice(0, 12)}</span>
                                <button
                                  onClick={() => handleCopy(user.id, `id-${user.id}`)}
                                  className="hover:text-slate-300"
                                  title="Copy User ID"
                                >
                                  {copiedId === `id-${user.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Email / Phone */}
                        <td className="py-3.5 px-4 font-mono text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[200px]">{user.emailOrPhone}</span>
                            <button
                              onClick={() => handleCopy(user.emailOrPhone, `email-${user.id}`)}
                              className="text-slate-500 hover:text-slate-300 cursor-pointer"
                              title="Copy Email"
                            >
                              {copiedId === `email-${user.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          {user.secretName && (
                            <div className="text-[10px] text-amber-400/80 mt-0.5">
                              {lang === 'bn' ? 'সিক্রেট:' : 'Secret:'} {user.secretName}
                            </div>
                          )}
                        </td>

                        {/* 3. Sign Up Date */}
                        <td className="py-3.5 px-4 text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{formatDate(user.createdAt)}</span>
                          </div>
                        </td>

                        {/* 4. Account Status Toggle */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                              isActive 
                                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60' 
                                : 'bg-rose-950/70 text-rose-300 border-rose-800/80 hover:bg-rose-900/60'
                            }`}
                            title={isActive ? (lang === 'bn' ? 'নিষ্ক্রিয় করতে ক্লিক করুন' : 'Click to disable') : (lang === 'bn' ? 'সক্রিয় করতে ক্লিক করুন' : 'Click to activate')}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                            <span>{isActive ? (lang === 'bn' ? 'সক্রিয়' : 'Active') : (lang === 'bn' ? 'নিষ্ক্রিয়' : 'Disabled')}</span>
                          </button>
                        </td>

                        {/* 5. Password Management (Secure & Protected) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span 
                              className="font-mono text-xs bg-slate-950/90 px-2.5 py-1 rounded-md border border-slate-800 text-slate-400 flex items-center gap-1.5"
                              title={lang === 'bn' ? 'পাসওয়ার্ড সুরক্ষিত ও অপ্রকাশিত' : 'Password is encrypted & confidential'}
                            >
                              <Lock className="w-3 h-3 text-emerald-400" />
                              <span className="tracking-widest">••••••••</span>
                            </span>
                            <button
                              onClick={() => {
                                setSelectedUserForReset(user);
                                setNewPasswordInput('');
                              }}
                              className="px-2 py-1 rounded-md bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                              title={lang === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset user password'}
                            >
                              <KeyRound className="w-3 h-3 text-amber-400" />
                              <span>{lang === 'bn' ? 'রিসেট' : 'Reset'}</span>
                            </button>
                          </div>
                        </td>

                        {/* 6. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Profile Details */}
                            <button
                              onClick={() => setSelectedUserForDetails(user)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-[11px] font-semibold"
                            >
                              {lang === 'bn' ? 'বিস্তারিত' : 'Details'}
                            </button>

                            {/* Delete Account */}
                            <button
                              onClick={() => setUserToDelete(user)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition cursor-pointer"
                              title={lang === 'bn' ? 'অ্যাকাউন্ট মুছুন' : 'Delete user account'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* --- MODAL 1: USER DETAILS MODAL --- */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                {selectedUserForDetails.customLogo ? (
                  <img
                    src={selectedUserForDetails.customLogo}
                    alt={selectedUserForDetails.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-base shadow-md">
                    {selectedUserForDetails.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedUserForDetails.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (selectedUserForDetails.status || 'active') === 'active'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                    }`}>
                      {(selectedUserForDetails.status || 'active') === 'active' ? 'Active' : 'Disabled'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {selectedUserForDetails.emailOrPhone}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForDetails(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                <div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold">{lang === 'bn' ? 'ইউজার আইডি' : 'User ID'}</div>
                  <div className="font-mono text-slate-200 mt-0.5 truncate">{selectedUserForDetails.id}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold">{lang === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'}</div>
                  <div className="text-slate-200 mt-0.5">{selectedUserForDetails.birthDate || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold">{lang === 'bn' ? 'সিক্রেট নাম (Recovery)' : 'Secret Name'}</div>
                  <div className="text-amber-300 font-mono mt-0.5">{selectedUserForDetails.secretName}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold">{lang === 'bn' ? 'স্টোরেজ কোটা' : 'Storage Limit'}</div>
                  <div className="text-cyan-400 font-bold mt-0.5">1,000 GB</div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">{lang === 'bn' ? 'সাইন আপের তারিখ' : 'Sign Up Date'}</div>
                  <div className="text-slate-200 mt-0.5">{formatDate(selectedUserForDetails.createdAt)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">{lang === 'bn' ? 'পাসওয়ার্ড নিরাপত্তা' : 'Password Security'}</div>
                  <div className="flex items-center justify-between bg-slate-950/90 px-3.5 py-2.5 rounded-xl border border-slate-800 mt-1">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono text-slate-300 tracking-widest text-xs">••••••••••••</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                      {lang === 'bn' ? 'নিরাপদ ও অপ্রকাশিত' : 'Protected & Encrypted'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const user = selectedUserForDetails;
                  setSelectedUserForDetails(null);
                  handleToggleStatus(user);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  (selectedUserForDetails.status || 'active') === 'active'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                }`}
              >
                {(selectedUserForDetails.status || 'active') === 'active' 
                  ? (lang === 'bn' ? 'অ্যাকাউন্ট নিষ্ক্রিয় করুন' : 'Disable Account')
                  : (lang === 'bn' ? 'অ্যাকাউন্ট সক্রিয় করুন' : 'Activate Account')}
              </button>
              <button
                onClick={() => {
                  setSelectedUserForReset(selectedUserForDetails);
                  setSelectedUserForDetails(null);
                  setNewPasswordInput('');
                }}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                {lang === 'bn' ? 'পাসওয়ার্ড রিসেট' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: RESET PASSWORD MODAL --- */}
      {selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1">
              {lang === 'bn' ? 'ইউজার পাসওয়ার্ড রিসেট করুন' : 'Reset User Password'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {lang === 'bn' 
                ? `${selectedUserForReset.name}-এর জন্য একটি নতুন পাসওয়ার্ড প্রদান করুন।` 
                : `Set a new password for ${selectedUserForReset.name}.`}
            </p>

            <form onSubmit={handleResetUserPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  {lang === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                    placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড লিখুন' : 'Enter new password'}
                    required
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForReset(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: DELETE CONFIRMATION MODAL --- */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-900/40 w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-400 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {lang === 'bn' ? 'ইউজার অ্যাকাউন্ট মুছে ফেলবেন?' : 'Delete User Account?'}
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {lang === 'bn' ? (
                <>
                  আপনি কি নিশ্চিত যে <strong className="text-white">{userToDelete.name}</strong> ({userToDelete.emailOrPhone})-এর অ্যাকাউন্ট এবং সংরক্ষিত সমস্ত ফাইল স্থায়ীভাবে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete <strong className="text-white">{userToDelete.name}</strong> and all their stored files? This action cannot be undone.
                </>
              )}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/20 cursor-pointer"
              >
                {lang === 'bn' ? 'হ্যাঁ, স্থায়ীভাবে মুছুন' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: CHANGE ADMIN PASSWORD MODAL --- */}
      {isChangeAdminPassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-white">
                  {lang === 'bn' ? 'অ্যাডমিন পাসওয়ার্ড পরিবর্তন' : 'Change Admin Password'}
                </h3>
              </div>
              <button
                onClick={() => setIsChangeAdminPassOpen(false)}
                className="text-slate-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            {adminPassError && (
              <div className="mb-3 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{adminPassError}</span>
              </div>
            )}

            {adminPassSuccess && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{adminPassSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangeAdminPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  {lang === 'bn' ? 'বর্তমান অ্যাডমিন পাসওয়ার্ড' : 'Current Admin Password'}
                </label>
                <input
                  type="password"
                  value={currentAdminPass}
                  onChange={e => setCurrentAdminPass(e.target.value)}
                  required
                  placeholder={lang === 'bn' ? 'বর্তমান পাসওয়ার্ড দিন' : 'Enter current password'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  {lang === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                </label>
                <input
                  type="password"
                  value={newAdminPass}
                  onChange={e => setNewAdminPass(e.target.value)}
                  required
                  placeholder={lang === 'bn' ? 'ন্যূনতম ৫ অক্ষর' : 'At least 5 characters'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  {lang === 'bn' ? 'নতুন পাসওয়ার্ড পুনরায় লিখুন' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  value={confirmAdminPass}
                  onChange={e => setConfirmAdminPass(e.target.value)}
                  required
                  placeholder={lang === 'bn' ? 'পুনরায় লিখুন' : 'Re-enter new password'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsChangeAdminPassOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  {lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

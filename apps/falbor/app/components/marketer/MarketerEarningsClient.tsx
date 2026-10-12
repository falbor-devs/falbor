'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Input } from '~/components/ui';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';
import { B2BSidebar } from './B2BSidebar';
import { getMarketerEarningsStats, requestPayout } from '~/lib/actions/earnings-actions';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'react-toastify';

interface MarketerEarningsClientProps {
  profile: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
  };
}

export function MarketerEarningsClient({ profile }: MarketerEarningsClientProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'earnings';

  const [stats, setStats] = useState<{
    totalEarnings: number;
    availableBalance: number;
    totalSales: number;
    transactions: any[];
    payouts: any[];
  }>({
    totalEarnings: 0,
    availableBalance: 0,
    totalSales: 0,
    transactions: [],
    payouts: [],
  });

  const [paypalEmail, setPaypalEmail] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Dynamic Date Range Picker State
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()); // 0-indexed

  const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  useEffect(() => {
    loadData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const loadData = async (y = selectedYear, m = selectedMonth) => {
    const data = await getMarketerEarningsStats(undefined, y, m);
    setStats(data);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paypalEmail.trim() || !withdrawAmount) return;

    const amt = Number(withdrawAmount);
    if (amt < 10) {
      toast.error('Minimum payout amount is $10.');
      return;
    }
    if (amt > stats.availableBalance) {
      toast.error('Insufficient available balance.');
      return;
    }

    setIsSubmitting(true);
    const res = await requestPayout(paypalEmail.trim(), amt);
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Payout request submitted to PayPal Sandbox!');
      setWithdrawAmount('');
      loadData();
    } else {
      toast.error(res.error || 'Failed to submit payout request');
    }
  };

  // Generate Year Range: Min September 2026 up to +3 years
  const startYear = 2026;
  const maxYear = currentDate.getFullYear() + 3;
  const yearOptions: number[] = [];
  for (let y = startYear; y <= maxYear; y++) {
    yearOptions.push(y);
  }

  const isOptionDisabled = (year: number, monthIdx: number) => {
    // Cannot go before Sept 2026
    if (year < 2026 || (year === 2026 && monthIdx < 8)) return true;
    // Cannot pick future date
    if (year > currentDate.getFullYear()) return true;
    if (year === currentDate.getFullYear() && monthIdx > currentDate.getMonth()) return true;
    return false;
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#09090B] text-zinc-900 dark:text-white font-sans">
      <B2BSidebar profile={profile} />
      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight capitalize">
                {activeTab === 'payout' ? 'Payout' : activeTab === 'transactions' ? 'Transactions' : 'Earnings'}
              </h1>
            </div>

            {/* Date Selector Dropdown - ONLY shown on Earnings tab */}
            {activeTab === 'earnings' && (
              <Dropdown
                align="end"
                trigger={
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 text-xs font-medium transition-colors outline-none">
                    <span className="i-ph:calendar text-amber-500" />
                    <span>{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
                    <span className="i-ph:caret-down text-zinc-400 text-xs" />
                  </button>
                }
              >
                <div className="p-3 w-64 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase">Select Period</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="text-xs border rounded px-1 py-0.5 bg-transparent"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y} disabled={y > currentDate.getFullYear()}>
                          {y} {y > currentDate.getFullYear() ? '(Future)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                    {MONTH_NAMES.map((m, idx) => {
                      const disabled = isOptionDisabled(selectedYear, idx);
                      const isSelected = selectedYear === selectedYear && selectedMonth === idx;

                      return (
                        <button
                          key={m}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            setSelectedMonth(idx);
                          }}
                          className={`py-1.5 rounded-md text-xs font-medium transition-colors ${isSelected
                            ? 'bg-amber-500 text-white font-bold'
                            : disabled
                              ? 'opacity-30 cursor-not-allowed text-zinc-400'
                              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Dropdown>
            )}
          </div>

          {/* Tab: Earnings */}
          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <div>
                <p className="text-2xl md:text-5xl font-semibold text-zinc-800 dark:text-zinc-200">You've made</p>
                <div className="text-5xl md:text-6xl text-[#0099ff] my-2 font-black">
                  ${stats.totalEarnings}
                </div>
                <p className="text-xs text-zinc-400">from <span className="font-medium text-zinc-700 dark:text-zinc-300">{stats.totalSales} sales</span></p>
              </div>

              {/* Full Width Dynamic Monthly Earnings Chart Box */}
              <div className="w-full bg-zinc-50/80 dark:bg-zinc-900/50 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Monthly Earnings Performance</h3>
                    <p className="text-[11px] text-zinc-400">Daily sales breakdown for {MONTH_NAMES[selectedMonth]} {selectedYear}</p>
                  </div>
                </div>

                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={(() => {
                        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                        const chartData = [];
                        const dailyTotals: Record<number, number> = {};

                        stats.transactions.forEach((tx) => {
                          const d = new Date(tx.createdAt).getDate();
                          dailyTotals[d] = (dailyTotals[d] || 0) + tx.amount;
                        });

                        for (let day = 1; day <= daysInMonth; day++) {
                          chartData.push({
                            day: `${day} ${MONTH_NAMES[selectedMonth]}`,
                            earnings: dailyTotals[day] || 0,
                          });
                        }
                        return chartData;
                      })()}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0099ff" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#0099ff" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.15)" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#09090b',
                          borderColor: '#27272a',
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`$${val}`, 'Earnings']}
                      />
                      <Area
                        type="monotone"
                        dataKey="earnings"
                        stroke="#0099ff"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#earningsGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Transactions */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              {/* Table Toolbar / Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {stats.transactions.length} result{stats.transactions.length === 1 ? '' : 's'}
                </h3>

                <div className="flex items-center gap-4 text-xs">
                  {/* Pagination Controls */}
                  <div className="flex items-center gap-2 text-zinc-500 font-medium select-none">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="i-ph:caret-left text-sm" />
                    </button>
                    <span>
                      Showing {stats.transactions.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, stats.transactions.length)}`} of {stats.transactions.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage * pageSize >= stats.transactions.length}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="i-ph:caret-right text-sm" />
                    </button>
                  </div>

                  {/* Export CSV Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (stats.transactions.length === 0) return;
                      const headers = ['Title', 'Member', 'Date', 'Balance ($)'];
                      const rows = stats.transactions.map((tx) => [
                        `"${tx.productName.replace(/"/g, '""')}"`,
                        `"Customer User"`,
                        `"${new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}"`,
                        tx.amount,
                      ]);
                      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement('a');
                      link.setAttribute('href', encodedUri);
                      link.setAttribute('download', `transactions_export_${Date.now()}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-100 font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <span className="i-ph:download-simple-bold text-sm" />
                    Export
                  </button>
                </div>
              </div>

              {/* Transactions Table Layout */}
              <div className="overflow-x-auto border-t border-b border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-semibold">
                      <th className="py-3 px-2 font-normal">Title</th>
                      <th className="py-3 px-2 font-normal">Member</th>
                      <th className="py-3 px-2 font-normal">Date</th>
                      <th className="py-3 px-2 font-normal text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {stats.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-400">
                          No payment transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      stats.transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((tx) => (
                        <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                          <td className="py-4 px-2 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-pink-100 dark:bg-pink-950/40 flex items-center justify-center text-pink-500 flex-shrink-0">
                              <span className="i-ph:gift-duotone text-base" />
                            </div>
                            <span>{tx.productName}</span>
                          </td>
                          <td className="py-4 px-2 text-zinc-500 dark:text-zinc-400 font-medium">
                            Customer User
                          </td>
                          <td className="py-4 px-2 text-zinc-600 dark:text-zinc-300 font-medium">
                            {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-4 px-2 text-right font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                            ${tx.amount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-zinc-400">Reports are in UTC time</p>
            </div>
          )}
          {activeTab === 'payout' && (
            <div className="space-y-6">
              <div className="bg-zinc-50/80 dark:bg-zinc-900/40 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {MONTH_NAMES[currentDate.getMonth()]} Balance
                </h3>
                <div className="bg-white dark:bg-zinc-950 rounded-xl p-5 space-y-2">
                  <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    ${stats.availableBalance}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span>Min amount for scheduled payout: $10</span>
                    <span className="i-ph:info text-zinc-400 text-sm" />
                  </div>
                </div>
              </div>
              <div className="bg-zinc-50/80 dark:bg-zinc-900/40 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Payout method</h3>
                <div className="bg-white dark:bg-zinc-950 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          Instant Payout via
                          <img
                            className="w-20 h-auto object-contain"
                            src="/paypal.png"
                            alt="PayPal"
                          />
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          Connect your PayPal email address to receive payouts directly.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const emailInput = document.getElementById('paypal-payout-email') as HTMLInputElement;
                        if (emailInput) emailInput.focus();
                      }}
                      className="px-5 py-2 text-xs font-bold rounded-full bg-[#0099ff]/20 text-[#0099ff] transition-colors shadow-sm"
                    >
                      Connect
                    </button>
                  </div>

                  {/* Form input to trigger payout */}
                  <form onSubmit={handleWithdraw} className="pt-3 border-t border-zinc-100 dark:border-zinc-900 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                          PayPal Account Email
                        </label>
                        <Input
                          id="paypal-payout-email"
                          type="email"
                          required
                          value={paypalEmail}
                          onChange={(e) => setPaypalEmail(e.target.value)}
                          placeholder="user@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                          Withdrawal Amount ($USD)
                        </label>
                        <Input
                          type="number"
                          required
                          min="10"
                          max={stats.availableBalance}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="Minimum $10"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting || stats.availableBalance < 10}
                      className="bg-[#0099ff]/20 text-[#0099ff] font-bold text-xs px-6 py-2 rounded-lg transition-colors"
                    >
                      {isSubmitting ? 'Requesting...' : 'Request Payout'}
                    </Button>
                  </form>
                </div>
              </div>

              {/* Request History */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Payout Requests History</h4>
                {stats.payouts.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-2">No payout requests submitted yet.</p>
                ) : (
                  stats.payouts.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex justify-between text-xs">
                      <div>
                        <p className="font-semibold">{p.paypalEmail}</p>
                        <p className="text-[10px] text-zinc-400">{new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-500">${p.amount}</p>
                        <span className="text-[10px] uppercase font-bold text-amber-600">{p.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

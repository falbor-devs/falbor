import React, { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { Receipt, Zap, Clock } from 'lucide-react';
import { toast } from 'react-toastify';

export default function BillingTab() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetchBilling();
  }, []);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/credits');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
        setPayments(data.payments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          Billing & Credits History
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View your credit additions and current AI credit balance.
        </p>
      </div>
      <div className="p-1 bg-[#E5E5E5] dark:bg-[#262626] rounded-xl">
        <div className="border border-gray-600 rounded-xl p-6 flex flex-col bg-white dark:bg-[#171717] shadow-[0_0_20px_rgba(168,85,247,0.25)] dark:shadow-none">
          <div>
            <p className="text-sm text-black dark:text-white mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-7 h-7 text-yellow-500 fill-yellow-500" />
              {typeof balance === 'number' ? (Number.isInteger(balance) ? balance : balance.toFixed(1)) : 0} Credits
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="i-svg-spinners:90-ring-with-bg text-purple-500 text-3xl animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
            <Receipt className="w-12 h-12 text-gray-500 dark:text-gray-500 mb-4 opacity-30" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No transactions found</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 max-w-sm">
              When you earn milestone rewards or add credits, your transaction log will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="dark:bg-[#262626] p-2 rounded-lg">
                    <Zap className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {payment.tier ? `Upgraded to ${payment.tier} Plan` : 'Credits Addition'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(payment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    +{payment.amount} Credits
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-500 font-mono">
                    Order ID: {payment.orderId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

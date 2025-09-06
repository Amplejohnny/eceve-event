"use client";

import { useState } from "react";
import {
  WalletIcon,
  ClockIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import { TrendingUp, RefreshCw } from "lucide-react";
import EarningsChart from "./EarningsChart";
import { formatCurrency } from "@/lib/utils";

interface FinancialManagementPanelProps {
  earningsData: any;
  withdrawalsData: any;
  onRequestWithdrawal: () => void;
  onRefresh: () => void;
}

export default function FinancialManagementPanel({
  earningsData,
  withdrawalsData,
  onRequestWithdrawal,
  onRefresh,
}: FinancialManagementPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-600 bg-green-100";
      case "PROCESSING":
        return "text-blue-600 bg-blue-100";
      case "PENDING":
        return "text-yellow-600 bg-yellow-100";
      case "FAILED":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "✓";
      case "PROCESSING":
        return "⏳";
      case "PENDING":
        return "⏱";
      case "FAILED":
        return "✗";
      default:
        return "•";
    }
  };

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Financial Management
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex cursor-pointer items-center justify-center w-10 h-10 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw
            className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Ticket Revenue */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Ticket Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {earningsData
                  ? formatCurrency(earningsData.totalTicketRevenue)
                  : "₦0"}
              </p>
            </div>
          </div>
        </div>

        {/* Total Withdrawable Revenue */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <WalletIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Withdrawable Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {earningsData
                  ? formatCurrency(earningsData.totalWithdrawableRevenue)
                  : "₦0"}
              </p>
              <p className="text-xs text-gray-500">After 7% platform fee</p>
            </div>
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Available Balance
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {earningsData
                  ? formatCurrency(earningsData.availableBalance)
                  : "₦0"}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Earnings (30 days) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowUpIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Recent Earnings
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {earningsData
                  ? formatCurrency(earningsData.recentEarnings)
                  : "₦0"}
              </p>
              <p className="text-xs text-gray-500">Last 30 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Chart */}
      {earningsData && (
        <div className="mb-8">
          <EarningsChart
            monthlyData={earningsData.monthlyData}
            currency={earningsData.currency}
          />
        </div>
      )}

      {/* Withdrawal Request Button */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Withdrawal Request
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Request withdrawal and get paid within 1-2 business days
            </p>
          </div>
          <button
            onClick={onRequestWithdrawal}
            disabled={!earningsData || earningsData.availableBalance <= 0}
            className="px-6 cursor-pointer py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Request Withdrawal
          </button>
        </div>
      </div>

      {/* Withdrawal History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Withdrawal History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {withdrawalsData?.withdrawals?.length > 0 ? (
                withdrawalsData.withdrawals.map((withdrawal: any) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(withdrawal.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          {withdrawal.accountName}
                        </div>
                        <div className="text-gray-500">
                          ****{withdrawal.bankAccount?.slice(-4)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          withdrawal.status
                        )}`}
                      >
                        <span className="mr-1">
                          {getStatusIcon(withdrawal.status)}
                        </span>
                        {withdrawal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {withdrawal.paystackRef || "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No withdrawal history found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

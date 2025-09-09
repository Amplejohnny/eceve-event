"use client";

import { useState } from "react";
import {
  RefreshCw,
  TrendingUp,
  BanknoteIcon,
  ChartBarIcon,
  Users,
} from "lucide-react";
import { FaNairaSign } from "react-icons/fa6";
import { formatCurrency } from "@/lib/utils";

interface PlatformStats {
  totalRevenue: number;
  totalPlatformFees: number;
  totalOrganizerAmount: number;
  totalPayouts: number;
  pendingObligations: number;
  platformBalance: number;
}

interface FinancialOversightToolsProps {
  platformStats: PlatformStats | null | undefined;
  onRefresh: () => void;
}

export default function FinancialOversightTools({
  platformStats,
  onRefresh,
}: FinancialOversightToolsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("30");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const calculatePlatformFeePercentage = () => {
    if (!platformStats || platformStats.totalRevenue === 0) return 0;
    return (
      (platformStats.totalPlatformFees / platformStats.totalRevenue) *
      100
    ).toFixed(1);
  };

  const calculateNetRevenue = () => {
    if (!platformStats) return 0;
    return platformStats.totalRevenue - platformStats.totalOrganizerAmount;
  };

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Financial Oversight Tools
        </h2>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Select time period"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center w-10 h-10 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Total Platform Revenue */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Platform Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {platformStats
                  ? formatCurrency(platformStats.totalRevenue)
                  : "₦0"}
              </p>
              <p className="text-xs text-gray-500">All time</p>
            </div>
          </div>
        </div>

        {/* Organizer Amount */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Organizer Earnings
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {platformStats
                  ? formatCurrency(platformStats.totalOrganizerAmount)
                  : "₦0"}
              </p>
              <p className="text-xs text-gray-500">93% of revenue</p>
            </div>
          </div>
        </div>

        {/* Platform Fees */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FaNairaSign className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Platform Fees (7%)
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {platformStats
                  ? formatCurrency(platformStats.totalPlatformFees)
                  : "₦0"}
              </p>
              <p className="text-xs text-gray-500">
                {calculatePlatformFeePercentage()}% of total revenue
              </p>
            </div>
          </div>
        </div>

        {/* Total Payouts */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BanknoteIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Payouts</p>
              <p className="text-2xl font-bold text-gray-900">
                {platformStats
                  ? formatCurrency(platformStats.totalPayouts)
                  : "₦0"}
              </p>
              <p className="text-xs text-gray-500">To organizers</p>
            </div>
          </div>
        </div>

        {/* Platform Balance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Platform Balance
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {platformStats
                  ? formatCurrency(platformStats.platformBalance)
                  : "₦0"}
              </p>
              <p className="text-xs text-gray-500">Available funds</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Revenue Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Gross Revenue</span>
              <span className="text-sm font-medium text-gray-900">
                {platformStats
                  ? formatCurrency(platformStats.totalRevenue)
                  : "₦0"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Organizer Earnings (93%)
              </span>
              <span className="text-sm font-medium text-orange-600">
                -
                {platformStats
                  ? formatCurrency(platformStats.totalOrganizerAmount)
                  : "₦0"}
              </span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-medium text-gray-900">
                Net Revenue (Platform Fees)
              </span>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(calculateNetRevenue())}
              </span>
            </div>
          </div>
        </div>

        {/* Payout Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Payout Status
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Payouts</span>
              <span className="text-sm font-medium text-gray-900">
                {platformStats
                  ? formatCurrency(platformStats.totalPayouts)
                  : "₦0"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Obligations</span>
              <span className="text-sm font-medium text-yellow-600">
                {platformStats
                  ? formatCurrency(platformStats.pendingObligations)
                  : "₦0"}
              </span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-medium text-gray-900">
                Available Balance
              </span>
              <span className="text-sm font-medium text-blue-600">
                {platformStats
                  ? formatCurrency(platformStats.platformBalance)
                  : "₦0"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Chart Placeholder */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Cash Flow Dashboard
        </h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">
              Cash flow chart will be displayed here
            </p>
            <p className="text-sm text-gray-400">
              Showing data for last {selectedPeriod} days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  TrendingUp,
  BanknoteIcon,
  ChartBarIcon,
  Users,
} from "lucide-react";
import { FaNairaSign } from "react-icons/fa6";
import { formatCurrency } from "@/lib/utils";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface PlatformStats {
  totalRevenue: number;
  totalPlatformFees: number;
  totalOrganizerAmount: number;
  totalPayouts: number;
  pendingObligations: number;
  platformBalance: number;
  cashFlowData?: CashFlowData[];
  period?: number;
}

interface CashFlowData {
  date: string;
  revenue: number;
  platformFees: number;
  payouts: number;
  netCashFlow: number;
}

interface FinancialOversightToolsProps {
  platformStats: PlatformStats | null | undefined;
  onRefresh: () => void;
}

export default function FinancialOversightTools({
  platformStats: initialPlatformStats,
  onRefresh,
}: FinancialOversightToolsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(
    initialPlatformStats || null
  );
  const [isLoadingPeriodData, setIsLoadingPeriodData] = useState(false);

  const fetchPeriodData = async (period: string) => {
    setIsLoadingPeriodData(true);
    try {
      const response = await fetch(
        `/api/admin/platform-stats?period=${period}`
      );
      if (response.ok) {
        const data = await response.json();
        setPlatformStats(data);
      }
    } catch (error) {
      console.error("Error fetching period data:", error);
    } finally {
      setIsLoadingPeriodData(false);
    }
  };

  useEffect(() => {
    fetchPeriodData(selectedPeriod);
  }, [selectedPeriod]);

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

  const FinancialCardSkeleton = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </div>
        <div className="ml-4 flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  );

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
        {isLoadingPeriodData ? (
          // Show 5 skeleton cards
          Array.from({ length: 5 }).map((_, i) => (
            <FinancialCardSkeleton key={i} />
          ))
        ) : (
          <>
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
                  <p className="text-sm font-medium text-gray-600">
                    Total Payouts
                  </p>
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
          </>
        )}
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
        {isLoadingPeriodData ? (
          <div className="h-64 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-center">
              <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32 mx-auto"></div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={platformStats?.cashFlowData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [
                  `₦${value.toLocaleString()}`,
                  "",
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Revenue"
              />
              <Area
                type="monotone"
                dataKey="payouts"
                stackId="2"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.6}
                name="Payouts"
              />
              <Line
                type="monotone"
                dataKey="netCashFlow"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Net Cash Flow"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

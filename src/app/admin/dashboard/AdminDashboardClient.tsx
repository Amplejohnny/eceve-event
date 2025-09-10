"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import WithdrawalManagementCenter from "@/components/admin/WithdrawalManagementCenter";
import FinancialOversightTools from "@/components/admin/FinancialOversightTools";
import AdministrativeFeatures from "@/components/admin/AdministrativeFeatures";

interface AdminDashboardData {
  withdrawalRequests: any[];
  platformStats: {
    totalRevenue: number;
    totalPlatformFees: number;
    totalOrganizerAmount: number;
    totalPayouts: number;
    pendingObligations: number;
    platformBalance: number;
  };
  organizers: any[];
  events: any[];
}

export default function AdminDashboardClient() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch admin dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      const [withdrawalsRes, statsRes, organizersRes, eventsRes] =
        await Promise.all([
          fetch("/api/admin/withdrawals"),
          fetch("/api/admin/platform-stats"),
          fetch("/api/admin/organizers"),
          fetch("/api/admin/events"),
        ]);

      if (
        withdrawalsRes.ok &&
        statsRes.ok &&
        organizersRes.ok &&
        eventsRes.ok
      ) {
        const [withdrawals, stats, organizers, events] = await Promise.all([
          withdrawalsRes.json(),
          statsRes.json(),
          organizersRes.json(),
          eventsRes.json(),
        ]);

        setDashboardData({
          withdrawalRequests: withdrawals.withdrawals || [],
          platformStats: stats,
          organizers: organizers.organizers || [],
          events: events.events || [],
        });
      }
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshKey]);

  const handleRefreshWithFilters = async (statusFilter?: string) => {
    try {
      const url = statusFilter
        ? `/api/admin/events?status=${statusFilter}`
        : "/api/admin/events";

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();

        // Update only the events part of dashboardData
        setDashboardData((prev) =>
          prev
            ? {
                ...prev,
                events: data.events || [],
              }
            : null
        );
      }
    } catch (error) {
      console.error("Error fetching filtered events:", error);
      toast.error("Failed to filter events");
    }
  };

  const handleWithdrawalApproval = async (
    withdrawalId: string,
    action: "approve" | "reject"
  ) => {
    try {
      const response = await fetch(
        `/api/admin/withdrawals/${withdrawalId}/${action}`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        toast.success(
          `Withdrawal ${
            action === "approve" ? "approved" : "rejected"
          } successfully!`
        );
        setRefreshKey((prev) => prev + 1);
      } else {
        toast.error(`Failed to ${action} withdrawal`);
      }
    } catch (error) {
      console.error(`Error ${action}ing withdrawal:`, error);
      toast.error(`Failed to ${action} withdrawal`);
    }
  };

  const handleBulkWithdrawalApproval = async (
    withdrawalIds: string[],
    action: "approve" | "reject"
  ) => {
    try {
      const response = await fetch(`/api/admin/withdrawals/bulk/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ withdrawalIds }),
      });

      if (response.ok) {
        toast.success(`Bulk ${action} completed successfully!`);
        setRefreshKey((prev) => prev + 1);
      } else {
        toast.error(`Failed to bulk ${action} withdrawals`);
      }
    } catch (error) {
      console.error(`Error bulk ${action}ing withdrawals:`, error);
      toast.error(`Failed to bulk ${action} withdrawals`);
    }
  };

  const handleTriggerEventStatusUpdate = async () => {
    try {
      const res = await fetch("/api/admin/maintenance/update-events", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update event statuses");
      }
      const data = await res.json();
      toast.success(
        `Updated ${data.completed} events (checked ${data.checked}).`
      );
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error updating event statuses:", error);
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, <b>{session?.user?.name}</b>! Manage platform operations
          and monitor financial activities.
        </p>
      </div>

      {/* Withdrawal Management Center */}
      <WithdrawalManagementCenter
        withdrawalRequests={dashboardData?.withdrawalRequests || []}
        onApprove={handleWithdrawalApproval}
        onBulkAction={handleBulkWithdrawalApproval}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
      />

      {/* Financial Oversight Tools */}
      <FinancialOversightTools
        platformStats={dashboardData?.platformStats}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
      />

      {/* Administrative Features */}
      <AdministrativeFeatures
        organizers={dashboardData?.organizers || []}
        events={dashboardData?.events || []}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
        onRefreshWithFilters={handleRefreshWithFilters}
        onTriggerUpdateEvents={handleTriggerEventStatusUpdate}
      />
    </div>
  );
}

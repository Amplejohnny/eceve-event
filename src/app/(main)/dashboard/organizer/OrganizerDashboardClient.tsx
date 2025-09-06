"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import FinancialManagementPanel from "@/components/dashboard/FinancialManagementPanel";
import EventAnalyticsSection from "@/components/dashboard/EventAnalyticsSection";
import WithdrawalRequestModal from "@/components/dashboard/WithdrawalRequestModal";

interface EarningsData {
  totalTicketRevenue: number;
  totalWithdrawableRevenue: number;
  totalPlatformFees: number;
  availableBalance: number;
  pendingWithdrawals: number;
  recentEarnings: number;
  monthlyData: Record<string, number>;
  currency: string;
}

interface AttendeesData {
  attendees: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    statusCounts: Record<string, number>;
  };
}

interface WithdrawalsData {
  withdrawals: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalWithdrawn: number;
    pendingAmount: number;
    statusSummary: Record<string, { count: number; totalAmount: number }>;
  };
}

export default function OrganizerDashboardClient() {
  const { data: session } = useSession();
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [attendeesData, setAttendeesData] = useState<AttendeesData | null>(
    null
  );
  const [withdrawalsData, setWithdrawalsData] =
    useState<WithdrawalsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      const [earningsRes, attendeesRes, withdrawalsRes] = await Promise.all([
        fetch("/api/organizer/earnings"),
        fetch("/api/organizer/attendees"),
        fetch("/api/organizer/withdrawals"),
      ]);

      if (earningsRes.ok) {
        const earnings = await earningsRes.json();
        setEarningsData(earnings);
      }

      if (attendeesRes.ok) {
        const attendees = await attendeesRes.json();
        setAttendeesData(attendees);
      }

      if (withdrawalsRes.ok) {
        const withdrawals = await withdrawalsRes.json();
        setWithdrawalsData(withdrawals);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshKey]);

  const handleWithdrawalSuccess = () => {
    setShowWithdrawalModal(false);
    setRefreshKey((prev) => prev + 1);
    toast.success("Withdrawal request submitted successfully!");
  };

  const handleExportAttendees = async (eventId?: string) => {
    if (!eventId) {
      toast.error("No event ID provided for export.");
      return;
    }
    try {
      const params = new URLSearchParams();
      params.append("eventId", eventId);

      const response = await fetch(`/api/organizer/attendees/export?${params}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendees-${eventId}-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Attendees exported successfully!");
      } else {
        toast.error("Failed to export attendees");
      }
    } catch (error) {
      console.error("Error exporting attendees:", error);
      toast.error("Failed to export attendees");
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
        <h1 className="text-3xl font-bold text-gray-900">
          Organizer Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {session?.user?.name}! Manage your events and earnings.
        </p>
      </div>

      {/* Financial Management Panel */}
      <FinancialManagementPanel
        earningsData={earningsData}
        withdrawalsData={withdrawalsData}
        onRequestWithdrawal={() => setShowWithdrawalModal(true)}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
      />

      {/* Event Analytics Section */}
      <EventAnalyticsSection
        attendeesData={attendeesData}
        onExportAttendees={handleExportAttendees}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
      />

      {/* Withdrawal Request Modal */}
      {showWithdrawalModal && (
        <WithdrawalRequestModal
          availableBalance={earningsData?.availableBalance || 0}
          onClose={() => setShowWithdrawalModal(false)}
          onSuccess={handleWithdrawalSuccess}
        />
      )}
    </div>
  );
}

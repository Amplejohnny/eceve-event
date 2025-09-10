"use client";

import { useState } from "react";
import { RefreshCw, CheckCircleIcon, XCircleIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  accountName: string;
  bankAccount: string;
  bankCode: string;
  reason?: string;
  createdAt: string;
  organizer: {
    name: string;
    email: string;
  };
}

interface WithdrawalManagementCenterProps {
  withdrawalRequests: WithdrawalRequest[];
  onApprove: (withdrawalId: string, action: "approve" | "reject") => void;
  onBulkAction: (withdrawalIds: string[], action: "approve" | "reject") => void;
  onRefresh: () => void;
}

export default function WithdrawalManagementCenter({
  withdrawalRequests,
  onApprove,
  onBulkAction,
  onRefresh,
}: WithdrawalManagementCenterProps) {
  const [selectedWithdrawals, setSelectedWithdrawals] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleSelectAll = () => {
    if (selectedWithdrawals.length === withdrawalRequests.length) {
      setSelectedWithdrawals([]);
    } else {
      setSelectedWithdrawals(withdrawalRequests.map((w) => w.id));
    }
  };

  const handleSelectWithdrawal = (withdrawalId: string) => {
    setSelectedWithdrawals((prev) =>
      prev.includes(withdrawalId)
        ? prev.filter((id) => id !== withdrawalId)
        : [...prev, withdrawalId]
    );
  };

  const handleBulkApprove = () => {
    if (selectedWithdrawals.length > 0) {
      onBulkAction(selectedWithdrawals, "approve");
      setSelectedWithdrawals([]);
    }
  };

  const handleBulkReject = () => {
    if (selectedWithdrawals.length > 0) {
      onBulkAction(selectedWithdrawals, "reject");
      setSelectedWithdrawals([]);
    }
  };

  const filteredRequests = withdrawalRequests.filter(
    (request) => filterStatus === "" || request.status === filterStatus
  );

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
      case "CANCELLED":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Withdrawal Management Center
        </h2>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-600">
            Total Requests
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {withdrawalRequests.length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {withdrawalRequests.filter((w) => w.status === "PENDING").length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-600">Processing</div>
          <div className="text-2xl font-bold text-blue-600">
            {withdrawalRequests.filter((w) => w.status === "PROCESSING").length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {withdrawalRequests.filter((w) => w.status === "COMPLETED").length}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedWithdrawals.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedWithdrawals.length} withdrawal(s) selected
            </span>
            <div className="flex space-x-3">
              <button
                onClick={handleBulkApprove}
                className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Approve All
              </button>
              <button
                onClick={handleBulkReject}
                className="flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <XCircleIcon className="w-4 h-4 mr-2" />
                Reject All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-400 transition-colors"
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Requests Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Withdrawal Requests
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedWithdrawals.length === withdrawalRequests.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organizer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedWithdrawals.includes(request.id)}
                        onChange={() => handleSelectWithdrawal(request.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.organizer.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.organizer.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(request.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.accountName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ****{request.bankAccount?.slice(-4)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === "PENDING" && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => onApprove(request.id, "approve")}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => onApprove(request.id, "reject")}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XCircleIcon className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No withdrawal requests found
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

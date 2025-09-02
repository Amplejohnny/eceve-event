"use client";

import { useState, useEffect } from "react";
import { XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

interface Bank {
  id: number;
  name: string;
  code: string;
  active: boolean;
  country: string;
  currency: string;
  type: string;
}

interface WithdrawalRequestModalProps {
  availableBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WithdrawalRequestModal({
  availableBalance,
  onClose,
  onSuccess,
}: WithdrawalRequestModalProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Form data
  const [formData, setFormData] = useState({
    amount: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
    reason: "",
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load banks on component mount
  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const response = await fetch("/api/organizer/banks");
      if (response.ok) {
        const data = await response.json();
        setBanks(data.banks);
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
      toast.error("Failed to load banks");
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    } else if (parseFloat(formData.amount) > availableBalance) {
      newErrors.amount = "Amount exceeds available balance";
    }

    if (!formData.bankCode) {
      newErrors.bankCode = "Please select a bank";
    }

    if (!formData.accountNumber || formData.accountNumber.length < 10) {
      newErrors.accountNumber = "Please enter a valid account number";
    }

    if (!formData.accountName || formData.accountName.trim().length < 2) {
      newErrors.accountName = "Please enter a valid account name";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const verifyBankAccount = async () => {
    if (!formData.accountNumber || !formData.bankCode) {
      toast.error("Please fill in account number and select bank first");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/organizer/verify-bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountNumber: formData.accountNumber,
          bankCode: formData.bankCode,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setVerificationResult(result);
        if (result.success) {
          toast.success("Bank account verified successfully!");
          setStep(2);
        } else {
          toast.error(result.error || "Bank verification failed");
        }
      } else {
        toast.error("Bank verification failed");
      }
    } catch (error) {
      console.error("Error verifying bank account:", error);
      toast.error("Bank verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/organizer/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (response.ok) {
        // const result = await response.json();
        toast.success("Withdrawal request submitted successfully!");
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to submit withdrawal request");
      }
    } catch (error) {
      console.error("Error submitting withdrawal request:", error);
      toast.error("Failed to submit withdrawal request");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < step) return "completed";
    if (stepNumber === step) return "current";
    return "upcoming";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Withdrawal Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {[
              { number: 1, title: "Bank Details" },
              { number: 2, title: "Verification" },
              { number: 3, title: "Submit Request" },
            ].map((stepInfo) => (
              <div key={stepInfo.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    getStepStatus(stepInfo.number) === "completed"
                      ? "bg-green-600 border-green-600 text-white"
                      : getStepStatus(stepInfo.number) === "current"
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-300 text-gray-500"
                  }`}
                >
                  {getStepStatus(stepInfo.number) === "completed" ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">
                      {stepInfo.number}
                    </span>
                  )}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {stepInfo.title}
                </span>
                {stepInfo.number < 3 && (
                  <div className="w-16 h-0.5 bg-gray-300 mx-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Bank Details Form */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Enter Bank Account Details
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Available balance: {formatCurrency(availableBalance)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₦)
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.amount ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter amount"
                    max={availableBalance}
                  />
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                  )}
                </div>

                {/* Bank Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank
                  </label>
                  <select
                    value={formData.bankCode}
                    onChange={(e) =>
                      setFormData({ ...formData, bankCode: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.bankCode ? "border-red-500" : "border-gray-300"
                    }`}
                    aria-label="Select bank"
                  >
                    <option value="">Select a bank</option>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                  {errors.bankCode && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.bankCode}
                    </p>
                  )}
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountNumber: e.target.value,
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.accountNumber
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter account number"
                    maxLength={10}
                  />
                  {errors.accountNumber && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.accountNumber}
                    </p>
                  )}
                </div>

                {/* Account Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) =>
                      setFormData({ ...formData, accountName: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.accountName ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter account name"
                  />
                  {errors.accountName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.accountName}
                    </p>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter reason for withdrawal"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyBankAccount}
                  disabled={
                    isVerifying || !formData.accountNumber || !formData.bankCode
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? "Verifying..." : "Verify Account"}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Verification Result */}
          {step === 2 && verificationResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Account Verification
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <CheckIcon className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800">
                        Account verified successfully!
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        Account name: {verificationResult.accountName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Details */}
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Review Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(formData.amount))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank:</span>
                    <span className="font-medium">
                      {banks.find((b) => b.code === formData.bankCode)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Number:</span>
                    <span className="font-medium">
                      ****{formData.accountNumber.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Name:</span>
                    <span className="font-medium">
                      {verificationResult.accountName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Submit Request */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Submit Withdrawal Request
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-800">
                    Your withdrawal request will be processed within 1-2
                    business days. You'll receive a confirmation email once the
                    transfer is initiated.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

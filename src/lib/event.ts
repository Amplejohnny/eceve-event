import { db } from "./db";
import { Prisma } from "@/generated/prisma";

// Event database functions
export async function getEvents(
  options: {
    skip?: number;
    take?: number;
    where?: unknown;
    include?: unknown;
    orderBy?: unknown;
  } = {}
) {
  return await db.event.findMany({
    skip: options.skip || 0,
    take: options.take || 10,
    where: options.where || { status: "ACTIVE", isPublic: true },
    include: options.include || {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      ticketTypes: {
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
        },
      },
      _count: {
        select: {
          tickets: true,
          favorites: true,
        },
      },
    },
    orderBy: options.orderBy || { createdAt: "desc" },
  });
}

export async function getEventBySlug(slug: string) {
  return await db.event.findUnique({
    where: { slug },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          location: true,
          website: true,
          twitter: true,
          instagram: true,
        },
      },
      ticketTypes: {
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
        },
      },
      tickets: {
        select: {
          id: true,
          ticketType: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          attendeeName: true,
          attendeeEmail: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          tickets: true,
          favorites: true,
        },
      },
    },
  });
}

export async function getEventById(id: string) {
  return await db.event.findUnique({
    where: { id },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      ticketTypes: true,
      tickets: {
        include: {
          ticketType: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
      payments: true,
      _count: {
        select: {
          tickets: true,
          favorites: true,
        },
      },
    },
  });
}

export async function createEvent(data: {
  title: string;
  description: string;
  eventType: "FREE" | "PAID";
  date: Date;
  endDate?: Date;
  startTime: string;
  endTime?: string;
  location: string;
  venue?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  tags: string[];
  category: string;
  imageUrl?: string;
  ticketTypes: Array<{
    name: string;
    price: number;
    quantity: number | null;
  }>;
  maxAttendees?: number;
  organizerId: string;
  slug: string;
}) {
  const { ticketTypes, ...eventData } = data;

  return await db.event.create({
    data: {
      ...eventData,
      ticketTypes: {
        create: ticketTypes,
      },
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      ticketTypes: true,
    },
  });
}

export async function updateEvent(
  id: string,
  data: Prisma.EventUpdateInput | Prisma.EventUncheckedUpdateInput
) {
  return await db.event.update({
    where: { id },
    data,
    include: {
      ticketTypes: true,
    },
  });
}

// Check if there are any tickets sold for this event
export async function checkTicketSales(eventId: string): Promise<boolean> {
  try {
    const ticketSales = await db.ticket.findFirst({
      where: {
        eventId: eventId,
        status: {
          in: ["ACTIVE", "USED"],
        },
      },
      select: {
        id: true,
      },
    });

    return !!ticketSales;
  } catch (error) {
    console.error("Error checking ticket sales:", error);
    return true;
  }
}

export async function checkTicketSalesWithCount(eventId: string): Promise<{
  hasSales: boolean;
  count: number;
}> {
  try {
    const ticketSalesCount = await db.ticket.count({
      where: {
        eventId: eventId,
        status: {
          in: ["ACTIVE", "USED"],
        },
      },
    });

    return {
      hasSales: ticketSalesCount > 0,
      count: ticketSalesCount,
    };
  } catch (error) {
    console.error("Error checking ticket sales with count:", error);
    return {
      hasSales: true,
      count: 0,
    };
  }
}

export async function checkTicketSalesDetailed(eventId: string): Promise<{
  hasAnySales: boolean;
  hasActiveSales: boolean;
  cancelledCount: number;
  activeSalesCount: number;
  usedCount: number;
}> {
  try {
    const [activeSales, usedSales, cancelledSales] = await Promise.all([
      db.ticket.count({
        where: {
          eventId: eventId,
          status: "ACTIVE",
        },
      }),
      db.ticket.count({
        where: {
          eventId: eventId,
          status: "USED",
        },
      }),
      db.ticket.count({
        where: {
          eventId: eventId,
          status: {
            in: ["CANCELLED", "REFUNDED"],
          },
        },
      }),
    ]);

    const totalSales = activeSales + usedSales;

    return {
      hasAnySales: totalSales > 0,
      hasActiveSales: activeSales > 0,
      cancelledCount: cancelledSales,
      activeSalesCount: activeSales,
      usedCount: usedSales,
    };
  } catch (error) {
    console.error("Error checking detailed ticket sales:", error);
    return {
      hasAnySales: true,
      hasActiveSales: true,
      cancelledCount: 0,
      activeSalesCount: 0,
      usedCount: 0,
    };
  }
}

export async function updateTicketType(
  id: string,
  data: Prisma.TicketTypeUpdateInput
) {
  return await db.ticketType.update({
    where: { id },
    data,
  });
}

export async function deleteTicketType(id: string) {
  return await db.ticketType.delete({
    where: { id },
  });
}

export async function getTicketTypeById(id: string) {
  return await db.ticketType.findUnique({
    where: { id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });
}

// Ticket database functions
export async function createTicket(data: {
  ticketTypeId: string;
  price: number;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  confirmationId: string;
  eventId: string;
  userId?: string;
  paymentId?: string;
}) {
  return await db.ticket.create({
    data,
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          location: true,
          organizer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      ticketType: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
    },
  });
}

export async function getTicketByConfirmationId(confirmationId: string) {
  return await db.ticket.findUnique({
    where: { confirmationId },
    include: {
      event: {
        include: {
          organizer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      ticketType: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
    },
  });
}

export async function getUserFavorites(userId: string) {
  return await db.eventFavorite.findMany({
    where: { userId },
    include: {
      event: {
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              tickets: true,
              favorites: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Favorites database functions
export async function toggleEventFavorite(userId: string, eventId: string) {
  const existingFavorite = await db.eventFavorite.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId,
      },
    },
  });

  if (existingFavorite) {
    await db.eventFavorite.delete({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });
    return false;
  } else {
    await db.eventFavorite.create({
      data: {
        userId,
        eventId,
      },
    });
    return true;
  }
}

// Analytics functions
export async function getEventAnalytics(eventId: string) {
  const [ticketsSold, totalRevenue, ticketTypeStats] = await Promise.all([
    db.ticket.count({
      where: { eventId, status: "ACTIVE" },
    }),
    db.ticket.aggregate({
      where: { eventId, status: "ACTIVE" },
      _sum: { price: true },
    }),
    db.ticket.groupBy({
      by: ["ticketTypeId"],
      where: { eventId, status: "ACTIVE" },
      _count: { ticketTypeId: true },
      _sum: { price: true },
    }),
  ]);

  // Get ticket type details for the stats
  const ticketTypeDetails = await db.ticketType.findMany({
    where: { eventId },
    select: {
      id: true,
      name: true,
      price: true,
      quantity: true,
    },
  });

  // Combine ticket type stats with details
  const ticketTypes = ticketTypeStats.map((stat) => {
    const ticketType = ticketTypeDetails.find(
      (t) => t.id === stat.ticketTypeId
    );
    return {
      id: stat.ticketTypeId,
      name: ticketType?.name || "Unknown",
      price: ticketType?.price || 0,
      totalQuantity: ticketType?.quantity || null,
      soldCount: stat._count.ticketTypeId,
      revenue: stat._sum.price || 0,
    };
  });

  return {
    ticketsSold,
    totalRevenue: totalRevenue._sum.price || 0,
    ticketTypes,
  };
}
// Additional utility functions
export async function getAvailableTicketTypes(eventId: string) {
  const ticketTypes = await db.ticketType.findMany({
    where: { eventId },
    include: {
      _count: {
        select: {
          tickets: {
            where: {
              status: "ACTIVE",
            },
          },
        },
      },
    },
  });

  return ticketTypes.map((ticketType) => ({
    ...ticketType,
    available: ticketType.quantity ? ticketType.quantity - ticketType._count.tickets : null, 
    soldOut: ticketType.quantity ? ticketType.quantity <= ticketType._count.tickets : false,
  }));
}

export async function getTicketsSoldCount(ticketTypeId: string) {
  return await db.ticket.count({
    where: {
      ticketTypeId,
      status: "ACTIVE",
    },
  });
}












"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Camera,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  X,
  User,
  Menu,
  Globe,
  MapPin,
} from "lucide-react";
import { RiTwitterXLine } from "react-icons/ri";
import { PiInstagramLogo } from "react-icons/pi";
import { isValidUrl, getErrorMessage, debounce } from "@/lib/utils";

interface ProfileData {
  image: string;
  name: string;
  bio: string;
  website: string;
  location: string;
  twitter: string;
  instagram: string;
  role: string;
}

interface Message {
  type: "success" | "error" | "";
  text: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const ProfileSettings: React.FC = () => {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<Message>({
    type: "",
    text: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<Message>({
    type: "",
    text: "",
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Profile form state - initialize with default values
  const [profileData, setProfileData] = useState<ProfileData>({
    image: "",
    name: "",
    bio: "",
    website: "",
    location: "",
    twitter: "",
    instagram: "",
    role: "USER",
  });

  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Loading state for initial data fetch
  const [initialLoading, setInitialLoading] = useState(true);

  // Field limits
  const limits = {
    bio: 500,
    website: 100,
    location: 100,
    twitter: 50,
    instagram: 50,
  };

  // Validation functions
  const validateProfileData = useCallback((): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Name validation
    if (!profileData.name.trim()) {
      errors.name = "Name is required";
    } else if (profileData.name.length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    // Website validation
    if (profileData.website && !isValidUrl(profileData.website)) {
      errors.website = "Please enter a valid website URL";
    }

    // Bio validation
    if (profileData.bio.length > limits.bio) {
      errors.bio = `Bio must not exceed ${limits.bio} characters`;
    }

    // Location validation
    if (profileData.location.length > limits.location) {
      errors.location = `Location must not exceed ${limits.location} characters`;
    }

    // Twitter validation
    if (profileData.twitter.length > limits.twitter) {
      errors.twitter = `Twitter handle must not exceed ${limits.twitter} characters`;
    }

    // Instagram validation
    if (profileData.instagram.length > limits.instagram) {
      errors.instagram = `Instagram handle must not exceed ${limits.instagram} characters`;
    }

    return errors;
  }, [profileData, limits]);

  const validatePasswordData = useCallback((): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "New passwords do not match";
    }

    return errors;
  }, [passwordData]);

  // Debounced validation
  const debouncedValidateProfile = useCallback(
    debounce(() => {
      const errors = validateProfileData();
      setValidationErrors(errors);
    }, 300),
    [validateProfileData]
  );

  // Fetch user profile data when session is available
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user) return;

      try {
        setInitialLoading(true);
        const response = await fetch("/api/profile");

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();

        if (data.success) {
          setProfileData({
            image: data.data.image || "",
            name: data.data.name || session.user.name || "",
            bio: data.data.bio || "",
            website: data.data.website || "",
            location: data.data.location || "",
            twitter: data.data.twitter || "",
            instagram: data.data.instagram || "",
            role: data.data.role || session.user.role || "USER",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        // Set default values from session if API fails
        setProfileData({
          image: "",
          name: session.user.name || "",
          bio: "",
          website: "",
          location: "",
          twitter: "",
          instagram: "",
          role: session.user.role || "USER",
        });
      } finally {
        setInitialLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchUserProfile();
    }
  }, [session, status]);

  // Trigger validation when profile data changes
  useEffect(() => {
    if (profileData.name || profileData.website || profileData.bio) {
      debouncedValidateProfile();
    }
  }, [profileData, debouncedValidateProfile]);

  // Show loading state while checking authentication
  if (status === "loading" || initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl mx-auto p-4">
          <div className="bg-gray-200 h-8 rounded-lg w-48"></div>
          <div className="bg-gray-200 h-32 rounded-lg"></div>
          <div className="bg-gray-200 h-10 rounded-lg"></div>
          <div className="bg-gray-200 h-10 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Show error state if not authenticated
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700 max-w-md w-full">
          <h3 className="font-medium mb-2">Authentication Required</h3>
          <p>Please log in to access your profile settings.</p>
        </div>
      </div>
    );
  }

  // Check if user can save profile (for organizer role change)
  const canSaveProfile = (): boolean => {
    if (profileData.role === "ORGANIZER") {
      const socialProofs = [
        profileData.website,
        profileData.twitter,
        profileData.instagram,
      ].filter(Boolean);
      return socialProofs.length >= 2;
    }
    return Object.keys(validateProfileData()).length === 0;
  };

  const getSocialProofCount = (): number => {
    return [
      profileData.website,
      profileData.twitter,
      profileData.instagram,
    ].filter(Boolean).length;
  };

  const handleProfileInputChange = (
    field: keyof ProfileData,
    value: string
  ) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear specific field error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handlePasswordInputChange = (
    field: keyof PasswordData,
    value: string
  ) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear specific field error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    const errors = validateProfileData();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setProfileMessage({
        type: "error",
        text: "Please fix the errors below before submitting.",
      });
      return;
    }

    setIsLoading(true);
    setProfileMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setProfileMessage({
        type: "success",
        text: data.message || "Profile updated successfully!",
      });

      // Update local state with returned data
      setProfileData((prev) => ({
        ...prev,
        ...data.data,
      }));

      // Clear validation errors on success
      setValidationErrors({});
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    const errors = validatePasswordData();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setPasswordMessage({
        type: "error",
        text: "Please fix the errors below before submitting.",
      });
      return;
    }

    setIsLoading(true);
    setPasswordMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setPasswordMessage({
        type: "success",
        text: data.message || "Password updated successfully!",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Clear validation errors on success
      setValidationErrors({});
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setProfileMessage({
          type: "error",
          text: "Image size must be less than 2MB",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        setProfileMessage({
          type: "error",
          text: "Please select a valid image file",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        handleProfileInputChange("image", e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTabChange = (tab: "profile" | "password") => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    // Clear messages and errors when switching tabs
    setProfileMessage({ type: "", text: "" });
    setPasswordMessage({ type: "", text: "" });
    setValidationErrors({});
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    switch (field) {
      case "current":
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case "new":
        setShowNewPassword(!showNewPassword);
        break;
      case "confirm":
        setShowConfirmPassword(!showConfirmPassword);
        break;
    }
  };

  const renderFieldError = (field: string) => {
    if (validationErrors[field]) {
      return (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {validationErrors[field]}
        </p>
      );
    }
    return null;
  };

  const renderMessage = (message: Message) => {
    if (!message.text) return null;

    return (
      <div
        className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === "success"
            ? "bg-green-50 text-green-800 border border-green-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}
      >
        {message.type === "success" ? (
          <Check className="w-5 h-5 flex-shrink-0" />
        ) : (
          <X className="w-5 h-5 flex-shrink-0" />
        )}
        <span className="text-sm lg:text-base">{message.text}</span>
      </div>
    );
  };

  const renderInputWithIcon = (
    type: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    icon: React.ReactNode,
    field: string,
    maxLength?: number
  ) => (
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        {icon}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-10 pr-3 lg:pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
          validationErrors[field] ? "border-red-300" : "border-gray-300"
        }`}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Account Settings
              </h1>
              <p className="text-sm text-gray-600">Manage your account</p>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Toggle Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block p-6 pb-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Account Settings
            </h1>
            <p className="text-gray-600">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Navigation */}
        <div
          className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          </div>
          <nav className="p-4 space-y-2">
            <button
              onClick={() => handleTabChange("profile")}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === "profile"
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Account info
            </button>
            <button
              onClick={() => handleTabChange("password")}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === "password"
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Change Password
            </button>
          </nav>
        </div>

        <div className="lg:flex lg:gap-8 lg:p-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <nav className="space-y-2">
              <button
                onClick={() => handleTabChange("profile")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "profile"
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Account info
              </button>
              <button
                onClick={() => handleTabChange("password")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "password"
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Change Password
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4 lg:p-0">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
                <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">
                  Profile Information
                </h2>
                <form
                  onSubmit={handleProfileSubmit}
                  className="space-y-4 lg:space-y-6"
                >
                  {/* Profile Image */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
                    <div className="relative flex-shrink-0">
                      <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        {profileData.image ? (
                          <img
                            src={profileData.image}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-12 h-12 lg:w-14 lg:h-14 text-gray-500" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-transparent border border-gray-300 text-gray-600 p-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors shadow-md">
                        <Camera className="w-4 h-4 lg:w-5 lg:h-5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 text-sm lg:text-base">
                        Profile Photo
                      </h3>
                      <p className="text-xs lg:text-sm text-gray-500 mt-1">
                        JPG, PNG or GIF. Max size 2MB.
                      </p>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        handleProfileInputChange("name", e.target.value)
                      }
                      className={`w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
                        validationErrors.name
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter your name"
                      required
                    />
                    {renderFieldError("name")}
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <div className="relative">
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          if (newValue.length <= limits.bio) {
                            handleProfileInputChange("bio", newValue);
                          }
                        }}
                        rows={4}
                        className={`w-full px-3 lg:px-4 py-2 pb-6 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base resize-none ${
                          validationErrors.bio
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                        placeholder="Tell us about yourself"
                        maxLength={limits.bio}
                      />
                      <div
                        className={`absolute bottom-2 right-2 text-xs px-1 rounded ${
                          profileData.bio.length > limits.bio * 0.9
                            ? "text-red-500 bg-red-50"
                            : "text-gray-500 bg-white"
                        }`}
                      >
                        {profileData.bio.length}/{limits.bio}
                      </div>
                    </div>
                    {renderFieldError("bio")}
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    {renderInputWithIcon(
                      "url",
                      profileData.website,
                      (value) => handleProfileInputChange("website", value),
                      "https://your-website.com",
                      <Globe className="w-4 h-4" />,
                      "website",
                      limits.website
                    )}
                    {renderFieldError("website")}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    {renderInputWithIcon(
                      "text",
                      profileData.location,
                      (value) => handleProfileInputChange("location", value),
                      "Your location",
                      <MapPin className="w-4 h-4" />,
                      "location",
                      limits.location
                    )}
                    {renderFieldError("location")}
                  </div>

                  {/* Social Media */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {/* Twitter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Twitter
                      </label>
                      {renderInputWithIcon(
                        "text",
                        profileData.twitter,
                        (value) => handleProfileInputChange("twitter", value),
                        "@yourusername",
                        <RiTwitterXLine className="w-4 h-4" />,
                        "twitter",
                        limits.twitter
                      )}
                      {renderFieldError("twitter")}
                    </div>

                    {/* Instagram */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instagram
                      </label>
                      {renderInputWithIcon(
                        "text",
                        profileData.instagram,
                        (value) => handleProfileInputChange("instagram", value),
                        "@yourusername",
                        <PiInstagramLogo className="w-4 h-4" />,
                        "instagram",
                        limits.instagram
                      )}
                      {renderFieldError("instagram")}
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label
                      htmlFor="role-select"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Role
                    </label>
                    <select
                      id="role-select"
                      value={profileData.role}
                      onChange={(e) =>
                        handleProfileInputChange("role", e.target.value)
                      }
                      disabled={
                        profileData.role === "ORGANIZER" ||
                        profileData.role === "ADMIN"
                      }
                      className={`w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
                        profileData.role === "ORGANIZER" ||
                        profileData.role === "ADMIN"
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200"
                          : "border-gray-300"
                      }`}
                    >
                      <option value="USER">User</option>
                      <option value="ORGANIZER">Organizer</option>
                    </select>

                    {/* Social Proof Requirement Notice */}
                    {profileData.role === "ORGANIZER" && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs lg:text-sm">
                          <p className="text-blue-800 font-medium">
                            Organizer Social Proof Required
                          </p>
                          <p className="text-blue-700 mt-1">
                            Please fill in at least 2 social proof fields
                            (Website, Twitter, or Instagram) to become an
                            organizer.
                          </p>
                          <p className="text-blue-600 mt-1">
                            Current social proofs: {getSocialProofCount()}/2
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Success/Error Messages */}
                  {renderMessage(profileMessage)}
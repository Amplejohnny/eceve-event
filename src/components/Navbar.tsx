"use client"

import React, { useState } from "react";
import { Menu, X, Ticket, Star, User, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

const Navbar: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Determine if user is logged in and email is verified
  const isLoggedIn = status === "authenticated" && !!session?.user;
  const isEmailVerified = session?.user?.emailVerified;
  const userRole = session?.user?.role;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleHomeClick = () => {
    router.push("/");
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
    }
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  // Helper function to get dashboard info based on user role
  const getDashboardInfo = () => {
    if (userRole === "ADMIN") {
      return { path: "/admin", label: "Admin Panel" };
    } else if (userRole === "ORGANIZER") {
      return { path: "/organizer", label: "Dashboard" };
    }
    return null;
  };

  const NavLinks = () => (
    <>
      <a
        href="#"
        onClick={() => handleNavClick("/")}
        className="text-white hover:text-yellow-400 transition-colors duration-200 border-b-2 border-yellow-400 pb-1"
      >
        Home
      </a>
      {/* Changed */}
      <a
        href="#"
        onClick={() => handleNavClick("/")}
        className="text-white hover:text-yellow-400 transition-colors duration-200 hover:border-b-2 hover:border-yellow-400 pb-1"
      >
        Events
      </a>
      <a
        href="#"
        onClick={() => handleNavClick("/events/create")}
        className="text-white hover:text-yellow-400 transition-colors duration-200 hover:border-b-2 hover:border-yellow-400 pb-1"
      >
        Create Event
      </a>
    </>
  );

  const AuthButtons = () => (
    <>
      <button
      // Changed
        onClick={() => handleNavClick("/")}
        className="text-white hover:text-yellow-400 transition-colors duration-200"
      >
        Login
      </button>
      <button
      // Changed
        onClick={() => handleNavClick("/")}
        className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-md hover:bg-yellow-300 transition-colors duration-200 font-medium"
      >
        Sign Up
      </button>
    </>
  );

  const EmailVerificationNotice = () => (
    <div className="bg-yellow-500 text-gray-900 px-3 py-1 rounded-md text-sm">
      Email not verified
    </div>
  );

  const LoggedInActions = () => {
    const dashboardInfo = getDashboardInfo();

    return (
      <>
        {/* Show email verification notice if not verified */}
        {!isEmailVerified && <EmailVerificationNotice />}

        {/* Create Event - visible to all users */}
        <button
          onClick={() => handleNavClick("/events/create")}
          className="text-white hover:text-yellow-400 transition-colors duration-200"
        >
          Create Event
        </button>

        <div className="flex items-center space-x-4">
          {/* Tickets - only for verified users */}
          {isEmailVerified && (
            <div
              className="flex flex-col items-center group cursor-pointer"
              onClick={() => handleNavClick("/tickets")}
            >
              <Ticket className="w-5 h-5 text-white group-hover:text-yellow-400 transition-colors duration-200" />
              <span className="text-xs text-white group-hover:text-yellow-400 transition-colors duration-200">
                Tickets
              </span>
            </div>
          )}

          {/* Profile Dropdown */}
          <div className="relative">
            <div
              className="flex flex-col items-center group cursor-pointer"
              onClick={toggleProfileDropdown}
            >
              <User className="w-5 h-5 text-white group-hover:text-yellow-400 transition-colors duration-200" />
              <span className="text-xs text-white group-hover:text-yellow-400 transition-colors duration-200">
                Profile
              </span>
            </div>

            {/* Profile Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-50">
                <div className="px-4 py-2 text-gray-800 border-b border-gray-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">
                      {session?.user?.name || "User"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {session?.user?.email}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        isEmailVerified
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {isEmailVerified ? "Verified" : "Unverified"}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                      {userRole}
                    </span>
                  </div>
                </div>

                {/* Profile Actions */}
                {isEmailVerified ? (
                  <>
                    <button
                      onClick={() => handleNavClick("/profile")}
                      className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </button>

                    <button
                      onClick={() => handleNavClick("/favorites")}
                      className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Star className="w-4 h-4" />
                      <span>Favorites</span>
                    </button>

                    <button
                      onClick={() => handleNavClick("/settings")}
                      className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Account Settings</span>
                    </button>

                    {/* Dashboard - for ADMIN and ORGANIZER */}
                    {dashboardInfo && (
                      <button
                        onClick={() => handleNavClick(dashboardInfo.path)}
                        className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>{dashboardInfo.label}</span>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => handleNavClick("/auth/verify-request")}
                    className="w-full text-left px-4 py-2 text-yellow-600 hover:bg-yellow-50 transition-colors duration-200"
                  >
                    Verify Email
                  </button>
                )}

                <div className="border-t border-gray-200 mt-2 pt-2">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  // Show loading state while session is being fetched
  if (status === "loading") {
    return (
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <Image
                  src="/ticket.png"
                  alt="Comforeve Logo"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-white text-xl font-bold">Comforeve</span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="animate-pulse bg-gray-600 h-6 w-32 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={handleHomeClick}
            >
              <Image
                src="/ticket.png"
                alt="Comforeve Logo"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
              <span className="text-white text-xl font-bold">Comforeve</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <NavLinks />
            </div>
          </div>

          {/* Desktop Auth/User Actions */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center space-x-4">
              {isLoggedIn ? <LoggedInActions /> : <AuthButtons />}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-white hover:text-yellow-400 transition-colors duration-200"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-700">
            <div className="flex flex-col space-y-3">
              <NavLinks />

              {isLoggedIn ? (
                <div className="flex flex-col space-y-3 pt-3 border-t border-gray-600">
                  {/* Email verification notice for mobile */}
                  {!isEmailVerified && (
                    <div className="bg-yellow-500 text-gray-900 px-3 py-2 rounded-md text-sm text-center">
                      Email not verified -{" "}
                      <span
                        className="underline cursor-pointer"
                        onClick={() => handleNavClick("/auth/verify-request")}
                      >
                        Verify now
                      </span>
                    </div>
                  )}

                  {/* Create Event - visible to all users, but only works for Admin/Organizers */}
                  <button
                    onClick={() => handleNavClick("/events/create")}
                    className="text-white hover:text-yellow-400 transition-colors duration-200 text-left"
                  >
                    Create Event
                  </button>

                  {/* Tickets - only for verified users */}
                  {isEmailVerified && (
                    <button
                      onClick={() => handleNavClick("/tickets")}
                      className="text-white hover:text-yellow-400 transition-colors duration-200 text-left flex items-center space-x-2"
                    >
                      <Ticket className="w-5 h-5" />
                      <span>My Tickets</span>
                    </button>
                  )}

                  {/* Profile actions */}
                  {isEmailVerified ? (
                    <>
                      <button
                        onClick={() => handleNavClick("/profile")}
                        className="text-white hover:text-yellow-400 transition-colors duration-200 text-left flex items-center space-x-2"
                      >
                        <User className="w-5 h-5" />
                        <span>Profile</span>
                      </button>

                      <button
                        onClick={() => handleNavClick("/favorites")}
                        className="text-white hover:text-yellow-400 transition-colors duration-200 text-left flex items-center space-x-2"
                      >
                        <Star className="w-4 h-4" />
                        <span>Favorites</span>
                      </button>

                      <button
                        onClick={() => handleNavClick("/settings")}
                        className="text-white hover:text-yellow-400 transition-colors duration-200 text-left flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Account Settings</span>
                      </button>

                      {/* Dashboard - for ADMIN and ORGANIZER */}
                      {(() => {
                        const dashboardInfo = getDashboardInfo();
                        return dashboardInfo ? (
                          <button
                            onClick={() => handleNavClick(dashboardInfo.path)}
                            className="text-white hover:text-yellow-400 transition-colors duration-200 text-left flex items-center space-x-2"
                          >
                            <Settings className="w-4 h-4" />
                            <span>{dashboardInfo.label}</span>
                          </button>
                        ) : null;
                      })()}
                    </>
                  ) : (
                    <button
                      onClick={() => handleNavClick("/auth/verify-request")}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors duration-200 text-left"
                    >
                      Verify Email
                    </button>
                  )}

                  <button
                    onClick={handleSignOut}
                    className="text-white hover:text-yellow-400 transition-colors duration-200 text-left flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-3 pt-3 border-t border-gray-600">
                  <button
                  // Changed
                    onClick={() => handleNavClick("/")}
                    className="text-white hover:text-yellow-400 transition-colors duration-200 text-left"
                  >
                    Login
                  </button>
                  <button
                  // Changed
                    onClick={() => handleNavClick("/")}
                    className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-md hover:bg-yellow-300 transition-colors duration-200 font-medium text-center"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

"use client";

import React, { useState } from "react";
import { Menu, X, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Navbar: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Determine if user is logged in and email is verified
  const isLoggedIn = status === "authenticated" && !!session?.user;
  const isEmailVerified = session?.user?.emailVerified;
  const userRole = session?.user?.role;

  const toggleMobileMenu = (): void => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleProfileDropdown = (): void => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleHomeClick = (): void => {
    router.push("/");
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
    }
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  // Helper function to get dashboard info based on user role
  const getDashboardInfo = (): {
    path: string;
    label: string;
  } | null => {
    if (userRole === "ADMIN") {
      return { path: "/admin", label: "Admin Panel" };
    } else if (userRole === "ORGANIZER") {
      return { path: "/organizer", label: "Dashboard" };
    }
    return null;
  };

  const NavLinks = (): React.JSX.Element => {
    const pathname = usePathname();

    const isActive = (path: string): boolean => {
      if (path === "/") {
        return pathname === "/";
      }
      return pathname.startsWith(path);
    };

    return (
      <>
        <Link
          href="/"
          className={`transition-colors duration-200 pb-1 ${
            isActive("/")
              ? "text-yellow-400 border-b-2 border-yellow-400"
              : "text-white hover:text-yellow-400 hover:border-b-2 hover:border-yellow-400"
          }`}
        >
          Home
        </Link>
        <Link
          href="/events"
          className={`transition-colors duration-200 pb-1 ${
            isActive("/events") && !pathname.includes("/events/create")
              ? "text-yellow-400 border-b-2 border-yellow-400"
              : "text-white hover:text-yellow-400 hover:border-b-2 hover:border-yellow-400"
          }`}
        >
          Events
        </Link>
        <Link
          href="/events/create"
          className={`transition-colors duration-200 pb-1 ${
            isActive("/events/create")
              ? "text-yellow-400 border-b-2 border-yellow-400"
              : "text-white hover:text-yellow-400 hover:border-b-2 hover:border-yellow-400"
          }`}
        >
          Create Event
        </Link>
      </>
    );
  };

  const AuthButtons = (): React.JSX.Element => (
    <>
      <button className="text-white hover:text-yellow-400 transition-colors duration-200 cursor-pointer">
        <Link href="/auth/login">Login</Link>
      </button>
      <button className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-md hover:bg-yellow-300 transition-colors duration-200 font-medium cursor-pointer">
        <Link href="/auth/register">Sign Up</Link>
      </button>
    </>
  );

  const LoggedInActions = (): React.JSX.Element => {
    const dashboardInfo = getDashboardInfo();

    return (
      <div className="flex items-center space-x-4">
        {/* Email verification notice */}
        {!isEmailVerified && (
          <div className="bg-yellow-500 text-gray-900 px-3 py-1 rounded-md text-sm font-medium">
            Email not verified
          </div>
        )}

        {/* Profile Avatar Dropdown */}
        <div className="relative">
          <div
            className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center cursor-pointer hover:bg-yellow-300 transition-colors duration-200"
            onClick={toggleProfileDropdown}
          >
            <User className="w-4 h-4 text-gray-900" />
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-50">
              <div className="px-3 py-2 text-gray-800 border-b border-gray-200">
                <div className="text-sm font-medium mb-1">
                  {session?.user?.name || "User"}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {session?.user?.email}
                </div>
                <div className="flex items-center justify-between">
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
                  <Link
                    href="/my-events"
                    className="w-full block px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    My Events
                  </Link>

                  <Link
                    href="/favorites"
                    className="w-full block px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    Favorites
                  </Link>

                  <Link
                    href="/profile-settings"
                    className="w-full block px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    Account Settings
                  </Link>

                  {/* Dashboard - for ADMIN and ORGANIZER */}
                  {dashboardInfo && (
                    <Link
                      href={dashboardInfo.path}
                      className="w-full block px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100 transition-colors duration-200"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      {dashboardInfo.label}
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href="/auth/verify-request"
                  className="w-full block px-3 py-1.5 text-sm text-yellow-600 hover:bg-yellow-50 transition-colors duration-200"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  Verify Email
                </Link>
              )}

              <div className="border-t border-gray-200 mt-1 pt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100 transition-colors duration-200"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
              <div className="animate-pulse bg-gray-600 h-6 w-8 rounded-4xl"></div>
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

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-baseline space-x-8">
              <NavLinks />
            </div>
          </div>

          {/* Desktop Auth/User Actions */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
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
                      <Link
                        href="/auth/verify-request"
                        className="underline font-medium"
                      >
                        Verify Now
                      </Link>
                    </div>
                  )}

                  {/* User info */}
                  <div className="text-white py-2">
                    <div className="text-sm font-medium">
                      {session?.user?.name || "User"}
                    </div>
                    <div className="text-xs text-gray-300">
                      {session?.user?.email}
                    </div>
                  </div>

                  {/* Profile actions */}
                  {isEmailVerified ? (
                    <>
                      <Link
                        href="/my-events"
                        className="text-white hover:text-yellow-400 transition-colors duration-200 text-left py-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        My Events
                      </Link>

                      <Link
                        href="/favorites"
                        className="text-white hover:text-yellow-400 transition-colors duration-200 text-left py-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Favorites
                      </Link>

                      <Link
                        href="/profile-settings"
                        className="text-white hover:text-yellow-400 transition-colors duration-200 text-left py-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Account Settings
                      </Link>

                      {/* Dashboard - for ADMIN and ORGANIZER */}
                      {((): React.JSX.Element | null => {
                        const dashboardInfo = getDashboardInfo();
                        return dashboardInfo ? (
                          <Link
                            href={dashboardInfo.path}
                            className="text-white hover:text-yellow-400 transition-colors duration-200 text-left py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {dashboardInfo.label}
                          </Link>
                        ) : null;
                      })()}
                    </>
                  ) : (
                    <Link
                      href="/auth/verify-request"
                      className="text-yellow-400 hover:text-yellow-300 transition-colors duration-200 text-left py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Verify Email
                    </Link>
                  )}

                  <button
                    onClick={handleSignOut}
                    className="text-white hover:text-yellow-400 transition-colors duration-200 text-left py-2"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-3 pt-3 border-t border-gray-600">
                  <Link
                    href="/auth/login"
                    className="text-white hover:text-yellow-400 transition-colors duration-200 text-left py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-md hover:bg-yellow-300 transition-colors duration-200 font-medium text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
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

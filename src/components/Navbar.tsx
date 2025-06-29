import React, { useState } from "react";
import { Menu, X, Ticket, Star, User, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface NavbarProps {
  isLoggedIn?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ isLoggedIn = false }) => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleHomeClick = () => {
    // Navigate to homepage
    router.push("/");
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (path: string) => {
    // Navigate to the specified path
    router.push(path);
    setIsMobileMenuOpen(false);
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
      <a
        href="#"
        onClick={() => handleNavClick("/events")}
        className="text-white hover:text-yellow-400 transition-colors duration-200 hover:border-b-2 hover:border-yellow-400 pb-1"
      >
        Events
      </a>
      <a
        href="#"
        onClick={() => handleNavClick("/about")}
        className="text-white hover:text-yellow-400 transition-colors duration-200 hover:border-b-2 hover:border-yellow-400 pb-1"
      >
        About
      </a>
      <a
        href="#"
        onClick={() => handleNavClick("/contact")}
        className="text-white hover:text-yellow-400 transition-colors duration-200 hover:border-b-2 hover:border-yellow-400 pb-1"
      >
        Contact
      </a>
    </>
  );

  const AuthButtons = () => (
    <>
      <button
        onClick={() => handleNavClick("/auth/login")}
        className="text-white hover:text-yellow-400 transition-colors duration-200"
      >
        Login
      </button>
      <button
        onClick={() => handleNavClick("/auth/signup")}
        className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-md hover:bg-yellow-300 transition-colors duration-200 font-medium"
      >
        Sign Up
      </button>
    </>
  );

  const LoggedInActions = () => (
    <>
      <button
        onClick={() => handleNavClick("/create-event")}
        className="text-white hover:text-yellow-400 transition-colors duration-200"
      >
        Create Event
      </button>

      <div className="flex items-center space-x-4">
        {/* Tickets */}
        <div className="flex flex-col items-center group cursor-pointer">
          <Ticket className="w-5 h-5 text-white group-hover:text-yellow-400 transition-colors duration-200" />
          <span className="text-xs text-white group-hover:text-yellow-400 transition-colors duration-200">
            Tickets
          </span>
        </div>

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
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Profile</span>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-yellow-600">Profile</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Profile</span>
                </div>
              </div>

              <button
                onClick={() => handleNavClick("/interests")}
                className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200"
              >
                Interests
              </button>

              <button
                onClick={() => handleNavClick("/settings")}
                className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Account Settings</span>
              </button>

              <button
                onClick={() => handleNavClick("/logout")}
                className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

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
                  <button
                    onClick={() => handleNavClick("/create-event")}
                    className="text-white hover:text-yellow-400 transition-colors duration-200 text-left"
                  >
                    Create Event
                  </button>

                  <div className="flex items-center space-x-2">
                    <Ticket className="w-5 h-5 text-white" />
                    <span className="text-white">Tickets</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-white" />
                    <span className="text-white">Profile</span>
                  </div>

                  <button
                    onClick={() => handleNavClick("/interests")}
                    className="text-white hover:text-yellow-400 transition-colors duration-200 text-left flex items-center space-x-2"
                  >
                    <Star className="w-4 h-4" />
                    Interests
                  </button>

                  <button
                    onClick={() => handleNavClick("/settings")}
                    className="text-white hover:text-yellow-400 transition-colors duration-200 text-left flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Account Settings</span>
                  </button>

                  <button
                    onClick={() => handleNavClick("/logout")}
                    className="text-white hover:text-yellow-400 transition-colors duration-200 text-left flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-3 pt-3 border-t border-gray-600">
                  <button
                    onClick={() => handleNavClick("/auth/login")}
                    className="text-white hover:text-yellow-400 transition-colors duration-200 text-left"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => handleNavClick("/auth/signup")}
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

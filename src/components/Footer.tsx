"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-[#2C293E] text-white py-10 px-6 md:px-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 text-sm">
        {/* Company Info */}
        <div>
          <h4 className="font-semibold text-lg mb-4">Company Info</h4>
          <ul className="space-y-2 text-gray-300">
            <li>
              <Link href="#">About Us</Link>
            </li>
            <li>
              <Link href="#">Contact Us</Link>
            </li>
            <li>
              <Link href="#">Careers</Link>
            </li>
            <li>
              <Link href="#">FAQs</Link>
            </li>
            <li>
              <Link href="#">Terms of Service</Link>
            </li>
            <li>
              <Link href="#">Privacy Policy</Link>
            </li>
          </ul>
        </div>

        {/* Help */}
        <div>
          <h4 className="font-semibold text-lg mb-4">Help</h4>
          <ul className="space-y-2 text-gray-300">
            <li>
              <Link href="#">Account Support</Link>
            </li>
            <li>
              <Link href="#">Listing Events</Link>
            </li>
            <li>
              <Link href="#">Event Ticketing</Link>
            </li>
            <li>
              <Link href="#">Ticket Purchase Terms & Conditions</Link>
            </li>
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h4 className="font-semibold text-lg mb-4">Categories</h4>
          <ul className="space-y-2 text-gray-300">
            <li>
              <Link href="#">Concerts & Gigs</Link>
            </li>
            <li>
              <Link href="#">Festivals & Lifestyle</Link>
            </li>
            <li>
              <Link href="#">Business & Networking</Link>
            </li>
            <li>
              <Link href="#">Food & Drinks</Link>
            </li>
            <li>
              <Link href="#">Performing Arts</Link>
            </li>
            <li>
              <Link href="#">Sports & Outdoors</Link>
            </li>
            <li>
              <Link href="#">Exhibitions</Link>
            </li>
            <li>
              <Link href="#">Workshops, Conferences & Classes</Link>
            </li>
          </ul>
        </div>

        {/* Follow Us */}
        <div>
          <h4 className="font-semibold text-lg mb-4">Follow Us</h4>
          <ul className="space-y-2 text-gray-300">
            <li>
              <Link href="#">Facebook</Link>
            </li>
            <li>
              <Link href="#">Instagram</Link>
            </li>
            <li>
              <Link href="#">Twitter</Link>
            </li>
            <li>
              <Link href="#">Youtube</Link>
            </li>
          </ul>
        </div>

        {/* Download The App */}
        <div>
          <h4 className="font-semibold text-lg mb-4">Download The App</h4>
          <div className="space-y-3">
            {/* Google Play Button */}
            <a
              href="#"
              className="flex items-center bg-gray-800 hover:bg-gray-700 transition-colors duration-200 rounded-lg border border-gray-600 px-3 py-2 w-38"
              aria-label="Download on Google Play"
              title="Download on Google Play"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.61 3 21.09 3 20.5Z"
                  fill="#EA4335"
                />
                <path
                  d="M16.81 10.09L13.69 12L16.81 13.91L20.05 12L16.81 10.09Z"
                  fill="#FBBC04"
                />
                <path
                  d="M3.84 21.85C4.24 22.05 4.74 21.95 5.13 21.56L15.13 12L5.13 2.44C4.74 2.05 4.24 1.95 3.84 2.15L13.69 12L3.84 21.85Z"
                  fill="#4285F4"
                />
                <path
                  d="M5.13 2.44L15.13 12L16.81 10.09L5.13 2.44Z"
                  fill="#34A853"
                />
              </svg>
              <div className="text-left">
                <div className="text-xs text-gray-300">Get it on</div>
                <div className="text-sm font-semibold">Google Play</div>
              </div>
            </a>

            {/* App Store Button */}
            <a
              href="#"
              className="flex items-center bg-gray-800 hover:bg-gray-700 transition-colors duration-200 rounded-lg border border-gray-600 px-3 py-2 w-38"
              aria-label="Download on App Store"
              title="Download on App Store"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"
                  fill="white"
                />
              </svg>
              <div className="text-left">
                <div className="text-xs text-gray-300">Download on the</div>
                <div className="text-sm font-semibold">App Store</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <hr className="my-6 border-gray-600" />

      <p className="text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} Comforeve. All rights reserved
      </p>
    </footer>
  );
};

export default Footer;

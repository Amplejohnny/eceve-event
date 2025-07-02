"use client"

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
          <div className="space-y-4">
            <a
              href="#"
              className="flex items-center bg-[#3B3950] px-4 py-3 rounded-md"
              aria-label="Download on Google Play"
              title="Download on Google Play"
            >
              <Image
                src="/google-play.png"
                alt="Google Play"
                width={25}
                height={25}
                className="mr-3 width:auto height:auto"
              />
            </a>
            <a
              href="#"
              className="flex items-center bg-[#3B3950] px-4 py-3 rounded-md"
              aria-label="Download on App Store"
              title="Download on App Store"
            >
              <Image
                src="/app-store.png"
                alt="App Store"
                width={25}
                height={25}
                className="mr-3 width:auto height:auto"
              />
            </a>
          </div>
        </div>
      </div>

      <hr className="my-8 border-gray-600" />

      <p className="text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} Comforeve. All rights reserved
      </p>
    </footer>
  );
};

export default Footer;

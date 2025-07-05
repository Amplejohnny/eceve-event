"use client";

import Link from "next/link";
import { Home, ArrowLeft, Search, Mail, Phone } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Animation */}
        <div className="relative mb-8">
          <div className="text-8xl md:text-9xl font-bold text-slate-200 dark:text-slate-700 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center animate-pulse">
              <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100">
              Page Not Found
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Sorry, we couldn't find the page you're looking for. The page
              might have been moved, deleted, or the URL might be incorrect.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-12 pt-8 flex border-t border-slate-200 dark:border-slate-700 flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              <Home className="w-5 h-5" />
              Go Home
            </Link>

            <button
              onClick={() => window.history.back()}
              className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg border border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:focus:ring-offset-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-sm text-slate-500 dark:text-slate-400">
          <p>Error Code: 404 | Page Not Found</p>
        </div>
      </div>
    </div>
  );
}

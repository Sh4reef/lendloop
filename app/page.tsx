"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Wrench, Shield, ArrowRight, Sparkles, Filter } from "lucide-react";

const CATEGORIES = [
  "all",
  "power tools",
  "garden",
  "kitchen",
  "camping",
  "other",
] as const;

export default function HomePage() {
  const { isSignedIn, isLoaded } = useUser();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Public data query - data minimized (only name and category)
  const publicTools = useQuery(api.tools.listPublicTools, {
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              LendLoop
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isLoaded && isSignedIn ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <button className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition">
                    Sign in to lend or borrow
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-14 px-4 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Neighborhood Tool-Sharing Community
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Borrow what you need. <br />
            <span className="text-emerald-600">Lend what you don’t.</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Share lawn mowers, drills, camping gear, and kitchen appliances with verified neighbors.
            Automated requests, smart loan tracking, and zero friction.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            {!isSignedIn && (
              <SignInButton mode="modal">
                <button className="px-6 py-3 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2">
                  Sign in to lend or borrow
                  <ArrowRight className="w-4 h-4" />
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </section>

      {/* Public Catalog Section (Data Minimized) */}
      <main className="max-w-6xl mx-auto px-4 py-12 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Available in Your Neighborhood</h2>
            <p className="text-sm text-slate-500 mt-1">
              Browse available equipment below. Sign in to view full descriptions, lender details, and request loans.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Public Cards Grid */}
        {publicTools === undefined ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : publicTools.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No tools found</h3>
            <p className="text-sm text-slate-500 mt-1">Be the first to list a tool in this category!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {publicTools.map((tool) => (
              <div
                key={tool._id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 capitalize border border-emerald-100">
                      {tool.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Available
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-lg line-clamp-1">{tool.name}</h3>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Shield className="w-3.5 h-3.5" />
                    Verified Community Tool
                  </span>
                  {!isSignedIn ? (
                    <SignInButton mode="modal">
                      <button className="font-semibold text-emerald-600 hover:text-emerald-700">
                        Sign in to request →
                      </button>
                    </SignInButton>
                  ) : (
                    <Link href="/dashboard" className="font-semibold text-emerald-600 hover:text-emerald-700">
                      Request Loan →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <p>© 2026 LendLoop Inc. Privacy-first neighborhood equipment sharing platform.</p>
      </footer>
    </div>
  );
}

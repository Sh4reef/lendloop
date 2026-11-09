"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, ArrowLeft, Wrench, Users } from "lucide-react";

export default function AdminPage() {
  const viewer = useQuery(api.users.getViewer);
  const allLoans = useQuery(api.loans.getAllLoans);
  const allTools = useQuery(api.tools.listTools, {});
  const deleteTool = useMutation(api.tools.deleteTool);
  const setTrustedLender = useMutation(api.users.setTrustedLender);

  if (viewer === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2.5 text-slate-500 text-sm font-medium">
          <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <span>Verifying administrator privileges...</span>
        </div>
      </div>
    );
  }

  // Prevent endpoint enumeration / reconnaissance by returning 404 for unauthorized users
  if (viewer?.role !== "admin") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="h-8 w-8 bg-amber-500 text-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none truncate">
                Admin Control Center
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                Moderation, trust verification, and global loan audit
              </p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
            RBAC: admin
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-8 sm:space-y-10 flex-1 w-full">
        {/* Section 1: Manage Listings */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                <span>Community Listings Moderation</span>
                {allTools && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {allTools.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Moderate tool listings, assign trusted lender badges, and remove violating entries.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 sm:hidden self-start italic">
              Swipe table horizontally →
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Tool Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Owner & Trust Status</th>
                    <th className="px-4 py-3 whitespace-nowrap">Category</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {allTools === undefined ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          <span>Loading community listings...</span>
                        </div>
                      </td>
                    </tr>
                  ) : allTools.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No tool listings currently found in the system.
                      </td>
                    </tr>
                  ) : (
                    allTools.map((tool: any) => (
                      <tr key={tool._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                          {tool.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{tool.ownerName}</span>
                            <button
                              onClick={() =>
                                setTrustedLender({
                                  userId: tool.ownerId,
                                  isTrusted: !tool.isTrustedLender,
                                })
                              }
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold transition whitespace-nowrap ${
                                tool.isTrustedLender
                                  ? "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                              }`}
                            >
                              {tool.isTrustedLender ? "✓ Trusted Lender" : "Make Trusted"}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {tool.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              tool.status === "available"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}
                          >
                            {tool.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => deleteTool({ toolId: tool._id })}
                            className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded font-medium transition"
                          >
                            Remove Listing
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 2: Global Loan Monitoring */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
                <span>Global Active Loans Audit</span>
                {allLoans && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {allLoans.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit system-wide equipment loans, due dates, and automated notification counts.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 sm:hidden self-start italic">
              Swipe table horizontally →
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Tool Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Borrower</th>
                    <th className="px-4 py-3 whitespace-nowrap">Lender</th>
                    <th className="px-4 py-3 whitespace-nowrap">Loan Dates</th>
                    <th className="px-4 py-3 whitespace-nowrap">Reminders</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {allLoans === undefined ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          <span>Loading global loans...</span>
                        </div>
                      </td>
                    </tr>
                  ) : allLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No active loans currently recorded across the neighborhood.
                      </td>
                    </tr>
                  ) : (
                    allLoans.map((loan: any) => (
                      <tr key={loan._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                          {loan.toolName}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {loan.borrowerName}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {loan.lenderName}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {loan.startDate} → {loan.endDate}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap font-mono">
                          {loan.reminderCount} sent
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full capitalize font-medium ${
                              loan.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : loan.status === "overdue"
                                ? "bg-rose-50 text-rose-700 font-semibold border border-rose-100"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

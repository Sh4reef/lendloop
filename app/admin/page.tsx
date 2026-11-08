"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Trash2, ArrowLeft, Wrench, Users } from "lucide-react";

export default function AdminPage() {
  const viewer = useQuery(api.users.getViewer);
  const allLoans = useQuery(api.loans.getAllLoans);
  const allTools = useQuery(api.tools.listTools, {});
  const deleteTool = useMutation(api.tools.deleteTool);
  const setTrustedLender = useMutation(api.users.setTrustedLender);

  if (viewer === undefined) {
    return <div className="p-8 text-center text-slate-500">Checking authorization...</div>;
  }

  // Prevent endpoint enumeration / reconnaissance by returning 404 for unauthorized users
  if (viewer?.role !== "admin") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-8 w-8 bg-amber-500 text-white rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Admin Control Center</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Manage Listings */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600" />
            All Community Listings (Admin Moderate)
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-4 py-3">Tool</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allTools?.map((tool: any) => (
                  <tr key={tool._id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{tool.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>{tool.ownerName}</span>
                        <button
                          onClick={() => setTrustedLender({ userId: tool.ownerId, isTrusted: !tool.isTrustedLender })}
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            tool.isTrustedLender
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {tool.isTrustedLender ? "✓ Trusted Lender" : "Make Trusted"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">{tool.category}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                        {tool.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteTool({ toolId: tool._id })}
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                      >
                        Remove Listing
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Global Loan Monitoring */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Global Active Loans
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-4 py-3">Tool</th>
                  <th className="px-4 py-3">Borrower</th>
                  <th className="px-4 py-3">Lender</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Reminders</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allLoans?.map((loan: any) => (
                  <tr key={loan._id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{loan.toolName}</td>
                    <td className="px-4 py-3 text-slate-600">{loan.borrowerName}</td>
                    <td className="px-4 py-3 text-slate-600">{loan.lenderName}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{loan.startDate} to {loan.endDate}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{loan.reminderCount} sent</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                        loan.status === "active" ? "bg-emerald-50 text-emerald-700" :
                        loan.status === "overdue" ? "bg-rose-50 text-rose-700 font-medium" : "bg-slate-100 text-slate-600"
                      }`}>
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

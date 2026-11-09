"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  Send,
  Calendar,
  ShieldCheck,
  RotateCcw,
  Bell,
  Trash2,
  Sparkles,
  Filter,
} from "lucide-react";
import Loading from "../loading";

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [activeTab, setActiveTab] = useState<"catalog" | "listings" | "requests" | "incoming" | "loans">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // New Tool Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [toolName, setToolName] = useState("");
  const [toolCategory, setToolCategory] = useState<"power tools" | "garden" | "kitchen" | "camping" | "other">("power tools");
  const [toolCondition, setToolCondition] = useState("Like New");
  const [toolDesc, setToolDesc] = useState("");

  // Request Loan Modal State
  const [requestToolId, setRequestToolId] = useState<any>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  // Convex Queries
  const viewer = useQuery(api.users.getViewer);
  const tools = useQuery(api.tools.listTools, {
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });
  const myListings = useQuery(api.tools.getMyListings);
  const myRequests = useQuery(api.requests.getMyRequests);
  const incomingRequests = useQuery(api.requests.getIncomingRequests);
  const myLoans = useQuery(api.loans.getMyLoans);

  // Convex Mutations
  const syncUser = useMutation(api.users.syncUser);
  const createTool = useMutation(api.tools.createTool);
  const deleteTool = useMutation(api.tools.deleteTool);
  const createRequest = useMutation(api.requests.createRequest);
  const updateRequestStatus = useMutation(api.requests.updateRequestStatus);
  const markReturned = useMutation(api.requests.markReturned);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      syncUser({
        name: user.fullName || user.firstName || user.username || "Neighbor",
        email: user.primaryEmailAddress?.emailAddress || "",
      }).catch(console.error);
    }
  }, [isLoaded, isSignedIn, user, syncUser]);

  const handleCreateTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName || !toolDesc) return;
    await createTool({
      name: toolName,
      category: toolCategory,
      condition: toolCondition,
      description: toolDesc,
    });
    setToolName("");
    setToolDesc("");
    setShowAddModal(false);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestToolId || !startDate || !endDate) return;
    await createRequest({
      toolId: requestToolId,
      startDate,
      endDate,
      notes: requestNotes || undefined,
    });
    setRequestToolId(null);
    setStartDate("");
    setEndDate("");
    setRequestNotes("");
    setActiveTab("requests");
  };

  if (!isLoaded) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">LendLoop</span>
            </Link>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {viewer?.role === "admin" && (
              <Link
                href="/admin"
                className="text-xs font-semibold px-2 py-1 sm:px-2.5 sm:py-1 bg-amber-100 text-amber-800 rounded-md border border-amber-200 hover:bg-amber-200 transition"
              >
                Admin<span className="hidden sm:inline"> Panel</span>
              </Link>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List a Tool</span>
              <span className="sm:hidden">List</span>
            </button>
            <div className="shrink-0 flex items-center">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-4 sm:gap-6 overflow-x-auto text-xs sm:text-sm font-medium border-t border-slate-100">
          {[
            { id: "catalog", label: "Browse Tools" },
            { id: "listings", label: `My Listings (${myListings?.length ?? 0})` },
            { id: "requests", label: `My Requests (${myRequests?.length ?? 0})` },
            { id: "incoming", label: `Incoming Requests (${incomingRequests?.filter((r) => r.status === "pending")?.length ?? 0})` },
            { id: "loans", label: `Active Loans (${myLoans?.length ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 sm:py-3.5 border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {/* TAB 1: BROWSE CATALOG */}
        {activeTab === "catalog" && (
          <div>
            {/* Catalog Section Header */}
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Neighborhood Equipment</h2>
              <p className="text-sm text-slate-500 mt-1">Borrow tools from trusted neighbors around your area.</p>
            </div>

            {/* Dedicated Full-Width Category Filter Row */}
            <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 mb-8 shadow-sm">
              <div className="flex items-center gap-2 overflow-x-auto px-1 py-0.5">
                <div className="flex items-center gap-1.5 pl-2 pr-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 border-r border-slate-200">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Filters</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-max">
                  {["all", "power tools", "garden", "kitchen", "camping", "other"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCategory(c)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-xl capitalize whitespace-nowrap transition-all duration-150 ${
                        selectedCategory === c
                          ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tools?.map((tool: any) => (
                <div key={tool._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 capitalize">
                        {tool.category}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        tool.status === "available" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {tool.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-lg">{tool.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tool.description}</p>
                    <div className="mt-3 text-xs text-slate-600 flex items-center gap-2">
                      <span className="font-medium text-slate-700">Condition:</span> {tool.condition}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      {tool.isTrustedLender && (
                        <span className="inline-flex items-center gap-0.5 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                          <ShieldCheck className="w-3 h-3" /> Trusted
                        </span>
                      )}
                      <span>Lender: {tool.ownerName}</span>
                    </div>

                    {!tool.isOwner && tool.status === "available" && (
                      <button
                        onClick={() => setRequestToolId(tool._id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                      >
                        Request Loan
                      </button>
                    )}
                    {tool.isOwner && (
                      <span className="text-xs text-slate-400 italic">Your Listing</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: MY LISTINGS */}
        {activeTab === "listings" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">My Tool Listings</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                + Add Another Tool
              </button>
            </div>

            {myListings?.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Wrench className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">You haven't listed any tools yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myListings?.map((tool: any) => (
                  <div key={tool._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                          {tool.category}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          tool.status === "available" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {tool.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-lg">{tool.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{tool.description}</p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Condition: {tool.condition}</span>
                      <button
                        onClick={() => deleteTool({ toolId: tool._id })}
                        className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MY REQUESTS */}
        {activeTab === "requests" && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Tools I Have Requested</h2>
            <div className="space-y-4">
              {myRequests?.map((req: any) => (
                <div key={req._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{req.toolName}</h3>
                    <p className="text-xs text-slate-500">Lender: {req.ownerName} • Dates: {req.startDate} to {req.endDate}</p>
                    {req.notes && <p className="text-xs text-slate-600 mt-1 italic">Note: "{req.notes}"</p>}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                      req.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                      req.status === "pending" ? "bg-amber-100 text-amber-800" :
                      req.status === "returned" ? "bg-slate-100 text-slate-700" :
                      "bg-rose-100 text-rose-800"
                    }`}>
                      {req.status}
                    </span>

                    {req.status === "approved" && (
                      <button
                        onClick={() => markReturned({ requestId: req._id })}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Mark as Returned
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: INCOMING REQUESTS */}
        {activeTab === "incoming" && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Incoming Requests on My Tools</h2>
            <div className="space-y-4">
              {incomingRequests?.map((req: any) => (
                <div key={req._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{req.toolName}</h3>
                    <p className="text-xs text-slate-500">Requested by: {req.requesterName} • Dates: {req.startDate} to {req.endDate}</p>
                    {req.notes && <p className="text-xs text-slate-600 mt-1 italic">Note: "{req.notes}"</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === "pending" ? (
                      <>
                        <button
                          onClick={() => updateRequestStatus({ requestId: req._id, status: "approved" })}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => updateRequestStatus({ requestId: req._id, status: "declined" })}
                          className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </button>
                      </>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-700 capitalize">
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: ACTIVE LOANS & AUTOMATION ACTIVITY (BONUS) */}
        {activeTab === "loans" && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Loan Activity & Automation Status</h2>
            <p className="text-xs text-slate-500 mb-6">
              Automated reminders powered by n8n scheduled workflows and signed webhooks.
            </p>

            <div className="space-y-5">
              {myLoans?.map((loan: any) => (
                <div key={loan._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{loan.toolName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        loan.status === "active" ? "bg-emerald-100 text-emerald-800" :
                        loan.status === "overdue" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
                      }`}>
                        {loan.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Due: {loan.endDate}
                    </span>
                  </div>

                  {/* Bonus Requirement: Show recent automation activity */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                      <Bell className="w-3.5 h-3.5 text-emerald-600" />
                      Automation Activity Logs:
                    </h4>
                    {loan.activityLog && loan.activityLog.length > 0 ? (
                      <ul className="space-y-1.5">
                        {loan.activityLog.map((log: any, idx: number) => (
                          <li key={idx} className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
                            <span>{log.message}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No automated reminders sent yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: LIST TOOL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">List a Tool for Neighbors</h3>
            <form onSubmit={handleCreateTool} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tool Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DeWalt Cordless Drill"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={toolCategory}
                  onChange={(e) => setToolCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="power tools">Power Tools</option>
                  <option value="garden">Garden</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="camping">Camping</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Condition</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Excellent / Like New"
                  value={toolCondition}
                  onChange={(e) => setToolCondition(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Short Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Include battery, attachments, or usage notes..."
                  value={toolDesc}
                  onChange={(e) => setToolDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST LOAN */}
      {requestToolId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Request Tool Loan</h3>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Message to Lender (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Planning to build a bookshelf this weekend!"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestToolId(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

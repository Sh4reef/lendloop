import Link from "next/link";
import { Wrench } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md text-center shadow-sm">
        <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-500">
          <Wrench className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">404</h1>
        <h2 className="text-base font-semibold text-slate-700 mt-1">Page Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">
          The page you requested could not be found or does not exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

import { Network, AlignRight } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Header({ activeContact, onToggleDashboard, isDashboardOpen }) {
    return (
        <header className="fixed top-0 left-0 right-0 max-w-md mx-auto h-20 bg-slate-900 border-b border-slate-800 z-40 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                    {/* Avatar Icon (Network graph style) */}
                    <div className="w-12 h-12 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center">
                        <Network className="w-7 h-7 text-blue-400" />
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-white">N</div>
                    </div>
                </div>
                <div className="flex flex-col">
                    <h2 className="text-white font-semibold text-lg leading-tight">
                        {activeContact?.name || 'Natango'}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            activeContact?.status === 'online' ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
                        )} />
                        <span className="text-slate-400 text-sm">
                            {activeContact?.role || 'Supervision'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Decorative graph icon from mockup */}
                <div className="w-7 h-7 rounded-lg border border-slate-700 flex items-end justify-center p-1 gap-0.5 opacity-60">
                    <div className="w-1 bg-white h-2/3 rounded-sm" />
                    <div className="w-1 bg-white h-full rounded-sm" />
                    <div className="w-1 bg-white h-1/3 rounded-sm" />
                    <div className="w-1 bg-white h-1/2 rounded-sm" />
                </div>

                <button
                    onClick={onToggleDashboard}
                    className={cn(
                        "p-2 rounded-xl transition-colors border border-transparent",
                        isDashboardOpen ? "bg-blue-600/20 text-blue-400 border-blue-500/30" : "text-slate-300 hover:bg-slate-800"
                    )}
                >
                    <AlignRight className="w-6 h-6" />
                </button>
            </div>
        </header>
    );
}

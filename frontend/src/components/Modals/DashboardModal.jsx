import { X, Users, Clock } from 'lucide-react';

export default function DashboardModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <>
            {/* Blurred Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 max-w-md mx-auto"
                onClick={onClose}
            >
                {/* Modal Content */}
                <div
                    className="bg-white w-[90%] max-w-[340px] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()} // Prevent close when clicking inside
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h3 className="font-semibold text-lg text-slate-800">Dashboard</h3>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Map Area (Mock graphic) */}
                    <div className="h-48 bg-slate-200 relative overflow-hidden">
                        {/* Simple stylistic map representation */}
                        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #fff 2px, transparent 2px)', backgroundSize: '20px 20px' }} />

                        {/* Stadium Mock */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-slate-300 bg-slate-100 flex items-center justify-center shadow-inner">
                            <div className="w-16 h-16 rounded-full border-2 border-slate-300 bg-white" />
                        </div>

                        {/* Zone Indicators */}
                        <div className="absolute top-6 right-8 w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-red-500/40 border-2 border-white">
                            A
                        </div>
                        <div className="absolute bottom-8 left-8 w-8 h-8 rounded-full bg-orange-400/90 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-orange-400/40 border-2 border-white">
                            C
                        </div>
                        <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-emerald-500/90 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-emerald-500/40 border-2 border-white">
                            D
                        </div>
                    </div>

                    {/* Operational Summary */}
                    <div className="p-5">
                        <h4 className="text-sm font-medium text-slate-500 mb-3">Résumé Opérationnel</h4>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">3 Missions en cours</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">Temps moyen d'intervention: <span className="text-blue-600 font-bold">8 min</span></span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="mt-6 w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                        >
                            Retour à la conversation
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
}

import { useState } from 'react';
import { Network, ArrowRight } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Onboarding({ onStart }) {
    const [formData, setFormData] = useState({ name: '', phone: '', role: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSubmitting(true);
        // Simulate API call for onboarding
        setTimeout(() => {
            onStart();
        }, 600);
    };

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-brand-bg relative overflow-hidden items-center justify-center p-6">
            <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="relative mb-6">
                    <Network className="w-20 h-20 text-blue-600" strokeWidth={1.5} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-3xl">N</div>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Natango</h1>
                <p className="text-slate-500 text-center text-sm px-4">
                    Votre interface de communication avec l'IA opérationnelle.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-backwards"
            >
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Nom Complet</label>
                    <input
                        type="text"
                        placeholder="Ex: Jean Dupont"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Numéro de téléphone</label>
                    <input
                        type="tel"
                        placeholder="+33 6 12 34 56 78"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Poste (Optionnel)</label>
                    <input
                        type="text"
                        placeholder="Ex: Chef d'équipe"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    disabled={!formData.name || isSubmitting}
                    className={cn(
                        "mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all duration-300",
                        formData.name && !isSubmitting ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30" : "bg-slate-300 cursor-not-allowed"
                    )}
                >
                    {isSubmitting ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Démarrer <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

import { MessageCircle, Phone, LayoutDashboard, User } from 'lucide-react';
import { cn } from '../utils/cn';

export default function BottomNav({ currentView, navigateTo }) {
    const tabs = [
        { id: 'chat', label: 'Chats', icon: MessageCircle },
        { id: 'calls', label: 'Calls', icon: Phone },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'profile', label: 'Vous', icon: User },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-16 bg-white border-t border-slate-200 z-40 flex items-center justify-around px-2 pb-safe">
            {tabs.map((tab) => {
                const isActive = currentView === tab.id || (currentView === 'contacts' && tab.id === 'chat');
                return (
                    <button
                        key={tab.id}
                        onClick={() => navigateTo(tab.id === 'chat' && currentView === 'chat' ? 'contacts' : tab.id)}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                            isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <tab.icon className={cn("w-6 h-6", isActive && "fill-blue-600/10")} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">{tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}

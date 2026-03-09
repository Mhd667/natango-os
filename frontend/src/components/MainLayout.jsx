import Header from './Header';
import BottomNav from './BottomNav';

export default function MainLayout({ children, appState }) {
    const {
        currentView,
        navigateTo,
        activeContact,
        isDashboardOpen,
        toggleDashboard
    } = appState;

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-brand-bg relative overflow-hidden">
            {/* Background pattern layer (from index.css body, but enforced here for safety) */}
            <Header
                activeContact={activeContact}
                onToggleDashboard={toggleDashboard}
                isDashboardOpen={isDashboardOpen}
            />

            {/* Main Content Area - Scrollable but contained between fixed headers */}
            <main className="flex-1 w-full overflow-y-auto mt-20 mb-16 scroll-smooth">
                {children}
            </main>

            <BottomNav
                currentView={currentView}
                navigateTo={navigateTo}
            />
        </div>
    );
}

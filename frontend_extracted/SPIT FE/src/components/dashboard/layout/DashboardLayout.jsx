import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import FilterBar from '../FilterBar';
import FloatingAIChatbot from './FloatingAIChatbot';
import ProcessingGuard from '../ProcessingGuard';
import { useData } from '../../../contexts/DataContext';

export default function DashboardLayout() {
    const location = useLocation();
    const { isDataUploaded } = useData();
    const isTeamPage = location.pathname === '/dashboard/team';
    const isUploadPage = location.pathname === '/dashboard/upload';
    const showChatbot = !isTeamPage && !isUploadPage;
    
    // Show filter bar on all pages except team and upload, and only if data is uploaded
    const showFilterBar = !isTeamPage && !isUploadPage && isDataUploaded;

    return (
        <ProcessingGuard>
            <div className="flex h-screen bg-background">
                <Sidebar />

                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="bg-background border-b border-border px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Dashboard
                                </h2>
                            </div>
                        </div>
                    </header>

                    {showFilterBar && (
                        <div className="bg-background border-b border-border px-6 py-4">
                            <FilterBar />
                        </div>
                    )}

                    <main className="flex-1 overflow-y-auto p-6">
                        <Outlet />
                    </main>
                </div>

                {showChatbot && <FloatingAIChatbot />}
            </div>
        </ProcessingGuard>
    );
}

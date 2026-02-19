import LeftSidebar from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex justify-center bg-background">
            <div className="flex w-full max-w-[1265px]">
                {/* Left Sidebar */}
                <LeftSidebar />

                {/* Main Content */}
                <main className="flex-1 min-w-0 border-x border-border pb-16 lg:pb-0">
                    {children}
                </main>

                {/* Right Sidebar */}
                <RightSidebar />
            </div>

            {/* Mobile Bottom Nav */}
            <MobileBottomNav />
        </div>
    );
}

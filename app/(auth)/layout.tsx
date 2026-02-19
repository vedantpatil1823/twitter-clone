import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-background flex">
            {/* Left: Twitter bird / branding */}
            <div className="hidden lg:flex lg:flex-1 bg-primary items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-48 h-48 fill-white" aria-label="Twitter">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.261 5.635 5.905-5.635Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            </div>

            {/* Right: Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">
                    {/* Mobile header logo */}
                    <div className="flex lg:hidden justify-center mb-8">
                        <svg viewBox="0 0 24 24" className="w-10 h-10 fill-primary" aria-label="Twitter">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.261 5.635 5.905-5.635Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}

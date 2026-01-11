"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TemplatesList } from "./templates-list";
import { TemplateDetailView } from "./template-detail-view";
import { Database } from "@/types/database";
import { cn } from "@/lib/utils";

export type Template = Database['public']['Tables']['templates']['Row'] & {
    items?: Database['public']['Tables']['template_items']['Row'][];
};

interface TemplatesLayoutProps {
    templates: Template[];
    currentUserId: string;
    userRole: string; // 'admin' | 'leader' | 'member'
}

export function TemplatesLayout({ templates, userRole }: TemplatesLayoutProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));
    const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

    // Sync state with URL
    useEffect(() => {
        const id = searchParams.get('id');
        if (id) {
            setSelectedId(id);
            setIsMobileDetailOpen(true);
        } else {
            setSelectedId(null);
            setIsMobileDetailOpen(false);
        }
    }, [searchParams]);

    const handleSelect = (id: string) => {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('id', id);
        router.push(`/templates?${newParams.toString()}`);
    };

    const handleCloseDetail = () => {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('id');
        router.push(`/templates?${newParams.toString()}`);
    };

    const selectedTemplate = templates.find(t => t.id === selectedId);

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
            {/* Left Sidebar - List View */}
            <div className={cn(
                "w-full md:w-[350px] lg:w-[400px] border-r flex flex-col transition-all duration-300 ease-in-out",
                isMobileDetailOpen ? "hidden md:flex" : "flex"
            )}>
                <TemplatesList
                    templates={templates}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                />
            </div>

            {/* Right Pane - Detail View */}
            <div className={cn(
                "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out bg-gray-50/50",
                !isMobileDetailOpen ? "hidden md:flex" : "flex"
            )}>
                {selectedTemplate ? (
                    <TemplateDetailView
                        template={selectedTemplate}
                        onClose={handleCloseDetail}
                        userRole={userRole}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No template selected</h3>
                        <p className="max-w-sm text-center mt-2">Select a template from the list to view its agenda and details.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

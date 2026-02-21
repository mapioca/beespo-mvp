'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
    hasNextPage: boolean;
    hasPrevPage: boolean;
    totalPages: number;
    currentPage: number;
}

export function PaginationControls({
    hasNextPage,
    hasPrevPage,
    totalPages,
    currentPage,
}: PaginationControlsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const t = useTranslations('UI.Pagination');

    // Helper to generate the URL for a specific page while KEEPING other params
    const createPageUrl = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">
                {t('pageDetail', { current: currentPage, total: totalPages })}
            </span>
            <Button
                variant="outline"
                size="sm"
                disabled={!hasPrevPage}
                onClick={() => {
                    router.push(createPageUrl(currentPage - 1));
                }}
            >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('previous')}
            </Button>
            <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage}
                onClick={() => {
                    router.push(createPageUrl(currentPage + 1));
                }}
            >
                {t('next')}
                <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
        </div>
    );
}


/**
 * Notebook cover styles using solid neutral surfaces.
 */

export interface NotebookCover {
    id: string;
    name: string;
    gradient: string;
    textColor: 'light' | 'dark';
}

export const NOTEBOOK_COVERS: NotebookCover[] = [
    {
        id: 'ledger-ivory',
        name: 'Ledger',
        gradient: '#ffffff',
        textColor: 'dark',
    },
    {
        id: 'midnight-grid',
        name: 'Midnight Grid',
        gradient: '#fcfcfb',
        textColor: 'dark',
    },
    {
        id: 'pinstripe-paper',
        name: 'Pinstripe',
        gradient: '#fafaf9',
        textColor: 'dark',
    },
    {
        id: 'graphite-diagonal',
        name: 'Graphite',
        gradient: '#f8f8f7',
        textColor: 'dark',
    },
    {
        id: 'editorial-columns',
        name: 'Editorial',
        gradient: '#f7f7f5',
        textColor: 'dark',
    },
    {
        id: 'obsidian-ledger',
        name: 'Obsidian',
        gradient: '#f5f5f4',
        textColor: 'dark',
    },
    {
        id: 'linen-dot',
        name: 'Linen',
        gradient: '#f3f3f2',
        textColor: 'dark',
    },
    {
        id: 'drafting-board',
        name: 'Drafting',
        gradient: '#f1f1ef',
        textColor: 'dark',
    },
    {
        id: 'barcode',
        name: 'Barcode',
        gradient: '#efefed',
        textColor: 'dark',
    },
    {
        id: 'stitched-paper',
        name: 'Stitched',
        gradient: '#ededeb',
        textColor: 'dark',
    },
    {
        id: 'charcoal-frame',
        name: 'Charcoal',
        gradient: '#ebebe9',
        textColor: 'dark',
    },
    {
        id: 'micro-grid',
        name: 'Micro Grid',
        gradient: '#e9e9e7',
        textColor: 'dark',
    },
    {
        id: 'night-stripe',
        name: 'Night Stripe',
        gradient: '#e7e7e4',
        textColor: 'dark',
    },
];

/**
 * Get a cover by ID, with fallback to default
 */
export function getCoverById(id: string): NotebookCover {
    return NOTEBOOK_COVERS.find(c => c.id === id) || NOTEBOOK_COVERS[0];
}

/**
 * Get the default cover
 */
export function getDefaultCover(): NotebookCover {
    return NOTEBOOK_COVERS[0];
}

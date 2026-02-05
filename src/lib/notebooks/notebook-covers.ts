/**
 * Notebook cover styles using CSS gradients
 * 12+ predefined options for the cover picker
 */

export interface NotebookCover {
    id: string;
    name: string;
    gradient: string;
    textColor: 'light' | 'dark';
}

export const NOTEBOOK_COVERS: NotebookCover[] = [
    // Blues & Purples
    {
        id: 'gradient-ocean',
        name: 'Ocean',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        textColor: 'light',
    },
    {
        id: 'gradient-twilight',
        name: 'Twilight',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
        textColor: 'light',
    },
    {
        id: 'gradient-midnight',
        name: 'Midnight',
        gradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
        textColor: 'light',
    },

    // Warm tones
    {
        id: 'gradient-sunset',
        name: 'Sunset',
        gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%)',
        textColor: 'light',
    },
    {
        id: 'gradient-peach',
        name: 'Peach',
        gradient: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
        textColor: 'dark',
    },
    {
        id: 'gradient-coral',
        name: 'Coral',
        gradient: 'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)',
        textColor: 'light',
    },

    // Greens & Teals
    {
        id: 'gradient-forest',
        name: 'Forest',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        textColor: 'light',
    },
    {
        id: 'gradient-mint',
        name: 'Mint',
        gradient: 'linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)',
        textColor: 'dark',
    },
    {
        id: 'gradient-teal',
        name: 'Teal',
        gradient: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
        textColor: 'light',
    },

    // Neutrals & Subtle
    {
        id: 'gradient-slate',
        name: 'Slate',
        gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
        textColor: 'light',
    },
    {
        id: 'gradient-stone',
        name: 'Stone',
        gradient: 'linear-gradient(135deg, #a8a29e 0%, #78716c 100%)',
        textColor: 'light',
    },
    {
        id: 'gradient-rose',
        name: 'Rose',
        gradient: 'linear-gradient(135deg, #fda4af 0%, #fb7185 100%)',
        textColor: 'dark',
    },

    // Special
    {
        id: 'gradient-aurora',
        name: 'Aurora',
        gradient: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 50%, #f472b6 100%)',
        textColor: 'light',
    },
    {
        id: 'gradient-galaxy',
        name: 'Galaxy',
        gradient: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)',
        textColor: 'light',
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

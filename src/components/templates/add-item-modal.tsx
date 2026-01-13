'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    List,
    MessageSquare,
    Briefcase,
    Megaphone,
    User,
    Music,
    Plus,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    SPECIALIZED_ITEM_TYPES,
    getItemTypeDescription,
    type SpecializedItemType,
} from '@/types/agenda';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/use-toast';

interface AddItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddItem: (item: any) => void;
    addedSpecializedTypes: Set<SpecializedItemType>;
    proceduralItems?: any[];
    hymns?: any[];
    workspaceId?: string;
    onCatalogUpdate?: () => void; // Callback to refresh catalog after custom item creation
}

type ViewMode = 'categories' | 'procedural' | 'specialized' | 'customize';

interface ItemToCustomize {
    base: any;
    type: 'procedural' | 'specialized';
}

export function AddItemModal({
    open,
    onOpenChange,
    onAddItem,
    addedSpecializedTypes,
    proceduralItems = [],
    hymns = [],
    workspaceId,
    onCatalogUpdate,
}: AddItemModalProps) {
    const [view, setView] = useState<ViewMode>('categories');
    const [itemToCustomize, setItemToCustomize] = useState<ItemToCustomize | null>(null);
    const { toast } = useToast();

    // Customization form state
    const [customTitle, setCustomTitle] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [customDuration, setCustomDuration] = useState('5');
    const [saveToLibrary, setSaveToLibrary] = useState(false);

    const resetCustomizationForm = () => {
        setCustomTitle('');
        setCustomDescription('');
        setCustomDuration('5');
        setSaveToLibrary(false);
        setItemToCustomize(null);
    };

    const handleSelectProcedural = (item: any) => {
        // Special handling for Hymn - just add generic placeholder
        if (item.id === 'hymn') {
            setItemToCustomize({
                base: {
                    ...item,
                    title: 'Hymn',
                },
                type: 'procedural',
            });
            setCustomTitle('Hymn');
            setCustomDescription('');
            setCustomDuration('3');
            setView('customize');
            return;
        }

        // All other procedural items go to customization
        setItemToCustomize({
            base: item,
            type: 'procedural',
        });
        setCustomTitle(item.name || '');
        setCustomDescription('');
        setCustomDuration(String(item.default_duration_minutes || 5));
        setView('customize');
    };

    const handleSelectSpecialized = (itemType: SpecializedItemType) => {
        // Singleton check (except Speaker)
        if (itemType !== 'speaker' && addedSpecializedTypes.has(itemType)) {
            return;
        }

        setItemToCustomize({
            base: { item_type: itemType },
            type: 'specialized',
        });
        setCustomTitle(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`);
        setCustomDescription('');
        setCustomDuration('10');
        setView('customize');
    };

    const handleSaveCustomItem = async () => {
        if (!customTitle.trim()) return;

        const supabase = createClient();

        // If user wants to save to library AND this is a new procedural item
        if (saveToLibrary && itemToCustomize?.type === 'procedural' && workspaceId) {
            try {
                const { error } = await supabase
                    .from('procedural_item_types')
                    .insert({
                        id: `custom_${Date.now()}`,
                        name: customTitle,
                        description: customDescription || null,
                        default_duration_minutes: parseInt(customDuration) || 5,
                        is_custom: true,
                        is_hymn: false,
                        workspace_id: workspaceId,
                        order_hint: 100,
                    });

                if (error) throw error;

                toast({
                    title: 'Success',
                    description: 'Custom item saved to your library!',
                });

                // Refresh catalog
                if (onCatalogUpdate) {
                    onCatalogUpdate();
                }
            } catch (error) {
                console.error('Error saving custom item:', error);
                toast({
                    title: 'Warning',
                    description: 'Item added but could not save to library.',
                    variant: 'destructive',
                });
            }
        }

        // Add item to template
        if (itemToCustomize?.type === 'procedural') {
            onAddItem({
                item_type: 'procedural',
                procedural_item_type_id: itemToCustomize.base.id === 'hymn' ? 'hymn' : itemToCustomize.base.id,
                title: customTitle,
                description: customDescription,
                duration_minutes: parseInt(customDuration) || 5,
                ...(itemToCustomize.base.id === 'hymn' && {
                    hymn_number: null,
                    hymn_title: null,
                }),
            });
        } else {
            onAddItem({
                item_type: itemToCustomize?.base.item_type,
                title: customTitle,
                description: customDescription,
                duration_minutes: parseInt(customDuration) || 10,
            });
        }

        // Reset and close
        resetCustomizationForm();
        onOpenChange(false);
        setView('categories');
    };

    const renderCategories = () => (
        <div className="space-y-2">
            <CategoryCard
                icon={List}
                title="Procedural Items"
                description="Prayer, hymns, sacrament, and more"
                onClick={() => setView('procedural')}
            />
            <CategoryCard
                icon={MessageSquare}
                title="Specialized Components"
                description="Discussions, announcements, business items, speakers"
                onClick={() => setView('specialized')}
                badge={`${addedSpecializedTypes.size}/3 singleton slots used`}
            />
        </div>
    );

    const renderProcedural = () => (
        <div className="space-y-2">
            <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={() => setView('categories')}
            >
                ← Back to Categories
            </Button>

            <div className="space-y-1">
                {proceduralItems.map((item) => (
                    <ItemButton
                        key={item.id}
                        icon={item.id === 'hymn' ? Music : List}
                        title={item.name}
                        onClick={() => handleSelectProcedural(item)}
                    />
                ))}

                {/* Hymn button */}
                <ItemButton
                    icon={Music}
                    title="Hymn"
                    onClick={() => handleSelectProcedural({ id: 'hymn', name: 'Hymn', default_duration_minutes: 3 })}
                />
            </div>
        </div>
    );

    const renderSpecialized = () => (
        <div className="space-y-2">
            <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={() => setView('categories')}
            >
                ← Back to Categories
            </Button>

            <p className="text-sm text-muted-foreground px-2 py-1">
                Discussion, Announcements, and Business are singleton slots
            </p>

            <div className="space-y-1">
                <ItemButton
                    icon={MessageSquare}
                    title="Discussion"
                    description={getItemTypeDescription('discussion')}
                    onClick={() => handleSelectSpecialized('discussion')}
                    disabled={addedSpecializedTypes.has('discussion')}
                />
                <ItemButton
                    icon={Megaphone}
                    title="Announcements"
                    description={getItemTypeDescription('announcement')}
                    onClick={() => handleSelectSpecialized('announcement')}
                    disabled={addedSpecializedTypes.has('announcement')}
                />
                <ItemButton
                    icon={Briefcase}
                    title="Business Items"
                    description={getItemTypeDescription('business')}
                    onClick={() => handleSelectSpecialized('business')}
                    disabled={addedSpecializedTypes.has('business')}
                />
                <ItemButton
                    icon={User}
                    title="Speaker"
                    description={getItemTypeDescription('speaker')}
                    onClick={() => handleSelectSpecialized('speaker')}
                />
            </div>
        </div>
    );

    const renderCustomize = () => (
        <div className="space-y-4">
            <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={() => {
                    resetCustomizationForm();
                    setView(itemToCustomize?.type === 'procedural' ? 'procedural' : 'specialized');
                }}
            >
                ← Back
            </Button>

            <div>
                <h4 className="font-medium mb-3">Customize Item</h4>
                <div className="space-y-3">
                    <div>
                        <Label htmlFor="custom-title">Name/Title *</Label>
                        <Input
                            id="custom-title"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder="e.g., Opening Prayer, Closing Prayer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Give this item a descriptive name
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="custom-description">Description (optional)</Label>
                        <Textarea
                            id="custom-description"
                            value={customDescription}
                            onChange={(e) => setCustomDescription(e.target.value)}
                            placeholder="Brief description..."
                            rows={2}
                        />
                    </div>

                    <div>
                        <Label htmlFor="custom-duration">Estimated Time (minutes) *</Label>
                        <Input
                            id="custom-duration"
                            type="number"
                            value={customDuration}
                            onChange={(e) => setCustomDuration(e.target.value)}
                            min="1"
                        />
                    </div>

                    {itemToCustomize?.type === 'procedural' && itemToCustomize?.base.id !== 'hymn' && (
                        <div className="flex items-center gap-2 p-3 border rounded-lg bg-accent/50">
                            <input
                                type="checkbox"
                                id="save-library"
                                checked={saveToLibrary}
                                onChange={(e) => setSaveToLibrary(e.target.checked)}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="save-library" className="text-sm cursor-pointer">
                                Save to my library for future use
                            </Label>
                        </div>
                    )}

                    <Button
                        onClick={handleSaveCustomItem}
                        disabled={!customTitle.trim()}
                        className="w-full"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Template
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Item to Template</DialogTitle>
                    <DialogDescription>
                        All items can be customized with a name and duration
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {view === 'categories' && renderCategories()}
                    {view === 'procedural' && renderProcedural()}
                    {view === 'specialized' && renderSpecialized()}
                    {view === 'customize' && renderCustomize()}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Category Card Component (Linktree-style)
function CategoryCard({
    icon: Icon,
    title,
    description,
    onClick,
    badge,
}: {
    icon: any;
    title: string;
    description: string;
    onClick: () => void;
    badge?: string;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full p-4 border rounded-lg hover:bg-accent hover:border-primary transition-colors text-left group"
        >
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">{title}</h3>
                        {badge && (
                            <span className="text-xs bg-secondary px-2 py-1 rounded-full">
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
        </button>
    );
}

// Item Button Component
function ItemButton({
    icon: Icon,
    title,
    description,
    onClick,
    disabled = false,
    showChevron = false,
}: {
    icon: any;
    title: string;
    description?: string;
    onClick: () => void;
    disabled?: boolean;
    showChevron?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'w-full p-3 border rounded-lg text-left transition-colors',
                disabled
                    ? 'opacity-50 cursor-not-allowed bg-muted'
                    : 'hover:bg-accent hover:border-primary'
            )}
        >
            <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                    <p className="text-sm font-medium">{title}</p>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    )}
                </div>
                {showChevron && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                {disabled && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded">Already added</span>
                )}
            </div>
        </button>
    );
}

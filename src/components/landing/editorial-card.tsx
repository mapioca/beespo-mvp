interface EditorialCardProps {
    number: string;
    title: string;
    description: string;
}

export function EditorialCard({
    number,
    title,
    description,
}: EditorialCardProps) {
    return (
        <div className="py-8 md:py-10 px-6 md:px-8">
            <span className="block text-6xl font-light text-neutral-300 leading-none mb-6">
                {number}
            </span>
            <h3 className="text-lg font-semibold tracking-tight mb-3">{title}</h3>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
                {description}
            </p>
        </div>
    );
}

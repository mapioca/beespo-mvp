import Image from "next/image";

// Camera symbol only — use as an icon replacement (e.g. sheet header, dialog title)
export function ZoomIcon({ className }: { className?: string }) {
    return (
        <Image
            src="/logos/zoom-symbol.png"
            alt="Zoom"
            width={32}
            height={32}
            className={className}
            style={{ objectFit: "contain" }}
        />
    );
}

// Camera symbol + "zoom" wordmark side-by-side — use in toolbar/button labels
export function ZoomLogo({ iconClassName, wordmarkClassName }: {
    iconClassName?: string;
    wordmarkClassName?: string;
}) {
    return (
        <>
            <Image
                src="/logos/zoom-symbol.png"
                alt=""
                width={32}
                height={32}
                className={iconClassName}
                style={{ objectFit: "contain" }}
            />
            <Image
                src="/logos/zoom-wordmark.svg"
                alt="Zoom"
                width={228}
                height={52}
                className={wordmarkClassName}
                style={{ objectFit: "contain" }}
            />
        </>
    );
}

// Full Zoom brand image (JPEG) — use in settings / integrations cards
export function ZoomFullLogo({ className }: { className?: string }) {
    return (
        <Image
            src="/logos/zoom-full.jpeg"
            alt="Zoom"
            width={200}
            height={200}
            className={className}
            style={{ objectFit: "cover" }}
        />
    );
}

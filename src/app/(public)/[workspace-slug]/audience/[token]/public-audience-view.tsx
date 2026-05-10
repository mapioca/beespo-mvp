import {
    AudienceProgram,
    type AudienceAnnouncement,
    type AudienceMeeting,
} from "@/components/audience/audience-program";
import {
    formatContentUnitName,
    getContentText,
    normalizeContentLanguage,
    type ContentLanguage,
} from "@/lib/content-language";

type PublicAudienceViewProps = {
    unitName: string;
    meeting: AudienceMeeting | null;
    isoDate: string | null;
    announcements: AudienceAnnouncement[];
    language?: ContentLanguage;
};

export function PublicAudienceView({
    unitName,
    meeting,
    isoDate,
    announcements,
    language,
}: PublicAudienceViewProps) {
    const contentLanguage = normalizeContentLanguage(language ?? meeting?.contentLanguage);
    const text = getContentText(contentLanguage).audience;
    const displayUnitName = formatContentUnitName(unitName, contentLanguage);

    if (!meeting || !isoDate) {
        return (
            <div className="mx-auto flex flex-1 max-w-md flex-col items-center justify-center px-6 py-16 text-center">
                <div className="font-serif text-[15px] italic text-muted-foreground">{displayUnitName}</div>
                <h1 className="mt-4 font-serif text-[24px] tracking-[-0.01em] text-foreground">
                    {text.comingSoonTitle}
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                    {text.comingSoonDescription}
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-3 py-8 sm:px-6 sm:py-12">
            <AudienceProgram
                unitName={unitName}
                isoDate={isoDate}
                meeting={meeting}
                announcements={announcements}
                language={contentLanguage}
            />
        </div>
    );
}

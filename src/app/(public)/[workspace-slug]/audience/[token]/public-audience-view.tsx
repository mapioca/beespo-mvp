import {
    AudienceProgram,
    type AudienceAnnouncement,
    type AudienceMeeting,
} from "@/components/audience/audience-program";

type PublicAudienceViewProps = {
    unitName: string;
    meeting: AudienceMeeting | null;
    isoDate: string | null;
    announcements: AudienceAnnouncement[];
};

export function PublicAudienceView({ unitName, meeting, isoDate, announcements }: PublicAudienceViewProps) {
    if (!meeting || !isoDate) {
        return (
            <div className="mx-auto flex flex-1 max-w-md flex-col items-center justify-center px-6 py-16 text-center">
                <div className="font-serif text-[15px] italic text-muted-foreground">{unitName}</div>
                <h1 className="mt-4 font-serif text-[24px] tracking-[-0.01em] text-foreground">
                    Program coming soon
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                    The next meeting program will appear here once it&rsquo;s published.
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
            />
        </div>
    );
}

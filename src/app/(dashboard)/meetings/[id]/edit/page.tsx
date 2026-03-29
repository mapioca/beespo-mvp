import { redirect } from "next/navigation";

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/meetings/${id}`);
}

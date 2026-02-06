import { RecoveryHub } from "@/components/pathfinder/recovery-hub";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Page Not Found | Beespo",
    description: "The page you are looking for does not exist.",
};

export default function NotFound() {
    return <RecoveryHub />;
}

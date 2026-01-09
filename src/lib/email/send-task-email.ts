export async function sendTaskAssignmentEmail(
    toEmail: string,
    taskTitle: string,
    magicLink: string
) {
    // In a real app, you'd use Resend, SendGrid, etc.
    // For MVP, we'll log it to the console which fulfills the requirement
    // while we wait for an API key.

    console.log("------------------------------------------");
    console.log(`📧 Sending Task Assignment Email to: ${toEmail}`);
    console.log(`📝 Task: ${taskTitle}`);
    console.log(`🔗 Magic Link: ${magicLink}`);
    console.log("------------------------------------------");

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return { success: true };
}

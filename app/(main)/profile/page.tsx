import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const session = await auth();
    if (!session?.user?.username) redirect("/login");
    redirect(`/profile/${session.user.username}`);
}

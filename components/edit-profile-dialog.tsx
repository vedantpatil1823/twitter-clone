"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/actions/user";
import { UploadButton } from "@/lib/uploadthing";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const profileSchema = z.object({
    name: z.string().min(1, "Name is required").max(50),
    bio: z.string().max(160).optional(),
    location: z.string().max(30).optional(),
    website: z.string().url("Invalid URL").optional().or(z.literal("")),
    image: z.string().url("Invalid URL").optional().or(z.literal("")),
    coverImage: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileDialogProps {
    user: {
        name: string | null;
        bio: string | null;
        location: string | null;
        website: string | null;
        image: string | null;
        coverImage: string | null;
    };
    trigger?: React.ReactNode;
}

export function EditProfileDialog({ user, trigger }: EditProfileDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user.name ?? "",
            bio: user.bio ?? "",
            location: user.location ?? "",
            website: user.website ?? "",
            image: user.image ?? "",
            coverImage: user.coverImage ?? "",
        },
    });

    const onSubmit = (data: ProfileFormValues) => {
        startTransition(async () => {
            const formData = new FormData();
            formData.append("name", data.name);
            formData.append("bio", data.bio || "");
            formData.append("location", data.location || "");
            formData.append("website", data.website || "");
            formData.append("image", data.image || "");
            formData.append("coverImage", data.coverImage || "");

            const result = await updateProfile(formData);

            if (result.error) {
                toast.error(result.error);
            } else {
                setOpen(false);
                router.refresh();
                toast.success("Profile updated successfully!");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="rounded-full font-bold">
                        Edit profile
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Images Section */}
                        <div className="space-y-4 border-b border-border pb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Profile Image */}
                                <div className="space-y-2">
                                    <FormLabel>Profile Image</FormLabel>
                                    <div className="flex gap-2 items-center">
                                        <FormField
                                            control={form.control}
                                            name="image"
                                            render={({ field }: { field: any }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input placeholder="Image URL" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="shrink-0">
                                            <UploadButton
                                                endpoint="imageUploader"
                                                onClientUploadComplete={(res) => {
                                                    if (res?.[0]) {
                                                        form.setValue("image", res[0].url);
                                                        toast.success("Image uploaded!");
                                                    }
                                                }}
                                                onUploadError={(error: Error) => {
                                                    toast.error(`ERROR! ${error.message}`);
                                                }}
                                                appearance={{
                                                    button: "bg-primary text-primary-foreground text-xs px-2 py-1 h-9",
                                                    allowedContent: "hidden"
                                                }}
                                                content={{
                                                    button({ ready }) {
                                                        if (ready) return "Upload";
                                                        return "Loading...";
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {form.watch("image") && (
                                        <div className="relative h-20 w-20 rounded-full overflow-hidden border">
                                            <img src={form.watch("image") || ""} alt="Preview" className="object-cover h-full w-full" />
                                        </div>
                                    )}
                                </div>

                                {/* Cover Image */}
                                <div className="space-y-2">
                                    <FormLabel>Cover Image</FormLabel>
                                    <div className="flex gap-2 items-center">
                                        <FormField
                                            control={form.control}
                                            name="coverImage"
                                            render={({ field }: { field: any }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input placeholder="Cover URL" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="shrink-0">
                                            <UploadButton
                                                endpoint="imageUploader"
                                                onClientUploadComplete={(res) => {
                                                    if (res?.[0]) {
                                                        form.setValue("coverImage", res[0].url);
                                                        toast.success("Cover uploaded!");
                                                    }
                                                }}
                                                onUploadError={(error: Error) => {
                                                    toast.error(`ERROR! ${error.message}`);
                                                }}
                                                appearance={{
                                                    button: "bg-primary text-primary-foreground text-xs px-2 py-1 h-9",
                                                    allowedContent: "hidden"
                                                }}
                                                content={{
                                                    button({ ready }) {
                                                        if (ready) return "Upload";
                                                        return "Loading...";
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {form.watch("coverImage") && (
                                        <div className="relative h-20 w-full rounded-md overflow-hidden border">
                                            <img src={form.watch("coverImage") || ""} alt="Preview" className="object-cover h-full w-full" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Your name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel>Bio</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Tell us about yourself"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel>Location</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Where do you live?" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="website"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel>Website</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Add your website" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending} className="rounded-full font-bold px-8">
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

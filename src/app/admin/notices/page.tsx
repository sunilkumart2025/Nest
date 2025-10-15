'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { collection, query, where, getDocs, orderBy, serverTimestamp } from "firebase/firestore";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from 'zod';
import { format } from 'date-fns';

const noticeSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
});

export default function NoticesPage() {
    const { user, firestore } = useFirebase();
    const { toast } = useToast();
    const [hostelId, setHostelId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const form = useForm<z.infer<typeof noticeSchema>>({
        resolver: zodResolver(noticeSchema),
        defaultValues: { title: '', content: '' },
    });

    useEffect(() => {
        if (user && firestore) {
            const hostelsRef = collection(firestore, 'hostels');
            const q = query(hostelsRef, where('adminId', '==', user.uid));
            getDocs(q).then((snapshot) => {
                if (!snapshot.empty) {
                    setHostelId(snapshot.docs[0].id);
                }
            });
        }
    }, [user, firestore]);

    const noticesQuery = useMemoFirebase(
        () => hostelId ? query(collection(firestore, `hostels/${hostelId}/notices`), orderBy('createdAt', 'desc')) : null,
        [hostelId, firestore]
    );
    const { data: notices, isLoading } = useCollection(noticesQuery);

    async function onSubmit(values: z.infer<typeof noticeSchema>) {
        if (!firestore || !hostelId) return;

        const noticesCollection = collection(firestore, `hostels/${hostelId}/notices`);
        addDocumentNonBlocking(noticesCollection, {
            ...values,
            hostelId,
            createdAt: serverTimestamp(),
        });
        
        toast({ title: "Success", description: "Notice posted successfully." });
        form.reset();
        setIsDialogOpen(false);
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="font-headline text-3xl font-bold tracking-tight">
                        Notices & Announcements
                    </h1>
                    <p className="text-muted-foreground">
                        Post updates for all tenures in your hostel.
                    </p>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Post New Notice
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create a New Notice</DialogTitle>
                            <DialogDescription>
                               This notice will be visible to all tenures.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                                <FormField control={form.control} name="title" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Maintenance Alert" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="content" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Content</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Describe the announcement..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <DialogFooter>
                                    <Button type="submit">Post Notice</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </header>

            <div className="space-y-4">
                {notices?.map((notice: any) => (
                    <Card key={notice.id}>
                        <CardHeader className="flex flex-row items-start justify-between">
                           <div>
                             <CardTitle>{notice.title}</CardTitle>
                             <CardDescription>
                                Posted on {notice.createdAt ? format(notice.createdAt.toDate(), 'PPP') : '...'}
                             </CardDescription>
                           </div>
                           <Button variant="ghost" size="icon">
                               <MoreHorizontal className="h-4 w-4" />
                           </Button>
                        </CardHeader>
                        <CardContent>
                           <p className="text-sm text-muted-foreground">{notice.content}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

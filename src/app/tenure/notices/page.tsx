'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useEffect, useState } from "react";
import { format } from 'date-fns';

export default function TenureNoticesPage() {
    const { user, firestore } = useFirebase();
    const [hostelId, setHostelId] = useState<string|null>(null);

    useEffect(() => {
        if (user && firestore) {
            const tenuresRef = collection(firestore, 'tenures');
            const q = query(tenuresRef, where('userId', '==', user.uid));
            getDocs(q).then((snapshot) => {
                if (!snapshot.empty) {
                    setHostelId(snapshot.docs[0].data().hostelId);
                }
            });
        }
    }, [user, firestore]);

    const noticesQuery = useMemoFirebase(() => {
        return hostelId ? query(collection(firestore, `hostels/${hostelId}/notices`), orderBy('createdAt', 'desc')) : null;
    }, [hostelId]);
    const { data: notices, isLoading } = useCollection(noticesQuery);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    Notices & Announcements
                </h1>
                <p className="text-muted-foreground">
                    Important updates from your hostel administration.
                </p>
            </header>

            <div className="space-y-4">
                {notices?.map((notice: any) => (
                    <Card key={notice.id}>
                        <CardHeader>
                           <CardTitle>{notice.title}</CardTitle>
                           <CardDescription>
                             Posted on {notice.createdAt ? format(notice.createdAt.toDate(), 'PPP') : '...'}
                           </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <p className="text-sm text-foreground/80">{notice.content}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
             {notices?.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                    <div className="text-lg font-medium">No Notices Yet</div>
                    <p className="text-sm text-muted-foreground">Check back later for announcements from your admin.</p>
                </div>
             )}
        </div>
    )
}

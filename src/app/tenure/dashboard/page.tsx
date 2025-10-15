'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Wallet, Bell } from 'lucide-react';
import Link from 'next/link';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export default function TenureDashboard() {
  const { user, firestore } = useFirebase();
  const [tenureData, setTenureData] = useState<any>(null);
  const [hostelId, setHostelId] = useState<string | null>(null);

  useEffect(() => {
    if (user && firestore) {
        // We now have a userId on the tenure doc, so we can query by that
        const tenuresRef = collection(firestore, 'tenures');
        const q = query(tenuresRef, where('userId', '==', user.uid));
        getDocs(q).then((snapshot) => {
            if (!snapshot.empty) {
                const tenure = snapshot.docs[0].data();
                setTenureData({ id: snapshot.docs[0].id, ...tenure });
                setHostelId(tenure.hostelId);
            }
        });
    }
  }, [user, firestore]);

  const roomDocRef = useMemoFirebase(() => {
      return hostelId && tenureData?.roomId && firestore ? doc(firestore, `hostels/${hostelId}/rooms/${tenureData.roomId}`) : null
  }, [hostelId, tenureData, firestore]);
  const { data: roomData } = useDoc(roomDocRef);

  const hostelDocRef = useMemoFirebase(() => {
    return hostelId && firestore ? doc(firestore, 'hostels', hostelId) : null
  }, [hostelId, firestore]);
  const { data: hostelData } = useDoc(hostelDocRef);

  const billingQuery = useMemoFirebase(() => {
    return hostelId && tenureData?.id ? query(collection(firestore, `hostels/${hostelId}/billingRecords`), where('tenureId', '==', tenureData.id)) : null;
  }, [hostelId, tenureData, firestore]);
  const { data: billingData } = useCollection(billingQuery);

  const noticesQuery = useMemoFirebase(() => {
    return hostelId ? query(collection(firestore, `hostels/${hostelId}/notices`), orderBy('createdAt', 'desc')) : null;
  }, [hostelId, firestore]);
  const { data: notices } = useCollection(noticesQuery);

  const pendingBill = billingData?.find(b => b.paymentStatus === 'Pending');
  const latestNotices = notices?.slice(0, 2);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Welcome, {tenureData?.name || user?.displayName || 'Tenure'}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s new in your hostel.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Room</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roomData?.roomNumber}</div>
            <p className="text-xs text-muted-foreground">{hostelData?.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rent Status</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
                <span>₹{(pendingBill?.rentAmount + pendingBill?.electricityBill)?.toLocaleString() || '0'}</span>
                <Badge className={pendingBill ? 'bg-orange-500 text-white' : 'bg-green-600/80 text-white'}>{pendingBill ? 'Pending' : 'Paid'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingBill ? `Due by ${pendingBill.dueDate ? format(pendingBill.dueDate.toDate(), 'PPP') : 'N/A'}` : 'All caught up!'}
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notices?.length || 0} Unread</div>
            <p className="text-xs text-muted-foreground">
              Check the notices section for details.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Bills</CardTitle>
            <CardDescription>{pendingBill ? 'You have a pending bill.' : 'You have no pending bills for this month.'}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center p-12">
            {pendingBill ? (
               <>
                <div className="rounded-full bg-orange-100 p-4">
                  <Wallet className="text-orange-600 h-8 w-8" />
                </div>
                <p className="mt-4 font-medium text-lg">Amount Due: ₹{(pendingBill.rentAmount + pendingBill.electricityBill).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Please pay your bill to avoid any late fees.</p>
                <Button asChild className="mt-4">
                    <Link href="/tenure/payments">Pay Now</Link>
                </Button>
               </>
            ) : (
                <>
                 <div className="rounded-full bg-green-100 p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <p className="mt-4 font-medium">All Clear!</p>
                <p className="text-sm text-muted-foreground">Your payments are all up to date. Well done!</p>
                <Button asChild variant="secondary" className="mt-4">
                    <Link href="/tenure/payments">View Payment History</Link>
                </Button>
                </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Notices</CardTitle>
            <CardDescription>Latest announcements from the admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestNotices?.map((notice: any) => (
              <div key={notice.id} className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-1">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{notice.title}</p>
                  <p className="text-sm text-muted-foreground">{notice.content.substring(0, 80)}...</p>
                  <p className="text-xs text-muted-foreground/70">{notice.createdAt ? format(notice.createdAt.toDate(), 'PPP') : '...'}</p>
                </div>
              </div>
            ))}
             <Button asChild variant="outline" className="w-full">
                <Link href="/tenure/notices">View All Notices</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

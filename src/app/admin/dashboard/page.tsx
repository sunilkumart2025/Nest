'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BedDouble, Wallet, Hourglass } from 'lucide-react';
import Link from 'next/link';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const { user, firestore, isUserLoading } = useFirebase();
  const [hostelId, setHostelId] = useState<string | null>(null);

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

  const tenuresQuery = useMemoFirebase(
    () =>
      hostelId && firestore
        ? (collection(firestore, 'hostels', hostelId, 'tenures'))
        : null,
    [hostelId, firestore]
  );
  const { data: tenures, isLoading: tenuresLoading } = useCollection(tenuresQuery);

  const roomsQuery = useMemoFirebase(
    () =>
      hostelId && firestore
        ? (collection(firestore, 'hostels', hostelId, 'rooms'))
        : null,
    [hostelId, firestore]
  );
  const { data: rooms, isLoading: roomsLoading } = useCollection(roomsQuery);

  const billingQuery = useMemoFirebase(
    () =>
      hostelId && firestore
        ? (collection(firestore, 'hostels', hostelId, 'billingRecords'))
        : null,
    [hostelId, firestore]
  );
  const { data: billing, isLoading: billingLoading } = useCollection(billingQuery);

  const isLoading = isUserLoading || tenuresLoading || roomsLoading || billingLoading;

  const totalTenures = tenures?.length ?? 0;
  const occupiedRooms = rooms?.filter((r: any) => r.status === 'Occupied').length ?? 0;
  const availableRooms = rooms?.filter((r: any) => r.status === 'Available').length ?? 0;
  const totalRooms = rooms?.length ?? 0;
  const monthlyEarnings =
    billing
      ?.filter((b: any) => b.paymentStatus === 'Paid')
      .reduce((sum: number, b: any) => sum + (b.rentAmount + b.electricityBill), 0) ?? 0;
  const pendingPayments = billing?.filter((b: any) => b.paymentStatus !== 'Paid') ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your hostel operations.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenures</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{totalTenures}</div>}
            <p className="text-xs text-muted-foreground">+2 this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Occupied vs. Available Rooms
            </CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">
              {occupiedRooms} / {availableRooms}
            </div>}
            <p className="text-xs text-muted-foreground">
              {totalRooms} total rooms
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Earnings (July)
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">
              ₹{monthlyEarnings.toLocaleString()}
            </div>}
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{pendingPayments.length}</div>}
            <p className="text-xs text-muted-foreground">
              Totaling ₹
              {pendingPayments
                .reduce((sum, p: any) => sum + (p.rentAmount + p.electricityBill), 0)
                .toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Payments</CardTitle>
          <CardDescription>
            A list of tenures with outstanding dues for the current month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenure</TableHead>
                <TableHead className="hidden sm:table-cell">Room</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 float-right" /></TableCell>
                </TableRow>
              ))}
              {pendingPayments.map((payment: any) => {
                 const tenure = tenures?.find((t: any) => t.id === payment.tenureId);
                 const room = rooms?.find((r: any) => r.id === tenure?.roomId);

                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="font-medium">{tenure?.name}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {tenure?.email}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {room?.roomNumber}
                    </TableCell>
                    <TableCell>₹{(payment.rentAmount + payment.electricityBill).toLocaleString()}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={payment.paymentStatus === 'Overdue' ? 'destructive' : 'secondary'}>{payment.paymentStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                         <Link href="/admin/billing">View Bill</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Eye } from 'lucide-react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  roomId: z.string().min(1, 'Room is required'),
});

export default function TenuresPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [hostelId, setHostelId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTenure, setEditingTenure] = useState<any | null>(null);
  const [viewingTenure, setViewingTenure] = useState<any | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      roomId: '',
    },
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      roomId: '',
    },
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

  const tenuresQuery = useMemoFirebase(
    () =>
      hostelId && firestore
        ? (collection(firestore, 'hostels', hostelId, 'tenures'))
        : null,
    [hostelId, firestore]
  );
  const { data: tenures, isLoading: tenuresLoading } = useCollection(tenuresQuery);
  
  const roomsQuery = useMemoFirebase(() => hostelId && firestore ? collection(firestore, 'hostels', hostelId, 'rooms') : null, [hostelId, firestore]);
  const { data: rooms, isLoading: roomsLoading } = useCollection(roomsQuery);

  const billingQuery = useMemoFirebase(() => hostelId && firestore ? collection(firestore, 'hostels', hostelId, 'billingRecords') : null, [hostelId, firestore]);
  const { data: billing, isLoading: billingLoading } = useCollection(billingQuery);

  async function onAddSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !hostelId) return;
    
    const registrationNumber = `REG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const tenuresCollection = collection(firestore, 'hostels', hostelId, 'tenures');
    addDocumentNonBlocking(tenuresCollection, {
        ...values,
        hostelId,
        registrationNumber,
    });
    
    toast({ title: 'Success', description: `Tenure pre-registered. Registration number: ${registrationNumber}` });
    form.reset();
    setIsAddDialogOpen(false);
  }
  
  async function onEditSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !editingTenure) return;
    const tenureRef = doc(firestore, 'hostels', editingTenure.hostelId, 'tenures', editingTenure.id);
    updateDocumentNonBlocking(tenureRef, values);

    toast({ title: 'Success', description: 'Tenure details updated.' });
    setEditingTenure(null);
  }

  const handleDeleteTenure = (tenureToDelete: any) => {
    if (!firestore) return;
    const tenureRef = doc(firestore, 'hostels', tenureToDelete.hostelId, 'tenures', tenureToDelete.id);
    deleteDocumentNonBlocking(tenureRef);

    toast({ title: 'Success', description: `${tenureToDelete.name} has been removed.` });
  }

  useEffect(() => {
    if (editingTenure) {
      editForm.reset(editingTenure);
    }
  }, [editingTenure, editForm]);


  const isLoading = tenuresLoading || billingLoading || roomsLoading || isUserLoading;

  const getPaymentStatus = (tenureId: string) => {
    const tenureBills = billing?.filter((b: any) => b.tenureId === tenureId);
    if (!tenureBills || tenureBills.length === 0) return 'Paid'; // Assuming no bills means paid
    if (tenureBills.some((b: any) => b.paymentStatus === 'Overdue')) return 'Overdue';
    if (tenureBills.some((b: any) => b.paymentStatus === 'Pending')) return 'Pending';
    return 'Paid';
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Tenure Management
          </h1>
          <p className="text-muted-foreground">
            View, add, and manage all tenures in your hostel.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Tenure
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Pre-register a New Tenure</DialogTitle>
              <DialogDescription>
                Fill in the details below. A unique registration number will be generated for the tenure.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jane.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+1 234 567 890" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="roomId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms?.map((room: any) => <SelectItem key={room.id} value={room.id}>{room.roomNumber}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit">Generate Registration Number</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All Tenures</CardTitle>
          <CardDescription>
            Total of {tenures?.length ?? 0} tenures currently registered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Registration #</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-sm float-right" /></TableCell>
                </TableRow>
              ))}
              {tenures?.map((tenure: any) => {
                const paymentStatus = getPaymentStatus(tenure.id);
                const room = rooms?.find((r:any) => r.id === tenure.roomId);
                return (
                <TableRow key={tenure.id}>
                  <TableCell className="font-medium">{tenure.name}</TableCell>
                  <TableCell className="font-mono text-xs">{tenure.registrationNumber}</TableCell>
                  <TableCell>{room?.roomNumber}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        paymentStatus === 'Paid'
                          ? 'default'
                          : paymentStatus === 'Pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className={paymentStatus === 'Paid' ? 'bg-green-600/80 text-white' : ''}
                    >
                      {paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingTenure(tenure)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingTenure(tenure)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will permanently remove {tenure.name} from the system. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTenure(tenure)} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       {/* Edit Tenure Dialog */}
      <Dialog open={!!editingTenure} onOpenChange={(open) => !open && setEditingTenure(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Tenure</DialogTitle>
              <DialogDescription>
                Update details for {editingTenure?.name}.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
                <FormField control={editForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="roomId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms?.map((room: any) => <SelectItem key={room.id} value={room.id}>{room.roomNumber}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                   <Button type="button" variant="ghost" onClick={() => setEditingTenure(null)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View Tenure Details Dialog */}
        <Dialog open={!!viewingTenure} onOpenChange={(open) => !open && setViewingTenure(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{viewingTenure?.name}</DialogTitle>
                    <DialogDescription>
                        Tenure Details
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Name</Label>
                        <p className="col-span-3 font-medium">{viewingTenure?.name}</p>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Email</Label>
                        <p className="col-span-3 text-sm text-muted-foreground">{viewingTenure?.email}</p>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Phone</Label>
                        <p className="col-span-3 text-sm text-muted-foreground">{viewingTenure?.phoneNumber || 'Not provided'}</p>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Reg. No.</Label>
                        <p className="col-span-3 font-mono text-sm">{viewingTenure?.registrationNumber}</p>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Room</Label>
                        <p className="col-span-3 font-medium">{rooms?.find(r => r.id === viewingTenure?.roomId)?.roomNumber || 'N/A'}</p>
                    </div>
                </div>
                 <DialogFooter>
                    <Button onClick={() => setViewingTenure(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

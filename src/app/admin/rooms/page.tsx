'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { PlusCircle, Bed, User, MoreVertical, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const formSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  rent: z.coerce.number().positive('Rent must be a positive number'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
});

const editFormSchema = formSchema.extend({
  status: z.enum(['Available', 'Occupied', 'Maintenance']),
});

export default function RoomsPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [hostelId, setHostelId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomNumber: '',
      rent: 0,
      capacity: 1,
    },
  });

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      roomNumber: '',
      rent: 0,
      capacity: 1,
      status: 'Available',
    }
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

  const roomsQuery = useMemoFirebase(
    () =>
      hostelId && firestore
        ? (collection(firestore, 'hostels', hostelId, 'rooms'))
        : null,
    [hostelId, firestore]
  );
  const { data: rooms, isLoading: roomsLoading } = useCollection(roomsQuery);
  
  const tenuresQuery = useMemoFirebase(() => hostelId && firestore ? collection(firestore, 'hostels', hostelId, 'tenures') : null, [hostelId, firestore]);
  const { data: tenures, isLoading: tenuresLoading } = useCollection(tenuresQuery);

  async function onAddSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !hostelId) return;
    
    const roomsCollection = collection(firestore, 'hostels', hostelId, 'rooms');
    addDocumentNonBlocking(roomsCollection, {
        ...values,
        hostelId,
        status: 'Available',
    }, { merge: true });
    
    toast({ title: 'Success', description: 'New room added.' });
    form.reset();
    setIsAddDialogOpen(false);
  }

  async function onEditSubmit(values: z.infer<typeof editFormSchema>) {
    if (!firestore || !editingRoom) return;

    const roomRef = doc(firestore, 'hostels', editingRoom.hostelId, 'rooms', editingRoom.id);
    updateDocumentNonBlocking(roomRef, values);

    toast({ title: 'Success', description: 'Room details updated.'});
    setEditingRoom(null);
  }

  const handleDeleteRoom = (roomToDelete: any) => {
    if (!firestore) return;
    const roomRef = doc(firestore, 'hostels', roomToDelete.hostelId, 'rooms', roomToDelete.id);
    deleteDocumentNonBlocking(roomRef);
    toast({ title: 'Success', description: `Room ${roomToDelete.roomNumber} has been deleted.` });
  };

  useEffect(() => {
    if (editingRoom) {
      editForm.reset(editingRoom);
    }
  }, [editingRoom, editForm]);


  const isLoading = roomsLoading || tenuresLoading || isUserLoading;

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'Occupied':
        return 'border-blue-500 bg-blue-50';
      case 'Available':
        return 'border-green-500 bg-green-50';
      case 'Maintenance':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };
  
  const getStatusDotClasses = (status: string) => {
    switch (status) {
      case 'Occupied':
        return 'bg-blue-500';
      case 'Available':
        return 'bg-green-500';
      case 'Maintenance':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Room Management
          </h1>
          <p className="text-muted-foreground">
            Manage all hostel rooms, occupancy, and rent.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add a New Room</DialogTitle>
              <DialogDescription>
                Enter details for the new room.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="roomNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 303B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Rent</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">Add Room</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {isLoading && Array.from({length: 8}).map((_, i) => (
          <Card key={i}><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent><CardFooter><Skeleton className="h-8 w-full" /></CardFooter></Card>
        ))}
        {rooms?.map((room: any) => {
          const roomTenures = tenures?.filter((t: any) => t.roomId === room.id) || [];
          return (
            <Card key={room.id} className={cn('flex flex-col transition-all hover:shadow-md', getStatusClasses(room.status))}>
              <CardHeader className="flex-row items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center justify-between">
                    <span>Room {room.roomNumber}</span>
                    <Badge variant="outline" className="flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', getStatusDotClasses(room.status))}></span>
                      {room.status}
                    </Badge>
                  </CardTitle>
                   <div className="text-lg font-bold">₹{room.rent.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ month</span></div>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem onClick={() => setEditingRoom(room)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                             </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete Room {room.roomNumber}. This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteRoom(room)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 pt-0">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Bed className="mr-2 h-4 w-4" />
                  <span>{room.capacity}-person sharing</span>
                </div>
                 <div className="flex items-center text-sm text-muted-foreground">
                      <User className="mr-2 h-4 w-4" />
                      <span>{roomTenures.length} / {room.capacity} occupied</span>
                  </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-2 text-sm">
                {roomTenures.map((tenure: any) => (
                  <div key={tenure.id} className="text-xs text-muted-foreground">{tenure.name}</div>
                ))}
              </CardFooter>
            </Card>
          )
        })}
      </div>
      
      {/* Edit Room Dialog */}
      <Dialog open={!!editingRoom} onOpenChange={(open) => !open && setEditingRoom(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Manage Room {editingRoom?.roomNumber}</DialogTitle>
              <DialogDescription>
                Update room details and status.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
                <FormField
                  control={editForm.control}
                  name="roomNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="rent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Rent</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={editForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="Occupied">Occupied</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setEditingRoom(null)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
    </div>
  );
}

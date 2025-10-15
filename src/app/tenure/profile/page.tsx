'use client';

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { useToast } from "@/hooks/use-toast";
import { updatePassword } from "firebase/auth";
import { collection, doc, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


const passwordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});


export default function TenureProfilePage() {
  const { user, firestore, auth } = useFirebase();
  const { toast } = useToast();
  const [tenureId, setTenureId] = useState<string | null>(null);

  useEffect(() => {
    if (user && firestore) {
        const tenuresRef = query(collection(firestore, 'tenures'), where('userId', '==', user.uid));
        getDocs(tenuresRef).then(snapshot => {
            if (!snapshot.empty) {
                setTenureId(snapshot.docs[0].id);
            }
        });
    }
  }, [user, firestore]);

  const tenureDocRef = useMemoFirebase(() => tenureId && firestore ? doc(firestore, 'tenures', tenureId) : null, [tenureId, firestore]);
  const { data: tenureData } = useDoc(tenureDocRef);

  const hostelDocRef = useMemoFirebase(() => tenureData && firestore ? doc(firestore, 'hostels', tenureData.hostelId) : null, [tenureData, firestore]);
  const { data: hostelData } = useDoc(hostelDocRef);

  const roomDocRef = useMemoFirebase(() => tenureData && firestore ? doc(firestore, `hostels/${tenureData.hostelId}/rooms/${tenureData.roomId}`) : null, [tenureData, firestore]);
  const { data: roomData } = useDoc(roomDocRef);

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

  const handlePasswordUpdate = (values: z.infer<typeof passwordSchema>) => {
    if (!user) return;
    updatePassword(user, values.newPassword)
      .then(() => {
        toast({ title: "Success", description: "Password updated." });
        passwordForm.reset();
      })
      .catch((error) => {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">Manage your personal details and password.</p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>These details are managed by your hostel admin.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
           <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Full Name</p>
            <p className="font-semibold">{tenureData?.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="font-semibold">{tenureData?.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Hostel</p>
            <p className="font-semibold">{hostelData?.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Room Number</p>
            <p className="font-semibold">{roomData?.roomNumber}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Registration Number</p>
            <p className="font-mono text-sm font-semibold">{tenureData?.registrationNumber}</p>
          </div>
        </CardContent>
      </Card>
      
       <Form {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)}>
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Choose a new password to secure your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter>
              <Button type="submit">Update Password</Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  )
}

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
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useFirebase, useMemoFirebase } from "@/firebase";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useDoc } from "@/firebase/firestore/use-doc";
import { useToast } from "@/hooks/use-toast";
import { doc, collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { updateEmail, updatePassword } from "firebase/auth";

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const hostelSchema = z.object({
  name: z.string().min(1, "Hostel name is required"),
  location: z.string().min(1, "Address is required"),
});

const paymentSchema = z.object({
  razorpayKeyId: z.string().min(1, "Key ID is required"),
  razorpaySecretKey: z.string().min(1, "Secret Key is required"),
});

export default function SettingsPage() {
  const { user, firestore, auth } = useFirebase();
  const { toast } = useToast();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [hostelId, setHostelId] = useState<string | null>(null);

  const adminDocRef = useMemoFirebase(() => adminId && firestore ? doc(firestore, 'admins', adminId) : null, [adminId, firestore]);
  const { data: adminData } = useDoc(adminDocRef);

  const hostelDocRef = useMemoFirebase(() => hostelId && firestore ? doc(firestore, 'hostels', hostelId) : null, [hostelId, firestore]);
  const { data: hostelData } = useDoc(hostelDocRef);

  const profileForm = useForm<z.infer<typeof profileSchema>>({ 
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', email: '' } 
  });
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({ 
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' } 
  });
  const hostelForm = useForm<z.infer<typeof hostelSchema>>({ 
    resolver: zodResolver(hostelSchema),
    defaultValues: { name: '', location: '' }
  });
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({ 
    resolver: zodResolver(paymentSchema),
    defaultValues: { razorpayKeyId: '', razorpaySecretKey: '' }
  });

  useEffect(() => {
    if (user) {
      setAdminId(user.uid);
    }
  }, [user]);

  useEffect(() => {
    if (adminId && firestore) {
      const hostelsRef = collection(firestore, 'hostels');
      const q = query(hostelsRef, where('adminId', '==', adminId));
      getDocs(q).then((snapshot) => {
        if (!snapshot.empty) {
          setHostelId(snapshot.docs[0].id);
        }
      });
    }
  }, [adminId, firestore]);

  useEffect(() => {
    if (adminData) {
      profileForm.reset({ fullName: adminData.fullName || '', email: adminData.email || '' });
      paymentForm.reset({ razorpayKeyId: adminData.razorpayKeyId || '', razorpaySecretKey: adminData.razorpaySecretKey || '' });
    }
    if (hostelData) {
      hostelForm.reset({ name: hostelData.name || '', location: hostelData.location || '' });
    }
  }, [adminData, hostelData, profileForm, hostelForm, paymentForm]);

  const handleProfileUpdate = (values: z.infer<typeof profileSchema>) => {
    if (!adminDocRef || !user) return;
    if(values.email !== user.email) {
      updateEmail(user, values.email).catch(e => toast({ variant: 'destructive', title: 'Error', description: e.message }));
    }
    updateDocumentNonBlocking(adminDocRef, values);
    toast({ title: "Success", description: "Profile updated." });
  };

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

  const handleHostelUpdate = (values: z.infer<typeof hostelSchema>) => {
    if (!hostelDocRef) return;
    updateDocumentNonBlocking(hostelDocRef, values);
    toast({ title: "Success", description: "Hostel details updated." });
  };

  const handlePaymentUpdate = (values: z.infer<typeof paymentSchema>) => {
    if (!adminDocRef) return;
    updateDocumentNonBlocking(adminDocRef, values);
    toast({ title: "Success", description: "Payment credentials saved." });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and hostel settings.</p>
      </header>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="hostel">Hostel Details</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)}>
              <Card>
                <CardHeader>
                  <CardTitle>Admin Profile</CardTitle>
                  <CardDescription>
                    Update your personal information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={profileForm.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={profileForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
                <CardFooter>
                  <Button type="submit">Save Changes</Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
           <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                    <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
                <CardFooter>
                  <Button type="submit">Update Password</Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="hostel">
          <Form {...hostelForm}>
            <form onSubmit={hostelForm.handleSubmit(handleHostelUpdate)}>
              <Card>
                <CardHeader>
                  <CardTitle>Hostel Details</CardTitle>
                  <CardDescription>
                    Update your hostel&apos;s name and location.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={hostelForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Hostel Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={hostelForm.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
                <CardFooter>
                  <Button type="submit">Save Changes</Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="payment">
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handlePaymentUpdate)}>
              <Card>
                <CardHeader>
                  <CardTitle>Razorpay Integration</CardTitle>
                  <CardDescription>
                    Configure your Razorpay credentials to receive payments directly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={paymentForm.control} name="razorpayKeyId" render={({ field }) => (
                      <FormItem><FormLabel>Razorpay Key ID</FormLabel><FormControl><Input placeholder="rzp_live_..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={paymentForm.control} name="razorpaySecretKey" render={({ field }) => (
                      <FormItem><FormLabel>Razorpay Secret Key</FormLabel><FormControl><Input type="password" placeholder="••••••••••••••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
                <CardFooter>
                  <Button type="submit">Save Credentials</Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc } from 'firebase/firestore';
import { useState } from 'react';

// For this MVP, we'll hardcode the master key. In a real app, this would be validated server-side.
const MASTER_KEY = '12345678';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name is required.' }),
  hostelName: z.string().min(3, { message: 'Hostel name is required.' }),
  address: z.string().min(10, { message: 'Address is required.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  masterKey: z.string().length(8, { message: 'Master Access Key must be 8 digits.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine(data => data.masterKey === MASTER_KEY, {
  message: 'Invalid Master Access Key.',
  path: ['masterKey'],
});

export default function AdminSignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      hostelName: '',
      address: '',
      email: '',
      phone: '',
      masterKey: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Create Admin document
      const adminRef = doc(firestore, 'admins', user.uid);
      setDocumentNonBlocking(adminRef, {
        id: user.uid,
        fullName: values.fullName,
        email: values.email,
        phoneNumber: values.phone,
        // In a real app, these would be collected securely later
        razorpayKeyId: 'YOUR_RAZORPAY_KEY_ID',
        razorpaySecretKey: 'YOUR_RAZORPAY_SECRET_KEY',
      }, { merge: true });

      // Create Hostel document
      const hostelsCollection = collection(firestore, 'hostels');
      await addDocumentNonBlocking(hostelsCollection, {
        name: values.hostelName,
        location: values.address,
        adminId: user.uid,
      });

      toast({
        title: 'Signup Successful',
        description: "Your admin account has been created. Please log in.",
      });
      router.push('/login/admin');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create an Admin Account</CardTitle>
        <CardDescription>
          Fill in the details to register your hostel with Nestify.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="fullName" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="hostelName" render={({ field }) => (
              <FormItem><FormLabel>Hostel Name</FormLabel><FormControl><Input placeholder="Sunshine Hostels" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="sm:col-span-2"><FormLabel>Location / Address</FormLabel><FormControl><Input placeholder="123 Main St, Anytown" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="admin@example.com" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+1 234 567 890" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="masterKey" render={({ field }) => (
              <FormItem className="sm:col-span-2"><FormLabel>Master Access Key</FormLabel><FormControl><Input placeholder="8-digit code" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="********" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="********" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" className="w-full sm:col-span-2" disabled={isLoading}>
              {isLoading ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login/admin" className="text-primary underline hover:no-underline">
            Log in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

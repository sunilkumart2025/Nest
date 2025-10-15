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
import { useState } from 'react';
import { completeTenureSignup } from '@/ai/flows/complete-tenure-signup-flow';


const formSchema = z.object({
  name: z.string().min(2, { message: 'Name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  phoneNumber: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  registrationNumber: z.string().min(6, { message: 'Registration number is required.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function TenureSignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      registrationNumber: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      // Call the single, secure server-side flow to handle the entire process
      await completeTenureSignup({
        registrationNumber: values.registrationNumber,
        email: values.email,
        password: values.password,
        name: values.name,
        phoneNumber: values.phoneNumber,
      });

      toast({
        title: 'Signup Successful',
        description: "Your account has been created. Please log in.",
      });
      router.push('/login/tenure');
    } catch (error: any) {
      // The flow will throw an error with a user-friendly message
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
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create a Tenure Account</CardTitle>
        <CardDescription>
          Use the registration number provided by your hostel admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Jane Smith" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email Address (must match pre-registered email)</FormLabel><FormControl><Input placeholder="tenure@example.com" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phoneNumber" render={({ field }) => (
              <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+1 234 567 890" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="registrationNumber" render={({ field }) => (
              <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input placeholder="Provided by admin" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="********" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="********" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login/tenure" className="text-primary underline hover:no-underline">
            Log in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

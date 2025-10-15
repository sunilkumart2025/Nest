'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Download } from 'lucide-react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, getDocs, query, where, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { createOrder } from '@/ai/flows/create-order-flow';
import { verifyPayment } from '@/ai/flows/verify-payment-flow';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Script from 'next/script';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function TenurePaymentsPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const [tenureId, setTenureId] = useState<string|null>(null);
  const [hostelId, setHostelId] = useState<string|null>(null);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (user && firestore) {
      const tenuresRef = query(collection(firestore, 'tenures'), where('userId', '==', user.uid));
      getDocs(tenuresRef).then(snapshot => {
        if (!snapshot.empty) {
          const tenureDoc = snapshot.docs[0];
          setTenureId(tenureDoc.id);
          setHostelId(tenureDoc.data().hostelId);
        }
      });
    }
  }, [user, firestore]);

  const billingQuery = useMemoFirebase(() => 
    tenureId && hostelId ? query(collection(firestore, `hostels/${hostelId}/billingRecords`), where('tenureId', '==', tenureId)) : null, 
    [tenureId, hostelId, firestore]
  );
  const { data: billingHistory } = useCollection(billingQuery);

  const currentBill = billingHistory?.find(b => b.paymentStatus === 'Pending');
  const paidBills = billingHistory?.filter(b => b.paymentStatus === 'Paid');

  const handlePayment = async () => {
      if (!currentBill || !user || !hostelId || !tenureId || !firestore) return;
      setIsPaying(true);
      
      const totalAmount = currentBill.rentAmount + currentBill.electricityBill;

      try {
          // 1. Get Admin's Razorpay credentials from their hostel
          const hostelRef = doc(firestore, 'hostels', hostelId);
          const hostelSnap = await getDoc(hostelRef);
          const hostelData = hostelSnap.data();

          if (!hostelData?.adminId) throw new Error("Admin for this hostel not found.");
          
          const adminRef = doc(firestore, 'admins', hostelData.adminId);
          const adminSnap = await getDoc(adminRef);
          const adminData = adminSnap.data();

          if (!adminData?.razorpayKeyId || !adminData?.razorpaySecretKey) {
            throw new Error("Admin's payment credentials are not configured.");
          }

          // 2. Create Order on the server
          const order = await createOrder({ 
            amount: totalAmount, 
            currency: 'INR',
            razorpayKeyId: adminData.razorpayKeyId,
            razorpaySecretKey: adminData.razorpaySecretKey,
          });

          if (!order) {
              throw new Error('Could not create payment order.');
          }

          // 3. Open Razorpay Checkout
          const options = {
              key: adminData.razorpayKeyId,
              amount: order.amount,
              currency: order.currency,
              name: "Nestify",
              description: `Bill Payment for ${format(new Date(), 'MMMM yyyy')}`,
              order_id: order.id,
              handler: async function (response: any) {
                  // 4. Verify Payment on the server
                  toast({ title: 'Verifying payment...', description: 'Please wait.' });
                  const verificationData = {
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                      razorpaySecretKey: adminData.razorpaySecretKey,
                  };
                  const result = await verifyPayment(verificationData);

                  if (result.status === 'success') {
                      // 5. Update Firestore records
                      const paymentRef = collection(firestore, `hostels/${hostelId}/payments`);
                      addDocumentNonBlocking(paymentRef, {
                          amount: totalAmount,
                          paymentDate: serverTimestamp(),
                          razorpayPaymentId: response.razorpay_payment_id,
                          tenureId: tenureId,
                          hostelId: hostelId,
                          billingRecordId: currentBill.id,
                      });

                      const billRef = doc(firestore, `hostels/${hostelId}/billingRecords`, currentBill.id);
                      updateDocumentNonBlocking(billRef, {
                          paymentStatus: 'Paid',
                          paymentDate: serverTimestamp(),
                      });
                      
                      toast({ title: 'Payment Successful!', description: 'Your bill has been marked as paid.' });
                  } else {
                      throw new Error('Payment verification failed.');
                  }
              },
              prefill: {
                  name: user.displayName || 'Tenure Name',
                  email: user.email,
              },
              theme: {
                  color: '#5252f2'
              }
          };

          const rzp = new window.Razorpay(options);
          rzp.open();

      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Payment Failed', description: error.message || 'An unexpected error occurred.' });
      } finally {
          setIsPaying(false);
      }
  }


  return (
    <>
    <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
    />
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Payments
        </h1>
        <p className="text-muted-foreground">
          View your bills and manage payments.
        </p>
      </header>

      {currentBill && (
        <Card>
          <CardHeader>
            <CardTitle>Current Bill</CardTitle>
            <CardDescription>
              Please pay on time to avoid late fees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="text-2xl font-bold">₹{currentBill.rentAmount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Electricity Charges</p>
                <p className="text-2xl font-bold">₹{currentBill.electricityBill.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-primary/10 p-4 text-primary">
                <p className="text-sm text-primary/80">Total Amount Due</p>
                <p className="text-2xl font-bold text-primary">₹{(currentBill.rentAmount + currentBill.electricityBill).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button size="lg" className="w-full sm:w-auto" onClick={handlePayment} disabled={isPaying}>
                {isPaying ? 'Processing...' : `Pay ₹${(currentBill.rentAmount + currentBill.electricityBill).toLocaleString()} with Razorpay`}
            </Button>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Your record of all previous transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Payment ID</TableHead>
                <TableHead>Bill Details</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paidBills?.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">{payment.id.substring(0,8)}</TableCell>
                  <TableCell className="font-medium">Monthly Bill</TableCell>
                  <TableCell className="hidden sm:table-cell">{payment.paymentDate ? format(payment.paymentDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="text-right">₹{(payment.rentAmount + payment.electricityBill).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="icon">
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download receipt</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FileDown, MoreHorizontal, PlusCircle, Printer } from 'lucide-react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, serverTimestamp, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Logo } from '@/components/logo';

type BillEntry = {
    tenureId: string;
    tenureName: string;
    roomNumber: string;
    rentShare: number;
    electricityBill: string;
};

type Bill = {
    id: string;
    tenureId: string;
    rentAmount: number;
    electricityBill: number;
    paymentStatus: 'Paid' | 'Pending' | 'Overdue';
    paymentDate: any; 
    [key: string]: any;
};

export default function BillingPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [hostelId, setHostelId] = useState<string | null>(null);
  const [hostelData, setHostelData] = useState<any>(null);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [billEntries, setBillEntries] = useState<BillEntry[]>([]);
  const [viewingInvoice, setViewingInvoice] = useState<Bill | null>(null);

  useEffect(() => {
    if (user && firestore) {
      const hostelsRef = collection(firestore, 'hostels');
      const q = query(hostelsRef, where('adminId', '==', user.uid));
      getDocs(q).then((snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setHostelId(doc.id);
          setHostelData(doc.data());
        }
      });
    }
  }, [user, firestore]);

  const billingQuery = useMemoFirebase(
    () =>
      hostelId && firestore
        ? (collection(firestore, 'hostels', hostelId, 'billingRecords'))
        : null,
    [hostelId, firestore]
  );
  const { data: billing, isLoading: billingLoading } = useCollection(billingQuery);

  const tenuresQuery = useMemoFirebase(
    () =>
      hostelId && firestore
        ? (collection(firestore, 'hostels', hostelId, 'tenures'))
        : null,
    [hostelId, firestore]
  );
  const { data: tenures, isLoading: tenuresLoading } = useCollection(tenuresQuery);
  
  const roomsQuery = useMemoFirebase(
    () => hostelId && firestore ? collection(firestore, 'hostels', hostelId, 'rooms') : null,
    [hostelId, firestore]
  );
  const { data: rooms, isLoading: roomsLoading } = useCollection(roomsQuery);

  const prepareBills = () => {
    if (!tenures || !rooms) return;

    const entries: BillEntry[] = [];
    
    const tenuresByRoom: {[roomId: string]: any[]} = tenures.reduce((acc, tenure) => {
        const { roomId } = tenure;
        if (!acc[roomId]) {
            acc[roomId] = [];
        }
        acc[roomId].push(tenure);
        return acc;
    }, {} as {[roomId: string]: any[]});

    for (const tenure of tenures) {
        const room = rooms.find((r: any) => r.id === tenure.roomId);
        if (room) {
            const occupants = tenuresByRoom[tenure.roomId]?.length || 1;
            const rentShare = room.rent / occupants;

            entries.push({
                tenureId: tenure.id,
                tenureName: tenure.name,
                roomNumber: room.roomNumber,
                rentShare: rentShare,
                electricityBill: '0',
            });
        }
    }

    setBillEntries(entries);
    setIsBillDialogOpen(true);
  }

  const handleBillEntryChange = (index: number, value: string) => {
    const updatedEntries = [...billEntries];
    updatedEntries[index].electricityBill = value;
    setBillEntries(updatedEntries);
  }
  
  const handleGenerateBills = async () => {
    if (!firestore || !hostelId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not generate bills. Missing data.' });
      return;
    }
    toast({ title: 'Generating Bills...', description: 'Please wait.' });

    const batch = writeBatch(firestore);
    
    for (const entry of billEntries) {
        const electricityBill = parseFloat(entry.electricityBill);
        if (isNaN(electricityBill) || electricityBill < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: `Please enter a valid electricity bill for ${entry.tenureName}.` });
            return;
        }
        const newBillRef = doc(collection(firestore, 'hostels', hostelId, 'billingRecords'));
        batch.set(newBillRef, {
            tenureId: entry.tenureId,
            hostelId,
            rentAmount: entry.rentShare,
            electricityBill,
            paymentStatus: 'Pending',
            paymentDate: null,
            createdAt: serverTimestamp(),
        });
    }

    try {
        await batch.commit();
        toast({ title: 'Success', description: 'Monthly bills have been generated successfully.' });
        setIsBillDialogOpen(false);
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: `Failed to generate bills: ${e.message}` });
    }
  };

  const handleMarkAsPaid = async (billId: string) => {
    if (!firestore || !hostelId) return;
    const billRef = doc(firestore, 'hostels', hostelId, 'billingRecords', billId);
    try {
        await updateDoc(billRef, {
            paymentStatus: 'Paid',
            paymentDate: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Bill marked as paid.' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  }

  const handleExport = () => {
    if (!billing || !tenures || !rooms) {
        toast({ variant: 'destructive', title: 'Error', description: 'Data not loaded yet.' });
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = ["Bill ID", "Tenure Name", "Room", "Rent", "Electricity", "Total", "Status", "Payment Date"];
    csvContent += headers.join(",") + "\r\n";

    billing.forEach((bill: any) => {
        const tenure = tenures.find((t: any) => t.id === bill.tenureId);
        const room = rooms.find((r: any) => r.id === tenure?.roomId);
        const total = bill.rentAmount + bill.electricityBill;
        const paymentDate = bill.paymentDate ? format(bill.paymentDate.toDate(), 'yyyy-MM-dd') : 'N/A';

        const row = [
            bill.id.substring(0, 7),
            tenure?.name,
            room?.roomNumber,
            bill.rentAmount,
            bill.electricityBill,
            total,
            bill.paymentStatus,
            paymentDate
        ].join(",");

        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `billing-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleDownloadPdf = () => {
    const invoiceElement = document.getElementById('invoice-content');
    if (invoiceElement && viewingInvoice) {
      toast({ title: 'Generating PDF...', description: 'Please wait a moment.' });
      html2canvas(invoiceElement, { scale: 2, useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'px', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const imgWidth = pdfWidth - 40; // with some padding
        const imgHeight = imgWidth / ratio;
        
        let height = imgHeight;
        let position = 20;

        if (imgHeight > pdfHeight - 40) {
            height = pdfHeight - 40;
        }
        
        pdf.addImage(imgData, 'PNG', 20, position, imgWidth, height);
        pdf.save(`invoice-${viewingInvoice.id.substring(0, 7)}.pdf`);
      }).catch(err => {
        toast({ variant: 'destructive', title: 'Error generating PDF', description: err.message });
      });
    }
  };

  const isLoading = billingLoading || tenuresLoading || roomsLoading || isUserLoading;
  
  const invoiceTenure = viewingInvoice ? tenures?.find(t => t.id === viewingInvoice.tenureId) : null;
  const invoiceRoom = invoiceTenure ? rooms?.find(r => r.id === invoiceTenure.roomId) : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Billing & Payments
          </h1>
          <p className="text-muted-foreground">
            Generate bills and track payment status for all tenures.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button onClick={prepareBills}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Generate Monthly Bills
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Current Billing Cycle</CardTitle>
          <CardDescription>
            Overview of all bills generated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenure</TableHead>
                <TableHead className="hidden sm:table-cell">Room</TableHead>
                <TableHead className="hidden md:table-cell">Rent</TableHead>
                <TableHead className="hidden md:table-cell">Electricity</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({length: 5}).map((_, i) => (
                 <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-sm float-right" /></TableCell>
                </TableRow>
              ))}
              {billing?.map((bill: Bill) => {
                const tenure = tenures?.find((t: any) => t.id === bill.tenureId);
                const room = rooms?.find((r: any) => r.id === tenure?.roomId);
                const total = bill.rentAmount + bill.electricityBill;

                return (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{tenure?.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{room?.roomNumber}</TableCell>
                  <TableCell className="hidden md:table-cell">₹{bill.rentAmount.toLocaleString()}</TableCell>
                  <TableCell className="hidden md:table-cell">₹{bill.electricityBill.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">₹{total.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                       variant={
                        bill.paymentStatus === 'Paid'
                          ? 'default'
                          : bill.paymentStatus === 'Pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className={bill.paymentStatus === 'Paid' ? 'bg-green-600/80 text-white' : ''}
                    >
                      {bill.paymentStatus}
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
                         {bill.paymentStatus === 'Pending' && (
                            <DropdownMenuItem onClick={() => handleMarkAsPaid(bill.id)}>Mark as Paid</DropdownMenuItem>
                         )}
                         {bill.paymentStatus === 'Paid' && (
                             <DropdownMenuItem onClick={() => setViewingInvoice(bill)}>View Invoice</DropdownMenuItem>
                         )}
                         {bill.paymentStatus === 'Pending' && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Edit Bill</DropdownMenuItem>
                            </>
                         )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Bill Generation Dialog */}
      <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generate Monthly Bills</DialogTitle>
            <DialogDescription>
              Rent is split among room occupants. Enter the electricity bill for each tenure.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tenure</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Rent Share</TableHead>
                        <TableHead>Electricity Bill</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {billEntries.map((entry, index) => (
                        <TableRow key={entry.tenureId}>
                            <TableCell>{entry.tenureName}</TableCell>
                            <TableCell>{entry.roomNumber}</TableCell>
                            <TableCell>₹{entry.rentShare.toLocaleString()}</TableCell>
                            <TableCell>
                                <Input 
                                    type="number" 
                                    value={entry.electricityBill} 
                                    onChange={(e) => handleBillEntryChange(index, e.target.value)}
                                    className="w-28"
                                    placeholder="e.g., 500"
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsBillDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateBills}>Confirm & Generate Bills</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Invoice Dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
             <DialogTitle className="sr-only">Invoice</DialogTitle>
             <DialogDescription className="sr-only">Invoice for a payment made by a tenure.</DialogDescription>
          </DialogHeader>
          <div id="invoice-content" className="bg-white text-black p-8">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <Logo className="text-primary"/>
                    <p className="font-semibold text-lg">{hostelData?.name}</p>
                    <p className="text-xs text-gray-600">{hostelData?.location}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold uppercase text-gray-800">Invoice</h2>
                    <p className="text-sm text-gray-500"># {viewingInvoice?.id.substring(0, 7)}</p>
                    <p className="text-sm text-gray-500">Date: {viewingInvoice?.paymentDate ? format(viewingInvoice.paymentDate.toDate(), 'PPP') : 'N/A'}</p>
                </div>
            </div>
            
            <div className="mb-8">
                <p className="text-sm text-gray-600">Bill To:</p>
                <p className="font-semibold">{invoiceTenure?.name}</p>
                <p>{invoiceTenure?.email}</p>
                <p>Room: {invoiceRoom?.roomNumber}</p>
            </div>

            <Table className="mb-8">
                <TableHeader className="bg-gray-100">
                    <TableRow>
                        <TableHead className="text-gray-800">Description</TableHead>
                        <TableHead className="text-right text-gray-800">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>Monthly Rent</TableCell>
                        <TableCell className="text-right">₹{viewingInvoice?.rentAmount.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Electricity Bill</TableCell>
                        <TableCell className="text-right">₹{viewingInvoice?.electricityBill.toLocaleString()}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            <div className="flex justify-end mb-8">
                <div className="w-full max-w-xs">
                    <div className="flex justify-between text-sm">
                        <p className="text-gray-600">Subtotal</p>
                        <p>₹{(viewingInvoice?.rentAmount + viewingInvoice?.electricityBill).toLocaleString()}</p>
                    </div>
                     <div className="border-t my-2"></div>
                    <div className="flex justify-between font-bold text-lg">
                        <p>Total Paid</p>
                        <p>₹{(viewingInvoice?.rentAmount + viewingInvoice?.electricityBill).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="text-center text-sm text-gray-500">
                <p>Thank you for your payment!</p>
                <p>Nestify – Smart Hostel Management</p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleDownloadPdf}>
                <Printer className="mr-2 h-4 w-4" />
                Download PDF
            </Button>
            <Button onClick={() => setViewingInvoice(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

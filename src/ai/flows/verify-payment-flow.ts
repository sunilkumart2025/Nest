'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import crypto from 'crypto';
import { Flow } from 'genkit/flow';

// NOTE: This flow no longer uses firebase-admin.
// It is a placeholder and will need to be adapted to a new auth mechanism if required.

const VerifyPaymentInputSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  razorpaySecretKey: z.string(),
});

const VerifyPaymentOutputSchema = z.object({
  status: z.string(),
});

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentInputSchema>;
export type VerifyPaymentOutput = z.infer<typeof VerifyPaymentOutputSchema>;

const verifyPaymentFlow: Flow<VerifyPaymentInput, VerifyPaymentOutput, any> = ai.defineFlow(
  {
    name: 'verifyPaymentFlow',
    inputSchema: VerifyPaymentInputSchema,
    outputSchema: VerifyPaymentOutputSchema,
  },
  async (input) => {
    if (!input.razorpaySecretKey) {
      throw new Error('Razorpay secret key is not provided.');
    }

    const body = input.razorpay_order_id + '|' + input.razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', input.razorpaySecretKey)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === input.razorpay_signature) {
      return { status: 'success' };
    } else {
      return { status: 'failure' };
    }
  }
);

export async function verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
  return verifyPaymentFlow(input, {});
}

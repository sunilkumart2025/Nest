'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Razorpay from 'razorpay';
import { Flow } from 'genkit/flow';

// NOTE: This flow no longer uses firebase-admin.
// It is a placeholder and will need to be adapted to a new auth mechanism if required.

const CreateOrderInputSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  razorpayKeyId: z.string(),
  razorpaySecretKey: z.string(),
});

const CreateOrderOutputSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;
export type CreateOrderOutput = z.infer<typeof CreateOrderOutputSchema>;

const createOrderFlow: Flow<CreateOrderInput, CreateOrderOutput, any> = ai.defineFlow(
  {
    name: 'createOrderFlow',
    inputSchema: CreateOrderInputSchema,
    outputSchema: CreateOrderOutputSchema,
  },
  async (input) => {
    if (!input.razorpayKeyId || !input.razorpaySecretKey) {
      throw new Error('Razorpay credentials are not provided.');
    }

    const razorpay = new Razorpay({
      key_id: input.razorpayKeyId,
      key_secret: input.razorpaySecretKey,
    });

    const options = {
      amount: input.amount * 100, // Amount in paise
      currency: input.currency,
      receipt: `receipt_order_${new Date().getTime()}`,
    };

    try {
      const order = await razorpay.orders.create(options);
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (error: any) {
      console.error('Razorpay order creation failed:', error);
      throw new Error('Failed to create Razorpay order.');
    }
  }
);

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
  return createOrderFlow(input, {});
}

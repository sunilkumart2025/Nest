'use server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const CompleteTenureSignupInputSchema = z.object({
  registrationNumber: z.string(),
  email: z.string().email(),
  password: z.string(),
  name: z.string(),
  phoneNumber: z.string(),
});

const CompleteTenureSignupOutputSchema = z.object({
  status: z.string(),
  message: z.string(),
  uid: z.string(),
});

export type CompleteTenureSignupInput = z.infer<
  typeof CompleteTenureSignupInputSchema
>;
export type CompleteTenureSignupOutput = z.infer<
  typeof CompleteTenureSignupOutputSchema
>;

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  if (!serviceAccount) {
    console.log('Service account not found, Admin SDK calls might fail if not in an emulated or pre-configured environment.');
    initializeApp();
  } else {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
}

const db = getFirestore();
const auth = getAuth();

export const completeTenureSignup = ai.defineFlow(
  {
    name: 'completeTenureSignupFlow',
    inputSchema: CompleteTenureSignupInputSchema,
    outputSchema: CompleteTenureSignupOutputSchema,
  },
  async (input) => {
    try {
      // 1. Find the tenure document using the registration number in a collection group query.
      const tenuresRef = db.collectionGroup('tenures');
      const q = tenuresRef
        .where('registrationNumber', '==', input.registrationNumber)
        .where('email', '==', input.email);
        
      const querySnapshot = await q.get();

      if (querySnapshot.empty) {
        throw new Error(
          'Invalid registration number or email. Please contact your hostel admin.'
        );
      }

      const tenureDoc = querySnapshot.docs[0];
      const tenureData = tenureDoc.data();

      if (tenureData.userId) {
        throw new Error(
          'This registration number has already been claimed by another account.'
        );
      }

      // 2. Create the Firebase Auth user if validation passes
      const userRecord = await auth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.name,
      });
      const userId = userRecord.uid;


      // 3. Update the tenure documents with the new user's ID and details in a batch.
      const batch = db.batch();
      const updateData = {
        userId: userId,
        name: input.name,
        phoneNumber: input.phoneNumber,
        updatedAt: new Date(),
      };
      
      // Update the document in the `/hostels/{hostelId}/tenures/{tenureId}` subcollection
      batch.update(tenureDoc.ref, updateData);

      // Create a document in the root `/tenures` collection for easy lookup
      const rootTenureRef = db.collection('tenures').doc(tenureDoc.id);
      batch.set(rootTenureRef, {
        ...tenureData,
        ...updateData
      });

      await batch.commit();

      return {
        status: 'success',
        message: 'Account created and linked successfully.',
        uid: userId,
      };
    } catch (error: any) {
      console.error("Error in completeTenureSignup flow: ", error);
       // Customize error message for known error codes
      if (error.code === 'auth/email-already-exists') {
        throw new Error('This email address is already in use by another account.');
      }
      // Re-throw other errors with a meaningful message
      throw new Error(error.message || 'An internal server error occurred.');
    }
  }
);

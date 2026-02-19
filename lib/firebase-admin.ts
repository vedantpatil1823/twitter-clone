import "server-only";
import admin from "firebase-admin";

const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

if (!admin.apps.length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined;

    console.log("Initializing Firebase Admin...");
    console.log("Project ID:", projectId);
    console.log("Client Email:", clientEmail);
    console.log("Private Key Length:", privateKey?.length);

    if (!projectId || !clientEmail || !privateKey) {
        console.error("Missing Firebase Admin Environment Variables!");
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
        console.log("Firebase Admin Initialized Successfully");
    } catch (error) {
        console.error("Failed to initialize Firebase Admin:", error);
    }
}

export const adminAuth = admin.auth();

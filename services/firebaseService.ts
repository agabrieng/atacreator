

// Fix: Switched to Firebase v8/compat API to resolve module export errors.
// The errors suggest that the installed Firebase version doesn't match the v9 modular syntax used previously.
// The compat library provides the familiar v8 API surface while using the v9 SDK under the hood.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import type { AtaData } from '../types';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWy3FXVAdnHBQMvsZ0IEV-vOI2ad729w",
  authDomain: "atacreator-79583.firebaseapp.com",
  projectId: "atacreator-79583",
  storageBucket: "atacreator-79583.appspot.com",
  messagingSenderId: "202196913223",
  appId: "1:202196913223:web:1e716de3d93aeace4af562",
  measurementId: "G-7H0QDPT0FD"
};


// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
export const db = firebase.firestore();

const atasCollectionRef = db.collection("atas");

/**
 * Saves or updates an AtaData object in the 'atas' collection in Firestore.
 * If the object has an 'id', it updates the existing document. Otherwise, it creates a new one.
 * @param ataData The meeting minutes data to save.
 * @returns The ID of the saved/updated document.
 */
export const saveAtaToFirestore = async (ataData: AtaData): Promise<string> => {
    try {
        const { id, ...dataToSave } = ataData;
        
        // Clean up pauta items to ensure they match the current data structure
        if (dataToSave.pauta) {
            dataToSave.pauta = dataToSave.pauta.map(item => {
                const { prazo, ...restOfItem } = item; // Remove the top-level 'prazo'
                return restOfItem;
            });
        }

        if (id) {
            // If ID exists, update the document
            const docRef = atasCollectionRef.doc(id);
            await docRef.set(dataToSave);
            console.log("Document updated with ID: ", id);
            return id;
        } else {
            // Otherwise, create a new document
            const docRef = await atasCollectionRef.add(dataToSave);
            console.log("Document written with ID: ", docRef.id);
            return docRef.id;
        }
    } catch (e) {
        console.error("Error saving document: ", e);
        throw new Error("Failed to save data to Firestore.");
    }
};

/**
 * Loads all documents from the 'atas' collection in Firestore.
 * @returns A promise that resolves to an array of AtaData objects, each including its Firestore document ID.
 */
export const loadAtasFromFirestore = async (): Promise<AtaData[]> => {
    try {
        const querySnapshot = await atasCollectionRef.get();
        const atas: AtaData[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data() as any; // Cast to any to handle migration

            // On-the-fly migration for old data structure
            if (data.pauta && data.pauta.length > 0 && data.pauta[0].responsaveis && typeof data.pauta[0].responsaveis[0] === 'string') {
                data.pauta = data.pauta.map((item: any) => ({
                    ...item,
                    responsaveis: item.responsaveis.map((resp: string) => ({
                        id: `${Date.now()}-${Math.random()}-${resp}`,
                        responsavel: resp,
                        prazo: item.prazo || null // Assign the single prazo to each responsible
                    }))
                }));
            }

            atas.push({
                id: doc.id,
                ...(data as Omit<AtaData, 'id'>)
            });
        });
        return atas;
    } catch (e) {
        console.error("Error getting documents: ", e);
        throw new Error("Failed to load data from Firestore.");
    }
};

/**
 * Deletes a document from the 'atas' collection in Firestore.
 * @param id The ID of the document to delete.
 */
export const deleteAtaFromFirestore = async (id: string): Promise<void> => {
    try {
        if (!id) throw new Error("Document ID is required for deletion.");
        const docRef = atasCollectionRef.doc(id);
        await docRef.delete();
        console.log("Document with ID deleted: ", id);
    } catch (e) {
        console.error("Error deleting document: ", e);
        throw new Error("Failed to delete data from Firestore.");
    }
};

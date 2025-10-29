
import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    doc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy 
} from "firebase/firestore";
import type { AtaData, Empreendimento } from '../types';

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
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const atasCollectionRef = collection(db, "atas");
const empreendimentosCollectionRef = collection(db, "empreendimentos");

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
            const docRef = doc(atasCollectionRef, id);
            await setDoc(docRef, dataToSave);
            console.log("Document updated with ID: ", id);
            return id;
        } else {
            // Otherwise, create a new document
            const docRef = await addDoc(atasCollectionRef, dataToSave);
            console.log("Document written with ID: ", docRef.id);
            return docRef.id;
        }
    } catch (e) {
        console.error("Error saving document: ", e);
        throw e;
    }
};

/**
 * Loads all documents from the 'atas' collection in Firestore.
 * @returns A promise that resolves to an array of AtaData objects, each including its Firestore document ID.
 */
export const loadAtasFromFirestore = async (): Promise<AtaData[]> => {
    try {
        const querySnapshot = await getDocs(atasCollectionRef);
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
        throw e;
    }
};

/**
 * Deletes a document from the 'atas' collection in Firestore.
 * @param id The ID of the document to delete.
 */
export const deleteAtaFromFirestore = async (id: string): Promise<void> => {
    try {
        if (!id) throw new Error("Document ID is required for deletion.");
        const docRef = doc(atasCollectionRef, id);
        await deleteDoc(docRef);
        console.log("Document with ID deleted: ", id);
    } catch (e) {
        console.error("Error deleting document: ", e);
        throw e;
    }
};

/**
 * Loads all documents from the 'empreendimentos' collection in Firestore.
 * @returns A promise that resolves to an array of Empreendimento objects.
 */
export const getEmpreendimentos = async (): Promise<Empreendimento[]> => {
    try {
        const q = query(empreendimentosCollectionRef, orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            contrato: doc.data().contrato || '',
        }));
    } catch (e) {
        console.error("Error getting empreendimentos: ", e);
        throw e;
    }
};

/**
 * Adds a new empreendimento to Firestore.
 * @param name The name of the new empreendimento.
 * @param contrato The contract associated with the empreendimento.
 * @returns The ID of the newly created document.
 */
export const addEmpreendimento = async (name: string, contrato: string): Promise<string> => {
    try {
        const docRef = await addDoc(empreendimentosCollectionRef, { name, contrato });
        return docRef.id;
    } catch (e) {
        console.error("Error adding empreendimento: ", e);
        throw e;
    }
};

/**
 * Updates an existing empreendimento in Firestore.
 * @param id The ID of the document to update.
 * @param name The new name for the empreendimento.
 * @param contrato The new contract for the empreendimento.
 */
export const updateEmpreendimento = async (id: string, name: string, contrato: string): Promise<void> => {
    try {
        const docRef = doc(empreendimentosCollectionRef, id);
        await updateDoc(docRef, { name, contrato });
    } catch (e) {
        console.error("Error updating empreendimento: ", e);
        throw e;
    }
};

/**
 * Deletes an empreendimento from Firestore.
 * @param id The ID of the document to delete.
 */
export const deleteEmpreendimento = async (id: string): Promise<void> => {
    try {
        const docRef = doc(empreendimentosCollectionRef, id);
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Error deleting empreendimento: ", e);
        throw e;
    }
};
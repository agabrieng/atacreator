import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    orderBy 
} from "firebase/firestore";
import type { AtaData, Empreendimento } from '../types';

// As credenciais da conta de serviço não devem ser usadas no cliente.
// O SDK da Web usa este objeto de configuração, que é seguro para expor.
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "atacreator-79583.firebaseapp.com",
  projectId: "atacreator-79583",
  storageBucket: "atacreator-79583.appspot.com",
  messagingSenderId: "591942023537",
  appId: "1:591942023537:web:8625d506a74a4ed8310e53"
};

console.warn(
    "Atenção: A configuração do Firebase está usando a variável de ambiente API_KEY, que também é usada pela API do Gemini. " +
    "A chave de API da Web do Firebase geralmente é diferente da chave secreta da API do Gemini. " +
    "Verifique se o uso compartilhado está correto para a sua configuração."
);


// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const empreendimentosCollectionRef = collection(db, 'empreendimentos');
const atasCollectionRef = collection(db, 'atas');

// --- Empreendimentos (Projetos) ---

export const getEmpreendimentos = async (): Promise<Empreendimento[]> => {
  try {
    const q = query(empreendimentosCollectionRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Empreendimento));
  } catch (error) {
    console.error("Erro ao obter empreendimentos do Firebase: ", error);
    throw new Error("Falha ao carregar empreendimentos do Firebase.");
  }
};

export const addEmpreendimento = async (name: string, contrato: string): Promise<string> => {
  try {
    const docRef = await addDoc(empreendimentosCollectionRef, { name, contrato });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao adicionar empreendimento ao Firebase: ", error);
    throw new Error("Falha ao adicionar empreendimento no Firebase.");
  }
};

export const updateEmpreendimento = async (id: string, name: string, contrato: string): Promise<void> => {
  try {
    const empreendimentoDoc = doc(db, 'empreendimentos', id);
    await updateDoc(empreendimentoDoc, { name, contrato });
  } catch (error) {
    console.error("Erro ao atualizar empreendimento no Firebase: ", error);
    throw new Error("Falha ao atualizar empreendimento no Firebase.");
  }
};

export const deleteEmpreendimento = async (id: string): Promise<void> => {
  try {
    const empreendimentoDoc = doc(db, 'empreendimentos', id);
    await deleteDoc(empreendimentoDoc);
  } catch (error) {
    console.error("Erro ao excluir empreendimento do Firebase: ", error);
    throw new Error("Falha ao excluir empreendimento do Firebase.");
  }
};


// --- Atas (Atas de Reunião) ---

export const saveAtaToFirebase = async (ataData: AtaData): Promise<string> => {
  try {
    const { id, ...dataToSave } = ataData;
    if (id) {
      // Atualiza documento existente
      const ataDoc = doc(db, 'atas', id);
      await updateDoc(ataDoc, dataToSave);
      return id;
    } else {
      // Cria novo documento
      const docRef = await addDoc(atasCollectionRef, dataToSave);
      return docRef.id;
    }
  } catch (error) {
    console.error("Erro ao salvar ata no Firebase: ", error);
    throw new Error("Falha ao salvar a ata no Firebase.");
  }
};


export const loadAtasFromFirebase = async (): Promise<AtaData[]> => {
    try {
        // Query simples; a ordenação pode ser adicionada se um campo de data/hora for incluído nos dados.
        const querySnapshot = await getDocs(atasCollectionRef);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AtaData));
    } catch (error) {
        console.error("Erro ao carregar atas do Firebase: ", error);
        throw new Error("Falha ao carregar atas do Firebase. Verifique suas regras de segurança do Firestore.");
    }
};

export const deleteAtaFromFirebase = async (id: string): Promise<void> => {
    try {
        if (!id) throw new Error("O ID do documento é necessário para a exclusão.");
        const ataDoc = doc(db, 'atas', id);
        await deleteDoc(ataDoc);
    } catch (error) {
        console.error("Erro ao excluir ata do Firebase: ", error);
        throw new Error("Falha ao excluir a ata do Firebase.");
    }
};
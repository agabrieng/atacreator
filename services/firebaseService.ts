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
    orderBy,
    where, 
} from "firebase/firestore";
import type { AtaData, Empreendimento, Webhook, Projetista, Projeto, SavedConversation } from '../types';

// As credenciais da conta de serviço não devem ser usadas no cliente.
// O SDK da Web usa este objeto de configuração, que é seguro para expor.
const firebaseConfig = {
  apiKey: process.env.API_KEY, // UTILIZA A CHAVE DE API PRINCIPAL FORNECIDA PELO AMBIENTE.
  authDomain: "atacreator-79583.firebaseapp.com",
  projectId: "atacreator-79583",
  storageBucket: "atacreator-79583.appspot.com",
  messagingSenderId: "591942023537",
  appId: "1:591942023537:web:8625d506a74a4ed8310e53"
};

// Adiciona uma verificação para garantir que a chave da API do Firebase esteja presente.
if (!firebaseConfig.apiKey) {
  throw new Error("A chave de API (API_KEY) não foi encontrada no ambiente. Verifique se a variável de ambiente está configurada, pois ela é necessária tanto para o Gemini quanto para o Firebase.");
}

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const handleFirebaseError = (error: any, context: string): Error => {
  console.error(`Erro no Firebase ao ${context}: `, error);
  // Retorna a mensagem de erro original para ser exibida na UI
  return new Error(`Erro ao ${context}: ${error.message || 'Ocorreu um erro desconhecido.'}`);
};


const empreendimentosCollectionRef = collection(db, 'empreendimentos');
const atasCollectionRef = collection(db, 'atas');
const webhooksCollectionRef = collection(db, 'webhooks');
const projetistasCollectionRef = collection(db, 'projetistas');
const projetosCollectionRef = collection(db, 'projetos');
const chatHistoryCollectionRef = collection(db, 'ai_chat_history');


// --- Empreendimentos (Projetos) ---

export const getEmpreendimentos = async (): Promise<Empreendimento[]> => {
  try {
    const q = query(empreendimentosCollectionRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Empreendimento));
  } catch (error) {
    throw handleFirebaseError(error, "obter empreendimentos");
  }
};

export const addEmpreendimento = async (data: Omit<Empreendimento, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(empreendimentosCollectionRef, data);
    return docRef.id;
  } catch (error) {
    throw handleFirebaseError(error, "adicionar empreendimento");
  }
};

export const updateEmpreendimento = async (id: string, data: Partial<Omit<Empreendimento, 'id'>>): Promise<void> => {
  try {
    const empreendimentoDoc = doc(db, 'empreendimentos', id);
    await updateDoc(empreendimentoDoc, data);
  } catch (error) {
    throw handleFirebaseError(error, "atualizar empreendimento");
  }
};

export const deleteEmpreendimento = async (id: string): Promise<void> => {
  try {
    const empreendimentoDoc = doc(db, 'empreendimentos', id);
    await deleteDoc(empreendimentoDoc);
  } catch (error) {
    throw handleFirebaseError(error, "excluir empreendimento");
  }
};

// --- Projetistas (Design Companies) ---

export const getProjetistas = async (): Promise<Projetista[]> => {
    try {
        const q = query(projetistasCollectionRef, orderBy('name'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Projetista));
    } catch (error) {
        throw handleFirebaseError(error, "obter empresas projetistas");
    }
};

export const addProjetista = async (name: string, logo: string | null): Promise<string> => {
    try {
        const docRef = await addDoc(projetistasCollectionRef, { name, logo });
        return docRef.id;
    } catch (error) {
        throw handleFirebaseError(error, "adicionar empresa projetista");
    }
};

export const updateProjetista = async (id: string, name: string, logo: string | null): Promise<void> => {
    try {
        const projetistaDoc = doc(db, 'projetistas', id);
        await updateDoc(projetistaDoc, { name, logo });
    } catch (error) {
        throw handleFirebaseError(error, "atualizar empresa projetista");
    }
};

export const deleteProjetista = async (id: string): Promise<void> => {
  try {
    // Delete all projects associated with this projetista first
    const projetosQuery = query(projetosCollectionRef, where('projetistaId', '==', id));
    const projetosSnapshot = await getDocs(projetosQuery);
    
    const deletePromises: Promise<void>[] = [];
    projetosSnapshot.forEach((document) => {
        deletePromises.push(deleteDoc(document.ref));
    });
    
    await Promise.all(deletePromises);

    // Then delete the projetista itself
    const projetistaDoc = doc(db, 'projetistas', id);
    await deleteDoc(projetistaDoc);
  } catch (error) {
    throw handleFirebaseError(error, "excluir empresa projetista e seus projetos");
  }
};


// --- Projetos (Deliverables) ---

export const getProjetos = async (): Promise<Projeto[]> => {
    try {
        const querySnapshot = await getDocs(projetosCollectionRef);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Projeto));
    } catch (error) {
        throw handleFirebaseError(error, "obter projetos");
    }
};

export const addProjeto = async (projetoData: Omit<Projeto, 'id'>): Promise<string> => {
    try {
        const docRef = await addDoc(projetosCollectionRef, projetoData);
        return docRef.id;
    } catch (error) {
        throw handleFirebaseError(error, "adicionar projeto");
    }
};

export const updateProjeto = async (id: string, dataToUpdate: Partial<Omit<Projeto, 'id'>>): Promise<void> => {
    try {
        const projetoDoc = doc(db, 'projetos', id);
        await updateDoc(projetoDoc, dataToUpdate);
    } catch (error) {
        throw handleFirebaseError(error, "atualizar projeto");
    }
};

export const deleteProjeto = async (id: string): Promise<void> => {
    try {
        const projetoDoc = doc(db, 'projetos', id);
        await deleteDoc(projetoDoc);
    } catch (error) {
        throw handleFirebaseError(error, "excluir projeto");
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
    throw handleFirebaseError(error, "salvar ata");
  }
};


export const loadAtasFromFirebase = async (): Promise<AtaData[]> => {
    try {
        // Query simples; a ordenação pode ser adicionada se um campo de data/hora for incluído nos dados.
        const querySnapshot = await getDocs(atasCollectionRef);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AtaData));
    } catch (error) {
        throw handleFirebaseError(error, "carregar atas");
    }
};

export const deleteAtaFromFirebase = async (id: string): Promise<void> => {
    try {
        if (!id) throw new Error("O ID do documento é necessário para a exclusão.");
        const ataDoc = doc(db, 'atas', id);
        await deleteDoc(ataDoc);
    } catch (error) {
        throw handleFirebaseError(error, "excluir ata");
    }
};

// --- Webhooks ---

export const getWebhooks = async (): Promise<Webhook[]> => {
  try {
    const q = query(webhooksCollectionRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Webhook));
  } catch (error) {
    throw handleFirebaseError(error, "obter webhooks");
  }
};

export const addWebhook = async (name: string, url: string): Promise<string> => {
  try {
    const docRef = await addDoc(webhooksCollectionRef, { name, url });
    return docRef.id;
  } catch (error) {
    throw handleFirebaseError(error, "adicionar webhook");
  }
};

export const updateWebhook = async (id: string, name: string, url: string): Promise<void> => {
  try {
    const webhookDoc = doc(db, 'webhooks', id);
    await updateDoc(webhookDoc, { name, url });
  } catch (error) {
    throw handleFirebaseError(error, "atualizar webhook");
  }
};

export const deleteWebhook = async (id: string): Promise<void> => {
  try {
    const webhookDoc = doc(db, 'webhooks', id);
    await deleteDoc(webhookDoc);
  } catch (error) {
    throw handleFirebaseError(error, "excluir webhook");
  }
};

// --- AI Chat History ---

export const getChatHistory = async (): Promise<SavedConversation[]> => {
  try {
    const q = query(chatHistoryCollectionRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedConversation));
  } catch (error) {
    throw handleFirebaseError(error, "obter histórico do chat");
  }
};

export const saveChatConversation = async (conversation: Omit<SavedConversation, 'id'> & { id?: string }): Promise<string> => {
  try {
    const { id, ...dataToSave } = conversation;
    if (id) {
      const convoDoc = doc(db, 'ai_chat_history', id);
      await updateDoc(convoDoc, dataToSave);
      return id;
    } else {
      const docRef = await addDoc(chatHistoryCollectionRef, dataToSave);
      return docRef.id;
    }
  } catch (error) {
    throw handleFirebaseError(error, "salvar conversa do chat");
  }
};

export const updateChatConversationName = async (id: string, newName: string): Promise<void> => {
    try {
        const convoDoc = doc(db, 'ai_chat_history', id);
        await updateDoc(convoDoc, { name: newName });
    } catch (error) {
        throw handleFirebaseError(error, "renomear conversa do chat");
    }
};

export const deleteChatConversation = async (id: string): Promise<void> => {
  try {
    if (!id) throw new Error("O ID da conversa é necessário para a exclusão.");
    const convoDoc = doc(db, 'ai_chat_history', id);
    await deleteDoc(convoDoc);
  } catch (error) {
    throw handleFirebaseError(error, "excluir conversa do chat");
  }
};
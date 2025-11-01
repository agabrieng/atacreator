import type { AtaData, Empreendimento } from '../types';

const ATAS_KEY = 'atas-data';
const EMPREENDIMENTOS_KEY = 'empreendimentos-data';

// Helper to generate simple unique IDs
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- Empreendimentos (Projects) ---

export const getEmpreendimentos = async (): Promise<Empreendimento[]> => {
    try {
        const data = localStorage.getItem(EMPREENDIMENTOS_KEY);
        const empreendimentos: Empreendimento[] = data ? JSON.parse(data) : [];
        // Ensure sorting like the original service
        empreendimentos.sort((a, b) => a.name.localeCompare(b.name));
        return empreendimentos;
    } catch (e) {
        console.error("Error getting empreendimentos from localStorage: ", e);
        return [];
    }
};

export const addEmpreendimento = async (name: string, contrato: string): Promise<string> => {
    const empreendimentos = await getEmpreendimentos();
    const newId = generateId();
    const newEmpreendimento: Empreendimento = { id: newId, name, contrato };
    empreendimentos.push(newEmpreendimento);
    localStorage.setItem(EMPREENDIMENTOS_KEY, JSON.stringify(empreendimentos));
    return newId;
};

export const updateEmpreendimento = async (id: string, name: string, contrato: string): Promise<void> => {
    let empreendimentos = await getEmpreendimentos();
    const index = empreendimentos.findIndex(e => e.id === id);
    if (index !== -1) {
        empreendimentos[index] = { id, name, contrato };
        localStorage.setItem(EMPREENDIMENTOS_KEY, JSON.stringify(empreendimentos));
    } else {
        throw new Error("Empreendimento not found for update.");
    }
};

export const deleteEmpreendimento = async (id: string): Promise<void> => {
    let empreendimentos = await getEmpreendimentos();
    const updatedEmpreendimentos = empreendimentos.filter(e => e.id !== id);
    localStorage.setItem(EMPREENDIMENTOS_KEY, JSON.stringify(updatedEmpreendimentos));
};

// --- Atas (Meeting Minutes) ---

export const saveAtaToLocalStorage = async (ataData: AtaData): Promise<string> => {
    const atas = await loadAtasFromLocalStorage();
    const { id, ...dataToSave } = ataData;
    let docId = id;

    if (docId) { // Update
        const index = atas.findIndex(a => a.id === docId);
        if (index !== -1) {
            atas[index] = { ...dataToSave, id: docId };
        } else {
             // If not found, treat as new but preserve ID if possible
            atas.push({ ...dataToSave, id: docId });
        }
    } else { // Create
        docId = generateId();
        atas.push({ ...dataToSave, id: docId });
    }
    
    localStorage.setItem(ATAS_KEY, JSON.stringify(atas));
    return docId;
};

export const loadAtasFromLocalStorage = async (): Promise<AtaData[]> => {
    try {
        const data = localStorage.getItem(ATAS_KEY);
        // We don't need the on-the-fly migration anymore
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Error getting atas from localStorage: ", e);
        return [];
    }
};

export const deleteAtaFromLocalStorage = async (id: string): Promise<void> => {
    let atas = await loadAtasFromLocalStorage();
    if (!id) throw new Error("Document ID is required for deletion.");
    const updatedAtas = atas.filter(a => a.id !== id);
    localStorage.setItem(ATAS_KEY, JSON.stringify(updatedAtas));
};

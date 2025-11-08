import type { IbgeState, IbgeCity } from '../types';

const IBGE_API_BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

/**
 * Fetches the list of Brazilian states from the IBGE API.
 * @returns A promise that resolves to an array of state objects, sorted by name.
 */
export const getStates = async (): Promise<{ sigla: string; nome: string }[]> => {
    try {
        const response = await fetch(`${IBGE_API_BASE_URL}/estados`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data: IbgeState[] = await response.json();
        // Sort by state name alphabetically
        data.sort((a, b) => a.nome.localeCompare(b.nome));
        return data.map(({ sigla, nome }) => ({ sigla, nome }));
    } catch (error) {
        console.error("Error fetching states from IBGE API:", error);
        throw new Error("Não foi possível carregar a lista de estados.");
    }
};

/**
 * Fetches the list of cities for a given state abbreviation (UF) from the IBGE API.
 * @param uf The state abbreviation (e.g., 'SC').
 * @returns A promise that resolves to an array of city names, sorted alphabetically.
 */
export const getCitiesByState = async (uf: string): Promise<string[]> => {
    if (!uf) return [];
    try {
        const response = await fetch(`${IBGE_API_BASE_URL}/estados/${uf}/municipios`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data: IbgeCity[] = await response.json();
        // Sort by city name alphabetically and return just the names
        return data.map(city => city.nome).sort((a, b) => a.localeCompare(b));
    } catch (error) {
        console.error(`Error fetching cities for state ${uf} from IBGE API:`, error);
        throw new Error(`Não foi possível carregar a lista de cidades para ${uf}.`);
    }
};
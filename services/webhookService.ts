
/**
 * Sends a POST request with an Adaptive Card payload to a specified Microsoft Teams webhook URL.
 * @param url The webhook URL to send the request to.
 * @param cardPayload The Adaptive Card JSON object.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export const sendToTeamsWebhook = async (url: string, cardPayload: object): Promise<{ success: boolean; message: string }> => {
    try {
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors', // Bypasses browser CORS restrictions for "fire and forget" requests.
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cardPayload),
        });

        // With 'no-cors' mode, we cannot read the response from the server.
        // We assume the request was successful if it doesn't throw a network error.
        // The user should verify in the Teams channel.
        return { success: true, message: 'Solicitação enviada. Verifique o canal do Teams para confirmação.' };

    } catch (error: any) {
        console.error('Failed to send webhook:', error);
        // This will now primarily catch network-level errors (e.g., offline), not CORS errors.
        return { success: false, message: `Falha na requisição: ${error.message}` };
    }
};
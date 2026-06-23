import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Data, mimeType } = req.body;
    
    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: 'No receipt file provided.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const receiptSchema = {
      type: Type.OBJECT,
      properties: {
        merchantName: { type: Type.STRING },
        merchantAddress: { type: Type.STRING },
        merchantPhone: { type: Type.STRING },
        transactionDate: { type: Type.STRING },
        transactionTime: { type: Type.STRING },
        receiptNumber: { type: Type.STRING },
        subtotal: { type: Type.NUMBER },
        taxAmount: { type: Type.NUMBER },
        serviceCharge: { type: Type.NUMBER },
        discountAmount: { type: Type.NUMBER },
        totalAmount: { type: Type.NUMBER },
        paymentMethod: { type: Type.STRING },
        currency: { type: Type.STRING },
        uncertainFields: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: "List of field names the AI is uncertain about. e.g. ['merchantName', 'totalAmount']"
        },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unitPrice: { type: Type.NUMBER },
              totalPrice: { type: Type.NUMBER }
            }
          }
        }
      }
    };

    let response;
    let retries = 4;
    let delay = 1500;
    let currentModel = 'gemini-2.5-flash';
    
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: currentModel,
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Extract information from this receipt carefully. Pay attention to dates, totals, taxes, and line items. Provide null for fields you cannot reliably extract. Be extremely accurate.' },
                { inlineData: { data: base64Data, mimeType } }
              ]
            }
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: receiptSchema
          }
        });
        break; // success
      } catch (e: any) {
        console.error(`Attempt with ${currentModel} failed. Retries left: ${retries - 1}`, e.message);
        if (retries === 1) throw e;
        
        if (e.message?.includes('503') || e.message?.includes('429') || e.status === 503 || e.status === 429) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
          retries--;
        } else {
          throw e; // if it's not a rate limit or server error, don't retry
        }
      }
    }

    if (!response || !response.text) {
      throw new Error('Gemini API returned empty response.');
    }
    
    const extractedData = JSON.parse(response.text);
    return res.status(200).json({ success: true, data: extractedData });
    
  } catch (error: any) {
    console.error('Extraction error:', error);
    
    let errorMessage = 'Error processing receipt';
    if (error && error.message) {
      errorMessage = error.message;
      
      try {
        const match = errorMessage.match(/\{.*\}/s);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.error && parsed.error.message) {
            errorMessage = parsed.error.message;
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      if (errorMessage.includes('429')) {
        errorMessage = 'API Quota Exceeded/Rate Limited: Please try again in a moment or check your API plan.';
      } else if (errorMessage.includes('503') || errorMessage.includes('high demand')) {
        errorMessage = 'The AI model is currently experiencing high demand. Please try again in a few moments.';
      } else if (errorMessage.length > 200) {
        errorMessage = errorMessage.substring(0, 200) + '...';
      }
    }
    
    return res.status(500).json({ error: errorMessage });
  }
}

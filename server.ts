import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Extract receipt route
  app.post('/api/extract', async (req, res) => {
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
      res.json({ success: true, data: extractedData });
      
    } catch (error: any) {
      console.error('Extraction error:', error);
      
      let errorMessage = 'Error processing receipt';
      if (error && error.message) {
        errorMessage = error.message;
        
        // Try to parse if it's a JSON string from Google API or contains one
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
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

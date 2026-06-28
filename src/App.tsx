import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, FileText, Download, Loader2, FileCheck, FileOutput, X, AlertCircle, LogOut } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ReceiptDocument, ReceiptItem } from './types';
import { ReceiptEditor, cn } from './ReceiptEditor';
import { Auth } from './Auth';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [receipts, setReceipts] = useState<ReceiptDocument[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setReceipts([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const onDrop = useCallback(async (acceptedFiles: any[]) => {
    const newDocs: ReceiptDocument[] = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'idle'
    }));

    setReceipts(prev => [...newDocs, ...prev]);

    // Process each document
    for (const doc of newDocs) {
      processReceipt(doc.id, doc.file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    }
  } as any);

  const processReceipt = async (id: string, file: File) => {
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, status: 'processing' } : r));

    try {
      const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = error => reject(error);
      });

      const base64Data = await toBase64(file);
      const mimeType = file.type;

      let response;
      let retries = 3;
      let delay = 2000;
      let textError = '';
      
      while (retries > 0) {
        try {
          response = await fetch('/api/extract', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ base64Data, mimeType }),
          });

          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            // It's a JSON response, we can break out of the retry loop
            break;
          } else {
            textError = await response.text();
            // If it's HTML, it means the server is restarting or proxy returned 502/503
            if (textError.toLowerCase().includes('<!doctype html>') || textError.toLowerCase().includes('<html')) {
              throw new Error('Server HTML response');
            } else {
              // Some other generic error, break and handle it below
              break;
            }
          }
        } catch (err: any) {
          if (err.message === 'Server HTML response' || err.message.includes('fetch')) {
            // It was an HTML response or a network failure (server unreachable). Let's retry.
            retries--;
            if (retries === 0) {
              if (err.message === 'Server HTML response') {
                throw new Error('Server is starting up or restarting. Please wait a few moments and try again.');
              }
              throw err; 
            }
            await new Promise(r => setTimeout(r, delay));
            delay *= 1.5;
          } else {
            throw err;
          }
        }
      }

      if (!response) {
         throw new Error('Failed to connect to the server.');
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to extract data');
        }

        // Add UUIDs to items for editor stable rendering
        const itemsWithIds = (result.data.items || []).map((item: any) => ({
          ...item,
          id: crypto.randomUUID(),
          quantity: item.quantity ?? null,
          unitPrice: item.unitPrice ?? null,
          totalPrice: item.totalPrice ?? null,
        }));

        setReceipts(prev => prev.map(r => r.id === id ? { 
          ...r, 
          status: 'success', 
          data: { ...result.data, items: itemsWithIds } 
        } : r));
      } else {
        if (!textError) {
           textError = await response.text();
        }
        throw new Error(`Server error: received non-JSON response from /api/extract (status: ${response.status}). Response: ${textError.substring(0, 150)}`);
      }

    } catch (error: any) {
      console.error(error);
      setReceipts(prev => prev.map(r => r.id === id ? { ...r, status: 'error', error: error.message } : r));
    }
  };

  const removeReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const updateReceipt = (updated: ReceiptDocument) => {
    setReceipts(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const successfulReceipts = receipts.filter(r => r.status === 'success' && r.data);
      if (successfulReceipts.length === 0) return;

      const rows: any[] = [];
      successfulReceipts.forEach(r => {
        const d = r.data!;
        const baseRow = {
          'Receipt No': d.receiptNumber || 'N/A',
          'Date': d.transactionDate || '',
          'Time': d.transactionTime || '',
          'Merchant': d.merchantName || '',
          'Address': d.merchantAddress || '',
          'Phone': d.merchantPhone || '',
          'Payment Method': d.paymentMethod || '',
          'Currency': d.currency || '',
          'Subtotal': d.subtotal ?? '',
          'Tax': d.taxAmount ?? '',
          'Service Charge': d.serviceCharge ?? '',
          'Discount': d.discountAmount ?? '',
          'Total Amount': d.totalAmount ?? '',
        };

        if (d.items && d.items.length > 0) {
          d.items.forEach(item => {
            rows.push({
              ...baseRow,
              'Item Name': item.name || '',
              'Qty': item.quantity ?? '',
              'Unit Price': item.unitPrice ?? '',
              'Line Total': item.totalPrice ?? '',
            });
          });
        } else {
          rows.push({
            ...baseRow,
            'Item Name': '',
            'Qty': '',
            'Unit Price': '',
            'Line Total': '',
          });
        }
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Extracted Receipts");
      XLSX.writeFile(wb, "AI_Extracted_Receipts.xlsx");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadTemplate = () => {
    const rows = [{
      'Receipt No': 'REC-12345',
      'Date': '2023-10-25',
      'Time': '14:30',
      'Merchant': 'Example Store Inc',
      'Address': '123 Main St, City',
      'Phone': '555-0199',
      'Payment Method': 'Credit Card',
      'Currency': 'USD',
      'Subtotal': 45.00,
      'Tax': 3.60,
      'Service Charge': 0,
      'Discount': 0,
      'Total Amount': 48.60,
      'Item Name': 'Office Supplies',
      'Qty': 1,
      'Unit Price': 45.00,
      'Line Total': 45.00,
    }];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Receipt_Template.xlsx");
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-slate-900 flex flex-col">
      <nav className="h-16 border-b border-slate-200 bg-white/70 backdrop-blur-md flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm sticky top-0 z-10 w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <span className="font-bold text-lg md:text-xl tracking-tight uppercase">AI Receipt <span className="text-blue-600">Converter</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-xs font-medium text-slate-500 mr-2">{session.user.email}</span>
          <button 
            onClick={downloadTemplate}
            className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors hidden sm:block"
          >
            Sample Template
          </button>
          <div className="hidden sm:block h-4 w-[1px] bg-slate-200"></div>
          <button 
            onClick={exportToExcel}
            disabled={isExporting || receipts.filter(r => r.status === 'success').length === 0}
            className="bg-green-600 text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export to Excel'}</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-200"></div>
          <button
            onClick={handleSignOut}
            className="text-slate-500 hover:text-slate-800 transition-colors p-2"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <main className="flex-grow p-4 md:p-8 max-w-5xl mx-auto w-full flex flex-col gap-6">

        {/* Dropzone */}
        <div 
          {...getRootProps()} 
          className={cn(
            "relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-gradient-to-b from-white to-slate-50 transition-all cursor-pointer group shadow-sm",
            isDragActive ? "border-blue-400 bg-blue-50/50" : "border-slate-200 hover:border-blue-400"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileUp className={cn("w-7 h-7", isDragActive ? "text-blue-600" : "text-blue-500")} />
          </div>
          <h3 className="font-bold text-slate-800 mb-1">
            {isDragActive ? "Drop receipt here" : "Drop receipts here"}
          </h3>
          <p className="text-xs text-slate-500">
            PDF, JPG, PNG up to 10MB. Batch upload supported.
          </p>
        </div>

        {/* Receipts List */}
        {receipts.length > 0 && (
          <div className="flex-grow bg-[#F9FAFB] flex flex-col space-y-6">
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Batch Queue ({receipts.length})</span>
              {receipts.some(r => r.status === 'processing') && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded-full uppercase">Processing</span>
              )}
            </div>
            
            <div className="space-y-6">
              {receipts.map(receipt => (
                <div key={receipt.id} className="flex flex-col xl:flex-row gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Left sidebar: File Preview & Status */}
                  <div className="w-full xl:w-72 flex-shrink-0 flex flex-col gap-4">
                    <div className="relative aspect-[3/4] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden group">
                      {receipt.file.type.startsWith('image/') ? (
                        <img 
                          src={receipt.previewUrl} 
                          alt="Receipt Preview" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <FileOutput className="w-16 h-16 mb-2 opacity-40" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">PDF Document</span>
                        </div>
                      )}
                      <button 
                        onClick={() => removeReceipt(receipt.id)}
                        className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-red-500 hover:text-white text-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md shadow-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-medium">
                      {receipt.status === 'processing' && (
                        <>
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                          <span className="text-blue-700">Extracting data...</span>
                        </>
                      )}
                      {receipt.status === 'success' && (
                        <>
                          <FileCheck className="w-4 h-4 text-green-600" />
                          <span className="text-green-700">Extraction Complete</span>
                        </>
                      )}
                      {receipt.status === 'error' && (
                        <>
                          <X className="w-4 h-4 text-red-600" />
                          <span className="text-red-600 truncate flex-1" title={receipt.error}>
                            Failed: {receipt.error}
                          </span>
                        </>
                      )}
                      {receipt.status === 'idle' && (
                        <span className="text-slate-500">Waiting in queue...</span>
                      )}
                    </div>
                  </div>

                  {/* Right side: Editor */}
                  <div className="flex-1 min-w-0">
                    {receipt.status === 'processing' && (
                      <div className="h-full min-h-[300px] flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-3xl bg-slate-50 text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500/50" />
                        <p className="text-sm font-medium">Analyzing receipt via Google Gemini...</p>
                      </div>
                    )}
                    {receipt.status === 'error' && (
                      <div className="h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-red-200 rounded-3xl bg-red-50/50 text-red-500 p-6 text-center overflow-hidden">
                        <AlertCircle className="w-10 h-10 mb-4 opacity-50 text-red-400 shrink-0" />
                        <p className="font-bold mb-2 text-slate-800">Extraction Failed</p>
                        <div className="text-xs font-medium opacity-80 break-words whitespace-pre-wrap max-w-full overflow-y-auto max-h-48 px-4">
                          {receipt.error}
                        </div>
                      </div>
                    )}
                    {receipt.status === 'success' && (
                      <ReceiptEditor receipt={receipt} onChange={updateReceipt} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      <footer className="h-12 border-t border-slate-200 bg-white flex items-center justify-between px-8 text-[10px] font-medium text-slate-400 shrink-0 mt-auto">
        <div>Powered by Google Gemini</div>
        <div>Secure Session</div>
      </footer>
    </div>
  );
}

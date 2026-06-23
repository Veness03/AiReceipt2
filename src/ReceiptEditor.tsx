import React from 'react';
import { Minus, Plus, Trash2, AlertCircle } from 'lucide-react';
import { ReceiptDocument, ReceiptItem } from './types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  receipt: ReceiptDocument;
  onChange: (updated: ReceiptDocument) => void;
}

export function ReceiptEditor({ receipt, onChange }: Props) {
  if (!receipt.data) return null;
  const data = receipt.data;

  const updateField = (field: keyof Omit<typeof data, 'items' | 'uncertainFields'>, value: string | null) => {
    onChange({
      ...receipt,
      data: { ...data, [field]: value || null }
    });
  };

  const updateItem = (itemId: string, field: keyof ReceiptItem, value: any) => {
    onChange({
      ...receipt,
      data: {
        ...data,
        items: data.items.map(item => item.id === itemId ? { ...item, [field]: value } : item)
      }
    });
  };

  const addItem = () => {
    onChange({
      ...receipt,
      data: {
        ...data,
        items: [...data.items, { id: crypto.randomUUID(), name: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
      }
    });
  };

  const removeItem = (itemId: string) => {
    onChange({
      ...receipt,
      data: {
        ...data,
        items: data.items.filter(item => item.id !== itemId)
      }
    });
  };

  const isUncertain = (fieldName: string) => {
    return data.uncertainFields?.includes(fieldName);
  };

  const InputField = ({ label, field, type = "text" }: { label: string, field: keyof typeof data, type?: string }) => {
    const uncertain = isUncertain(field as string);
    const val = data[field as keyof typeof data] as unknown as string | number | null;
    return (
      <div className="flex flex-col space-y-1 w-full">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center justify-between mb-1">
          <span>{label}</span>
        </label>
        <div className="relative">
          <input
            type={type}
            value={val ?? ''}
            onChange={(e) => updateField(field as any, type === 'number' ? parseFloat(e.target.value) || null : e.target.value)}
            className={cn(
              "p-2 rounded text-sm w-full font-bold transition-all outline-none",
              uncertain 
                ? "bg-amber-50 text-amber-900 border border-amber-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-400" 
                : "bg-slate-50/80 text-slate-800 border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
            )}
            placeholder="-"
          />
          {uncertain && <AlertCircle className="w-3.5 h-3.5 text-amber-500 absolute right-2 top-2.5 pointer-events-none" title="Low AI confidence" />}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-end bg-gradient-to-r from-white to-slate-50 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
            Active Extraction
            {data.uncertainFields?.length > 0 && (
              <span className="text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 normal-case tracking-normal">
                <AlertCircle className="w-3 h-3" /> Please verify highlights
              </span>
            )}
          </span>
          <h2 className="text-2xl font-bold text-slate-800 truncate max-w-[300px] md:max-w-md">{data.merchantName || 'Unknown Merchant'}</h2>
          <p className="text-xs text-slate-500">
            {data.transactionDate || ''} {data.transactionTime ? `• ${data.transactionTime}` : ''}
          </p>
        </div>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
             <span className="italic text-blue-500">Merchant Info</span>
             <div className="flex-grow h-[1px] bg-slate-100"></div>
          </h4>
          <InputField label="Merchant Name" field="merchantName" />
          <InputField label="Merchant Address" field="merchantAddress" />
          <InputField label="Merchant Phone" field="merchantPhone" />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Date" field="transactionDate" />
            <InputField label="Time" field="transactionTime" />
          </div>
          <InputField label="Receipt Number" field="receiptNumber" />
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
             <span className="italic text-blue-500">Payment Details</span>
             <div className="flex-grow h-[1px] bg-slate-100"></div>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Payment Method" field="paymentMethod" />
            <InputField label="Currency" field="currency" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Subtotal" field="subtotal" type="number" />
            <InputField label="Tax" field="taxAmount" type="number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Service Charge" field="serviceCharge" type="number" />
            <InputField label="Discount" field="discountAmount" type="number" />
          </div>
          <InputField label="Total Amount" field="totalAmount" type="number" />
        </div>
      </div>

      <div className="p-6 border-t border-slate-100">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <span className="italic text-blue-500">Line Items</span>
          <div className="flex-grow h-[1px] bg-slate-100"></div>
          <button 
            onClick={addItem}
            className="text-xs font-bold uppercase text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {data.items.length === 0 ? (
          <div className="text-xs text-slate-400 italic py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No items detected.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <tr className="h-10">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 w-20">Qty</th>
                  <th className="pb-2 w-24">Price</th>
                  <th className="pb-2 w-24">Total</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 font-medium">
                {data.items.map((item, idx) => (
                  <tr key={item.id} className="h-14 border-b border-slate-50 group hover:bg-slate-50/50">
                    <td className="pr-2 py-2">
                      <input 
                        type="text" 
                        value={item.name || ''} 
                        onChange={e => updateItem(item.id, 'name', e.target.value)}
                        className="w-full bg-slate-50/80 border border-transparent rounded p-2 font-bold text-slate-800 hover:border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-300 outline-none transition-all"
                        placeholder="Item name"
                      />
                    </td>
                    <td className="pr-2 py-2">
                      <input 
                        type="number" 
                        value={item.quantity ?? ''} 
                        onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || null)}
                        className="w-full bg-slate-50/80 border border-transparent rounded p-2 text-slate-800 hover:border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-300 outline-none transition-all"
                        placeholder="-"
                      />
                    </td>
                    <td className="pr-2 py-2">
                      <input 
                        type="number" 
                        value={item.unitPrice ?? ''} 
                        onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || null)}
                        className="w-full bg-slate-50/80 border border-transparent rounded p-2 text-slate-800 hover:border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-300 outline-none transition-all"
                        placeholder="-"
                      />
                    </td>
                    <td className="pr-2 py-2">
                      <input 
                        type="number" 
                        value={item.totalPrice ?? ''} 
                        onChange={e => updateItem(item.id, 'totalPrice', parseFloat(e.target.value) || null)}
                        className="w-full bg-slate-50/80 border border-transparent rounded p-2 font-bold text-slate-900 hover:border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-300 outline-none transition-all"
                        placeholder="-"
                      />
                    </td>
                    <td className="py-2 text-center text-slate-400">
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="hover:text-red-500 p-1.5 rounded-md transition-colors hover:bg-red-50 opacity-0 group-hover:opacity-100"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {data.uncertainFields?.length > 0 && (
         <div className="p-4 border-t border-slate-100 bg-amber-50/30 flex items-center justify-between mt-auto shrink-0">
           <div className="flex items-center gap-2">
             <AlertCircle className="w-4 h-4 text-amber-500" />
             <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Uncertain values highlighted in yellow. Please verify before exporting.</span>
           </div>
         </div>
      )}
    </div>
  );
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
}

export interface ExtractedData {
  merchantName: string | null;
  merchantAddress: string | null;
  merchantPhone: string | null;
  transactionDate: string | null;
  transactionTime: string | null;
  receiptNumber: string | null;
  subtotal: string | null;
  taxAmount: string | null;
  serviceCharge: string | null;
  discountAmount: string | null;
  totalAmount: string | null;
  paymentMethod: string | null;
  currency: string | null;
  uncertainFields: string[];
  items: any[];
}

export type ReceiptStatus = 'idle' | 'processing' | 'success' | 'error';

export interface ReceiptDocument {
  id: string;
  file: File;
  previewUrl: string;
  status: ReceiptStatus;
  data?: Omit<ExtractedData, 'items'> & { items: ReceiptItem[] };
  error?: string;
}

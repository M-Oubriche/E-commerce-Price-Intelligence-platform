export type OfferStatus = 'ACTIVE' | 'EXPIRED' | 'REDEEMED' | 'CANCELLED';

export interface IOffer {
  id: string;
  productId: string;
  sellerId: string;
  price: number;
  quantity: number;
  minQuantity: number;
  status: OfferStatus;
  validUntil: string; // ISO Date
  createdAt: string; // ISO Date
}

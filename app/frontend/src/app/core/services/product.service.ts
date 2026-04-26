import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IProduct } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private products: IProduct[] = [
    {
      productId: 'p1',
      productName: 'NVIDIA GeForce RTX 4090 Founders Edition',
      brand: 'NVIDIA',
      category: 'Gaming',
      subcategory: 'Graphics Cards',
      modelNumber: 'NV-4090-FE',
      platform: 'Amazon',
      platformProductId: 'B0BG9ZXYG7',
      productUrl: 'https://amazon.com/dp/B0BG9ZXYG7',
      imageUrl: 'assets/images/rtx4090.jpg',
      isActive: true,
      firstSeenAt: '2024-01-01T00:00:00Z',
      lastSeenAt: new Date().toISOString()
    },
    {
      productId: 'p2',
      productName: 'Apple MacBook Pro 14-inch (M3 Max, 2023)',
      brand: 'Apple',
      category: 'Laptops',
      subcategory: 'Professional Laptops',
      modelNumber: 'MBP-M3-MAX-14',
      platform: 'BestBuy',
      platformProductId: '6565186',
      productUrl: 'https://bestbuy.com/site/6565186.p',
      imageUrl: 'assets/images/macbook.jpg',
      isActive: true,
      firstSeenAt: '2024-01-05T00:00:00Z',
      lastSeenAt: new Date().toISOString()
    },
    {
      productId: 'p3',
      productName: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
      brand: 'Sony',
      category: 'Audio',
      subcategory: 'Noise-cancelling headphones',
      modelNumber: 'WH1000XM5/B',
      platform: 'Walmart',
      platformProductId: '12345678',
      productUrl: 'https://walmart.com/ip/12345678',
      imageUrl: 'assets/images/sony-xm5.jpg',
      isActive: true,
      firstSeenAt: '2024-02-10T00:00:00Z',
      lastSeenAt: new Date().toISOString()
    }
  ];

  getProducts(): Observable<IProduct[]> {
    return of(this.products);
  }

  getProductById(id: string): Observable<IProduct | undefined> {
    return of(this.products.find(p => p.productId === id));
  }

  searchProducts(query: string): Observable<IProduct[]> {
    const q = query.toLowerCase();
    return of(this.products.filter(p => 
      p.productName.toLowerCase().includes(q) || 
      p.brand.toLowerCase().includes(q) ||
      p.modelNumber.toLowerCase().includes(q)
    ));
  }
}

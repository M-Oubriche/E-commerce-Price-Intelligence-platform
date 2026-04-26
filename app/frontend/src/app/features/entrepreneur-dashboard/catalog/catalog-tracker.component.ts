import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Router, RouterModule } from '@angular/router';
import { PLATFORM_PRODUCT_LIBRARY } from '../../../core/constants/product-library';

interface CatalogItem {
  id: string; name: string; category: string; image: string;
  yourPrice: number; lowestComp: number; margin: number; status: 'healthy' | 'risk' | 'critical';
}

@Component({
  selector: 'app-catalog-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, RouterModule],
  template: `
    <div class="catalog-page" [@pageEnter]>
      
      <!-- ── PAGE HEADER & CONTROLS ── -->
      <div class="page-top">
        <div class="pt-left">
          <h1 class="page-title">Catalog Tracker</h1>
          <p class="page-sub">Monitor your product pricing against market competitors in real-time.</p>
        </div>
        <div class="pt-right">
          <button class="btn btn-primary" (click)="openAddModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Product
          </button>
        </div>
      </div>

      <div class="filters-row">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" [(ngModel)]="searchQuery" (input)="showMainSearchDropdown = true" placeholder="Search by product name...">
          
          <!-- Main Search Autocomplete -->
          <div class="suggestion-dropdown" *ngIf="showMainSearchDropdown && mainSearchSuggestions.length > 0">
            <div class="suggestion-item" *ngFor="let item of mainSearchSuggestions" (click)="searchQuery = item.name; showMainSearchDropdown = false">
              <img [src]="item.image" class="s-img">
              <div class="s-info">
                <span class="s-name">{{ item.name }}</span>
                <span class="s-cat">{{ item.category }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="filter-group">
          <select [(ngModel)]="categoryFilter" class="filter-select">
            <option value="all">All Categories</option>
            <option value="Audio">Audio</option>
            <option value="Phones">Phones</option>
            <option value="Périphériques">Périphériques</option>
            <option value="Laptops">Laptops</option>
          </select>
          <select [(ngModel)]="statusFilter" class="filter-select">
            <option value="all">All Statuses</option>
            <option value="healthy">Healthy Margin</option>
            <option value="risk">At Risk</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <!-- ── MAIN CATALOG TABLE ── -->
      <div class="content-panel animate-in">
        <div class="table-container">
          <!-- Header -->
          <div class="tr-header">
            <div class="th-cell product-cell">Product</div>
            <div class="th-cell">Category</div>
            <div class="th-cell num">Your Price</div>
            <div class="th-cell num">Lowest Comp.</div>
            <div class="th-cell">Margin Health</div>
            <div class="th-cell center">Status</div>
            <div class="th-cell act-cell">Actions</div>
          </div>

          <!-- Body -->
          <div class="tr-group" *ngFor="let item of filteredItems; trackBy: trackById">
            <!-- Main Row -->
            <div class="tr-main"
                 (click)="navigateToDetail(item.id)"
                 [class.risk-row]="item.status==='risk'"
                 [class.critical-row]="item.status==='critical'">
              <div class="td-cell product-cell">
                <img [src]="item.image" [alt]="item.name" class="p-img">
                <div class="p-info">
                  <span class="p-name">{{ item.name }}</span>
                </div>
              </div>
              <div class="td-cell"><span class="p-cat">{{ item.category }}</span></div>
              <div class="td-cell num p-price my-price">{{ item.yourPrice | currency }}</div>
              <div class="td-cell num p-price comp-price" [class.lower]="item.lowestComp < item.yourPrice">{{ item.lowestComp | currency }}</div>
              <div class="td-cell">
                <div class="margin-bar-wrap">
                  <div class="margin-bar-track">
                    <div class="margin-bar-fill" [ngClass]="item.status" [style.width.%]="item.margin"></div>
                  </div>
                  <span class="margin-label">{{ item.margin }}%</span>
                </div>
              </div>
              <div class="td-cell center">
                <span class="status-badge" [ngClass]="item.status">
                  <span class="s-dot" [ngClass]="item.status"></span>
                  {{ item.status === 'healthy' ? 'Healthy' : item.status === 'risk' ? 'At Risk' : 'Critical' }}
                </span>
              </div>
              <div class="td-cell act-cell" (click)="$event.stopPropagation()">
                <button class="icon-btn" title="View Product Details" (click)="$event.stopPropagation(); navigateToDetail(item.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </button>
                <button class="icon-btn delete-btn" title="Remove Product" (click)="removeProduct($event, item.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              </div>
            </div>
          </div>
          
          <div *ngIf="filteredItems.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            <h3>No products found</h3>
            <p>Try adjusting your search criteria or add a new product.</p>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination">
          <span class="pag-info">Showing <span class="white">1-{{ filteredItems.length }}</span> of <span class="white">{{ filteredItems.length }}</span> products</span>
          <div class="pag-controls">
            <button class="pag-btn" [disabled]="currentPage === 1" (click)="currentPage = currentPage - 1">← Previous</button>
            <button class="pag-num" [class.active]="currentPage === 1" (click)="currentPage = 1">1</button>
            <button class="pag-num" [class.active]="currentPage === 2" (click)="currentPage = 2">2</button>
            <button class="pag-btn" [disabled]="currentPage === 2" (click)="currentPage = currentPage + 1">Next →</button>
          </div>
        </div>
      </div>

      <!-- Add Product Drawer -->
      <div class="drawer-overlay" *ngIf="showAddModal" (click)="closeAddModal()" [@pageEnter]></div>
      
      <aside class="product-drawer" *ngIf="showAddModal" [@drawerSlide]>
        <header class="drawer-header">
          <div class="header-left">
            <div class="icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <div>
              <h3>{{ editingProduct ? 'Edit Product' : 'Add to Catalog' }}</h3>
              <p>{{ editingProduct ? 'Modify pricing or product details.' : 'Start tracking a new competitor product.' }}</p>
            </div>
          </div>
          <button class="close-btn" (click)="closeAddModal()">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div class="drawer-body">
          <div class="input-section">
            <label class="section-label">Identity</label>
            <div class="field-wrap">
              <span class="field-icon">🏷️</span>
              <input type="text" [(ngModel)]="newProduct.name" (input)="showDropdown = true" class="drawer-input" placeholder="Product Name (e.g. Sony Headphones)">
              
              <!-- Autocomplete Dropdown -->
              <div class="suggestion-dropdown" *ngIf="showDropdown && dropdownItems.length > 0">
                <div class="suggestion-item" *ngFor="let item of dropdownItems" (click)="selectSuggestion(item)">
                  <img [src]="item.image" class="s-img">
                  <div class="s-info">
                    <span class="s-name">{{ item.name }}</span>
                    <span class="s-cat">{{ item.category }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="input-section">
             <label class="section-label">Pricing Strategy</label>
             <div class="field-wrap">
                <span class="field-icon">💰</span>
                <input type="number" [(ngModel)]="newProduct.yourPrice" class="drawer-input" placeholder="Your Listing Price ($)">
             </div>
          </div>

          <div class="drawer-divider"></div>

          <!-- Preview Section -->
          <div class="preview-card" *ngIf="newProduct.name || newProduct.yourPrice">
            <label class="section-label">LIVE PREVIEW</label>
            <div class="preview-item">
              <div class="p-img-placeholder" *ngIf="!newProduct.image">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              </div>
              <img [src]="newProduct.image" *ngIf="newProduct.image" class="p-img-prev">
              <div class="p-details">
                <div class="p-name-prev">{{ newProduct.name || 'Product Title' }}</div>
                <div class="p-price-prev">{{ (newProduct.yourPrice || 0) | currency }}</div>
                <div class="p-tag">Awaiting Market Scan...</div>
              </div>
            </div>
          </div>

          <div class="drawer-footer">
            <div class="security-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Automated tracking begins immediately after saving.</span>
            </div>
            <button class="btn-save" (click)="saveProduct()">
              {{ editingProduct ? 'Update Parameters' : 'Deploy & Track Product' }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Toast Notification -->
      <div class="toast-notification" [class.show]="toastActive">
        <div class="toast-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="toast-content">{{ toastMessage }}</div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }
    
    .catalog-page { display: flex; flex-direction: column; gap: 24px; max-width: 1400px; margin: 0 auto; }

    /* Header */
    .page-top { display: flex; justify-content: space-between; align-items: flex-end; }
    .pt-left { display: flex; flex-direction: column; gap: 6px; }
    .page-title { font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.02em; }
    .page-sub { font-size: 13px; color: var(--text-secondary); margin: 0; }
    
    .btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; outline: none; }
    .btn svg { width: 16px; height: 16px; }
    .btn-primary { background: var(--accent-blue); color: white; box-shadow: 0 4px 12px rgba(59,130,246,0.25); &:hover { background: #2563EB; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(59,130,246,0.35); } }

    /* Filters */
    .filters-row { display: flex; gap: 16px; align-items: center; }
    .search-box {
      flex: 1; position: relative; max-width: 400px;
      svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 16px; color: var(--text-muted); }
      input {
        width: 100%; height: 42px; background: var(--card-bg); border: 1px solid var(--border);
        border-radius: 12px; padding: 0 16px 0 40px; color: var(--text-primary); font-size: 13px;
        transition: all 0.2s;
        &::placeholder { color: var(--text-muted); }
        &:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); outline: none; }
      }
    }
    .filter-group { display: flex; gap: 12px; margin-left: auto; }
    .filter-select {
      height: 42px; background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 12px; padding: 0 36px 0 16px; color: var(--text-primary); font-size: 13px; font-weight: 500;
      cursor: pointer; appearance: none; transition: all 0.2s;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat; background-position: right 12px center; background-size: 14px;
      &:focus { border-color: var(--accent-blue); outline: none; }
    }

    /* Main Table Container */
    .content-panel { background: var(--card-bg); border: 1px solid var(--border); border-radius: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column; }
    .table-container { min-width: 900px; }
    
    /* Table Grid Definitions */
    .tr-header { display: grid; grid-template-columns: minmax(240px, 2fr) 120px 110px 110px minmax(140px, 1fr) 100px 80px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border); padding: 0 16px; }
    .th-cell { padding: 14px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); display: flex; align-items: center; }
    .th-cell.num { justify-content: flex-end; }
    .th-cell.center { justify-content: center; }
    
    .tr-group { border-bottom: 1px solid var(--border); transition: background 0.2s; }
    .tr-group:last-child { border-bottom: none; }
    .tr-group:hover { background: rgba(255,255,255,0.015); }
    
    .tr-main { display: grid; grid-template-columns: minmax(240px, 2fr) 120px 110px 110px minmax(140px, 1fr) 100px 80px; padding: 0 16px; text-decoration: none; cursor: pointer; }
    .td-cell { padding: 16px; display: flex; align-items: center; font-size: 13px; }
    .td-cell.num { justify-content: flex-end; }
    .td-cell.center { justify-content: center; }
    
    .tr-main.risk-row { background: rgba(245,158,11,0.02); }
    .tr-main.critical-row { background: rgba(239,68,68,0.02); }

    /* Product Cell */
    .product-cell { gap: 12px; }
    .p-img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); background: #000; }
    .p-info { display: flex; flex-direction: column; overflow: hidden; }
    .p-name { font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .p-cat { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 100px; color: var(--text-secondary); }
    
    /* Pricing */
    .p-price { font-weight: 700; }
    .my-price { color: var(--text-primary); font-size: 14px; }
    .comp-price { color: var(--text-secondary); &.lower { color: #F87171; } }

    /* Margin Bar */
    .margin-bar-wrap { display: flex; align-items: center; gap: 8px; width: 100%; }
    .margin-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; }
    .margin-bar-fill { height: 100%; border-radius: 100px; box-shadow: inset 0 0 4px rgba(0,0,0,0.5); &.healthy { background: linear-gradient(90deg, #059669, #10B981); } &.risk { background: linear-gradient(90deg, #D97706, #F59E0B); } &.critical { background: linear-gradient(90deg, #B91C1C, #EF4444); } }
    .margin-label { font-size: 12px; font-weight: 800; color: var(--text-primary); width: 34px; text-align: right; font-variant-numeric: tabular-nums; }

    /* Status Badge */
    .status-badge { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 100px; &.healthy { background: rgba(16,185,129,0.1); color: #34D399; } &.risk { background: rgba(245,158,11,0.1); color: #FBBF24; } &.critical { background: rgba(239,68,68,0.1); color: #F87171; } }
    .s-dot { width: 6px; height: 6px; border-radius: 50%; opacity: 0.8; &.healthy { background: currentColor; } &.risk { background: currentColor; } &.critical { background: currentColor; } }

    /* Actions */
    .act-cell { justify-content: flex-end; gap: 4px; padding-right: 0px; position: relative; z-index: 10; }
    .icon-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; position: relative; z-index: 11; svg { width: 16px; } &:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); transform: translateY(-1px); } }
    .icon-btn.delete-btn { &:hover { background: rgba(239,68,68,0.1); color: #F87171; } }

    /* Empty State */
    .empty-state { padding: 60px 0; text-align: center; color: var(--text-muted); svg { width: 48px; opacity: 0.5; margin-bottom: 16px; } h3 { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; } p { font-size: 13px; margin: 0; } }

    /* Pagination */
    .pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-top: 1px solid var(--border); background: var(--card-bg); }
    .pag-info { font-size: 12px; color: var(--text-muted); .white { color: var(--text-primary); font-weight: 600; } }
    .pag-controls { display: flex; align-items: center; gap: 8px; }
    .pag-btn { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; &:hover:not([disabled]) { background: rgba(255,255,255,0.05); color: var(--text-primary); } &[disabled] { opacity: 0.4; cursor: not-allowed; } }
    .pag-num { background: transparent; border: 1px solid transparent; color: var(--text-secondary); font-size: 12px; font-weight: 600; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; &:hover:not(.active) { background: rgba(255,255,255,0.05); } &.active { background: var(--accent-blue); color: white; border-color: transparent; } }
    .pag-dots { color: var(--text-muted); padding: 0 4px; }

    /* Drawer Design */
    .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(12px); z-index: 2000; }
    .product-drawer { 
      position: fixed; top: 0; right: 0; bottom: 0; 
      width: 480px; background: var(--bg-card, #0a0a0c); border-left: 1px solid var(--border);
      z-index: 2001; display: flex; flex-direction: column;
      box-shadow: -20px 0 60px rgba(0,0,0,0.5);
    }

    .drawer-header {
      padding: 40px; border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: flex-start;
      background: linear-gradient(135deg, rgba(59,130,246,0.05) 0%, transparent 100%);
    }
    .header-left { display: flex; align-items: center; gap: 20px; }
    .icon-circle { width: 48px; height: 48px; border-radius: 14px; background: var(--accent-blue); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(59,130,246,0.3); svg { width: 22px; } }
    .drawer-header h3 { font-size: 22px; font-weight: 850; color: var(--text-primary); margin: 0; letter-spacing: -0.03em; }
    .drawer-header p { font-size: 13px; color: var(--text-muted); margin: 6px 0 0; }
    
    .close-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border); background: rgba(255,255,255,0.03); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; &:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); } svg { width: 18px; } }

    .drawer-body { padding: 40px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }
    .section-label { font-size: 11px; font-weight: 850; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px; }
    
    .field-wrap { position: relative; }
    .field-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 18px; }
    .drawer-input {
      width: 100%; height: 56px; background: rgba(255,255,255,0.03); border: 1px solid var(--border);
      border-radius: 16px; padding: 0 20px 0 54px; color: var(--text-primary); font-size: 15px; font-weight: 600;
      transition: all 0.3s;
      &::placeholder { color: var(--text-muted); font-weight: 400; }
      &:focus { background: rgba(59,130,246,0.02); border-color: var(--accent-blue); box-shadow: 0 0 0 4px rgba(59,130,246,0.1); outline: none; }
    }

    /* Autocomplete */
    .suggestion-dropdown {
      position: absolute; top: 100%; left: 0; right: 0; 
      background: var(--bg-card, #0a0a0c); border: 1px solid var(--border);
      border-radius: 16px; margin-top: 8px; z-index: 2005;
      max-height: 240px; overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      animation: fadeInDown 0.2s ease-out;
    }
    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .suggestion-item {
      padding: 12px 18px; display: flex; gap: 14px; align-items: center; 
      cursor: pointer; transition: all 0.2s; border-bottom: 1px solid rgba(255,255,255,0.03);
      &:last-child { border-bottom: none; }
      &:hover { background: rgba(59,130,246,0.08); }
    }
    .s-img { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); }
    .s-info { display: flex; flex-direction: column; gap: 2px; }
    .s-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .s-cat { font-size: 10px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; }

    .drawer-divider { height: 1px; background: var(--border); }

    /* Preview Card */
    .preview-card { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 20px; padding: 24px; animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .preview-item { display: flex; gap: 16px; align-items: center; }
    .p-img-placeholder { width: 64px; height: 64px; border-radius: 12px; border: 2px dashed var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-muted); svg { width: 24px; } }
    .p-img-prev { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; border: 1px solid var(--border); }
    .p-name-prev { font-size: 16px; font-weight: 750; color: var(--text-primary); margin-bottom: 4px; }
    .p-price-prev { font-size: 18px; font-weight: 900; color: var(--accent-blue); }
    .p-tag { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 6px; }

    .drawer-footer { margin-top: auto; display: flex; flex-direction: column; gap: 20px; }
    .security-note { display: flex; gap: 10px; font-size: 12px; color: var(--text-muted); align-items: center; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 12px; svg { width: 14px; } }
    
    .btn-save {
      width: 100%; height: 60px; background: var(--accent-blue); color: white; border: none; border-radius: 18px;
      font-size: 16px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px;
      box-shadow: 0 10px 20px rgba(59,130,246,0.3); transition: all 0.3s;
      &:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(59,130,246,0.4); background: #2563EB; }
      svg { width: 20px; transition: transform 0.2s; }
      &:hover svg { transform: translateX(4px); }
    }
    
    /* Toast */
    .toast-notification { position: fixed; bottom: 32px; right: 32px; background: #fff; border-radius: 12px; padding: 14px 20px; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); transform: translateY(100px); opacity: 0; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); z-index: 1000; }
    .toast-notification.show { transform: translateY(0); opacity: 1; }
    .toast-icon { width: 24px; height: 24px; border-radius: 50%; background: #10B981; display: flex; align-items: center; justify-content: center; color: #fff; svg { width: 14px; } }
    .toast-content { font-size: 14px; font-weight: 700; color: #111; letter-spacing: -0.01em; }
  `],
  animations: [
    trigger('drawerSlide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('pageEnter', [
      transition(':enter', [
        query('.animate-in', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger(100, [
            animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class CatalogTrackerComponent implements OnInit {
  private router = inject(Router);
  searchQuery = '';
  categoryFilter = 'all';
  statusFilter = 'all';
  currentPage = 1;

  showAddModal = false;
  showDropdown = false;
  showMainSearchDropdown = false;
  toastActive = false;
  toastMessage = '';
  toastTimeout: any;

  editingProduct: any = null;
  newProduct: any = { name: '', yourPrice: null, image: '' };

  availableProducts = PLATFORM_PRODUCT_LIBRARY;

  get dropdownItems() {
    if (!this.newProduct.name || this.newProduct.name.length < 1) return [];
    return this.availableProducts.filter(p => 
      p.name.toLowerCase().includes(this.newProduct.name.toLowerCase())
    );
  }

  get mainSearchSuggestions() {
    if (!this.searchQuery || this.searchQuery.length < 1) return [];
    return this.availableProducts.filter(p => 
      p.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  selectSuggestion(item: any) {
    this.newProduct.name = item.name;
    this.newProduct.yourPrice = item.defaultPrice;
    this.newProduct.image = item.image;
    this.showDropdown = false;
  }

  items: CatalogItem[] = [
    { id: '1', name: 'Sony WH-1000XM5 Noise Cancelling', category: 'Audio', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200', yourPrice: 299, lowestComp: 279, margin: 38, status: 'healthy' },
    { id: '2', name: 'iPhone 15 Pro 256GB Titanium', category: 'Phones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200', yourPrice: 999, lowestComp: 949, margin: 24, status: 'risk' },
    { id: '3', name: 'Samsung Galaxy S24 Ultra 512GB', category: 'Phones', image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200', yourPrice: 1199, lowestComp: 1149, margin: 19, status: 'risk' },
    { id: '4', name: 'MacBook Air M3 13-inch', category: 'Laptops', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200', yourPrice: 1099, lowestComp: 1019, margin: 22, status: 'risk' },
    { id: '5', name: 'Keychron Q1 Max Mechanical Keyboard', category: 'Périphériques', image: 'https://images.unsplash.com/photo-1595225442460-394136278fc4?w=200', yourPrice: 199, lowestComp: 189, margin: 15, status: 'healthy' },
    { id: '6', name: 'iPad Air M2 64GB WiFi', category: 'Tablets', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200', yourPrice: 549, lowestComp: 599, margin: 31, status: 'healthy' }
  ];

  ngOnInit() {}

  get filteredItems(): CatalogItem[] {
    return this.items.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchCat = this.categoryFilter === 'all' || item.category === this.categoryFilter;
      const matchStatus = this.statusFilter === 'all' || item.status === this.statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }

  openAddModal(item: any = null) {
    if (item) {
      this.editingProduct = item;
      this.newProduct = { ...item };
    } else {
      this.editingProduct = null;
      this.newProduct = { name: '', yourPrice: null, image: '' };
    }
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  saveProduct() {
    if(!this.newProduct.name) {
      this.showToast('Name is required.');
      return;
    }

    const matchedProduct = PLATFORM_PRODUCT_LIBRARY.find(p => p.name === this.newProduct.name);
    if (!matchedProduct) {
      this.showToast('Please select a valid product from the suggestions.');
      return;
    }
    
    if (this.editingProduct) {
      const idx = this.items.findIndex(p => p.id === this.editingProduct.id);
      if (idx !== -1) {
        this.items[idx] = { 
          ...this.items[idx], 
          name: this.newProduct.name, 
          yourPrice: this.newProduct.yourPrice || 0,
          image: this.newProduct.image || this.items[idx].image
        };
        this.showToast('Product parameters updated.');
      }
    } else {
      const suggestion = this.availableProducts.find(p => p.name === this.newProduct.name);
      this.items.unshift({
        id: Math.random().toString(),
        name: this.newProduct.name,
        category: suggestion ? suggestion.category : 'Other',
        image: this.newProduct.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200',
        yourPrice: this.newProduct.yourPrice || 0,
        lowestComp: (this.newProduct.yourPrice || 0) * 0.95, 
        margin: 15,
        status: 'risk'
      });
      this.showToast('Product added successfully!');
    }
    this.closeAddModal();
  }

  removeProduct(event: Event, id: string) {
    event.preventDefault();
    event.stopPropagation();
    this.items = this.items.filter(item => item.id !== id);
    this.showToast('Product successfully removed from tracking.');
  }

  navigateToDetail(id: string) {
    this.router.navigate(['/business/catalog', id]);
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.toastActive = true;
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastActive = false;
    }, 3000);
  }
  trackById(index: number, item: CatalogItem) {
    return item.id;
  }
}

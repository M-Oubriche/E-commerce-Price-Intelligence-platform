import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<any>();
  private reconnectTimeout: any;
  private userId: string | null = null;
  private token: string | null = null;

  messages$ = this.messageSubject.asObservable();

  connect(userId: string, token: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.userId = userId;
    this.token = token;

    // Connect to ws://localhost:8000/api/v1/ws/{user_id}?token={access_token}
    const wsUrl = `ws://localhost:8000/api/v1/ws/${userId}?token=${token}`;
    
    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageSubject.next(data);
      } catch (e) {
        console.error('Error parsing WebSocket message', e);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket closed. Attempting reconnect in 5s...');
      this.scheduleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.socket?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.userId && this.token) {
        this.connect(this.userId, this.token);
      }
    }, 5000);
  }

  disconnect(): void {
    this.userId = null;
    this.token = null;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.onclose = null; // Prevent reconnect loop
      this.socket.close();
      this.socket = null;
    }
  }
}

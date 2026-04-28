export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: "FREE" | "OCCUPIED";
}

export interface Product {
  id: string;
  name: string;
  category: string;
  finalPrice: number;
  basePrice: number;
  vatAmount: number;
  vatRate: number;
  active: boolean;
}

export interface OrderItem {
  id: string;
  sessionId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product: Product;
}

export interface TableSession {
  id: string;
  tableId: string;
  openedBy: string;
  consumers: number;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  table: Table;
  orderItems: OrderItem[];
}

export interface Role {
  id: number;
  code: 'ADMIN' | 'APPROVER' | 'USER';
  name: string;
  description?: string;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AuditHistoryEntry {
  id: string;
  status: 'OK' | 'MISSING';
  date: string;
  note: string;
  user: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  pn?: string; // Part Number
  sn: string; // Serial Number
  warehouse?: string; // Mã Kho
  loc?: string; // Vị trí / Tủ
  qty: number; // Số lượng
  auditStatus: 'OK' | 'MISSING' | null;
  auditDate?: string | null;
  auditNote?: string;
  category?: string; // Phân loại (e.g. VHF, VCCS, Radar, Nguồn, Khác)
  history?: AuditHistoryEntry[];
}

export interface SyncConfig {
  webAppUrl: string;
  lastSynced?: string;
  autoSync: boolean;
  autoLoadOnStartup?: boolean;
}

export type Role = 'admin' | 'guest';

export interface AuditStats {
  totalItems: number;
  totalQty: number;
  checkedCount: number;
  okCount: number;
  missingCount: number;
  healthRate: number; // Percentage of checked items that are OK
}

export interface UsageSlip {
  id: string;
  itemId: string;
  itemName: string;
  sn: string;
  pn: string;
  category: string;
  warehouse: string;
  originalLoc: string;
  user: string;
  qtyUsed: number;
  purpose: string;
  notes?: string;
  targetLocation: string;
  date: string;
}


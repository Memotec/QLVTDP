/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  QrCode, Search, Database, RefreshCw, SlidersHorizontal, Plus, Edit, 
  Trash2, User, Lock, LogOut, Sun, Moon, FileSpreadsheet, Printer, 
  Clock, ArrowRightLeft, CheckCircle2, XCircle, AlertCircle, X, 
  ChevronRight, History, Settings, Camera, Laptop, Check, Filter,
  FileText, Activity, Layers, MapPin, PlusCircle, CheckSquare, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';

import { InventoryItem, SyncConfig, Role, AuditStats, AuditHistoryEntry, UsageSlip } from './types.ts';
import { INITIAL_INVENTORY, CATEGORIES } from './initialData.ts';

export default function App() {
  // --- STATE ---
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  
  // Equipment Usage States
  const [usageSlips, setUsageSlips] = useState<UsageSlip[]>(() => {
    const saved = localStorage.getItem('cns_usage_slips_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });
  const [selectedItemForUsage, setSelectedItemForUsage] = useState<InventoryItem | null>(null);
  const [usageUser, setUsageUser] = useState('');
  const [usageQty, setUsageQty] = useState(1);
  const [usagePurpose, setUsagePurpose] = useState('Bảo dưỡng định kỳ / Thay thế dự phòng');
  const [usageNotes, setUsageNotes] = useState('');
  const [usageTargetLoc, setUsageTargetLoc] = useState('');
  const [deductInventory, setDeductInventory] = useState(true);
  const [isUsageHistoryOpen, setIsUsageHistoryOpen] = useState(false);
  const [usageSearchQuery, setUsageSearchQuery] = useState('');
  
  // --- OFFIClAL HANDOVER FORM STATES (BIÊN BẢN BÀN GIAO CHUẨO) ---
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverNo, setHandoverNo] = useState(() => {
    const yr = new Date().getFullYear();
    const ran = Math.floor(100 + Math.random() * 900);
    return `${ran}/KT`;
  });
  const [handoverGiverDept, setHandoverGiverDept] = useState('Đội Thông tin – Trung tâm BĐKT');
  const [handoverGiverName, setHandoverGiverName] = useState('Nguyễn Văn Khải');
  const [handoverGiverPos, setHandoverGiverPos] = useState('Đội trưởng');
  const [handoverReceiverDept, setHandoverReceiverDept] = useState('Tổ Kỹ thuật Không lưu');
  const [handoverReceiverName, setHandoverReceiverName] = useState('Trần Quốc Toản');
  const [handoverReceiverPos, setHandoverReceiverPos] = useState('Kỹ sư trực ban');
  const [handoverLocation, setHandoverLocation] = useState('Trung tâm Bảo đảm Kỹ thuật');
  const [handoverDay, setHandoverDay] = useState(() => new Date().getDate().toString());
  const [handoverMonth, setHandoverMonth] = useState(() => (new Date().getMonth() + 1).toString());
  const [handoverYear, setHandoverYear] = useState(() => new Date().getFullYear().toString());
  const [handoverReason, setHandoverReason] = useState('Đảm bảo trang thiết bị kỹ thuật dự phòng và vận hành ổn định hệ thống');
  
  // Handover selected items structure
  const [handoverRows, setHandoverRows] = useState<Array<{
    id: string;
    name: string;
    unit: string;
    qty: number;
    quality: string;
    specs: string;
    sn: string;
    note: string;
  }>>([]);
  
  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả loại');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OK' | 'MISSING' | 'UNCHECKED'>('ALL');

  // Dynamic Custom Categories State Load
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('cns_categories_v30');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    return CATEGORIES;
  });

  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Form Editor States (For Adding/Editing items)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPn, setFormPn] = useState('');
  const [formSn, setFormSn] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('');
  const [formLoc, setFormLoc] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [formCategory, setFormCategory] = useState('VHF AM');

  // Modal Dialog Controllers
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<InventoryItem | null>(null);

  // Simulated Scanner States
  const [scanInputCode, setScanInputCode] = useState('');
  const [scanStatus, setScanStatus] = useState<'OK' | 'MISSING'>('OK');
  const [scanNote, setScanNote] = useState('');
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Cloud Sync Configurations
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    webAppUrl: 'https://script.google.com/macros/s/AKfycby3ecczSKLGb81GXQSqirqM0s-qQH-jQDjJpZQohnNS_aUQgtH15KzvB8JYr7LJbYql/exec',
    autoSync: false,
    lastSynced: undefined
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncStatusDetail, setSyncStatusDetail] = useState('');

  // Toast Alerts State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  // Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Printing Layout Controllers
  const [printLayout, setPrintLayout] = useState<'NONE' | 'QR' | 'LABEL'>('NONE');

  // Theme Controller
  const [darkMode, setDarkMode] = useState(false);

  // Reference for scanning audio
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Load local theme preference
    const savedTheme = localStorage.getItem('cns_theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    // Load local inventory
    const localInv = localStorage.getItem('cns_inventory_v30_stable');
    if (localInv) {
      try {
        setInventory(JSON.parse(localInv));
      } catch (e) {
        setInventory(INITIAL_INVENTORY);
      }
    } else {
      setInventory(INITIAL_INVENTORY);
      localStorage.setItem('cns_inventory_v30_stable', JSON.stringify(INITIAL_INVENTORY));
    }

    // Load local session
    const savedRole = localStorage.getItem('cns_session_active');
    if (savedRole === 'admin' || savedRole === 'guest') {
      setRole(savedRole as Role);
    }

    // Load sync url
    const savedSyncUrl = localStorage.getItem('cns_sync_url');
    if (savedSyncUrl) {
      setSyncConfig(prev => ({ ...prev, webAppUrl: savedSyncUrl }));
    }
  }, []);

  // Sync to local storage
  const saveInventoryLocally = (newInv: InventoryItem[]) => {
    setInventory(newInv);
    localStorage.setItem('cns_inventory_v30_stable', JSON.stringify(newInv));
  };

  const saveCategoriesLocally = (newCats: string[]) => {
    setCategories(newCats);
    localStorage.setItem('cns_categories_v30', JSON.stringify(newCats));
  };

  // --- HELPER METRICS ---
  const stats = useMemo<AuditStats>(() => {
    const totalItems = inventory.length;
    const totalQty = inventory.reduce((acc, item) => acc + (item.qty || 0), 0);
    const checkedCount = inventory.filter(item => item.auditStatus !== null).length;
    const okCount = inventory.filter(item => item.auditStatus === 'OK').length;
    const missingCount = inventory.filter(item => item.auditStatus === 'MISSING').length;
    const healthRate = checkedCount > 0 ? Math.round((okCount / checkedCount) * 100) : 100;

    return {
      totalItems,
      totalQty,
      checkedCount,
      okCount,
      missingCount,
      healthRate
    };
  }, [inventory]);

  // --- FILTERED DATA ---
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      // Category filter
      if (selectedCategory !== 'Tất cả loại' && item.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'OK' && item.auditStatus !== 'OK') return false;
      if (statusFilter === 'MISSING' && item.auditStatus !== 'MISSING') return false;
      if (statusFilter === 'UNCHECKED' && item.auditStatus !== null) return false;

      // Text Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.name.toLowerCase().includes(q);
        const snMatch = item.sn.toLowerCase().includes(q);
        const pnMatch = item.pn?.toLowerCase().includes(q) || false;
        const whMatch = item.warehouse?.toLowerCase().includes(q) || false;
        const locMatch = item.loc?.toLowerCase().includes(q) || false;

        return nameMatch || snMatch || pnMatch || whMatch || locMatch;
      }

      return true;
    });
  }, [inventory, selectedCategory, statusFilter, searchQuery]);

  // --- TOAST SERVICE ---
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- BEEP AUDIO SYNTHESIZER ---
  const playScanBeep = (freq = 800, duration = 0.12) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio fallback silent
    }
  };

  // --- ACTIONS ---

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.toLowerCase().trim();
    const p = password;

    if ((u === 'admin' && p === 'admin') || (u === 'guest' && p === '123456')) {
      const assignedRole = u as Role;
      setRole(assignedRole);
      localStorage.setItem('cns_session_active', assignedRole);
      setLoginError('');
      setUsername('');
      setPassword('');
      addToast(`Xin chào ${u.toUpperCase()}! Đăng nhập thành công.`, 'success');
      playScanBeep(1000, 0.15);
    } else {
      setLoginError('Tài khoản hoặc mật khẩu không chính xác!');
      playScanBeep(300, 0.25);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('cns_session_active');
    setRole(null);
    setEditingItemId(null);
    clearForm();
    addToast('Đã đăng xuất tài khoản.', 'info');
  };

  // Toggle Dark Mode
  const toggleTheme = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    if (newVal) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cns_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cns_theme', 'light');
    }
  };

  // Clear Editor Form
  const clearForm = () => {
    setEditingItemId(null);
    setFormName('');
    setFormPn('');
    setFormSn('');
    setFormWarehouse('');
    setFormLoc('');
    setFormQty(1);
    setFormCategory('VHF AM');
  };

  // Populate form to edit
  const handleEditClick = (item: InventoryItem) => {
    if (role !== 'admin') {
      addToast('Chỉ quản lý (Admin) mới được phép chỉnh sửa thiết bị.', 'error');
      return;
    }
    setEditingItemId(item.id);
    setFormName(item.name || '');
    setFormPn(item.pn || '');
    setFormSn(item.sn || '');
    setFormWarehouse(item.warehouse || '');
    setFormLoc(item.loc || '');
    setFormQty(item.qty || 1);
    setFormCategory(item.category || 'VHF AM');
    
    // Smooth scroll to editor
    const el = document.getElementById('editor-panel');
    el?.scrollIntoView({ behavior: 'smooth' });
    addToast('Đã tải thông tin thiết bị lên biểu mẫu.', 'info');
  };

  // Save or Add Item
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSn.trim()) {
      addToast('Vui lòng điền các thông tin bắt buộc (*)', 'error');
      return;
    }

    if (editingItemId) {
      // Update existing item
      const updated = inventory.map(item => {
        if (item.id === editingItemId) {
          return {
            ...item,
            name: formName.trim(),
            pn: formPn.trim(),
            sn: formSn.trim(),
            warehouse: formWarehouse.trim().toUpperCase(),
            loc: formLoc.trim(),
            qty: Number(formQty) || 1,
            category: formCategory
          };
        }
        return item;
      });
      saveInventoryLocally(updated);
      addToast('Cập nhật dữ liệu thiết bị thành công!', 'success');
      playScanBeep(900, 0.1);
    } else {
      // Check duplicate Serial Number
      const isDuplicate = inventory.some(item => item.sn.toLowerCase() === formSn.trim().toLowerCase());
      if (isDuplicate) {
        addToast(`Cảnh báo: S/N "${formSn}" đã tồn tại trong hệ thống!`, 'error');
        return;
      }

      // Add new item
      const newItem: InventoryItem = {
        id: `item-${Date.now()}`,
        name: formName.trim(),
        pn: formPn.trim(),
        sn: formSn.trim(),
        warehouse: formWarehouse.trim().toUpperCase(),
        loc: formLoc.trim(),
        qty: Number(formQty) || 1,
        auditStatus: null,
        auditNote: '',
        category: formCategory,
        history: []
      };
      saveInventoryLocally([...inventory, newItem]);
      addToast('Đã thêm thiết bị mới vào kho thành công!', 'success');
      playScanBeep(880, 0.15);
    }
    clearForm();
  };

  // Prompt delete item
  const handleDeleteClick = (item: InventoryItem) => {
    if (role !== 'admin') {
      addToast('Chỉ quản lý (Admin) mới có quyền xóa thiết bị.', 'error');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa thiết bị',
      message: `Bạn đang chọn xóa thiết bị "${item.name}" (S/N: ${item.sn}). Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa?`,
      onConfirm: () => {
        const nextInv = inventory.filter(i => i.id !== item.id);
        saveInventoryLocally(nextInv);
        addToast('Đã xóa thiết bị khỏi cơ sở dữ liệu.', 'success');
        playScanBeep(400, 0.3);
        setConfirmDialog(null);
      }
    });
  };

  // Quick action: Toggle audit status directly from line
  const handleQuickStatusClick = (item: InventoryItem, nextStatus: 'OK' | 'MISSING' | null) => {
    const updated = inventory.map(i => {
      if (i.id === item.id) {
        const nowStr = new Date().toLocaleString('vi-VN');
        const updatedHistory: AuditHistoryEntry[] = i.history ? [...i.history] : [];
        if (nextStatus) {
          updatedHistory.unshift({
            id: `h-${Date.now()}`,
            status: nextStatus,
            date: nowStr,
            note: 'Kiểm bằng nhấp chọn nhanh trên danh sách',
            user: role || 'guest'
          });
        }
        return {
          ...i,
          auditStatus: nextStatus,
          auditDate: nextStatus ? nowStr : null,
          history: updatedHistory
        };
      }
      return i;
    });
    saveInventoryLocally(updated);
    addToast(`Đã cập nhật trạng thái kiểm kê cho thiết bị s/n ${item.sn}.`, 'success');
    playScanBeep(nextStatus === 'OK' ? 950 : 350, 0.12);
  };

  // Multi Reset: Reset entire inventory check logs
  const handleResetFiltersAndStatus = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Đặt lại trạng thái kiểm kê',
      message: 'Hành động này sẽ XÓA TOÀN BỘ trạng thái kiểm kê hiện tại của toàn bộ thiết bị trong danh sách về trạng thái CHƯA KIỂM. Bạn có đồng ý thực hiện?',
      onConfirm: () => {
        const reseted = inventory.map(item => ({
          ...item,
          auditStatus: null,
          auditDate: null,
          auditNote: ''
        }));
        saveInventoryLocally(reseted);
        addToast('Đã đặt toàn bộ thiết bị về vị trí Chưa Kiểm kê.', 'info');
        playScanBeep(300, 0.4);
        setConfirmDialog(null);
      }
    });
  };

  // --- CLOUD SYNC LOGIC ---
  const fetchCloudData = async () => {
    if (syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    setSyncStatusDetail('Đang tạo yêu cầu kết nối Server...');

    try {
      const url = `${syncConfig.webAppUrl}?t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Yêu cầu dữ liệu thất bại từ Google Apps Script.');
      
      const resText = await res.text();
      if (resText.trim().startsWith('<!DOCTYPE') || resText.trim().startsWith('<html')) {
        throw new Error('Đường dẫn Apps Script phản hồi HTML. Vui lòng kiểm tra phân quyền truy cập public (Anyone).');
      }

      const data = JSON.parse(resText);
      if (data && Array.isArray(data)) {
        if (data.length > 0) {
          // Format incoming items (keep fields matching structure)
          const formatted: InventoryItem[] = data.map((item: any, index: number) => ({
            id: item.id || `cloud-item-${index}-${Date.now()}`,
            name: item.name || 'Thiết bị không tên',
            pn: item.pn || '',
            sn: item.sn || `SN-${index}`,
            warehouse: item.warehouse || '',
            loc: item.loc || '',
            qty: Number(item.qty) || 1,
            auditStatus: item.auditStatus === 'OK' ? 'OK' : (item.auditStatus === 'MISSING' ? 'MISSING' : null),
            auditDate: item.auditDate || null,
            auditNote: item.auditNote || '',
            category: item.category || 'Khác',
            history: item.history || []
          }));
          saveInventoryLocally(formatted);
          const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          setSyncConfig(prev => ({ ...prev, lastSynced: nowStr }));
          setSyncStatus('success');
          setSyncStatusDetail(`Đã tải xuống thành công ${formatted.length} thiết bị.`);
          addToast(`Đồng bộ thành công! Đã tải xuống ${formatted.length} thiết bị.`, 'success');
          playScanBeep(1000, 0.2);
        } else {
          setSyncStatus('success');
          setSyncStatusDetail('Kho Cloud rỗng. Có thể tiến hành đẩy lên.');
          addToast('Kho trên Cloud hiện đang trống!', 'info');
        }
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSyncStatusDetail(err.message || 'Lỗi mạng không xác định.');
      addToast('Lỗi tải dữ liệu từ Cloud! Xem chi tiết ở phần cài đặt.', 'error');
      playScanBeep(250, 0.3);
    }
  };

  const syncToCloud = async () => {
    if (syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    setSyncStatusDetail('Đang tải dữ liệu của bạn lên Cloud...');

    try {
      const params = new URLSearchParams();
      params.append('data', JSON.stringify(inventory));
      params.append('timestamp', Date.now().toString());
      params.append('user', role || 'anonymous');

      // POST to script
      await fetch(syncConfig.webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSyncConfig(prev => ({ ...prev, lastSynced: nowStr }));
      setSyncStatus('success');
      setSyncStatusDetail('Đã đẩy dữ liệu thành công lên Apps Script.');
      addToast('Đã đẩy toàn bộ danh sách lên Cloud thành công!', 'success');
      playScanBeep(980, 0.15);
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSyncStatusDetail('Đẩy dữ liệu thất bại. Hãy kiểm tra kết nối mạng.');
      addToast('Không thể đẩy dữ liệu lên Cloud. Hãy thử lại.', 'error');
    }
  };

  // Save settings change
  const saveSettingsConfig = (newUrl: string) => {
    const cleanUrl = newUrl.trim();
    setSyncConfig(prev => ({ ...prev, webAppUrl: cleanUrl }));
    localStorage.setItem('cns_sync_url', cleanUrl);
    addToast('Đã lưu cấu hình Apps Script.', 'success');
  };

  // --- EXPORTS & PRINTS ---

  // Export excel
  const handleExportExcel = () => {
    if (inventory.length === 0) {
      addToast('Không có dữ liệu để xuất Excel!', 'error');
      return;
    }

    try {
      // Map friendly columns
      const excelRows = inventory.map((item, index) => ({
        'STT': index + 1,
        'Tên thiết bị': item.name,
        'Phân loại': item.category || 'Khác',
        'Part Number (P/N)': item.pn || 'N/A',
        'Serial Number (S/N)': item.sn,
        'Mã Kho (QR)': item.warehouse || '',
        'Vị trí / Tủ': item.loc || '',
        'Số lượng': item.qty,
        'Trạng thái kiểm kê': item.auditStatus === 'OK' ? 'Đủ/Tốt' : (item.auditStatus === 'MISSING' ? 'Thiếu/Hỏng' : 'Chưa kiểm'),
        'Ngày kiểm gần nhất': item.auditDate || '',
        'Ghi chú kiểm kê': item.auditNote || ''
      }));

      const ws = XLSX.utils.json_to_sheet(excelRows);
      
      // Styling and table boundaries auto dimensions
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Danh sach vat tu CNS");
      
      const fileDate = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Kho_Vat_Tu_CNS_ATM_${fileDate}.xlsx`);
      addToast('Xuất báo cáo Excel thành công!', 'success');
      playScanBeep(1000, 0.1);
    } catch (err) {
      addToast('Có lỗi xảy ra khi tạo file Excel!', 'error');
    }
  };

  // Handle PDF/Action audit report
  const handleExportWebBill = () => {
    const win = window.open('', '_blank');
    if (!win) {
      addToast('Vui lòng cho phép trình duyệt hiển thị tab/popup mới!', 'error');
      return;
    }
    const today = new Date().toLocaleDateString('vi-VN');
    const rowsHtml = inventory.map((item, idx) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px; font-weight: bold; text-align: left;">${item.name}</td>
        <td style="padding: 10px;">${item.category || '-'}</td>
        <td style="padding: 10px; font-family: monospace;">${item.sn}</td>
        <td style="padding: 10px; text-align: center; font-weight: bold;">${item.warehouse || '-'}</td>
        <td style="padding: 10px; text-align: center; font-weight: bold;">${item.qty}</td>
        <td style="padding: 10px; text-align: center;">
          <span style="font-weight: bold; color: ${item.auditStatus === 'OK' ? '#10b981' : (item.auditStatus === 'MISSING' ? '#ef4444' : '#6b7280')};">
            ${item.auditStatus === 'OK' ? 'ĐỦ/TỐT' : (item.auditStatus === 'MISSING' ? 'THIẾU/HỎNG' : 'CHƯA KIỂM')}
          </span>
        </td>
        <td style="padding: 10px; text-align: left; font-size: 11px; max-width: 155px;">${item.auditNote || ''}</td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>Biên Bản Kiểm Kê Kho CNS/ATM</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; color: #333; margin: 30px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 20px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .subtitle { font-size: 13px; color: #666; font-style: italic; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background-color: #f3f4f6; border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-weight: bold; }
            td { border: 1px solid #e2e8f0; }
            .summary { margin-top: 30px; font-size: 13px; display: flex; justify-content: space-between; }
            .signs { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 13px; page-break-inside: avoid; }
            .sign-box { width: 250px; font-weight: bold; }
            .sign-title { margin-bottom: 60px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 15px;">ĐỘI THÔNG TIN - KHO VẬT TƯ CNS/ATM</div>
            <div class="title">BIÊN BẢN KIỂM KÊ THIẾT BỊ VÀ VẬT TƯ CHUYÊN NGÀNH</div>
            <div class="subtitle">Ngày tạo biên bản: ${today} - Người lập: ${role ? role.toUpperCase() : 'Guest'}</div>
          </div>

          <div style="font-size: 13px; margin-bottom: 10px; border-left: 3px solid #3b82f6; padding-left: 10px;">
            Hệ thống ghi nhận tổng số <strong>${stats.totalItems}</strong> dòng thiết bị khác nhau với tổng số lượng tồn kho <strong>${stats.totalQty}</strong> đơn vị. 
            Tỷ lệ bảo toàn kiểm kê đạt <strong>${stats.healthRate}%</strong> đóng băng ở thời điểm kết xuất dữ liệu.
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">STT</th>
                <th>Tên Thiết Bị / Linh Kiện</th>
                <th style="width: 100px;">Phân Loại</th>
                <th style="width: 120px;">Serial Number</th>
                <th style="width: 100px;">Mã Kho (QR)</th>
                <th style="width: 50px;">SL</th>
                <th style="width: 100px;">Trạng Thái</th>
                <th style="width: 180px;">Ghi Chú Kiểm Kê</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="summary">
            <div>
              <p>Số thiết bị đạt (ĐỦ/ỐN ĐỊNH): <strong>${stats.okCount}</strong></p>
              <p>Số thiết bị lệch (THIẾU/HỎNG): <strong style="color:red">${stats.missingCount}</strong></p>
            </div>
            <div style="text-align: right;">
              <p>Đơn vị kiểm kê: Đội thông tin hàng không</p>
              <p>Giờ xuất phiếu: ${new Date().toLocaleTimeString('vi-VN')}</p>
            </div>
          </div>

          <div class="signs">
            <div class="sign-box">
              <div class="sign-title">Đại Diện Tổ Kiểm Kê</div>
              <div>(Ký, ghi rõ họ tên)</div>
            </div>
            <div class="sign-box">
              <div class="sign-title">Đội Trưởng Đội Thông Tin</div>
              <div>(Ký, đóng dấu xác nhận)</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          <\/script>
        </body>
      </html>
    `);
    win.document.close();
    addToast('Đã khởi tạo bản in biên bản chuyên nghiệp!', 'success');
  };

  // --- PRINT OFFICIAL HANDOVER (BIÊN BẢN BÀN GIAO CHUẨN FORM VATM-BĐKT) ---
  const handlePrintOfficialHandover = () => {
    if (handoverRows.length === 0) {
      addToast('Danh sách thiết bị bàn giao hiện tại đang trống! Vui lòng chọn thiết bị trước.', 'error');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) {
      addToast('Vui lòng cho phép trình duyệt hiển thị tab/popup mới!', 'error');
      return;
    }

    const rowsHtml = handoverRows.map((row, idx) => `
      <tr>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: center; font-size: 13.5px;">${idx + 1}</td>
        <td style="border: 1px solid #000; padding: 7px 8px; text-align: left; font-size: 13.5px; font-weight: bold; font-family: 'Times New Roman', Times, serif;">${row.name}</td>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: center; font-size: 13.5px;">${row.unit || 'Cái'}</td>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: center; font-size: 13.5px; font-weight: bold;">${row.qty}</td>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: center; font-size: 13.5px;">${row.quality || 'Tốt (Mới 100%)'}</td>
        <td style="border: 1px solid #000; padding: 7px 8px; text-align: left; font-size: 13.5px;">${row.specs || 'N/A'}</td>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: center; font-family: monospace; font-size: 13.5px; font-weight: bold;">${row.sn || 'N/A'}</td>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: left; font-size: 13.5px;">${row.note || ''}</td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>BIÊN BẢN GIAO NHẬN TÀI SẢN CÔNG CỤ - ${handoverNo}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm 15mm 20mm 20mm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              color: #000;
              line-height: 1.5;
              margin: 0;
              padding: 0;
              background-color: #fff;
              -webkit-print-color-adjust: exact;
            }
            .container {
              width: 100%;
              max-width: 680px;
              margin: 0 auto;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              border: none;
              margin-bottom: 25px;
            }
            .header-table td {
              border: none;
              padding: 0;
              vertical-align: top;
            }
            .national-brand {
              text-align: center;
              font-size: 12.5px;
              width: 58%;
              font-family: 'Times New Roman', Times, serif;
            }
            .national-title {
              font-weight: bold;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: -0.2px;
            }
            .national-subtitle {
              font-weight: bold;
              font-size: 13px;
              margin-top: 3px;
              text-decoration: none;
            }
            .company-brand {
              text-align: center;
              font-size: 12px;
              width: 42%;
              font-family: 'Times New Roman', Times, serif;
            }
            .company-name {
              text-transform: uppercase;
              font-size: 11px;
              font-weight: bold;
              letter-spacing: -0.2px;
            }
            .dept-name {
              text-transform: uppercase;
              font-weight: bold;
              font-size: 12px;
              margin-top: 3px;
            }
            .doc-number {
              font-size: 12.5px;
              margin-top: 5px;
              text-align: center;
              font-family: 'Times New Roman', Times, serif;
            }
            .location-date {
              font-size: 13px;
              text-align: center;
              font-style: italic;
              margin-top: 6px;
            }
            .line-decoration {
              border-top: 1px solid #000;
              width: 110px;
              margin: 4px auto 0 auto;
            }
            .national-line-decoration {
              border-top: 1.2px solid #000;
              width: 135px;
              margin: 4px auto 0 auto;
            }
            .doc-title {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
              margin: 30px 0 6px 0;
              letter-spacing: 0.5px;
              font-family: 'Times New Roman', Times, serif;
            }
            .doc-intro {
              text-align: left;
              font-size: 14px;
              margin-bottom: 18px;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              margin-top: 15px;
              margin-bottom: 8px;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              border: none;
              margin-bottom: 12px;
            }
            .info-table td {
              border: none;
              padding: 4px 0;
              font-size: 14.5px;
            }
            .table-main {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              margin-bottom: 20px;
            }
            .table-main th {
              border: 1px solid #000;
              background-color: #fff;
              padding: 8px 5px;
              text-align: center;
              font-weight: bold;
              font-size: 13px;
              text-transform: uppercase;
            }
            .footer-note {
              font-size: 14px;
              margin: 15px 0 25px 0;
              text-align: left;
            }
            .signature-table {
              width: 100%;
              border-collapse: collapse;
              border: none;
              margin-top: 25px;
              page-break-inside: avoid;
            }
            .signature-table td {
              border: none;
              width: 50%;
              text-align: center;
              vertical-align: top;
              padding: 0;
            }
            .sig-title {
              font-weight: bold;
              text-transform: uppercase;
              font-size: 13.5px;
              margin-bottom: 5px;
            }
            .sig-note {
              font-style: italic;
              font-size: 12.5px;
              color: #222;
              margin-bottom: 80px;
            }
            .sig-name {
              font-weight: bold;
              font-size: 14px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <table class="header-table">
              <tr>
                <td class="company-brand">
                  <div class="company-name">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
                  <div class="dept-name"><u>TRUNG TÂM BĐKT</u></div>
                  <div style="margin-top: 12px;" class="doc-number">Số: ${handoverNo || '......../KT'}</div>
                </td>
                <td class="national-brand">
                  <div class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div class="national-subtitle"><u>Độc lập - Tự do - Hạnh phúc</u></div>
                  <div class="location-date">TPHCM, ngày ${handoverDay} tháng ${handoverMonth} năm ${handoverYear}</div>
                </td>
              </tr>
            </table>

            <div class="doc-title">BIÊN BẢN GIAO, NHẬN TÀI SẢN, CÔNG CỤ</div>
            <div class="doc-intro">
              Hôm nay, ngày ${handoverDay} tháng ${handoverMonth} năm ${handoverYear}, tại ${handoverLocation || 'Trung tâm Bảo đảm Kỹ thuật'}
            </div>

            <div class="section-title">THÀNH PHẦN BÀN GIAO:</div>
            
            <table class="info-table">
              <tr>
                <td style="font-weight: bold; width: 100%;" colspan="2">
                  1. Đại diện bên giao: ${handoverGiverDept || 'Đội Thông tin – Trung tâm BĐKT'}
                </td>
              </tr>
              <tr>
                <td style="width: 55%; padding-left: 20px;">
                  Ông (bà): <span style="font-weight: bold;">${handoverGiverName || '...........................................'}</span>
                </td>
                <td style="width: 45%;">
                  Chức vụ: <span style="font-weight: bold;">${handoverGiverPos || '...........................................'}</span>
                </td>
              </tr>
              <tr>
                <td style="font-weight: bold; width: 100%; pt: 6px;" colspan="2">
                  2. Đại diện bên nhận: ${handoverReceiverDept || '...........................................'}
                </td>
              </tr>
              <tr>
                <td style="width: 55%; padding-left: 20px;">
                  Ông (bà): <span style="font-weight: bold;">${handoverReceiverName || '...........................................'}</span>
                </td>
                <td style="width: 45%;">
                  Chức vụ: <span style="font-weight: bold;">${handoverReceiverPos || '...........................................'}</span>
                </td>
              </tr>
            </table>

            <div style="font-size: 14px; margin-top: 15px; margin-bottom: 5px;">
              Đã tiến hành công tác giao nhận tài sản, công cụ dụng cụ:
            </div>

            <table class="table-main">
              <thead>
                <tr>
                  <th style="width: 45px;">STT</th>
                  <th>Tên tài sản, công cụ</th>
                  <th style="width: 55px;">ĐVT</th>
                  <th style="width: 70px;">Số lượng</th>
                  <th style="width: 90px;">Chất lượng</th>
                  <th>Nhãn hiệu, quy cách, xuất xứ</th>
                  <th style="width: 110px;">S/N</th>
                  <th style="width: 90px;">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div style="font-size: 14px; margin-top: 10px; margin-bottom: 5px; text-align: left;">
              lý do Bàn giao: <span style="font-weight: bold; border-bottom: 1px dotted #000; padding-bottom: 1px; min-width: 250px; display: inline-block;">${handoverReason || '...........................................................................'}</span>
            </div>

            <div class="footer-note">
              Biên bản này được lập thành hai bản, mỗi bên giữ một bản, các bản có giá trị như nhau.
            </div>

            <table class="signature-table">
              <tr>
                <td>
                  <div class="sig-title">ĐẠI DIỆN BÊN GIAO</div>
                  <div class="sig-name" style="margin-top:80px;">${handoverGiverName || ''}</div>
                </td>
                <td>
                  <div class="sig-title">ĐẠI DIỆN BÊN NHẬN</div>
                  <div class="sig-name" style="margin-top:80px;">${handoverReceiverName || ''}</div>
                </td>
              </tr>
            </table>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          <\/script>
        </body>
      </html>
    `);
    win.document.close();
    addToast('Đã khởi tạo in biên bản bàn giao chuẩn form thành công!', 'success');
  };

  // --- EQUIPMENT USAGE HANDLERS ---
  const handlePrintUsageSlip = (slip: UsageSlip) => {
    const win = window.open('', '_blank');
    if (!win) {
      addToast('Vui lòng cho phép trình duyệt hiển thị tab/popup mới!', 'error');
      return;
    }
    win.document.write(`
      <html>
        <head>
          <title>Phiếu Báo Sử Dụng Thiết Bị - ${slip.sn}</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; margin: 40px; line-height: 1.6; }
            .header-table { width: 100%; border: none; margin-bottom: 30px; }
            .header-left { text-align: center; width: 45%; vertical-align: top; font-size: 11px; font-weight: bold; }
            .header-right { text-align: center; width: 55%; vertical-align: top; font-size: 11px; }
            .title { text-align: center; font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 30px 0 5px 0; color: #000; letter-spacing: 0.5px; }
            .subtitle { text-align: center; font-size: 12px; font-style: italic; color: #475569; margin-bottom: 30px; }
            .content-section { margin-bottom: 25px; }
            .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; color: #0f172a; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 20px; font-size: 12.5px; margin-bottom: 15px; }
            .info-item { display: flex; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
            .info-label { font-weight: 600; color: #334155; min-width: 160px; }
            .info-value { color: #0f172a; font-weight: bold; }
            .signature-section { margin-top: 50px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; font-size: 12.5px; page-break-inside: avoid; }
            .signature-box { font-weight: bold; color: #0f172a; }
            .signature-title { margin-bottom: 70px; text-transform: uppercase; font-size: 11.5px; }
            .stamp-area { height: 60px; margin-bottom: 15px; font-style: italic; font-weight: normal; color: #64748b; font-size: 11px; }
            .deco-line { border-top: 1px solid #000; width: 120px; margin: 5px auto 0 auto; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="header-left">
                <div style="text-transform: uppercase;">TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM</div>
                <div style="text-transform: uppercase; font-weight: 900; margin-top: 3px;">ĐỘI THÔNG TIN HÀNG KHÔNG</div>
                <div style="font-weight: normal; font-style: italic; margin-top: 2px;">Bộ phận: Quản lý Kho CNS/ATM</div>
                <div class="deco-line"></div>
              </td>
              <td class="header-right">
                <div style="font-weight: bold; text-transform: uppercase; font-size: 11.5px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div style="font-weight: bold; font-size: 11px; margin-top: 3px;">Độc lập - Tự do - Hạnh phúc</div>
                <div class="deco-line"></div>
                <div style="margin-top: 8px; font-size: 10px; color: #475569;">Số phiếu: SLIP-${slip.id.slice(-6).toUpperCase()}</div>
              </td>
            </tr>
          </table>

          <div class="title">PHIẾU BÁO SỬ DỤNG - BÀN GIAO THIẾT BỊ</div>
          <div class="subtitle">(Ngày xuất phiếu: ${slip.date})</div>

          <div class="content-section">
            <div class="section-title">I. Thông tin nhân sự thực hiện tác vụ</div>
            <div class="info-grid">
              <div class="info-item" style="grid-column: span 2;">
                <span class="info-label">Kỹ sư tiếp nhận sử dụng:</span>
                <span class="info-value" style="font-size: 14px; text-transform: uppercase; color: #1e3a8a;">${slip.user}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Đơn vị công tác:</span>
                <span class="info-value">Đội Thông Tin hàng không (CNS/ATM)</span>
              </div>
              <div class="info-item">
                <span class="info-label">Thời điểm bàn giao:</span>
                <span class="info-value">${slip.date}</span>
              </div>
            </div>
          </div>

          <div class="content-section">
            <div class="section-title">II. Thông tin thiết bị rút xuất từ kho</div>
            <div class="info-grid">
              <div class="info-item" style="grid-column: span 2;">
                <span class="info-label">Tên thiết bị linh kiện:</span>
                <span class="info-value text-indigo-900" style="font-size: 13.5px; color: #111827;">${slip.itemName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Số chế tạo S/N:</span>
                <span class="info-value" style="font-family: monospace; font-size: 13px;">${slip.sn}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Mã linh kiện P/N:</span>
                <span class="info-value">${slip.pn || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Phân nhóm chuyên ngành:</span>
                <span class="info-value">${slip.category}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Mã định vị kho (QR):</span>
                <span class="info-value" style="color: #4f46e5;">${slip.warehouse || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Vị trí kho bãi cũ:</span>
                <span class="info-value">${slip.originalLoc || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Số lượng xuất sử dụng:</span>
                <span class="info-value" style="font-size: 14px; color: #dc2626;">x${slip.qtyUsed} bộ / chiếc</span>
              </div>
            </div>
          </div>

          <div class="content-section">
            <div class="section-title">III. Mục đích áp dụng & hệ thống lắp đặt mới</div>
            <div class="info-grid">
              <div class="info-item" style="grid-column: span 2;">
                <span class="info-label">Mục đích sử dụng thiết bị:</span>
                <span class="info-value">${slip.purpose}</span>
              </div>
              <div class="info-item" style="grid-column: span 2;">
                <span class="info-label">Điểm lắp đặt mới / Hệ thống:</span>
                <span class="info-value">${slip.targetLocation || 'Chưa cập nhật'}</span>
              </div>
              <div class="info-item" style="grid-column: span 2; border-bottom: none;">
                <span class="info-label" style="display: block; margin-bottom: 5px;">Mô tả chi tiết kỹ thuật bàn giao:</span>
                <div style="padding: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11.5px; font-style: italic; min-height: 50px; text-align: left; width: 100%;">
                  ${slip.notes ? slip.notes : 'Kiểm thử đạt chuẩn đáp ứng tham số khai thác kỹ thuật, bàn giao đầy đủ phụ kiện kèm theo.'}
                </div>
              </div>
            </div>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-title">Người lập phiếu</div>
              <div class="stamp-area">(Ký và ghi rõ họ tên)</div>
              <div style="font-weight: 500; font-size: 11.5px; margin-top: 10px;">${role ? role.toUpperCase() : 'Guest'}</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">Kỹ sư nhận thiết bị</div>
              <div class="stamp-area">(Ký và ghi rõ họ tên)</div>
              <div style="font-weight: 500; font-size: 11.5px; margin-top: 10px; text-transform: uppercase;">${slip.user}</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">Đội Trưởng Đội Thông Tin</div>
              <div class="stamp-area">(Ký phê duyệt và đóng dấu)</div>
              <div style="font-weight: bold; font-size: 11.5px; margin-top: 10px; color: #475569;">Phê duyệt</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          <\/script>
        </body>
      </html>
    `);
    win.document.close();
    addToast(`Đã xuất phiếu sử dụng ${slip.sn} sang PDF / bản in thành công!`, 'success');
  };

  const handleSubmitUsage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForUsage) return;
    if (!usageUser.trim()) {
      addToast('Vui lòng nhập tên người nhận sử dụng thiết bị!', 'error');
      return;
    }
    if (usageQty < 1) {
      addToast('Số lượng sử dụng tối thiểu là 1!', 'error');
      return;
    }
    if (usageQty > selectedItemForUsage.qty) {
      addToast(`Số lượng sử dụng không được vượt quá tồn kho hiện tại (Tối đa x${selectedItemForUsage.qty})!`, 'error');
      return;
    }

    const todayStr = new Date().toLocaleString('vi-VN');
    const newSlip: UsageSlip = {
      id: `slip-${Date.now()}`,
      itemId: selectedItemForUsage.id,
      itemName: selectedItemForUsage.name,
      sn: selectedItemForUsage.sn,
      pn: selectedItemForUsage.pn || '',
      category: selectedItemForUsage.category || 'Khác',
      warehouse: selectedItemForUsage.warehouse || '',
      originalLoc: selectedItemForUsage.loc || '',
      user: usageUser.trim(),
      qtyUsed: usageQty,
      purpose: usagePurpose,
      notes: usageNotes.trim(),
      targetLocation: usageTargetLoc.trim(),
      date: todayStr
    };

    // 1. Save slip
    const nextSlips = [newSlip, ...usageSlips];
    setUsageSlips(nextSlips);
    localStorage.setItem('cns_usage_slips_v1', JSON.stringify(nextSlips));

    // 2. Deduct inventory if selected
    if (deductInventory) {
      const updatedInv = inventory.map(item => {
        if (item.id === selectedItemForUsage.id) {
          const newQty = item.qty - usageQty;
          
          // Log inside audit check history list
          const updatedHistory = item.history ? [...item.history] : [];
          updatedHistory.unshift({
            id: `h-use-${Date.now()}`,
            status: 'OK',
            date: todayStr,
            note: `Lắp đặt sử dụng x${usageQty} chiếc tại: ${usageTargetLoc.trim() || 'Hệ thống'} (Người nhận: ${usageUser.trim()})`,
            user: role || 'guest'
          });

          return {
            ...item,
            qty: newQty,
            history: updatedHistory
          };
        }
        return item;
      });
      saveInventoryLocally(updatedInv);
    }

    // Success indications
    playScanBeep(1000, 0.2);
    addToast('Đã đăng ký phiếu sử dụng thành công!', 'success');

    // Reset usage form states and close modal
    setUsageUser('');
    setUsageQty(1);
    setUsageNotes('');
    setUsageTargetLoc('');
    setSelectedItemForUsage(null);

    // Auto-open print window
    setTimeout(() => {
      handlePrintUsageSlip(newSlip);
    }, 500);
  };

  const handleClearUsageHistory = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa lịch sử phiếu báo',
      message: 'Hành động này sẽ xóa vĩnh viễn toàn bộ lịch sử các phiếu báo bàn giao đã lưu trên bộ nhớ cục bộ. Có chắc chắn tiếp tục?',
      onConfirm: () => {
        setUsageSlips([]);
        localStorage.removeItem('cns_usage_slips_v1');
        addToast('Đã xóa trắng lịch sử các phiếu báo sử dụng.', 'info');
        playScanBeep(300, 0.25);
        setConfirmDialog(null);
      }
    });
  };

  const handleDeleteUsageSlip = (slipId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa phiếu báo bàn giao',
      message: 'Bạn có chắc chắn muốn xóa phiếu báo này ra khỏi nhật ký lưu trữ?',
      onConfirm: () => {
        const remaining = usageSlips.filter(s => s.id !== slipId);
        setUsageSlips(remaining);
        localStorage.setItem('cns_usage_slips_v1', JSON.stringify(remaining));
        addToast('Đã xóa phiếu báo sử dụng được chọn.', 'success');
        playScanBeep(400, 0.1);
        setConfirmDialog(null);
      }
    });
  };

  // --- OFFLINE BACKUP UTILITY (JSON TRANSFER) ---
  const handleExportJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inventory, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `CNS_ATM_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      addToast('Xuất tệp sao lưu JSON thành công!', 'success');
      playScanBeep(1000, 0.1);
    } catch (e) {
      addToast('Không thể xuất tệp sao lưu!', 'error');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const hasMinimumFields = parsed.every((item: any) => item && typeof item === 'object' && 'sn' in item && 'name' in item);
          if (hasMinimumFields) {
            saveInventoryLocally(parsed);
            
            // Auto sync custom types of devices
            const importedCats = parsed
              .map((it: any) => it.category)
              .filter((cat: any) => typeof cat === 'string' && cat.trim() !== '');
            const combined = Array.from(new Set([...categories, ...importedCats]));
            saveCategoriesLocally(combined);

            addToast(`Đồng bộ offline thành công! Đã khôi phục ${parsed.length} thiết bị và đồng bộ phân loại máy.`, 'success');
            playScanBeep(1000, 0.25);
          } else {
            addToast('Cấu trúc file JSON backup không khớp định dạng cơ sở!', 'error');
          }
        } else {
          addToast('File backup phải là một danh sách JSON hợp lệ!', 'error');
        }
      } catch (err) {
        addToast('Lỗi phân tích file JSON. Có thể tệp đã bị lỗi!', 'error');
      }
    };
    fileReader.readAsText(file);
    e.target.value = '';
  };

  // --- SCAN BARCODE / QR SIMULATOR PROCESSING ---
  const handleSimulatedScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanInputCode.trim()) {
      setScanMessage({ text: 'Vui lòng chọn hoặc nhập mã hàng rọi quét!', type: 'error' });
      playScanBeep(200, 0.3);
      return;
    }

    const cleanCode = scanInputCode.trim().toUpperCase();
    
    // Search by either Warehouse Code (Mã Kho) or Serial Number (S/N)
    const matchingItemsIdx = inventory.reduce<number[]>((acc, item, idx) => {
      if (
        (item.warehouse && item.warehouse.toUpperCase() === cleanCode) ||
        item.sn.toUpperCase() === cleanCode
      ) {
        acc.push(idx);
      }
      return acc;
    }, []);

    if (matchingItemsIdx.length === 0) {
      setScanMessage({ 
        text: `Không tìm thấy thiết bị nào khớp với mã "${cleanCode}"!`, 
        type: 'error' 
      });
      playScanBeep(200, 0.4);
      return;
    }

    // Update state of found item(s)
    const nowStr = new Date().toLocaleString('vi-VN');
    const updated = [...inventory];
    
    matchingItemsIdx.forEach(idx => {
      const i = updated[idx];
      const entry: AuditHistoryEntry = {
        id: `h-${Date.now()}-${idx}`,
        status: scanStatus,
        date: nowStr,
        note: scanNote.trim() || 'Kiểm kê tự động bằng hệ thống quét ảo',
        user: role || 'guest'
      };
      
      updated[idx] = {
        ...i,
        auditStatus: scanStatus,
        auditDate: nowStr,
        auditNote: scanNote.trim() || 'Quét mã xác nhận Đủ',
        history: i.history ? [entry, ...i.history] : [entry]
      };
    });

    saveInventoryLocally(updated);
    playScanBeep(scanStatus === 'OK' ? 1047 : 330, 0.16); // High pitch beep for OK, lower for warning
    setScanMessage({ 
      text: `Đã cập nhật trạng thái kiểm cho ${matchingItemsIdx.length} mã thiết bị khớp với: ${cleanCode}!`, 
      type: 'success' 
    });
    setScanNote('');
    setScanInputCode('');

    addToast(`Quét thành công! Thiết bị đã được đánh dấu ${scanStatus === 'OK' ? 'ĐỦ' : 'THIẾU'}.`, 'success');

    // Trigger Cloud Autosync if checked
    if (syncConfig.autoSync) {
      syncToCloud();
    }
  };

  // Immediate layout print
  const startPrintSession = (type: 'QR' | 'LABEL') => {
    setPrintLayout(type);
    addToast('Đang tạo form in... Hệ thống sẽ tự kích hoạt hộp thoại in.', 'info');
    setTimeout(() => {
      window.print();
      // Reset back afterwards
      setTimeout(() => {
        setPrintLayout('NONE');
      }, 1000);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col antialiased">
      
      {/* Toast Alert Rail */}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 w-full max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-5 py-4 rounded-2xl shadow-xl text-white font-medium text-sm flex items-start gap-3 border border-white/10 animate-slide-in transition-all duration-300 ${
              t.type === 'success' ? 'bg-emerald-600 dark:bg-emerald-700' :
              t.type === 'error' ? 'bg-rose-600 dark:bg-rose-700' : 'bg-slate-800 dark:bg-slate-900'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-150" />}
            {t.type === 'error' && <XCircle className="w-5 h-5 shrink-0 text-rose-150" />}
            {t.type === 'info' && <AlertCircle className="w-5 h-5 shrink-0 text-sky-150" />}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Printable Area - Only Visible in window.print() context */}
      {printLayout !== 'NONE' && (
        <div className="hidden printable-area">
          {printLayout === 'QR' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                <h2 style={{ textTransform: 'uppercase', fontSize: '16px', margin: '0' }}>DANH SÁCH MÃ QR TRUY XUẤT VẬT TƯ</h2>
                <span style={{ fontSize: '11px', color: '#666' }}>Đội Thông Tin CNS/ATM - Ngày in: {new Date().toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="qr-print-grid">
                {inventory.filter(item => item.warehouse).map(item => (
                  <div key={item.id} className="qr-print-item">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5px' }}>
                      <QRCodeSVG value={item.warehouse || ''} size={110} level="M" />
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{item.warehouse}</div>
                    <div style={{ fontSize: '9px', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace' }}>S/N: {item.sn}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {printLayout === 'LABEL' && (
            <div>
              <div className="label-print-grid">
                {inventory.map(item => (
                  <div key={item.id} className="label-print-item">
                    <div>
                      <div style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '3px', marginBottom: '5px' }}>
                        TẬP ĐOÀN QUẢN LÝ BAY - ĐỘI THÔNG TIN
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '800', lineHeight: '1.2', color: '#000', textTransform: 'uppercase' }}>
                        {item.name}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '10px', color: '#333' }}>
                        <div><strong>P/N:</strong> {item.pn || 'N/A'}</div>
                        <div><strong>S/N:</strong> <span style={{ fontFamily: 'monospace' }}>{item.sn}</span></div>
                        {item.loc && <div><strong>Vị trí:</strong> {item.loc}</div>}
                      </div>
                      
                      {item.warehouse ? (
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <QRCodeSVG value={item.warehouse} size={65} />
                          <div style={{ fontSize: '8px', fontWeight: 'bold', marginTop: '2px' }}>{item.warehouse}</div>
                        </div>
                      ) : (
                        <div style={{ width: '65px', height: '65px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#777' }}>
                          NO QR
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Confirmation Overlay Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[90000] p-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 text-center animate-scale-in">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-rose-100 dark:border-rose-900/30">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              {confirmDialog.title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-2xl text-sm transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl text-sm shadow-lg shadow-rose-650/20 transition-colors cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- NOT LOGGED IN WRAPPER --- */}
      {!role ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 px-8 py-10 sm:px-10 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/20">
                <QrCode className="w-8 h-8 text-white animate-spin-slow" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">KHO CNS & ATM</h1>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-2.5 uppercase tracking-widest">
                Đội Thông Tin Hàng Không
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase ml-1">
                  Tài khoản đăng nhập
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-slate-400"
                    placeholder="Nhập 'admin' hoặc 'guest'"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase ml-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-slate-400"
                    placeholder="Mật khẩu tương ứng"
                  />
                </div>
              </div>

              {loginError && (
                <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl text-xs font-medium border border-rose-100 dark:border-rose-900/40">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all outline-none font-sans text-sm tracking-wide mt-5 active:scale-[0.98] cursor-pointer"
              >
                ĐĂNG NHẬP HỆ THỐNG
              </button>
            </form>

            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 text-center text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
              <p className="font-bold">Nhãn gợi ý đăng nhập:</p>
              <p className="mt-1">Vai Quản lý: <span className="font-mono text-slate-600 dark:text-slate-300">admin / admin</span> • Vai Kiểm kê: <span className="font-mono text-slate-600 dark:text-slate-300">guest / 123456</span></p>
            </div>
          </div>
        </div>
      ) : (
        /* --- MAIN LOGGED APPLICATION --- */
        <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Header Row */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800/60">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500 rounded-xl text-white shadow-md shadow-indigo-500/10">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    VẬT TƯ CNS/ATM
                    <span className="text-[9px] translate-y-[-4px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-extrabold uppercase">
                      Tổ Thông Tin
                    </span>
                  </h1>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống quản lý định danh & kiểm định hiện vật nội bộ
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
              {/* Sync Quick Tag */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-3.5 py-1.5 rounded-2xl shadow-sm text-xs font-semibold">
                <span className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'syncing' ? 'bg-indigo-500 animate-ping' : syncStatus === 'success' ? 'bg-emerald-500' : syncStatus === 'error' ? 'bg-rose-500' : 'bg-slate-350'}`}></span>
                <span className="text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                  {syncStatus === 'syncing' ? 'Đang sync...' : syncStatus === 'success' ? 'Đã Sync Cloud' : 'Offline'}
                </span>
                {syncConfig.lastSynced && (
                  <span className="text-[10px] text-slate-400 ml-1 font-normal">({syncConfig.lastSynced})</span>
                )}
              </div>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm transition-all focus:outline-none cursor-pointer"
                aria-label="Đổi giao diện"
              >
                {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-600" />}
              </button>

              {/* Settings modal button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm transition-all focus:outline-none cursor-pointer"
                title="Cấu hình Google Apps Script"
              >
                <Settings className="w-4.5 h-4.5 text-slate-500 hover:text-indigo-500 transition-colors" />
              </button>

              {/* Profile Card / Logout */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 pl-3 pr-1 py-1 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-extrabold uppercase text-slate-700 dark:text-slate-200">{role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-405 font-bold rounded-xl transition-all cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </header>

          {/* Key statistical bento overview cards */}
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-[1.8rem] shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng sản phẩm</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalItems}</h3>
                <p className="text-[10px] text-slate-500">Mã danh mục lưu</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 border border-indigo-100/55 dark:border-indigo-900/35">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-[1.8rem] shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng số lượng</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalQty}</h3>
                <p className="text-[10px] text-slate-500">Cái / chiếc tồn kho</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 border border-emerald-100/55 dark:border-emerald-900/35">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-[1.8rem] shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Đã kiểm kê</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.checkedCount} <span className="text-xs font-normal text-slate-400">/ {stats.totalItems}</span>
                </h3>
                <p className="text-[10px] text-slate-500">{Math.round((stats.checkedCount / (stats.totalItems || 1)) * 100)}% hoàn thành</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-sky-600 border border-sky-100/55 dark:border-sky-900/35">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-[1.8rem] shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Thiếu/Hỏng hóc</p>
                <h3 className={`text-2xl font-black ${stats.missingCount > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                  {stats.missingCount}
                </h3>
                <p className="text-[10px] text-slate-500">Thiết bị cần hồi báo</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${stats.missingCount > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-100 dark:border-rose-900/35' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                <XCircle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white p-5 rounded-[1.8rem] shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Độ an toàn kho</p>
                <h3 className="text-3xl font-black tracking-tight">{stats.healthRate}%</h3>
                <p className="text-[10px] text-indigo-150">Độ khớp danh mục tốt</p>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Check className="w-6 h-6 text-white" />
              </div>
            </div>
          </section>

          {/* Quick Tools & Cloud Sync Toolbar */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[2rem] p-4.5 mt-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            
            {/* Realtime Search with Clear Button */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm: Tên thiết bị, P/N, S/N, Mã Kho..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-smplaceholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* General Actions Block */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              
              {/* Cloud Sync Manual Actions */}
              <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 dark:bg-slate-850 p-1">
                <button
                  onClick={fetchCloudData}
                  disabled={syncStatus === 'syncing'}
                  className="p-2 px-3 text-[10px] uppercase font-extrabold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Tải cấu trúc từ đám mây về đè đắp bộ nhớ máy"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${syncStatus==='syncing'?'animate-spin':''}`} />
                  Tải Về (PULL)
                </button>
                <button
                  onClick={syncToCloud}
                  disabled={syncStatus === 'syncing'}
                  className="p-2 px-3 text-[10px] uppercase font-extrabold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Tải tất cả các bản ghi hiện có đẩy ngược lên Cloud"
                >
                  Đẩy Lên (PUSH)
                </button>
              </div>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden md:block mx-1"></div>

              {/* Advanced Scanning Trigger */}
              <button
                onClick={() => {
                  setIsScannerOpen(true);
                  setScanMessage(null);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-600/10 transition-colors text-xs tracking-wide cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                KIỂM KÊ (QUÉT)
              </button>

              {/* Printer Menus dropdown triggers */}
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-850 rounded-xl p-1">
                <button
                  onClick={() => startPrintSession('QR')}
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="In bộ mã QR cho thiết bị có Mã Kho"
                >
                  <Printer className="w-3.5 h-3.5" />
                  MÃ QR
                </button>
                <button
                  onClick={() => startPrintSession('LABEL')}
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="In tem dán nhãn chuẩn kỹ thuật cho tất cả các thiết bị"
                >
                  TEM NHÃN
                </button>
              </div>

              {/* Export Tools Group */}
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-850 rounded-xl p-1">
                <button
                  onClick={handleExportExcel}
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-emerald-600 dark:text-emerald-400 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Xuất bảng Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  EXCEL
                </button>
                <button
                  onClick={handleExportWebBill}
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-indigo-600 dark:text-indigo-400 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Xuất biên bản kiểm định PDF chuyên nghiệp"
                >
                  <FileText className="w-3.5 h-3.5" />
                  BIÊN BẢN
                </button>
                <button
                  onClick={() => {
                    setIsHandoverModalOpen(true);
                    if (handoverRows.length === 0 && inventory.length > 0) {
                      // Prefill first item if empty
                      const initialRows = inventory.slice(0, 1).map(item => ({
                        id: item.id,
                        name: item.name,
                        unit: 'Cái',
                        qty: 1,
                        quality: 'Tốt (Mới 100%)',
                        specs: `${item.pn ? 'P/N: ' + item.pn + '. ' : ''}Quy cách chuẩn`,
                        sn: item.sn,
                        note: ''
                      }));
                      setHandoverRows(initialRows);
                    }
                  }}
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-rose-600 dark:text-rose-400 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer border-l border-slate-200 dark:border-slate-750 pl-2"
                  title="Lập và in Biên Bản Bàn Giao thiết bị, tài sản, công cụ chuẩn form Quản lý bay"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  BB BÀN GIAO
                </button>
                <button
                  onClick={() => setIsUsageHistoryOpen(true)}
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-amber-600 dark:text-amber-400 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer border-l border-slate-200 dark:border-slate-750 pl-2"
                  title="Xem lịch sử và quản lý danh sách các Phiếu Báo Sử Dụng Thiết Bị"
                >
                  <History className="w-3.5 h-3.5" />
                  PHIẾU SỬ DỤNG ({usageSlips.length})
                </button>
              </div>

            </div>
          </section>

          {/* Catalog Selection & Sub Filters Rows */}
          <div className="mt-6 flex flex-col lg:flex-row gap-5 items-start lg:items-stretch">
            
            {/* Category Pills (Left) */}
            <div className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[2rem] p-4 shadow-sm flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mr-2 ml-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-indigo-500" /> Loại máy:
              </span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10' 
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Verification Filters (Right) */}
            <div className="w-full lg:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[2rem] p-4 shadow-sm flex flex-wrap gap-1 items-center">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mr-2 ml-1">
                Kiểm kê:
              </span>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-[11px] font-bold">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setStatusFilter('OK')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'OK' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
                >
                  Tốt / Đủ ({inventory.filter(i => i.auditStatus === 'OK').length})
                </button>
                <button
                  onClick={() => setStatusFilter('MISSING')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'MISSING' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500'}`}
                >
                  Thiếu / Hỏng ({inventory.filter(i => i.auditStatus === 'MISSING').length})
                </button>
                <button
                  onClick={() => setStatusFilter('UNCHECKED')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'UNCHECKED' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-350 shadow-sm' : 'text-slate-500'}`}
                >
                  Chưa kiểm ({inventory.filter(i => i.auditStatus === null).length})
                </button>
              </div>
            </div>
          </div>

          {/* Core Body Container (Bento Grid layout: Left Form/Stats if admin, Right Main Database list) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            
            {/* ADMIN CONTROLLER FORM (Only visible to admin) */}
            {role === 'admin' ? (
              <div id="editor-panel" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[2.2rem] p-6 shadow-sm h-fit">
                <div className="flex items-center gap-2 mb-4">
                  <span className="p-1 px-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg uppercase">
                    Admin Form
                  </span>
                  <h2 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                    {editingItemId ? 'Cập Nhật Thiết Bị' : 'Thêm Mới Thiết Bị'}
                  </h2>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">Tên thiết bị *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="VD: Máy thu phát VHF Jotron"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-semibold placeholder:text-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1 ml-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Phân loại</label>
                        {!isAddingNewCat ? (
                          <button 
                            type="button" 
                            onClick={() => setIsAddingNewCat(true)}
                            className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" /> Thêm nhanh
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            onClick={() => { setIsAddingNewCat(false); setNewCatInput(''); }}
                            className="text-[9px] font-bold text-rose-500 hover:underline cursor-pointer"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                      {!isAddingNewCat ? (
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-extrabold"
                        >
                          {categories.filter(cat => cat !== 'Tất cả loại').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Phân loại..."
                            value={newCatInput}
                            onChange={(e) => setNewCatInput(e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1.5 rounded-xl border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = newCatInput.trim();
                              if (trimmed) {
                                if (!categories.includes(trimmed)) {
                                  const updated = [...categories, trimmed];
                                  saveCategoriesLocally(updated);
                                  setFormCategory(trimmed);
                                  addToast(`Đã thêm loại: ${trimmed}`, 'success');
                                  playScanBeep(1000, 0.1);
                                } else {
                                  setFormCategory(trimmed);
                                }
                                setIsAddingNewCat(false);
                                setNewCatInput('');
                              } else {
                                addToast('Tên loại không được trống!', 'error');
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-[32px] px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                          >
                            Lưu
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">Số lượng</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formQty}
                        onChange={(e) => setFormQty(Math.max(1, Number(e.target.value)))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">P/N (Model)</label>
                      <input
                        type="text"
                        value={formPn}
                        onChange={(e) => setFormPn(e.target.value)}
                        placeholder="Mã Model"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-semibold placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">S/N *</label>
                      <input
                        type="text"
                        required
                        value={formSn}
                        onChange={(e) => setFormSn(e.target.value)}
                        placeholder="Số Sê-ri"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-mono font-bold placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">Mã Kho (QR)</label>
                      <input
                        type="text"
                        value={formWarehouse}
                        onChange={(e) => setFormWarehouse(e.target.value)}
                        placeholder="VD: KHO-01"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-bold placeholder:text-slate-400 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">Vị trí tủ / ngăn</label>
                      <input
                        type="text"
                        value={formLoc}
                        onChange={(e) => setFormLoc(e.target.value)}
                        placeholder="Tủ 2 - Ngăn B"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-semibold placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm shadow-indigo-600/10 cursor-pointer text-center"
                    >
                      {editingItemId ? 'LƯU CHỈNH SỬA' : 'THÊM MỚI KHO'}
                    </button>
                    <button
                      type="button"
                      onClick={clearForm}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // GUEST VIEW HELPER (Simple introduction block)
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[2.2rem] p-6 shadow-sm h-fit space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 text-[9px] font-black rounded-lg uppercase">
                    Quyền kiểm kê
                  </span>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Tài khoản Guest</h2>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bạn đang đăng nhập bằng quyền <strong className="text-slate-700 dark:text-slate-200">Kiểm kê viên (Guest)</strong>. 
                  Bạn có thể tra cứu nhanh, kiểm kê bằng QR code ngoại vi và kết xuất báo cáo Excel/Biên bản.
                </p>
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/40 rounded-2xl flex gap-2">
                  <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                    Để chỉnh sửa thông số kỹ thuật (S/N, P/N, Số lượng, Loại máy), vui lòng đăng nhập bằng quyền Quản trị viên (Admin).
                  </p>
                </div>
              </div>
            )}

            {/* MAIN STOCK LIST TABLE */}
            <div className={`bg-white dark:bg-slate-900 rounded-[2.2rem] border border-slate-200 dark:border-slate-850 overflow-hidden shadow-sm flex flex-col min-h-[500px] ${role === 'admin' ? 'lg:col-span-3' : 'lg:col-span-3'}`}>
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                    DANH MỤC THIẾT BỊ DÀI HẠN ({filteredInventory.length})
                  </span>
                </div>
                
                {/* Reset button for all tests */}
                {role === 'admin' && (
                  <button
                    onClick={handleResetFiltersAndStatus}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors cursor-pointer border border-dashed border-slate-200 dark:border-slate-700 hover:border-rose-400 px-2.5 py-1 rounded-lg"
                    title="Hủy kiểm kê toàn bộ thiết bị về ban đầu"
                  >
                    Reset Kiểm kê
                  </button>
                )}
              </div>

              {/* Table rendering panel */}
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block table-container overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-xs text-left whitespace-nowrap min-w-[750px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3 w-12 text-center">STT</th>
                      <th className="px-5 py-3">Danh xưng & Thông số</th>
                      <th className="px-5 py-3">Serial (S/N)</th>
                      <th className="px-5 py-3 text-center">Mã Kho (QR)</th>
                      <th className="px-5 py-3 text-center w-20">SL</th>
                      <th className="px-5 py-3 text-center">Tình hình (Kiểm)</th>
                      <th className="px-5 py-3 text-center w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-slate-400" />
                          </div>
                          <p className="text-slate-400 max-w-sm mx-auto font-medium text-xs leading-relaxed">
                            Không có thiết bị vật tư nào thỏa mãn bộ lọc hiện tại. Thử xóa hoặc thay đổi từ khóa tìm kiếm.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredInventory.map((item, idx) => {
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-all group">
                            <td className="px-5 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => setSelectedItemDetail(item)}>
                                  {item.name}
                                </span>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">{item.category || 'Khác'}</span>
                                  {item.pn && (
                                    <>
                                      <span>•</span>
                                      <span>P/N: <strong className="text-slate-600 dark:text-slate-350 font-medium">{item.pn}</strong></span>
                                    </>
                                  )}
                                  {item.loc && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3 text-indigo-400" /> {item.loc}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 font-mono font-semibold text-slate-700 dark:text-slate-300">{item.sn}</td>
                            <td className="px-5 py-4 text-center">
                              {item.warehouse ? (
                                <span className="inline-block bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-450 px-2 py-0.5 rounded font-black text-[10px] border border-indigo-100/50 dark:border-indigo-900/35 uppercase">
                                  {item.warehouse}
                                </span>
                              ) : (
                                <span className="text-slate-350 italic text-[10px]">- Chưa cấp -</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center font-black text-slate-800 dark:text-slate-200">{item.qty}</td>
                            <td className="px-5 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {item.auditStatus === 'OK' ? (
                                  <span className="inline-flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-extrabold text-[10px] border border-emerald-100 dark:border-emerald-900/30">
                                    ● ĐỦ / TỐT
                                  </span>
                                ) : item.auditStatus === 'MISSING' ? (
                                  <span className="inline-flex items-center gap-0.5 bg-rose-50 dark:bg-rose-955/40 text-rose-600 dark:text-rose-450 px-2 py-0.5 rounded font-extrabold text-[10px] border border-rose-100 dark:border-rose-900/30">
                                    ▲ THIẾU
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold text-[10px] border border-slate-200 dark:border-slate-750">
                                    Chưa kiểm
                                  </span>
                                )}
                                {item.auditDate && (
                                  <span className="text-[8px] text-slate-400 font-normal">
                                    {item.auditDate.split(' ')[0]}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2.5 justify-center">
                                {/* Quick verification checkboxes */}
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/50 dark:border-slate-700">
                                  <button
                                    onClick={() => handleQuickStatusClick(item, item.auditStatus === 'OK' ? null : 'OK')}
                                    className={`p-1 rounded text-[9px] font-bold cursor-pointer transition-all ${
                                      item.auditStatus === 'OK' 
                                        ? 'bg-emerald-500 text-white shadow-sm' 
                                        : 'text-slate-500 hover:text-emerald-500'
                                    }`}
                                    title="Duyệt nhanh: Đủ / Tốt"
                                  >
                                    Đủ
                                  </button>
                                  <button
                                    onClick={() => handleQuickStatusClick(item, item.auditStatus === 'MISSING' ? null : 'MISSING')}
                                    className={`p-1 rounded text-[9px] font-bold cursor-pointer transition-all ${
                                      item.auditStatus === 'MISSING' 
                                        ? 'bg-rose-500 text-white shadow-sm' 
                                        : 'text-slate-500 hover:text-rose-500'
                                    }`}
                                    title="Duyệt nhanh: Thiếu hụt"
                                  >
                                    Thiếu
                                  </button>
                                </div>

                                <div className="h-4 w-px bg-slate-200 dark:bg-slate-750"></div>

                                {/* Custom detail lookup / view */}
                                <button
                                  onClick={() => setSelectedItemDetail(item)}
                                  className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
                                  title="Xem lịch sử kiểm kê"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>

                                {/* Báo cáo sử dụng thiết bị */}
                                <button
                                  onClick={() => {
                                    setSelectedItemForUsage(item);
                                    setUsageQty(1);
                                    setUsageUser(role === 'admin' ? 'Kỹ sư Đội Thông Tin' : 'Kỹ sư ' + (role || 'Guest'));
                                    setUsageTargetLoc('');
                                    setUsageNotes('');
                                    setDeductInventory(item.qty > 0);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                                  title="Sử dụng thiết bị này (Xuất phiếu PDF báo cáo)"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete and edit standard toggles (Admin only) */}
                                {role === 'admin' && (
                                  <>
                                    <button
                                      onClick={() => handleEditClick(item)}
                                      className="p-1 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                                      title="Chỉnh sửa thông số máy"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(item)}
                                      className="p-1 text-slate-450 hover:text-rose-500 transition-colors cursor-pointer"
                                      title="Xóa thiết bị này"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW */}
              <div className="block md:hidden flex-1 p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar bg-slate-50/20 dark:bg-slate-950/10">
                {filteredInventory.length === 0 ? (
                  <div className="px-6 py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-400 font-medium text-xs leading-relaxed">
                      Không có thiết bị vật tư nào thỏa mãn bộ lọc hiện tại.
                    </p>
                  </div>
                ) : (
                  filteredInventory.map((item, idx) => {
                    return (
                      <div 
                        key={item.id} 
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-150 dark:border-slate-800/80 shadow-sm flex flex-col gap-3.5 relative overflow-hidden"
                      >
                        {/* Upper row: STT badge & Category tag & Audit Status */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-[10px] font-black">
                              {idx + 1}
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase">
                              {item.category || 'Khác'}
                            </span>
                          </div>
                          
                          {/* Audit Status pill */}
                          <div>
                            {item.auditStatus === 'OK' ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-lg font-black text-[9px] border border-emerald-100 dark:border-emerald-900/30">
                                ● ĐỦ / TỐT
                              </span>
                            ) : item.auditStatus === 'MISSING' ? (
                              <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-955/40 text-rose-600 dark:text-rose-450 px-2 py-0.5 rounded-lg font-black text-[9px] border border-rose-100 dark:border-rose-900/30">
                                ▲ THIẾU
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-lg font-bold text-[9px] border border-slate-200 dark:border-slate-750">
                                Chưa kiểm
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Name of item - Wrap full line beautifully */}
                        <div className="space-y-1 cursor-pointer" onClick={() => setSelectedItemDetail(item)}>
                          <h4 className="font-extrabold text-xs sm:text-xs text-slate-900 dark:text-white leading-relaxed break-words">
                            {item.name}
                          </h4>
                          {item.auditDate && (
                            <p className="text-[9px] text-slate-400 flex items-center gap-1 font-semibold">
                              <Clock className="w-3 h-3 text-indigo-400" /> Kiểm lần cuối: {item.auditDate}
                            </p>
                          )}
                        </div>

                        {/* Middle detailed metadata block - highly scannable grid */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 bg-slate-50 dark:bg-slate-850/50 p-2.5 rounded-xl text-[10.5px] border border-slate-100 dark:border-slate-800/40 font-semibold text-slate-500">
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-slate-450 block mb-0.5">Mã Serial S/N</span>
                            <span className="font-mono text-slate-800 dark:text-slate-200 font-black">{item.sn}</span>
                          </div>
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-slate-450 block mb-0.5">Part Number</span>
                            <span className="text-slate-800 dark:text-slate-200 truncate block font-bold">{item.pn || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-slate-450 block mb-0.5">Mã Kho (QR)</span>
                            {item.warehouse ? (
                              <span className="inline-block bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[9px] font-black border border-indigo-100 dark:border-indigo-900/30 uppercase">
                                {item.warehouse}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic font-normal text-[9.5px]">- Chưa cấp -</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-slate-450 block mb-0.5">Số Lượng & Vị trí</span>
                            <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1 font-bold">
                              <span className="font-black text-indigo-600 dark:text-indigo-400">x{item.qty} bộ</span>
                              {item.loc && <span className="text-[9px] font-normal truncate max-w-[65px]" title={item.loc}>({item.loc})</span>}
                            </span>
                          </div>
                        </div>

                        {/* Actions block with 44px touch targets on mobile */}
                        <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-1.5 justify-between">
                          {/* Quick checklist buttons - touch target 38px inside 44px layout */}
                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/50 dark:border-slate-700">
                            <button
                              onClick={() => handleQuickStatusClick(item, item.auditStatus === 'OK' ? null : 'OK')}
                              className={`h-9 px-3.5 rounded-lg text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1 ${
                                item.auditStatus === 'OK' 
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/15' 
                                  : 'text-slate-500 hover:text-emerald-500'
                              }`}
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              Đủ
                            </button>
                            <button
                              onClick={() => handleQuickStatusClick(item, item.auditStatus === 'MISSING' ? null : 'MISSING')}
                              className={`h-9 px-3.5 rounded-lg text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1 ${
                                item.auditStatus === 'MISSING' 
                                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/15' 
                                  : 'text-slate-500 hover:text-rose-500'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Thiếu
                            </button>
                          </div>

                          {/* Detail lookups & Admin modifiers - clear touch sizes */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedItemDetail(item)}
                              className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 border border-slate-250 dark:border-slate-750 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Xem lịch sử kiểm kê"
                            >
                              <History className="w-4 h-4" />
                            </button>

                            {/* Báo cáo sử dụng thiết bị */}
                            <button
                              onClick={() => {
                                setSelectedItemForUsage(item);
                                setUsageQty(1);
                                setUsageUser(role === 'admin' ? 'Kỹ sư Đội Thông Tin' : 'Kỹ sư ' + (role || 'Guest'));
                                setUsageTargetLoc('');
                                setUsageNotes('');
                                setDeductInventory(item.qty > 0);
                              }}
                              className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 border border-amber-200/55 dark:border-amber-900/35 flex items-center justify-center text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                              title="Sử dụng thiết bị này (Xuất phiếu PDF báo cáo)"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            {/* Admin only action controls */}
                            {role === 'admin' && (
                              <>
                                <button
                                  onClick={() => handleEditClick(item)}
                                  className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/30 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 transition-colors cursor-pointer"
                                  title="Sửa thiết bị"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(item)}
                                  className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-100/30 dark:bg-rose-955/40 dark:hover:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-450 transition-colors cursor-pointer"
                                  title="Xóa thiết bị"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Table stats footer */}
              <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-semibold text-slate-500 flex justify-between items-center flex-wrap gap-2">
                <span>
                  Hiển thị <strong className="text-slate-700 dark:text-slate-350">{filteredInventory.length}</strong> dòng vật tư (Tổng số lượng: <strong className="text-slate-700 dark:text-slate-350">{filteredInventory.reduce((s, i)=>s+i.qty,0)}</strong> bộ)
                </span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Cơ sở bộ nhớ an toàn</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EXTRA ADVANCED MODAL: SCANNER SIMULATOR CLIENT --- */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-950/60 dark:bg-black/90 backdrop-blur-md flex items-center justify-center z-[80000] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-800/80 overflow-hidden animate-scale-in">
            
            {/* Header */}
            <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-500" />
                Kiểm Kê Thiết Bị Qua Quét Mã (Simulated)
              </h3>
              <button
                onClick={() => setIsScannerOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Feed Viewport */}
            <div className="relative bg-slate-900 h-44 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.4)_100%)]"></div>
              
              {/* Scan Reticle corners styling */}
              <div className="absolute w-36 h-28 border-2 border-indigo-400/40 rounded-xl flex items-center justify-center">
                <div className="absolute top-[-3px] left-[-3px] w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                <div className="absolute top-[-3px] right-[-3px] w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                <div className="absolute bottom-[-3px] left-[-3px] w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                <div className="absolute bottom-[-3px] right-[-3px] w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
                <QrCode className="w-12 h-12 text-indigo-400/30 animate-pulse" />
              </div>

              {/* Laser line effect */}
              <div className="scanner-laser"></div>

              {/* Terminal status line overlay */}
              <div className="absolute top-3 left-4 text-[9px] font-mono text-emerald-400 tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                <span>CHÚ Ý: MODULE SCANNER ONLINE</span>
              </div>
            </div>

            {/* Form controls */}
            <form onSubmit={handleSimulatedScanSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase ml-1">
                  Nhập mã quét thiết bị (Mã Kho hoặc S/N) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={scanInputCode}
                    onChange={(e) => {
                      setScanInputCode(e.target.value);
                      if (scanMessage) setScanMessage(null);
                    }}
                    placeholder="VD: KHO-VHF-01 hoặc RS100429402"
                    className="w-full text-center px-4 py-3 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-sm font-mono font-bold"
                  />
                </div>
              </div>

              {/* Quick simulation pills triggers */}
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">
                  Nhấp vào mã thử nghiệm nhanh để rọi quét (S/N / Mã Kho)
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar justify-center">
                  {inventory.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setScanInputCode(item.warehouse || item.sn);
                        setScanMessage(null);
                        playScanBeep(600, 0.05);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono text-slate-600 dark:text-slate-300 font-bold hover:border-indigo-400 transition-colors shrink-0 cursor-pointer"
                    >
                      {item.warehouse || item.sn.slice(0, 6) + '...'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Radio buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold font-sans tracking-wide bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent has-checked:border-emerald-500 has-checked:bg-emerald-50/20 dark:has-checked:bg-emerald-950/20">
                  <input
                    type="radio"
                    name="scanStatus"
                    checked={scanStatus === 'OK'}
                    onChange={() => setScanStatus('OK')}
                    className="sr-only"
                  />
                  <CheckCircle2 className={`w-4 h-4 ${scanStatus==='OK'?'text-emerald-500':'text-slate-400'}`} />
                  <span className={scanStatus==='OK'?'text-emerald-500':'text-slate-500 dark:text-slate-400'}>ĐỦ / TỐT (OK)</span>
                </label>

                <label className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold font-sans tracking-wide bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent has-checked:border-rose-500 has-checked:bg-rose-50/20 dark:has-checked:bg-rose-950/20">
                  <input
                    type="radio"
                    name="scanStatus"
                    checked={scanStatus === 'MISSING'}
                    onChange={() => setScanStatus('MISSING')}
                    className="sr-only"
                  />
                  <XCircle className={`w-4 h-4 ${scanStatus==='MISSING'?'text-rose-500':'text-slate-400'}`} />
                  <span className={scanStatus==='MISSING'?'text-rose-500':'text-slate-500 dark:text-slate-400'}>THIẾU / HỎNG</span>
                </label>
              </div>

              {/* Optional comments notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">
                  Đánh giá chi tiết (Ghi chú tùy chọn)
                </label>
                <input
                  type="text"
                  value={scanNote}
                  onChange={(e) => setScanNote(e.target.value)}
                  placeholder="Nhập tình hình máy, ghi chú kíp trực..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs placeholder:text-slate-400"
                />
              </div>

              {/* Status scan feedbacks */}
              {scanMessage && (
                <div className={`px-4 py-3 rounded-xl text-xs font-medium border ${
                  scanMessage.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/35' 
                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/35'
                }`}>
                  {scanMessage.text}
                </div>
              )}

              {/* Footer actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-indigo-650/10 cursor-pointer transition-colors"
                >
                  XÁC NHẬN GHI KIỂM KÊ
                </button>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(false)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-5 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SETTINGS / GOOGLE APPS SCRIPT SYNC CONFIG --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[80000] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 overflow-hidden animate-scale-in">
            <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-indigo-500" />
                Cài Đặt Đồng Bộ Google Apps Script
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/40 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-black text-indigo-700 dark:text-indigo-400 tracking-wider">Lưu ý chuyên nghiệp:</span>
                <p className="text-[11.5px] text-indigo-750 dark:text-indigo-350 leading-relaxed">
                  Đường dẫn này kết nối trực tiếp đến Macro triển khai dịch vụ Web App của Google Sheets. Khi đẩy (PUSH) hoặc kéo (PULL), cơ sở dữ liệu sẽ tự động đồng bộ hóa thời gian thực.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase ml-1">
                  Đường dẫn triển khai Google Web App *
                </label>
                <textarea
                  rows={3}
                  value={syncConfig.webAppUrl}
                  onChange={(e) => saveSettingsConfig(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-950 dark:text-white font-mono text-xs outline-none focus:border-indigo-400 resize-none leading-relaxed"
                  placeholder="https://script.google.com/macros/s/..."
                />
              </div>

              {/* Autosync configurations */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-850 dark:text-white">Tự động đồng bộ</span>
                  <p className="text-[10px] text-slate-400">Đồng bộ Cloud lập tức khi quét kiểm kê hàng hoàn thành</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncConfig.autoSync}
                    onChange={(e) => setSyncConfig(prev => ({ ...prev, autoSync: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
                </label>
              </div>

              {/* QUẢN LÝ PHÂN LOẠI THIẾT BỊ HOÀN TOÀN OFFLINE */}
              <div className="p-4 rounded-2xl bg-indigo-50/10 dark:bg-slate-855/20 border border-indigo-100/20 dark:border-slate-800 space-y-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-850 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Quản Lý Danh Mục Phân Loại
                  </span>
                  <p className="text-[10.5px] text-slate-400">Xem và sửa đổi các phân loại trang thiết bị đã lưu.</p>
                </div>
                
                {/* Add dynamic classification form */}
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    id="new-global-category"
                    placeholder="Thêm phân loại mới..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:border-indigo-400 font-bold"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          if (!categories.includes(val)) {
                            const updated = [...categories, val];
                            saveCategoriesLocally(updated);
                            addToast(`Đã thêm phân loại: ${val}`, 'success');
                            playScanBeep(1000, 0.12);
                            (e.target as HTMLInputElement).value = '';
                          } else {
                            addToast('Phân loại này đã tồn tại!', 'info');
                          }
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('new-global-category') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        const val = input.value.trim();
                        if (!categories.includes(val)) {
                          const updated = [...categories, val];
                          saveCategoriesLocally(updated);
                          addToast(`Đã thêm phân loại: ${val}`, 'success');
                          playScanBeep(1000, 0.12);
                          input.value = '';
                        } else {
                          addToast('Phân loại này đã tồn tại!', 'info');
                        }
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>

                {/* Classification items selection block */}
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 custom-scrollbar">
                  {categories.map(cat => {
                    const isDefault = ['Tất cả loại', 'VHF AM', 'VCCS', 'GPS & Ăng-ten', 'Ghi âm & Lưu trữ', 'Nguồn & UPS', 'Khác'].includes(cat);
                    return (
                      <div 
                        key={cat} 
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9.5px] font-extrabold ${
                          isDefault 
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' 
                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/30'
                        }`}
                      >
                        {cat}
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = categories.filter(c => c !== cat);
                              saveCategoriesLocally(updated);
                              addToast(`Đã xóa phân loại: ${cat}`, 'info');
                              playScanBeep(705, 0.12);
                            }}
                            className="text-indigo-450 hover:text-rose-600 font-extrabold ml-0.5 cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SAO LƯU FILE OFFLINE */}
              <div className="p-4 rounded-2xl bg-indigo-50/25 dark:bg-slate-850/50 border border-indigo-100/30 dark:border-slate-800 space-y-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-850 dark:text-white flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-indigo-500" />
                    Truyền Tệp / Sao Lưu Ngoại Tuyến (Offline)
                  </span>
                  <p className="text-[10.5px] text-slate-400">Trích xuất thành tệp JSON hoặc nạp trực tiếp cơ sở dữ liệu vật tư giữa các máy tính nội bộ thông qua cổng USB.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-805 dark:text-slate-300 font-bold py-2.5 px-3 rounded-xl text-[11px] transition-colors cursor-pointer text-center"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Xuất XML/JSON Backup
                  </button>

                  <label className="flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold py-2.5 px-3 rounded-xl text-[11px] transition-colors cursor-pointer text-center border border-indigo-205/30">
                    <History className="w-3.5 h-3.5" />
                    Nhập XML/JSON Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {/* Connection Status Indicator block */}
              {syncStatusDetail && (
                <div className={`p-3.5 rounded-2xl text-[11px] font-medium leading-relaxed border ${
                  syncStatus === 'syncing' ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-100/30' :
                  syncStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100' :
                  'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-100'
                }`}>
                  <strong className="block uppercase text-[9px] font-extrabold tracking-wider mb-0.5">Phản hồi log:</strong>
                  {syncStatusDetail}
                </div>
              )}

              {/* Test Connections buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={fetchCloudData}
                  disabled={syncStatus === 'syncing'}
                  className="flex-1 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-300 font-extrabold py-3 rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  PULL/LOAD CLOUD
                </button>
                <button
                  type="button"
                  onClick={syncToCloud}
                  disabled={syncStatus === 'syncing'}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md shadow-indigo-650/10 transition-colors cursor-pointer text-center"
                >
                  PUSH LOCAL CODES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SYSTEM WORKSPACE LOG DETAIL DRAWER (BENTO CLICK) --- */}
      {selectedItemDetail && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex justify-end z-[80000] animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-screen shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800/80 animate-slide-left">
            
            {/* Drawer Header */}
            <div className="px-6 py-5 bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                  Chi tiết thiết bị
                </span>
                <h3 className="font-black text-slate-900 dark:text-white text-sm line-clamp-1">
                  {selectedItemDetail.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="p-1 px-2.5 hover:text-slate-950 dark:hover:text-white text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details contents */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* Core metrics visual items cards */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800 space-y-4">
                <div className="text-center pb-2">
                  {selectedItemDetail.warehouse ? (
                    <div className="inline-block p-2 bg-white dark:bg-slate-850 rounded-2xl shadow-sm border border-slate-150 dark:border-slate-750">
                      <QRCodeSVG value={selectedItemDetail.warehouse} size={150} level="M" />
                      <div className="text-xs font-mono font-bold mt-2 text-indigo-600 dark:text-indigo-400">{selectedItemDetail.warehouse}</div>
                    </div>
                  ) : (
                    <div className="w-24 h-24 mx-auto border-2 border-dashed border-slate-350 rounded-2xl flex items-center justify-center text-[10px] text-slate-400">
                      Chưa cấp mã QR
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block">PART NUMBER / MODEL</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-semibold">{selectedItemDetail.pn || 'N/A'}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block">SERIAL NUMBER (S/N)</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold">{selectedItemDetail.sn}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block">SL TỒN / SỐ LƯỢNG MÁY</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-black">{selectedItemDetail.qty} bộ / chiếc</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block">VỊ TRÍ PHÂN KHO</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-semibold">{selectedItemDetail.loc || 'N/A'}</strong>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700/80 grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block">TIỂU CHUẨN ĐÁNH GIÁ</span>
                    {selectedItemDetail.auditStatus === 'OK' ? (
                      <span className="text-emerald-500 font-extrabold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-md">ĐỦ / HOẠT ĐỘNG TỐT</span>
                    ) : selectedItemDetail.auditStatus === 'MISSING' ? (
                      <span className="text-rose-500 font-extrabold text-[10px] bg-rose-500/10 px-2 py-0.5 rounded-md">THIẾU / HỎNG HÓC</span>
                    ) : (
                      <span className="text-slate-400 font-bold">CHƯA KIỂM KÊ</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block">NGÀY KIỂM CUỐI</span>
                    <strong className="text-slate-700 dark:text-slate-350">{selectedItemDetail.auditDate || 'Chưa ghi nhận'}</strong>
                  </div>
                </div>

                {selectedItemDetail.auditNote && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider mb-0.5">Ghi chú kiểm định:</span>
                    <p className="text-slate-650 dark:text-slate-300 text-xs font-medium leading-normal italic">
                      "{selectedItemDetail.auditNote}"
                    </p>
                  </div>
                )}
              </div>

              {/* History Timeline */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 border-b border-slate-150 dark:border-slate-800 pb-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-widest">
                    LỊCH SỬ KIỂM KÊ GẦN ĐÂY
                  </span>
                </div>

                {/* List past audits check blocks */}
                {!selectedItemDetail.history || selectedItemDetail.history.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-medium text-xs">
                    Chưa có hoạt động kiểm kê lịch sử được lưu vết cho mã này.
                  </div>
                ) : (
                  <div className="relative border-l border-slate-200 dark:border-slate-750 ml-3.5 pl-4.5 space-y-4">
                    {selectedItemDetail.history.map(hist => (
                      <div key={hist.id} className="relative text-xs">
                        {/* Timeline dot node */}
                        <div className={`absolute left-[-26px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-slate-900 ${hist.status === 'OK' ? 'border-emerald-500' : 'border-rose-500'}`}></div>
                        
                        <div className="flex justify-between items-start">
                          <strong className={hist.status === 'OK' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                            {hist.status === 'OK' ? '● ĐỦ / TỐT' : '▲ THIẾU THIẾT BỊ'}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-semibold">{hist.date}</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-relaxed mt-1">
                          {hist.note}
                        </p>
                        <div className="text-[10px] text-slate-405 italic mt-1 font-semibold block">
                          Người log: {hist.user.toUpperCase()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Quick Actions at footer of detail panels */}
            <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-150 dark:border-slate-800 flex justify-between gap-3 shrink-0">
              <button
                onClick={() => {
                  setSelectedItemDetail(null);
                  if (role === 'admin') handleEditClick(selectedItemDetail);
                }}
                disabled={role !== 'admin'}
                className="flex-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center disabled:opacity-40"
              >
                Chỉnh sửa tệp
              </button>
              <button
                onClick={() => {
                  const item = selectedItemDetail;
                  setSelectedItemDetail(null);
                  if (item) {
                    setSelectedItemForUsage(item);
                    setUsageQty(1);
                    setUsageUser(role === 'admin' ? 'Kỹ sư Đội Thông Tin' : 'Kỹ sư ' + (role || 'Guest'));
                    setUsageTargetLoc('');
                    setUsageNotes('');
                    setDeductInventory(item.qty > 0);
                  }
                }}
                className="flex-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/45 dark:hover:bg-amber-900/35 text-amber-700 dark:text-amber-400 font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Báo sử dụng
              </button>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-750 dark:hover:bg-slate-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Xác nhận đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- EXTRA ADVANCED MODAL: CREATE EQUIPMENT USAGE SLIP --- */}
      {selectedItemForUsage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/50 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl p-6 md:p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto my-8">
            <button
              onClick={() => setSelectedItemForUsage(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  Tạo Phiếu Báo Sử Dụng
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold uppercase">
                  BỐC DỠ VÀ LẮP ĐẶT THIẾT BỊ CNS/ATM
                </p>
              </div>
            </div>

            {/* Target Item summary banner */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-150 dark:border-slate-800 mb-6 space-y-1.5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thiết bị bốc dỡ:</div>
              <div className="text-xs font-black text-slate-850 dark:text-white truncate">
                {selectedItemForUsage.name}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-medium pt-1 border-t border-dashed border-slate-200 dark:border-slate-800/80">
                <div>
                  <span className="text-slate-400">S/N:</span> <strong className="font-mono text-slate-705 dark:text-slate-300">{selectedItemForUsage.sn}</strong>
                </div>
                <div>
                  <span className="text-slate-400">P/N:</span> <strong className="text-slate-705 dark:text-slate-300">{selectedItemForUsage.pn || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Kho hàng:</span> <strong className="text-slate-705 dark:text-slate-300">{selectedItemForUsage.warehouse || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Tồn hiện tại:</span> <strong className="text-amber-600 dark:text-amber-400">x{selectedItemForUsage.qty} chiếc</strong>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitUsage} className="space-y-4">
              {/* Form Input fields */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                  Kỹ sư thực hiện tiếp nhận *
                </label>
                <input
                  type="text"
                  required
                  value={usageUser}
                  onChange={(e) => setUsageUser(e.target.value)}
                  placeholder="Nhập tên kỹ sư nhận bàn giao"
                  className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                    Số lượng sử dụng *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedItemForUsage.qty}
                      value={usageQty}
                      onChange={(e) => setUsageQty(Math.min(selectedItemForUsage.qty, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-200 dark:border-slate-800 pl-4 pr-12 py-3 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-4 top-3 text-[11px] text-slate-400 font-extrabold uppercase">
                      Chiếc
                    </span>
                  </div>
                  {/* Preset quick buttons */}
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setUsageQty(1)}
                      className="text-[10px] font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer"
                    >
                      x1
                    </button>
                    {selectedItemForUsage.qty >= 2 && (
                      <button
                        type="button"
                        onClick={() => setUsageQty(2)}
                        className="text-[10px] font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer"
                      >
                        x2
                      </button>
                    )}
                    {selectedItemForUsage.qty > 2 && (
                      <button
                        type="button"
                        onClick={() => setUsageQty(selectedItemForUsage.qty)}
                        className="text-[10px] font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer"
                      >
                        Max
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                    Địa điểm lắp đặt mới *
                  </label>
                  <input
                    type="text"
                    required
                    value={usageTargetLoc}
                    onChange={(e) => setUsageTargetLoc(e.target.value)}
                    placeholder="Ví dụ: Phòng máy ATM / Đài KSV"
                    className="w-full bg-slate-50 dark:bg-slate-955 px-4 py-3 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                  Mục đích sử dụng chuyên ngành
                </label>
                <select
                  value={usagePurpose}
                  onChange={(e) => setUsagePurpose(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 font-semibold resize-none"
                >
                  <option value="Thay thế dự phòng khẩn cấp">Thay thế dự phòng khẩn cấp</option>
                  <option value="Bảo dưỡng định kỳ / Sửa chữa căn chỉnh">Bảo dưỡng định kỳ / Sửa chữa căn chỉnh</option>
                  <option value="Trang bị mở rộng hệ thống">Trang bị mở rộng hệ thống</option>
                  <option value="Đo đạc kiểm thử phòng Lab kỹ thuật">Đo đạc kiểm thử phòng Lab kỹ thuật</option>
                  <option value="Bốc dỡ hủy mát học cụ đào tạo">Bốc dỡ hủy mát học cụ đào tạo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                  Mô tả kỹ thuật bàn giao / Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={usageNotes}
                  onChange={(e) => setUsageNotes(e.target.value)}
                  placeholder="Kiểm tra các tham số kỹ thuật đạt chuẩn trước khi thay thế lắp đặt mới phòng máy dỡ..."
                  className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-semibold resize-none"
                />
              </div>

              {/* Deduct inventory optional toggle */}
              <label className="flex items-center gap-3 p-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-2xl cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={deductInventory}
                  onChange={(e) => {
                    if (selectedItemForUsage.qty === 0) {
                      addToast('Sản phẩm đã hết hàng, không thể trừ hàng thêm!', 'error');
                      return;
                    }
                    setDeductInventory(e.target.checked);
                  }}
                  disabled={selectedItemForUsage.qty === 0}
                  className="w-4.5 h-4.5 accent-amber-500 cursor-pointer"
                />
                <div>
                  <span className="text-[11px] font-black text-amber-850 dark:text-amber-400 uppercase block">
                    Đăng ký cập nhật trừ kho vật tư
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    Tự động giảm tồn kho thiết bị này và chèn vào nhật ký lịch sử kỹ thuật.
                  </span>
                </div>
              </label>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedItemForUsage(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold py-3 rounded-2xl text-xs transition-colors cursor-pointer text-center"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3 rounded-2xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Xác nhận & Xuất PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EXTRA ADVANCED MODAL: USAGE TICKET HISTORY EXPLORER --- */}
      {isUsageHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/50 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl p-6 md:p-8 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto my-8 flex flex-col">
            <button
              onClick={() => setIsUsageHistoryOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header section with Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-5 mb-5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Nhật Ký Phiếu Báo Sử Dụng
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">
                    Quản lý tài liệu và in ấn biên bản rút kho chuyên dụng
                  </p>
                </div>
              </div>

              {usageSlips.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearUsageHistory}
                  className="sm:self-center self-start text-[10px] font-black tracking-wider text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 px-3 py-1.5 rounded-xl border border-rose-100 dark:border-rose-950/20 transition-all uppercase cursor-pointer"
                >
                  Xóa tất cả phiếu
                </button>
              )}
            </div>

            {/* Quick Live Filter */}
            <div className="mb-4 shrink-0 relative">
              <input
                type="text"
                placeholder="Tìm kiếm phiếu (theo tên kỹ sư, S/N, hệ thống, tên linh kiện...)"
                value={usageSearchQuery}
                onChange={(e) => setUsageSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-800/80 px-4.5 py-3 pl-11 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4.5 top-3.5" />
              {usageSearchQuery && (
                <button
                  onClick={() => setUsageSearchQuery('')}
                  className="absolute right-4.5 top-3.5 text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* List entries layout */}
            <div className="overflow-y-auto flex-1 pr-1">
              {(() => {
                const filtered = usageSlips.filter(slip => {
                  const q = usageSearchQuery.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    slip.user.toLowerCase().includes(q) ||
                    slip.sn.toLowerCase().includes(q) ||
                    slip.itemName.toLowerCase().includes(q) ||
                    slip.purpose.toLowerCase().includes(q) ||
                    (slip.targetLocation || '').toLowerCase().includes(q) ||
                    slip.id.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-24 text-slate-400 font-semibold text-xs space-y-2">
                      <div className="text-3xl">📭</div>
                      <p>Không tìm thấy bản ghi phiếu báo sử dụng nào phù hợp.</p>
                      <p className="text-[10px] font-normal text-slate-350 uppercase">Mẹo: Thử nhập số S/N hoặc hệ thống lắp đặt</p>
                    </div>
                  );
                }

                return (
                  <div>
                    {/* Tablet / Desktop Table structure */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-semibold">
                        <thead>
                          <tr className="border-b border-slate-150 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-3">Thời điểm / Mã</th>
                            <th className="py-3 px-3">Thiết bị bốc dỡ</th>
                            <th className="py-3 px-3">Kỹ sư trích dỡ</th>
                            <th className="py-3 px-3">Nơi lắp đặt mới</th>
                            <th className="py-3 px-3 text-center">SL</th>
                            <th className="py-3 px-3 text-right">Tác Vụ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((slip) => (
                            <tr key={slip.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 text-slate-700 dark:text-slate-300 transition-colors">
                              <td className="py-3 px-3">
                                <div className="text-[11px] text-slate-800 dark:text-slate-150">{slip.date.split(' ')[1] || slip.date}</div>
                                <div className="text-[9px] text-slate-400 font-mono lowercase tracking-wide mt-0.5">{slip.date.split(' ')[0] || ''} • #{slip.id.slice(-6)}</div>
                              </td>
                              <td className="py-3 px-3 max-w-[200px]">
                                <div className="truncate text-slate-900 dark:text-white font-extrabold" title={slip.itemName}>{slip.itemName}</div>
                                <div className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">S/N: {slip.sn}</div>
                              </td>
                              <td className="py-3 px-3 uppercase text-[10.5px] font-black text-indigo-600 dark:text-indigo-400">
                                {slip.user}
                              </td>
                              <td className="py-3 px-3">
                                <div className="truncate text-slate-850 dark:text-slate-200" title={slip.targetLocation}>{slip.targetLocation || '-'}</div>
                                <div className="text-[10px] text-slate-400 font-normal truncate max-w-[150px] italic mt-0.5" title={slip.purpose}>{slip.purpose}</div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="bg-amber-100/60 dark:bg-amber-955/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-black">x{slip.qtyUsed}</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handlePrintUsageSlip(slip)}
                                    className="p-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-500/5 dark:text-amber-400 rounded-lg transition-colors cursor-pointer"
                                    title="In lại phiếu báo bàn giao (PDF)"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUsageSlip(slip.id)}
                                    className="p-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-500/5 dark:text-rose-455 rounded-lg transition-colors cursor-pointer"
                                    title="Xóa biên bản lưu trữ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile lists layout rendering */}
                    <div className="block md:hidden space-y-3.5">
                      {filtered.map((slip) => (
                        <div key={slip.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-150 dark:border-slate-800/80 space-y-2.5">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="text-[9px] font-bold text-slate-400 font-mono tracking-wider uppercase">Voucher #{slip.id.slice(-6)} • {slip.date}</div>
                              <h4 className="text-xs font-black text-slate-900 dark:text-white mt-1 leading-normal">{slip.itemName}</h4>
                            </div>
                            <span className="shrink-0 bg-amber-500/10 text-amber-500 text-[10.5px] px-2 py-0.5 rounded-lg font-black">
                              x{slip.qtyUsed} bộ
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-medium pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                            <div>
                              <span className="text-slate-400">Kỹ sư trích dỡ:</span>
                              <div className="text-indigo-600 dark:text-indigo-400 font-black mt-0.5 text-[10.5px] uppercase">{slip.user}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">Hệ thống mục tiêu:</span>
                              <div className="text-slate-850 dark:text-slate-200 font-bold mt-0.5 truncate">{slip.targetLocation || 'N/A'}</div>
                            </div>
                            <div className="col-span-2 mt-1">
                              <span className="text-slate-400">Lý do bàn giao:</span>
                              <p className="text-[10px] text-slate-400 italic mt-0.5 leading-relaxed truncate">{slip.purpose}</p>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                            <button
                              onClick={() => handlePrintUsageSlip(slip)}
                              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 rounded-xl text-[11px] cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              IN LẠI
                            </button>
                            <button
                              onClick={() => handleDeleteUsageSlip(slip.id)}
                              className="w-10 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/10 flex items-center justify-center cursor-pointer"
                              title="Xóa phiếu"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                );
              })()}
            </div>

            {/* Footer actions of history list */}
            <div className="mt-6 pt-4 border-t border-slate-150 dark:border-slate-800 shrink-0 text-right">
              <button
                type="button"
                onClick={() => setIsUsageHistoryOpen(false)}
                className="bg-slate-850 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-black text-xs px-6 py-3 rounded-2xl cursor-pointer"
              >
                Hoàn tất
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- EXTRA ADVANCED MODAL: OFFICIAL HANDOVER CERTIFICATE EDITOR --- */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/50 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl p-6 md:p-8 w-full max-w-5xl relative max-h-[92vh] overflow-y-auto my-8 flex flex-col">
            
            {/* Close button */}
            <button
              onClick={() => setIsHandoverModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header section */}
            <div className="flex items-center gap-3 border-b border-slate-150 dark:border-slate-800 pb-5 mb-5 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-sm">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-850 dark:text-white uppercase tracking-wider">
                  Lập Biên Bản Bàn Giao Thiết Bị
                </h3>
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  Biên bản giao, nhận tài sản, công cụ chuyên ngành kỹ thuật và hàng không
                </p>
              </div>
            </div>

            {/* Config metadata fields card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5 bg-slate-50/50 dark:bg-slate-950 p-5 rounded-[2rem] border border-slate-150 dark:border-slate-800/80">
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest block font-bold">Số hiệu biên bản:</label>
                <input
                  type="text"
                  value={handoverNo}
                  onChange={(e) => setHandoverNo(e.target.value)}
                  placeholder="Ví dụ: 125/KT"
                  className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-extrabold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-405 uppercase tracking-widest block font-bold">Nơi ký biên bản:</label>
                <input
                  type="text"
                  value={handoverLocation}
                  onChange={(e) => setHandoverLocation(e.target.value)}
                  placeholder="Ví dụ: Trung tâm Bảo đảm Kỹ thuật"
                  className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-405 uppercase tracking-widest block font-bold">Ngày tháng năm lập biên bản:</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold">Ngày</span>
                    <input
                      type="text"
                      value={handoverDay}
                      onChange={(e) => setHandoverDay(e.target.value)}
                      className="w-full text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-2 py-2 text-xs text-slate-850 dark:text-white font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold">Tháng</span>
                    <input
                      type="text"
                      value={handoverMonth}
                      onChange={(e) => setHandoverMonth(e.target.value)}
                      className="w-full text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-2 py-2 text-xs text-slate-855 dark:text-white font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold">Năm</span>
                    <input
                      type="text"
                      value={handoverYear}
                      onChange={(e) => setHandoverYear(e.target.value)}
                      className="w-full text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-2 py-2 text-xs text-slate-855 dark:text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 md:col-span-4 mt-2">
                <label className="text-[10px] font-black text-slate-405 uppercase tracking-widest block font-bold">Lý do bàn giao tài sản, công cụ:</label>
                <input
                  type="text"
                  value={handoverReason}
                  onChange={(e) => setHandoverReason(e.target.value)}
                  placeholder="Ví dụ: Đảm bảo trang thiết bị kỹ thuật dự phòng và vận hành ổn định hệ thống"
                  className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-rose-500"
                />
              </div>

            </div>

            {/* Side-by-side Giver and Receiver editor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 shrink-0">
              
              {/* SIDE A: GIVER (BÊN GIAO) */}
              <div className="bg-rose-500/5 dark:bg-rose-500/10 p-5 rounded-[2rem] border border-rose-500/10 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/35 dark:border-rose-950/30">
                  <h4 className="text-[11px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1">
                    🟢 BÊN GIAO
                  </h4>
                  <span className="text-[9px] font-bold py-0.5 px-2 rounded-full bg-rose-500/10 text-rose-500 uppercase">Đội kỹ thuật</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase block font-bold">Đơn vị chủ quản bên giao:</label>
                  <input
                    type="text"
                    value={handoverGiverDept}
                    onChange={(e) => setHandoverGiverDept(e.target.value)}
                    placeholder="Ví dụ: Đội Thông tin – Trung tâm BĐKT"
                    className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase block font-bold">Đại diện (Ông/bà):</label>
                    <input
                      type="text"
                      value={handoverGiverName}
                      onChange={(e) => setHandoverGiverName(e.target.value)}
                      placeholder="Tên người bàn bàn giao"
                      className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-850 dark:text-white font-semibold focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase block font-bold">Chức vụ:</label>
                    <input
                      type="text"
                      value={handoverGiverPos}
                      onChange={(e) => setHandoverGiverPos(e.target.value)}
                      placeholder="Ví dụ: Đội trưởng"
                      className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-850 dark:text-white font-semibold focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* SIDE B: RECEIVER (BÊN NHẬN) */}
              <div className="bg-indigo-500/5 dark:bg-indigo-500/10 p-5 rounded-[2rem] border border-indigo-500/10 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-indigo-200/35 dark:border-indigo-950/30">
                  <h4 className="text-[11px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                    🔵 BÊN NHẬN
                  </h4>
                  <span className="text-[9px] font-bold py-0.5 px-2 rounded-full bg-indigo-500/10 text-indigo-500 uppercase">Đối tác tiếp nhận</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase block font-bold">Đơn vị tiếp nhận bên nhận:</label>
                  <input
                    type="text"
                    value={handoverReceiverDept}
                    onChange={(e) => setHandoverReceiverDept(e.target.value)}
                    placeholder="Ví dụ: Tổ Kỹ thuật VHF - Cam Ranh"
                    className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase block font-bold">Đại diện (Ông/bà):</label>
                    <input
                      type="text"
                      value={handoverReceiverName}
                      onChange={(e) => setHandoverReceiverName(e.target.value)}
                      placeholder="Tên đối tác tiếp nhận"
                      className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-850 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase block font-bold">Chức vụ:</label>
                    <input
                      type="text"
                      value={handoverReceiverPos}
                      onChange={(e) => setHandoverReceiverPos(e.target.value)}
                      placeholder="Ví dụ: Kỹ sư trực ban"
                      className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-850 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Selector to add items in handover lists */}
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-4 rounded-3xl border border-emerald-500/10 mb-5 text-slate-800 dark:text-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                <label className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                  🛒 THÊM THIẾT BỊ TỪ KHO VẬT TƯ VÀO BIÊN BẢN (CHỌN NHIỀU):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const allList = inventory.map(item => ({
                      id: item.id,
                      name: item.name,
                      unit: 'Cái',
                      qty: 1,
                      quality: 'Tốt (Mới 100%)',
                      specs: `${item.pn ? 'P/N: ' + item.pn + '. ' : ''}Quy cách chuẩn`,
                      sn: item.sn || 'N/A',
                      note: ''
                    }));
                    setHandoverRows(allList);
                    addToast('Đã thêm toàn bộ kho vào biên bản bàn giao!', 'success');
                  }}
                  className="text-[10px] font-black tracking-wider text-emerald-600 dark:text-emerald-400 hover:underline uppercase font-bold"
                >
                  [ Thêm toàn bộ vật tư từ hệ thống ]
                </button>
              </div>

              <div className="flex gap-2">
                <select
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    const matched = inventory.find(x => x.id === id);
                    if (matched) {
                      if (handoverRows.some(row => row.id === matched.id)) {
                        addToast('Thiết bị này đã được thêm vào biên bản!', 'info');
                        return;
                      }
                      setHandoverRows(prev => [...prev, {
                        id: matched.id,
                        name: matched.name,
                        unit: 'Cái',
                        qty: 1,
                        quality: 'Tốt (Mới 100%)',
                        specs: `${matched.pn ? 'P/N: ' + matched.pn + '. ' : ''}Quy cách chuẩn`,
                        sn: matched.sn || 'N/A',
                        note: ''
                      }]);
                      addToast(`Đã thêm "${matched.name}"`, 'success');
                    }
                  }}
                  className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-805 dark:text-white font-bold focus:outline-none"
                >
                  <option value="">-- Chọn một thiết bị từ kho để thêm vào danh sách ... --</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (S/N: {item.sn} | PN: {item.pn || '-'})
                    </option>
                  ))}
                </select>
                
                <button
                  type="button"
                  onClick={() => {
                    const randId = 'custom_' + Math.random().toString(36).substr(2, 9);
                    setHandoverRows(prev => [...prev, {
                      id: randId,
                      name: 'Thiết bị tự phát sinh ngoài kho',
                      unit: 'Cái',
                      qty: 1,
                      quality: 'Tốt (Mới 100%)',
                      specs: 'Quy cách chuẩn kỹ thuật CNS/ATM',
                      sn: 'SN-' + Math.floor(1000 + Math.random() * 9000),
                      note: ''
                    }]);
                    addToast('Đã tạo dòng thiết bị tự nhập mới!', 'success');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4.5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all text-center flex items-center justify-center font-bold"
                >
                  + Tự Gõ Ngoài
                </button>
              </div>
            </div>

            {/* List of items table in Handover editor */}
            <div className="flex-1 overflow-y-auto max-h-[250px] pr-1 mb-4 border border-slate-150 dark:border-slate-800 rounded-3xl">
              <table className="w-full text-[11px] font-semibold text-slate-800 dark:text-white text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 z-10 border-b border-slate-150 dark:border-slate-800">
                  <tr className="text-[9.5px] uppercase text-slate-400 font-extrabold tracking-wider">
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3">Tên tài sản, công cụ</th>
                    <th className="py-2.5 px-3 w-16 text-center">ĐVT</th>
                    <th className="py-2.5 px-3 w-20 text-center">Số lượng</th>
                    <th className="py-2.5 px-3 w-32">Chất lượng</th>
                    <th className="py-2.5 px-3">Nhãn hiệu, quy cách, xuất xứ</th>
                    <th className="py-2.5 px-3 w-28 text-center">S/N</th>
                    <th className="py-2.5 px-3">Ghi chú</th>
                    <th className="py-2.5 px-3 w-10 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {handoverRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 uppercase font-black text-[10px]">
                        Danh sách rỗng. Vui lòng thêm thiết bị từ mục chọn ở trên!
                      </td>
                    </tr>
                  ) : (
                    handoverRows.map((row, index) => (
                      <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-850/25">
                        <td className="py-2 px-3 text-center text-slate-400 font-extrabold">{index + 1}</td>
                        <td className="py-2 px-3">
                           <input
                            type="text"
                            value={row.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, name: val } : r));
                            }}
                            className="bg-transparent text-slate-855 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-755 focus:border-rose-500 focus:outline-none font-bold py-0.5"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.unit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, unit: val } : r));
                            }}
                            className="bg-transparent text-slate-800 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-750 focus:border-rose-500 focus:outline-none text-center font-bold"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min={1}
                            value={row.qty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, qty: val } : r));
                            }}
                            className="bg-transparent text-center text-slate-900 dark:text-white w-20 border-b border-transparent hover:border-slate-200 dark:hover:border-slate-755 focus:border-rose-500 focus:outline-none font-black"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.quality}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, quality: val } : r));
                            }}
                            className="bg-transparent text-slate-800 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-750 focus:border-rose-500 focus:outline-none font-semibold text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.specs}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, specs: val } : r));
                            }}
                            className="bg-transparent text-slate-800 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-750 focus:border-rose-500 focus:outline-none text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.sn}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, sn: val } : r));
                            }}
                            className="bg-transparent text-center font-mono text-slate-800 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-750 focus:border-rose-500 focus:outline-none font-extrabold"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.note || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, note: val } : r));
                            }}
                            className="bg-transparent text-slate-800 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-750 focus:border-rose-500 focus:outline-none text-xs"
                            placeholder="Ghi chú..."
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setHandoverRows(prev => prev.filter(r => r.id !== row.id));
                              addToast('Đã xoá một thiết bị khỏi biên bản', 'info');
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Tip guide */}
            <div className="mb-4 py-2 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl flex items-center gap-2">
              <span className="text-[12px]">💡</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Mẹo: Bạn có thể thay đổi trực tiếp thông tin ô nhập (Tên, ĐVT, SL, Chất lượng, Xuất xứ, S/N) ngay trên bảng trước khi xuất bản in PDF/A4!
              </p>
            </div>

            {/* Footer action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-150 dark:border-slate-800 mt-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setHandoverRows([]);
                  addToast('Đã xoá sạch danh sách biên bản!', 'info');
                }}
                disabled={handoverRows.length === 0}
                className="text-[10px] font-black uppercase text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 px-4 py-2.5 rounded-2xl border border-rose-500/10 disabled:opacity-40 transition-all cursor-pointer"
              >
                Xóa tất cả mặt hàng
              </button>

              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(false)}
                  className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold px-6 py-3 rounded-2xl text-xs transition-colors cursor-pointer text-center"
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={handlePrintOfficialHandover}
                  disabled={handoverRows.length === 0}
                  className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-8 py-3 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-600/15 disabled:opacity-40"
                >
                  <Printer className="w-3.5 h-3.5" />
                  XUẤT IN BIÊN BẢN CHUẨN FORM
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

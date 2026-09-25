import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  RotateCcw, 
  SlidersHorizontal, 
  Search, 
  Printer, 
  Edit3, 
  Trash2, 
  Copy, 
  Layers, 
  Building2,
  FileCheck,
  X
} from 'lucide-react';

import { ConstructionLogRecord, ProductCategory } from './types.ts';
import { INITIAL_RECORDS, DEFAULT_COLUMN_VISIBILITY } from './initialData.ts';
import { SummaryCards } from './components/SummaryCards.tsx';
import { RecordModal } from './components/RecordModal.tsx';
import { ColumnToggleModal } from './components/ColumnToggleModal.tsx';
import { ImportModal } from './components/ImportModal.tsx';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { exportToCSV, exportToJSON, formatCurrency, formatNumber } from './utils/exportUtils.ts';

const STORAGE_KEY = 'unified_master_construction_log_v4';
const VISIBILITY_STORAGE_KEY = 'unified_master_col_visibility_v4';

export default function App() {
  // 1. Data State with LocalStorage persistence
  const [records, setRecords] = useState<ConstructionLogRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('unified_master_construction_log_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: ConstructionLogRecord) => {
            const initialMatch = INITIAL_RECORDS.find(r => r.id === item.id);
            if (initialMatch && initialMatch.paidMaterial !== undefined && item.paidMaterial === undefined) {
              return { 
                ...item, 
                materialAmount: initialMatch.materialAmount,
                transportType: initialMatch.transportType,
                haulerName: initialMatch.haulerName,
                freightRate: initialMatch.freightRate,
                freightAmount: initialMatch.freightAmount,
                paidMaterial: initialMatch.paidMaterial,
                paidFreight: initialMatch.paidFreight
              };
            }
            return item;
          });
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_RECORDS;
  });

  // 2. Column visibility state (ensuring split payment fields are visible)
  const [colVisibility, setColVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const savedVis = localStorage.getItem(VISIBILITY_STORAGE_KEY);
      if (savedVis) {
        return { 
          ...DEFAULT_COLUMN_VISIBILITY, 
          ...JSON.parse(savedVis),
          materialAmount: true,
          transportType: true,
          freightRate: true,
          freightAmount: true,
          paidMaterial: true,
          materialBalance: true,
          paidFreight: true,
          freightBalance: true,
          paidAmount: true,
          balance: true,
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_COLUMN_VISIBILITY;
  });

  // 3. Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');

  // 4. Modal states
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ConstructionLogRecord | null>(null);
  
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [deletingRecord, setDeletingRecord] = useState<ConstructionLogRecord | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 5. Toast alerts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(colVisibility));
    } catch (e) {
      console.error("Failed to save col visibility", e);
    }
  }, [colVisibility]);

  const addToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Filtered & Searched data calculation
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return records.filter((item) => {
      // Category filter - merge หินโรงโม่, หินคลุก/ขนส่ง, and หินโรงโม่และขนส่ง into one
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'หินโรงโม่และขนส่ง') {
          if (
            item.category !== 'หินโรงโม่และขนส่ง' && 
            item.category !== 'หินโรงโม่' && 
            item.category !== 'หินคลุก/ขนส่ง'
          ) {
            return false;
          }
        } else if (item.category !== selectedCategory) {
          return false;
        }
      }

      // Payment status filter
      const balance = (Number(item.totalAmount) || 0) - (Number(item.paidAmount) || 0);
      if (paymentFilter === 'PAID' && balance > 0) return false;
      if (paymentFilter === 'UNPAID' && balance <= 0) return false;

      // Text search
      if (q) {
        const match = 
          (item.poNo || '').toLowerCase().includes(q) ||
          (item.ticketNo || '').toLowerCase().includes(q) ||
          (item.rrNo || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q) ||
          (item.spec || '').toLowerCase().includes(q) ||
          (item.vendor || '').toLowerCase().includes(q) ||
          (item.quarry || '').toLowerCase().includes(q) ||
          (item.truckNo || '').toLowerCase().includes(q) ||
          (item.workStructure || '').toLowerCase().includes(q) ||
          (item.remark || '').toLowerCase().includes(q) ||
          (item.category || '').toLowerCase().includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [records, selectedCategory, paymentFilter, searchQuery]);

  // Totals for table footer
  const tableTotals = useMemo(() => {
    let sumGross = 0;
    let sumTare = 0;
    let sumNet = 0;
    let sumDestGross = 0;
    let sumDestTare = 0;
    let sumDestNet = 0;
    let sumDiffKg = 0;
    let countDiff = 0;
    let sumQty = 0;
    let sumMaterialAmount = 0;
    let sumPaidMaterial = 0;
    let sumMaterialBalance = 0;
    let sumFreightAmount = 0;
    let sumPaidFreight = 0;
    let sumFreightBalance = 0;
    let sumTotal = 0;
    let sumPaid = 0;
    let sumBalance = 0;

    filteredRecords.forEach((r) => {
      sumGross += Number(r.grossWt) || 0;
      sumTare += Number(r.tareWt) || 0;
      sumNet += Number(r.netWt) || 0;
      sumDestGross += Number(r.destGrossWt) || 0;
      sumDestTare += Number(r.destTareWt) || 0;
      sumDestNet += Number(r.destNetWt) || 0;

      const diff = r.weightDiffKg ?? (
        r.destNetWt && r.destNetWt > 0 && r.netWt && r.netWt > 0 
          ? Math.round((r.destNetWt - r.netWt) * 1000) 
          : null
      );
      if (diff !== null && diff !== undefined && !isNaN(diff)) {
        sumDiffKg += diff;
        countDiff++;
      }

      const q = Number(r.qty) || 0;
      const p = Number(r.pricePerUnit) || 0;
      sumQty += q;

      const mat = r.materialAmount !== undefined ? Number(r.materialAmount) : (q * p);
      sumMaterialAmount += mat;

      const pMat = r.paidMaterial !== undefined 
        ? Number(r.paidMaterial) 
        : (r.paidAmount ? Math.min(mat, Number(r.paidAmount)) : 0);
      sumPaidMaterial += pMat;
      sumMaterialBalance += Math.max(0, mat - pMat);

      const isHired = r.transportType === 'hired' || (r.freightAmount && Number(r.freightAmount) > 0) || (r.extraFee && Number(r.extraFee) > 0);
      const fr = isHired 
        ? (r.freightAmount !== undefined ? Number(r.freightAmount) : (r.extraFee ? q * Number(r.extraFee) : 0))
        : 0;
      sumFreightAmount += fr;

      const pFr = isHired 
        ? (r.paidFreight !== undefined ? Number(r.paidFreight) : 0)
        : 0;
      sumPaidFreight += pFr;
      sumFreightBalance += Math.max(0, fr - pFr);

      const tot = Number(r.totalAmount) || (mat + fr);
      const pd = Number(r.paidAmount) || (pMat + pFr);
      sumTotal += tot;
      sumPaid += pd;
      sumBalance += (tot - pd);
    });

    return { 
      sumGross, 
      sumTare, 
      sumNet, 
      sumDestGross, 
      sumDestTare, 
      sumDestNet, 
      sumDiffKg, 
      countDiff, 
      sumQty, 
      sumMaterialAmount,
      sumPaidMaterial,
      sumMaterialBalance,
      sumFreightAmount,
      sumPaidFreight,
      sumFreightBalance,
      sumTotal, 
      sumPaid, 
      sumBalance 
    };
  }, [filteredRecords]);

  // Handlers
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setIsRecordModalOpen(true);
  };

  const handleOpenEdit = (rec: ConstructionLogRecord) => {
    setEditingRecord(rec);
    setIsRecordModalOpen(true);
  };

  const handleDuplicate = (rec: ConstructionLogRecord) => {
    const duplicated: ConstructionLogRecord = {
      ...rec,
      id: `R${Date.now()}`,
      description: `${rec.description} (คัดลอก)`,
      updatedAt: new Date().toISOString()
    };
    setRecords((prev) => [duplicated, ...prev]);
    addToast(`คัดลอกรายการ "${rec.description}" เรียบร้อยแล้ว`);
  };

  const handleDeletePrompt = (rec: ConstructionLogRecord) => {
    setDeletingRecord(rec);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingRecord) return;
    setRecords((prev) => prev.filter((r) => r.id !== deletingRecord.id));
    addToast(`ลบรายการ "${deletingRecord.description}" เรียบร้อยแล้ว`, 'warning');
    setDeletingRecord(null);
  };

  const handleSaveRecord = (savedRecord: ConstructionLogRecord) => {
    if (editingRecord) {
      setRecords((prev) => prev.map((r) => (r.id === savedRecord.id ? savedRecord : r)));
      addToast('แก้ไขข้อมูลลงในตารางเรียบร้อยแล้ว');
    } else {
      setRecords((prev) => [savedRecord, ...prev]);
      addToast('เพิ่มรายการใหม่ลงในตารางเรียบร้อยแล้ว');
    }
  };

  const handleResetData = () => {
    if (window.confirm("คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าตัวอย่างเริ่มต้นใช่หรือไม่? (ข้อมูลที่บันทึกไว้ในเครื่องจะถูกแทนที่)")) {
      setRecords([...INITIAL_RECORDS]);
      setColVisibility({ ...DEFAULT_COLUMN_VISIBILITY });
      addToast('รีเซ็ตข้อมูลตารางกลับเป็นค่าเริ่มต้น 20 รายการเรียบร้อยแล้ว');
    }
  };

  const handleImport = (newRecords: ConstructionLogRecord[], mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      setRecords(newRecords);
      addToast(`นำเข้าข้อมูลใหม่สำเร็จ (${newRecords.length} รายการ)`, 'success');
    } else {
      // Merge: avoid duplicating IDs
      const existingIds = new Set(records.map(r => r.id));
      const adjusted = newRecords.map(r => {
        if (existingIds.has(r.id)) {
          return { ...r, id: `R${Date.now()}_${Math.random().toString(36).substr(2, 4)}` };
        }
        return r;
      });
      setRecords((prev) => [...adjusted, ...prev]);
      addToast(`รวมข้อมูลเพิ่มเติมสำเร็จ (${adjusted.length} รายการ)`, 'success');
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: records.length };
    records.forEach((r) => {
      const c = (r.category === 'หินโรงโม่' || r.category === 'หินคลุก/ขนส่ง' || r.category === 'หินโรงโม่และขนส่ง') 
        ? 'หินโรงโม่และขนส่ง' 
        : r.category;
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [records]);

  // Category Badge Render Helper (Clean & Professional, Zero Emoji)
  const renderCategoryBadge = (cat: ProductCategory) => {
    switch (cat) {
      case 'เหล็ก/วัสดุ':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            เหล็ก / วัสดุ
          </span>
        );
      case 'คอนกรีต':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            คอนกรีต
          </span>
        );
      case 'เสาเข็ม':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            เสาเข็ม
          </span>
        );
      case 'หินโรงโม่':
      case 'หินคลุก/ขนส่ง':
      case 'หินโรงโม่และขนส่ง':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            หินโรงโม่และขนส่ง
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {cat}
          </span>
        );
    }
  };

  return (
    <div className="h-full text-slate-800 flex flex-col antialiased bg-slate-50 selection:bg-blue-100 selection:text-blue-900">
      {/* Header Bar */}
      <header className="bg-white text-slate-800 shadow-xs border-b border-slate-200 shrink-0 no-print">
        <div className="max-w-full mx-auto px-4 py-2.5 flex flex-wrap justify-between items-center gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-xs shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>ตารางบันทึกข้อมูลจัดซื้อ ขนส่ง และการเงิน (Master Log)</span>
                <span className="hidden sm:inline-flex bg-blue-50 text-blue-700 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">
                  22 คอลัมน์ • จัดเก็บในเครื่องอัตโนมัติ
                </span>
              </h1>
              <p className="text-[11px] text-slate-500">
                รวมข้อมูลหน้างาน: เหล็ก/วัสดุ • คอนกรีต • เสาเข็ม • หินโรงโม่และค่าบรรทุกขนส่ง (ยืดหยุ่น ปรับฟิลด์ได้)
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Action */}
            <button
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มรายการใหม่</span>
            </button>

            {/* Export CSV / Excel */}
            <button
              onClick={() => exportToCSV(filteredRecords)}
              title="ส่งออกเป็นไฟล์สำหรับ Microsoft Excel (รองรับภาษาไทย UTF-8)"
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>ส่งออก Excel</span>
            </button>

            {/* Backup JSON */}
            <button
              onClick={() => exportToJSON(records)}
              title="ดาวน์โหลดไฟล์สำรองข้อมูล JSON เก็บไว้ในคอมพิวเตอร์"
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">สำรอง JSON</span>
            </button>

            {/* Import JSON */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              title="นำเข้าไฟล์สำรองข้อมูล JSON"
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline">นำเข้า JSON</span>
            </button>

            {/* Column Toggler */}
            <button
              onClick={() => setIsColModalOpen(true)}
              title="ตั้งค่าซ่อน/แสดงคอลัมน์ในตาราง"
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">จัดการคอลัมน์</span>
            </button>

            {/* Print */}
            <button
              onClick={() => window.print()}
              title="พิมพ์ตารางรายงาน (Print / Save as PDF)"
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 p-1.5 rounded-lg text-xs transition shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
            </button>

            {/* Reset */}
            <button
              onClick={handleResetData}
              title="รีเซ็ตกลับเป็นข้อมูลตัวอย่างเริ่มต้น 20 รายการ"
              className="bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-300 p-1.5 rounded-lg text-xs transition shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-3 md:p-4 max-w-full mx-auto w-full gap-3 overflow-hidden">
        {/* KPI Metric Cards */}
        <div className="no-print">
          <SummaryCards records={filteredRecords} />
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 shrink-0 no-print">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 font-semibold mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>หมวดหมู่:</span>
            </span>

            {[
              { id: 'ALL', label: 'ทั้งหมด (Master View)' },
              { id: 'เหล็ก/วัสดุ', label: 'เหล็ก / วัสดุ' },
              { id: 'คอนกรีต', label: 'คอนกรีต' },
              { id: 'เสาเข็ม', label: 'เสาเข็ม' },
              { id: 'หินโรงโม่และขนส่ง', label: 'หินโรงโม่และขนส่ง' },
            ].map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar & Payment Status */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as 'ALL' | 'PAID' | 'UNPAID')}
              className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">สถานะเงิน: ทั้งหมด</option>
              <option value="UNPAID">ค้างชำระ (มียอดคงค้าง)</option>
              <option value="PAID">ชำระครบถ้วนแล้ว</option>
            </select>

            {/* Keyword Search */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา PO, ตั๋วชั่ง, รายการ, รถ, ผู้รับเหมา..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                  title="ล้างคำค้นหา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Master Table Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col overflow-hidden">
          <div className="table-responsive flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                {/* Header Level 1: Pastel Group Headers */}
                <tr className="font-bold border-b border-slate-300 select-none text-[11px]">
                  {/* Group 1: ข้อมูลเอกสาร */}
                  {(colVisibility.category || colVisibility.date || colVisibility.poNo || colVisibility.ticketNo || colVisibility.rrNo) && (
                    <th
                      colSpan={
                        (colVisibility.category ? 1 : 0) +
                        (colVisibility.date ? 1 : 0) +
                        (colVisibility.poNo ? 1 : 0) +
                        (colVisibility.ticketNo ? 1 : 0) +
                        (colVisibility.rrNo ? 1 : 0)
                      }
                      className="px-3 py-2 text-center bg-blue-100/80 text-blue-900 border-r border-blue-200 sticky-top"
                    >
                      1. ข้อมูลวันที่ & เอกสาร
                    </th>
                  )}

                  {/* Group 2: สถานที่ & ขนส่ง */}
                  {(colVisibility.vendor || colVisibility.quarry || colVisibility.truckNo) && (
                    <th
                      colSpan={
                        (colVisibility.vendor ? 1 : 0) +
                        (colVisibility.quarry ? 1 : 0) +
                        (colVisibility.truckNo ? 1 : 0)
                      }
                      className="px-3 py-2 text-center bg-purple-100/80 text-purple-900 border-r border-purple-200 sticky-top"
                    >
                      2. สถานที่ & ขนส่ง
                    </th>
                  )}

                  {/* Group 3: รายละเอียดสินค้า */}
                  {(colVisibility.description || colVisibility.spec) && (
                    <th
                      colSpan={
                        (colVisibility.description ? 1 : 0) +
                        (colVisibility.spec ? 1 : 0)
                      }
                      className="px-3 py-2 text-center bg-emerald-100/80 text-emerald-900 border-r border-emerald-200 sticky-top"
                    >
                      3. รายละเอียดสินค้า
                    </th>
                  )}

                  {/* Group 4: น้ำหนักชั่ง & เทียบตั๋วปลายทาง */}
                  {(colVisibility.grossWt || colVisibility.tareWt || colVisibility.netWt || colVisibility.destDate || colVisibility.destTicketNo || colVisibility.destGrossWt || colVisibility.destTareWt || colVisibility.destNetWt || colVisibility.weightDiff) && (
                    <th
                      colSpan={
                        (colVisibility.grossWt ? 1 : 0) +
                        (colVisibility.tareWt ? 1 : 0) +
                        (colVisibility.netWt ? 1 : 0) +
                        (colVisibility.destDate ? 1 : 0) +
                        (colVisibility.destTicketNo ? 1 : 0) +
                        (colVisibility.destGrossWt ? 1 : 0) +
                        (colVisibility.destTareWt ? 1 : 0) +
                        (colVisibility.destNetWt ? 1 : 0) +
                        (colVisibility.weightDiff ? 1 : 0)
                      }
                      className="px-3 py-2 text-center bg-amber-100 text-amber-900 border-r border-amber-200 sticky-top"
                    >
                      4. น้ำหนักชั่ง & ตั๋วปลายทาง (เทียบส่วนต่าง)
                    </th>
                  )}

                  {/* Group 5: ราคาหิน, ค่าบรรทุก (แยก 2 ส่วน) & รวมเงิน */}
                  {(colVisibility.qty || colVisibility.unit || colVisibility.pricePerUnit || colVisibility.materialAmount || colVisibility.transportType || colVisibility.haulerName || colVisibility.freightRate || colVisibility.freightAmount || colVisibility.extraFee || colVisibility.totalAmount) && (
                    <th
                      colSpan={
                        (colVisibility.qty ? 1 : 0) +
                        (colVisibility.unit ? 1 : 0) +
                        (colVisibility.pricePerUnit ? 1 : 0) +
                        (colVisibility.materialAmount ? 1 : 0) +
                        (colVisibility.transportType ? 1 : 0) +
                        (colVisibility.haulerName ? 1 : 0) +
                        (colVisibility.freightRate ? 1 : 0) +
                        (colVisibility.freightAmount ? 1 : 0) +
                        (colVisibility.extraFee ? 1 : 0) +
                        (colVisibility.totalAmount ? 1 : 0)
                      }
                      className="px-3 py-2 text-center bg-indigo-100/80 text-indigo-900 border-r border-indigo-200 sticky-top"
                    >
                      5. ราคาหิน, ค่าบรรทุก (แยก 2 ส่วน) & รวมเงิน
                    </th>
                  )}

                  {/* Group 6: การเงิน & โครงการ */}
                  {(colVisibility.paidAmount || colVisibility.balance || colVisibility.workStructure || colVisibility.remark) && (
                    <th
                      colSpan={
                        (colVisibility.paidAmount ? 1 : 0) +
                        (colVisibility.balance ? 1 : 0) +
                        (colVisibility.workStructure ? 1 : 0) +
                        (colVisibility.remark ? 1 : 0)
                      }
                      className="px-3 py-2 text-center bg-teal-100/80 text-teal-900 border-r border-teal-200 sticky-top"
                    >
                      6. การเงิน & โครงการ
                    </th>
                  )}

                  {/* Actions Sticky Column */}
                  <th rowSpan={2} className="px-3 py-2 text-center bg-slate-200 text-slate-800 sticky-top border-l border-slate-300 no-print">
                    จัดการ
                  </th>
                </tr>

                {/* Header Level 2: Specific Columns */}
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 text-[11px]">
                  {/* Group 1 */}
                  {colVisibility.category && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">หมวดหมู่</th>}
                  {colVisibility.date && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100 font-mono-numbers">วัน/เดือน/ปี</th>}
                  {colVisibility.poNo && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">เลขที่ PO</th>}
                  {colVisibility.ticketNo && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">เลขใบจ่ายสินค้า/ตั๋ว</th>}
                  {colVisibility.rrNo && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">ใบเสนอราคา / RR</th>}

                  {/* Group 2 */}
                  {colVisibility.vendor && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">ผู้รับเหมา / บริษัท</th>}
                  {colVisibility.quarry && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">โรงโม่ / กิจการ</th>}
                  {colVisibility.truckNo && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">ทะเบียนรถ / ชุด</th>}

                  {/* Group 3 */}
                  {colVisibility.description && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100 min-w-[180px]">รายละเอียด / รายการ</th>}
                  {colVisibility.spec && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">สเปก / รหัส / str.</th>}

                  {/* Group 4: ต้นทาง & ปลายทาง & ผลต่าง */}
                  {colVisibility.grossWt && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-amber-50 text-amber-900">รถหนักต้นทาง</th>}
                  {colVisibility.tareWt && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-amber-50 text-amber-900">รถเบาต้นทาง</th>}
                  {colVisibility.netWt && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right font-bold bg-amber-100 text-amber-950">สุทธิต้นทาง (ตัน)</th>}
                  {colVisibility.destDate && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-sky-50 text-sky-900 font-mono-numbers">วันที่ปลายทาง</th>}
                  {colVisibility.destTicketNo && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-sky-50 text-sky-900 font-semibold">เลขที่บิล/ตั๋วปลายทาง</th>}
                  {colVisibility.destGrossWt && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-sky-50 text-sky-900">รถหนักปลายทาง</th>}
                  {colVisibility.destTareWt && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-sky-50 text-sky-900">รถเบาปลายทาง</th>}
                  {colVisibility.destNetWt && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right font-bold bg-sky-100 text-sky-950">สุทธิปลายทาง (ตัน)</th>}
                  {colVisibility.weightDiff && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-center font-bold bg-rose-50 text-rose-900">ผลต่าง (กก.)</th>}

                  {/* Group 5: ราคาหิน & ค่าบรรทุก */}
                  {colVisibility.qty && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-slate-100">ปริมาณ</th>}
                  {colVisibility.unit && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">หน่วย</th>}
                  {colVisibility.pricePerUnit && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-amber-50 text-amber-900">ราคาหิน/หน่วย</th>}
                  {colVisibility.materialAmount && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right font-bold bg-amber-100 text-amber-950">รวมค่าหิน (บาท)</th>}
                  {colVisibility.transportType && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-center bg-sky-50 text-sky-900">ประเภทขนส่ง</th>}
                  {colVisibility.haulerName && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-sky-50 text-sky-900">ผู้รับจ้างขนส่ง</th>}
                  {colVisibility.freightRate && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-sky-50 text-sky-900">ค่าบรรทุก/ตัน</th>}
                  {colVisibility.freightAmount && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right font-bold bg-sky-100 text-sky-950">รวมค่าบรรทุก (บาท)</th>}
                  {colVisibility.extraFee && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-slate-100">ค่าขนส่งเดิม</th>}
                  {colVisibility.totalAmount && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right font-bold bg-blue-100 text-blue-900">รวมเงินทั้งสิ้น</th>}

                  {/* Group 6 */}
                  {colVisibility.paidAmount && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-slate-100 text-emerald-800">ชำระแล้ว</th>}
                  {colVisibility.balance && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-slate-100 text-rose-700 font-semibold">คงค้างชำระ</th>}
                  {colVisibility.workStructure && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">โครงสร้างงาน / กม.</th>}
                  {colVisibility.remark && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100 min-w-[140px]">หมายเหตุ</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-slate-700 text-xs">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={24} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Layers className="w-10 h-10 text-slate-300" />
                        <div className="font-semibold text-slate-600">ไม่พบรายการข้อมูลตามเงื่อนไขที่เลือก</div>
                        <p className="text-xs text-slate-400">ลองล้างคำค้นหา หรือเลือกหมวดหมู่อื่น หรือกดปุ่ม "+ เพิ่มรายการใหม่"</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((row, idx) => {
                    const balance = (Number(row.totalAmount) || 0) - (Number(row.paidAmount) || 0);

                    return (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-blue-50/50 transition-colors border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                      >
                        {/* Group 1 */}
                        {colVisibility.category && (
                          <td className="px-3 py-2 border-r border-slate-200">
                            {renderCategoryBadge(row.category)}
                          </td>
                        )}
                        {colVisibility.date && (
                          <td className="px-3 py-2 border-r border-slate-200 font-mono-numbers text-slate-600 text-[11px]">
                            {row.date || '-'}
                          </td>
                        )}
                        {colVisibility.poNo && (
                          <td className="px-3 py-2 border-r border-slate-200 font-mono-numbers text-blue-700 font-semibold text-[11px]">
                            {row.poNo !== '-' ? row.poNo : '-'}
                          </td>
                        )}
                        {colVisibility.ticketNo && (
                          <td className="px-3 py-2 border-r border-slate-200 font-mono-numbers text-slate-800 text-[11px]">
                            {row.ticketNo !== '-' ? row.ticketNo : '-'}
                          </td>
                        )}
                        {colVisibility.rrNo && (
                          <td className="px-3 py-2 border-r border-slate-200 font-mono-numbers text-slate-600 text-[11px]">
                            {row.rrNo !== '-' ? row.rrNo : '-'}
                          </td>
                        )}

                        {/* Group 2 */}
                        {colVisibility.vendor && (
                          <td className="px-3 py-2 border-r border-slate-200 font-medium text-slate-800">
                            {row.vendor !== '-' ? row.vendor : '-'}
                          </td>
                        )}
                        {colVisibility.quarry && (
                          <td className="px-3 py-2 border-r border-slate-200 text-slate-700">
                            {row.quarry !== '-' ? row.quarry : '-'}
                          </td>
                        )}
                        {colVisibility.truckNo && (
                          <td className="px-3 py-2 border-r border-slate-200 font-mono-numbers text-slate-700">
                            {row.truckNo !== '-' ? row.truckNo : '-'}
                          </td>
                        )}

                        {/* Group 3 */}
                        {colVisibility.description && (
                          <td className="px-3 py-2 border-r border-slate-200 font-semibold text-slate-900">
                            {row.description || '-'}
                          </td>
                        )}
                        {colVisibility.spec && (
                          <td className="px-3 py-2 border-r border-slate-200 font-mono-numbers text-slate-600 text-[11px]">
                            {row.spec !== '-' ? row.spec : '-'}
                          </td>
                        )}

                        {/* Group 4: ต้นทาง, ปลายทาง & ผลต่าง */}
                        {colVisibility.grossWt && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right bg-amber-50/40 font-mono-numbers">
                            {formatNumber(row.grossWt)}
                          </td>
                        )}
                        {colVisibility.tareWt && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right bg-amber-50/40 font-mono-numbers">
                            {formatNumber(row.tareWt)}
                          </td>
                        )}
                        {colVisibility.netWt && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right font-bold text-amber-950 bg-amber-100/50 font-mono-numbers">
                            {row.netWt ? Number(row.netWt).toFixed(2) : '-'}
                          </td>
                        )}
                        {colVisibility.destDate && (
                          <td className="px-3 py-2 border-r border-slate-200 font-mono-numbers text-sky-800 text-[11px] bg-sky-50/20">
                            {row.destDate && row.destDate !== '-' ? row.destDate : (row.date || '-')}
                          </td>
                        )}
                        {colVisibility.destTicketNo && (
                          <td className="px-3 py-2 border-r border-slate-200 font-mono-numbers text-sky-800 text-[11px] bg-sky-50/20">
                            {row.destTicketNo && row.destTicketNo !== '-' ? row.destTicketNo : '-'}
                          </td>
                        )}
                        {colVisibility.destGrossWt && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right bg-sky-50/20 font-mono-numbers">
                            {row.destGrossWt && Number(row.destGrossWt) > 0 ? formatNumber(row.destGrossWt) : '-'}
                          </td>
                        )}
                        {colVisibility.destTareWt && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right bg-sky-50/20 font-mono-numbers">
                            {row.destTareWt && Number(row.destTareWt) > 0 ? formatNumber(row.destTareWt) : '-'}
                          </td>
                        )}
                        {colVisibility.destNetWt && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right font-bold text-sky-950 bg-sky-100/50 font-mono-numbers">
                            {row.destNetWt && Number(row.destNetWt) > 0 ? Number(row.destNetWt).toFixed(2) : '-'}
                          </td>
                        )}
                        {colVisibility.weightDiff && (
                          <td className="px-3 py-2 border-r border-slate-200 text-center font-mono-numbers">
                            {(() => {
                              const diff = row.weightDiffKg ?? (
                                row.destNetWt && Number(row.destNetWt) > 0 && row.netWt && Number(row.netWt) > 0
                                  ? Math.round((Number(row.destNetWt) - Number(row.netWt)) * 1000)
                                  : null
                              );
                              if (diff === null || diff === undefined) {
                                return <span className="text-slate-300">-</span>;
                              }
                              if (diff < 0) {
                                return (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    ขาด {Math.abs(diff).toLocaleString()} กก.
                                  </span>
                                );
                              }
                              if (diff > 0) {
                                return (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    +{diff.toLocaleString()} กก.
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  ตรงกัน
                                </span>
                              );
                            })()}
                          </td>
                        )}

                        {/* Group 5: ราคาหิน & ค่าบรรทุก */}
                        {colVisibility.qty && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right font-semibold font-mono-numbers">
                            {formatNumber(row.qty)}
                          </td>
                        )}
                        {colVisibility.unit && (
                          <td className="px-3 py-2 border-r border-slate-200 text-slate-600 text-center">
                            {row.unit || '-'}
                          </td>
                        )}
                        {colVisibility.pricePerUnit && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right font-mono-numbers text-amber-900 bg-amber-50/20">
                            {formatNumber(row.pricePerUnit)}
                          </td>
                        )}
                        {colVisibility.materialAmount && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right font-bold text-amber-950 bg-amber-100/40 font-mono-numbers">
                            {formatCurrency(row.materialAmount ?? (Number(row.qty) * Number(row.pricePerUnit)))}
                          </td>
                        )}
                        {colVisibility.transportType && (
                          <td className="px-3 py-2 border-r border-slate-200 text-center font-medium text-[11px]">
                            {(() => {
                              const isHired = row.transportType === 'hired' || (row.freightAmount && Number(row.freightAmount) > 0) || (row.extraFee && Number(row.extraFee) > 0);
                              if (isHired) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
                                    <span>🚛 จ้างขน</span>
                                    {row.haulerName && row.haulerName !== '-' && <span className="text-[10px]">({row.haulerName})</span>}
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <span>🚗 วิ่งเอง</span>
                                </span>
                              );
                            })()}
                          </td>
                        )}
                        {colVisibility.haulerName && (
                          <td className="px-3 py-2 border-r border-slate-200 text-slate-700 font-medium">
                            {row.haulerName && row.haulerName !== '-' ? row.haulerName : (row.transportType === 'hired' ? (row.vendor || '-') : 'รถบริษัท')}
                          </td>
                        )}
                        {colVisibility.freightRate && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right bg-sky-50/20 font-mono-numbers text-sky-900">
                            {(() => {
                              const isHired = row.transportType === 'hired' || (row.freightAmount && Number(row.freightAmount) > 0) || (row.extraFee && Number(row.extraFee) > 0);
                              if (!isHired) return <span className="text-slate-300">-</span>;
                              const rate = row.freightRate !== undefined ? row.freightRate : row.extraFee;
                              return formatNumber(rate);
                            })()}
                          </td>
                        )}
                        {colVisibility.freightAmount && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right bg-sky-100/40 font-bold font-mono-numbers text-sky-950">
                            {(() => {
                              const isHired = row.transportType === 'hired' || (row.freightAmount && Number(row.freightAmount) > 0) || (row.extraFee && Number(row.extraFee) > 0);
                              if (!isHired) return <span className="text-slate-400 font-normal">0.00</span>;
                              const amt = row.freightAmount !== undefined 
                                ? row.freightAmount 
                                : (Number(row.qty) * (Number(row.freightRate) || Number(row.extraFee) || 0));
                              return formatCurrency(amt);
                            })()}
                          </td>
                        )}
                        {colVisibility.extraFee && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right text-slate-600 font-mono-numbers">
                            {formatNumber(row.extraFee)}
                          </td>
                        )}
                        {colVisibility.totalAmount && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right font-bold text-blue-700 bg-blue-50/60 font-mono-numbers">
                            {formatCurrency(row.totalAmount)}
                          </td>
                        )}

                        {/* Group 6 */}
                        {colVisibility.paidAmount && (
                          <td className="px-3 py-2 border-r border-slate-200 text-right text-emerald-600 font-semibold font-mono-numbers">
                            {formatCurrency(row.paidAmount)}
                          </td>
                        )}
                        {colVisibility.balance && (
                          <td className={`px-3 py-2 border-r border-slate-200 text-right font-semibold font-mono-numbers ${balance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {formatCurrency(balance)}
                          </td>
                        )}
                        {colVisibility.workStructure && (
                          <td className="px-3 py-2 border-r border-slate-200 text-slate-600">
                            {row.workStructure !== '-' ? row.workStructure : '-'}
                          </td>
                        )}
                        {colVisibility.remark && (
                          <td className="px-3 py-2 border-r border-slate-200 text-slate-500 italic max-w-xs truncate" title={row.remark}>
                            {row.remark !== '-' ? row.remark : '-'}
                          </td>
                        )}

                        {/* Actions */}
                        <td className="px-2 py-1 text-center bg-white sticky-col-left border-l border-slate-200 no-print">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition"
                              title="แก้ไขรายการ"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(row)}
                              className="text-slate-500 hover:text-slate-700 p-1 hover:bg-slate-100 rounded transition"
                              title="คัดลอกสร้างรายการใหม่ (Duplicate)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(row)}
                              className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition"
                              title="ลบรายการ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer: Dynamic Totals */}
              <tfoot>
                <tr className="bg-slate-200 text-slate-900 font-bold sticky bottom-0 z-20 border-t-2 border-blue-600 text-xs">
                  {/* Category, Date, PO, Ticket, RR, Vendor, Quarry, Truck, Desc, Spec */}
                  <td
                    colSpan={
                      (colVisibility.category ? 1 : 0) +
                      (colVisibility.date ? 1 : 0) +
                      (colVisibility.poNo ? 1 : 0) +
                      (colVisibility.ticketNo ? 1 : 0) +
                      (colVisibility.rrNo ? 1 : 0) +
                      (colVisibility.vendor ? 1 : 0) +
                      (colVisibility.quarry ? 1 : 0) +
                      (colVisibility.truckNo ? 1 : 0) +
                      (colVisibility.description ? 1 : 0) +
                      (colVisibility.spec ? 1 : 0)
                    }
                    className="px-3 py-2 text-right font-bold text-slate-800"
                  >
                    รวมยอดสรุปตามที่แสดงในตาราง:
                  </td>

                  {/* Weights */}
                  {colVisibility.grossWt && (
                    <td className="px-3 py-2 text-right font-bold text-amber-900 font-mono-numbers">
                      {formatNumber(tableTotals.sumGross)}
                    </td>
                  )}
                  {colVisibility.tareWt && (
                    <td className="px-3 py-2 text-right font-bold text-amber-900 font-mono-numbers">
                      {formatNumber(tableTotals.sumTare)}
                    </td>
                  )}
                  {colVisibility.netWt && (
                    <td className="px-3 py-2 text-right font-bold text-amber-950 bg-amber-200/70 font-mono-numbers">
                      {tableTotals.sumNet.toFixed(2)}
                    </td>
                  )}
                  {colVisibility.destDate && <td className="px-3 py-2 bg-sky-50"></td>}
                  {colVisibility.destTicketNo && <td className="px-3 py-2"></td>}
                  {colVisibility.destGrossWt && (
                    <td className="px-3 py-2 text-right font-bold text-sky-900 font-mono-numbers">
                      {tableTotals.sumDestGross > 0 ? formatNumber(tableTotals.sumDestGross) : '-'}
                    </td>
                  )}
                  {colVisibility.destTareWt && (
                    <td className="px-3 py-2 text-right font-bold text-sky-900 font-mono-numbers">
                      {tableTotals.sumDestTare > 0 ? formatNumber(tableTotals.sumDestTare) : '-'}
                    </td>
                  )}
                  {colVisibility.destNetWt && (
                    <td className="px-3 py-2 text-right font-bold text-sky-950 bg-sky-200/70 font-mono-numbers">
                      {tableTotals.sumDestNet > 0 ? tableTotals.sumDestNet.toFixed(2) : '-'}
                    </td>
                  )}
                  {colVisibility.weightDiff && (
                    <td className="px-3 py-2 text-center font-bold font-mono-numbers">
                      {tableTotals.countDiff > 0 ? (
                        <span className={tableTotals.sumDiffKg < 0 ? 'text-rose-700' : tableTotals.sumDiffKg > 0 ? 'text-emerald-700' : 'text-slate-600'}>
                          {tableTotals.sumDiffKg < 0 ? `ขาด ${Math.abs(tableTotals.sumDiffKg).toLocaleString()} กก.` : tableTotals.sumDiffKg > 0 ? `+${tableTotals.sumDiffKg.toLocaleString()} กก.` : '0 กก.'}
                        </span>
                      ) : '-'}
                    </td>
                  )}

                  {/* Qty, Unit, Price, Material Amount, Transport, Hauler, Freight Rate, Freight Amount, ExtraFee, Total */}
                  {colVisibility.qty && (
                    <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono-numbers">
                      {formatNumber(tableTotals.sumQty)}
                    </td>
                  )}
                  {colVisibility.unit && <td className="px-3 py-2"></td>}
                  {colVisibility.pricePerUnit && <td className="px-3 py-2"></td>}
                  {colVisibility.materialAmount && (
                    <td className="px-3 py-2 text-right font-bold text-amber-950 bg-amber-200/70 font-mono-numbers">
                      {formatCurrency(tableTotals.sumMaterialAmount)}
                    </td>
                  )}
                  {colVisibility.transportType && <td className="px-3 py-2"></td>}
                  {colVisibility.haulerName && <td className="px-3 py-2"></td>}
                  {colVisibility.freightRate && <td className="px-3 py-2"></td>}
                  {colVisibility.freightAmount && (
                    <td className="px-3 py-2 text-right font-bold text-sky-950 bg-sky-200/70 font-mono-numbers">
                      {formatCurrency(tableTotals.sumFreightAmount)}
                    </td>
                  )}
                  {colVisibility.extraFee && <td className="px-3 py-2"></td>}
                  {colVisibility.totalAmount && (
                    <td className="px-3 py-2 text-right font-bold text-blue-900 bg-blue-100 font-mono-numbers">
                      {formatCurrency(tableTotals.sumTotal)}
                    </td>
                  )}

                  {/* Paid, Balance, Structure, Remark */}
                  {colVisibility.paidAmount && (
                    <td className="px-3 py-2 text-right font-bold text-emerald-800 font-mono-numbers">
                      {formatCurrency(tableTotals.sumPaid)}
                    </td>
                  )}
                  {colVisibility.balance && (
                    <td className="px-3 py-2 text-right font-bold text-rose-800 font-mono-numbers">
                      {formatCurrency(tableTotals.sumBalance)}
                    </td>
                  )}
                  {colVisibility.workStructure && <td className="px-3 py-2"></td>}
                  {colVisibility.remark && <td className="px-3 py-2"></td>}

                  {/* Empty cell for Actions column */}
                  <td className="px-2 py-2 no-print bg-slate-200"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Table Bottom Status Bar */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs text-slate-500 gap-2 shrink-0 no-print">
            <div className="font-medium text-slate-700 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>
                กำลังแสดง <strong>{filteredRecords.length}</strong> จากทั้งหมด <strong>{records.length}</strong> รายการ
              </span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span> เหล็ก / วัสดุ</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-amber-500 rounded-full inline-block"></span> คอนกรีต</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-purple-500 rounded-full inline-block"></span> เสาเข็ม</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-600 rounded-full inline-block"></span> หินโรงโม่และขนส่ง</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modals & Dialogs */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSave={handleSaveRecord}
        initialRecord={editingRecord}
      />

      <ColumnToggleModal
        isOpen={isColModalOpen}
        onClose={() => setIsColModalOpen(false)}
        visibility={colVisibility}
        onChangeVisibility={setColVisibility}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        record={deletingRecord}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={removeToast}
      />
    </div>
  );
}

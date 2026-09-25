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
  X,
  Check,
  Truck,
  Boxes,
  Hammer,
  Link2,
  Split
} from 'lucide-react';

import { ConstructionLogRecord, ProductCategory, PendingDocument } from './types.ts';
import { INITIAL_RECORDS, DEFAULT_COLUMN_VISIBILITY, INITIAL_PENDING_DOCUMENTS } from './initialData.ts';

const PRODUCT_CATEGORIES: ProductCategory[] = [
  'หินโรงโม่และขนส่ง',
  'เหล็ก/วัสดุ',
  'คอนกรีต',
  'เสาเข็ม',
  'ทั่วไป/อื่นๆ',
];
import { SummaryCards } from './components/SummaryCards.tsx';
import { RecordModal } from './components/RecordModal.tsx';
import { ColumnToggleModal } from './components/ColumnToggleModal.tsx';
import { ImportModal } from './components/ImportModal.tsx';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.tsx';
import { PendingMatchingModal } from './components/PendingMatchingModal.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { exportToCSV, exportToJSON, formatCurrency, formatNumber } from './utils/exportUtils.ts';

const STORAGE_KEY = 'unified_master_construction_log_v4';
const VISIBILITY_STORAGE_KEY = 'unified_master_col_visibility_v4';
const PENDING_DOCS_KEY = 'unified_master_pending_docs_v1';

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
          paymentRecipientType: true,
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
  const [recipientFilter, setRecipientFilter] = useState<'ALL' | 'split' | 'hauler_all' | 'seller_all'>('ALL');

  // 4. Modal states
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ConstructionLogRecord | null>(null);
  
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [deletingRecord, setDeletingRecord] = useState<ConstructionLogRecord | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Phase 1: Pending Matching Hub State (กล่องพักเอกสารรอชนบิล)
  const [isMatchingModalOpen, setIsMatchingModalOpen] = useState(false);
  const [selectedRecordForMatching, setSelectedRecordForMatching] = useState<string | null>(null);
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>(() => {
    try {
      const saved = localStorage.getItem(PENDING_DOCS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_PENDING_DOCUMENTS;
  });

  // Inline table editing states (แก้ไขในตารางโดยตรง ไม่เปิดป๊อปอัป)
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState<ConstructionLogRecord | null>(null);

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
      localStorage.setItem(PENDING_DOCS_KEY, JSON.stringify(pendingDocs));
    } catch (e) {
      console.error("Failed to save pending docs to localStorage", e);
    }
  }, [pendingDocs]);

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

      // Payment recipient pattern filter (จ่ายแยก / จ่ายผู้รับจ้างขนรวม / จ่ายผู้ขายรวม)
      if (recipientFilter !== 'ALL') {
        const isHired = item.transportType === 'hired' || (item.freightAmount && Number(item.freightAmount) > 0) || (item.extraFee && Number(item.extraFee) > 0);
        const scheme = !isHired ? 'seller_all' : (item.paymentRecipientType || 'split');
        if (scheme !== recipientFilter) return false;
      }

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
          (item.haulerName || '').toLowerCase().includes(q) ||
          (item.workStructure || '').toLowerCase().includes(q) ||
          (item.remark || '').toLowerCase().includes(q) ||
          (item.category || '').toLowerCase().includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [records, selectedCategory, paymentFilter, recipientFilter, searchQuery]);

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

      const isHired = r.transportType === 'hired' || (r.freightAmount && Number(r.freightAmount) > 0) || (r.extraFee && Number(r.extraFee) > 0);
      const fr = isHired 
        ? (r.freightAmount !== undefined ? Number(r.freightAmount) : (r.extraFee ? q * Number(r.extraFee) : 0))
        : 0;
      sumFreightAmount += fr;

      const tot = Number(r.totalAmount) || (mat + fr);
      const pd = Number(r.paidAmount) || 0;
      sumTotal += tot;
      sumPaid += pd;
      sumBalance += (tot - pd);

      const scheme = !isHired ? 'seller_all' : (r.paymentRecipientType || 'split');
      let rowPaidMat = 0;
      let rowBalMat = 0;
      let rowPaidFr = 0;
      let rowBalFr = 0;

      if (scheme === 'hauler_all') {
        rowPaidFr = pd;
        rowBalFr = Math.max(0, tot - pd);
        rowPaidMat = 0;
        rowBalMat = 0;
      } else if (scheme === 'seller_all') {
        rowPaidMat = pd;
        rowBalMat = Math.max(0, tot - pd);
        rowPaidFr = 0;
        rowBalFr = 0;
      } else {
        // split
        rowPaidMat = r.paidMaterial !== undefined ? Number(r.paidMaterial) : (pd >= mat ? mat : pd);
        rowBalMat = Math.max(0, mat - rowPaidMat);
        rowPaidFr = r.paidFreight !== undefined ? Number(r.paidFreight) : (pd > mat ? Math.min(fr, pd - mat) : 0);
        rowBalFr = Math.max(0, fr - rowPaidFr);
      }

      sumPaidMaterial += rowPaidMat;
      sumMaterialBalance += rowBalMat;
      sumPaidFreight += rowPaidFr;
      sumFreightBalance += rowBalFr;
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

  // Group 1 sticky layout calculations (ตรึงข้อมูลเอกสาร & วันที่ ทางซ้าย)
  const group1Widths = {
    category: 145,
    poNo: 110,
    rrNo: 110,
    date: 95,
    ticketNo: 130,
  } as const;

  const { group1Offsets, lastVisibleGroup1Key, group1VisibleCount } = useMemo(() => {
    let currentLeft = 0;
    const offsets: Record<string, number> = {};
    const visibleKeys: (keyof typeof group1Widths)[] = [];

    const keys = ['category', 'poNo', 'rrNo', 'date', 'ticketNo'] as const;
    keys.forEach((key) => {
      if (colVisibility[key]) {
        offsets[key] = currentLeft;
        currentLeft += group1Widths[key];
        visibleKeys.push(key);
      }
    });

    return {
      group1Offsets: offsets,
      lastVisibleGroup1Key: visibleKeys.length > 0 ? visibleKeys[visibleKeys.length - 1] : null,
      group1VisibleCount: visibleKeys.length,
    };
  }, [colVisibility]);

  // Handlers
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setIsRecordModalOpen(true);
  };

  const handleOpenEdit = (rec: ConstructionLogRecord) => {
    // When editing, do inline editing instead of opening popup
    handleStartInlineEdit(rec);
  };

  // Inline Editing Handlers
  const handleStartInlineEdit = (rec: ConstructionLogRecord) => {
    setInlineEditingId(rec.id);
    setInlineDraft({ ...rec });
  };

  const handleCancelInline = () => {
    setInlineEditingId(null);
    setInlineDraft(null);
  };

  const handleSaveInline = () => {
    if (!inlineDraft) return;
    const updated: ConstructionLogRecord = {
      ...inlineDraft,
      date: inlineDraft.date ? inlineDraft.date.trim() : '-',
      poNo: inlineDraft.poNo ? inlineDraft.poNo.trim() : '-',
      rrNo: inlineDraft.rrNo ? inlineDraft.rrNo.trim() : '-',
      ticketNo: inlineDraft.ticketNo ? inlineDraft.ticketNo.trim() : '-',
      vendor: inlineDraft.vendor ? inlineDraft.vendor.trim() : '-',
      quarry: inlineDraft.quarry ? inlineDraft.quarry.trim() : '-',
      truckNo: inlineDraft.truckNo ? inlineDraft.truckNo.trim() : '-',
      description: inlineDraft.description ? inlineDraft.description.trim() : '-',
      spec: inlineDraft.spec ? inlineDraft.spec.trim() : '-',
      destDate: inlineDraft.destDate ? inlineDraft.destDate.trim() : '-',
      destTicketNo: inlineDraft.destTicketNo ? inlineDraft.destTicketNo.trim() : '-',
      haulerName: inlineDraft.haulerName ? inlineDraft.haulerName.trim() : '-',
      workStructure: inlineDraft.workStructure ? inlineDraft.workStructure.trim() : '-',
      remark: inlineDraft.remark ? inlineDraft.remark.trim() : '-',
      updatedAt: new Date().toISOString()
    };

    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    addToast(`บันทึกการแก้ไข "${updated.description || updated.ticketNo}" ในตารางเรียบร้อยแล้ว`, 'success');
    setInlineEditingId(null);
    setInlineDraft(null);
  };

  const updateInlineField = (updates: Partial<ConstructionLogRecord>) => {
    setInlineDraft((prev) => {
      if (!prev) return null;
      const next: ConstructionLogRecord = { ...prev, ...updates };

      // Weight auto-calc
      const g = parseFloat(String(next.grossWt)) || 0;
      const t = parseFloat(String(next.tareWt)) || 0;
      if (updates.grossWt !== undefined || updates.tareWt !== undefined) {
        const net = g > 0 ? Math.max(0, g - t) : 0;
        next.netWt = Number(net.toFixed(2));
        if (
          next.category === 'หินโรงโม่และขนส่ง' ||
          next.category === 'หินโรงโม่' ||
          next.category === 'หินคลุก/ขนส่ง'
        ) {
          next.qty = next.netWt;
        }
      }

      // Dest weights auto-calc
      const dg = parseFloat(String(next.destGrossWt)) || 0;
      const dt = parseFloat(String(next.destTareWt)) || 0;
      if (updates.destGrossWt !== undefined || updates.destTareWt !== undefined) {
        const dnet = dg > 0 ? Math.max(0, dg - dt) : 0;
        next.destNetWt = Number(dnet.toFixed(2));
      }
      const curNet = next.netWt ? Number(next.netWt) : 0;
      const curDestNet = next.destNetWt ? Number(next.destNetWt) : 0;
      if (curNet > 0 && curDestNet > 0) {
        next.weightDiffKg = Math.round((curDestNet - curNet) * 1000);
      } else {
        next.weightDiffKg = undefined;
      }

      // Pricing & Freight auto-calc
      const q = parseFloat(String(next.qty)) || 0;
      const p = parseFloat(String(next.pricePerUnit)) || 0;
      const fRate = parseFloat(String(next.freightRate)) || 0;
      const tType = next.transportType || 'self';
      const fFeeType = next.freightFeeType || 'per_unit';

      const matAmt = q * p;
      next.materialAmount = Number(matAmt.toFixed(2));

      let frAmt = 0;
      if (tType === 'hired') {
        frAmt = fFeeType === 'per_unit' ? q * fRate : fRate;
      }
      next.freightAmount = Number(frAmt.toFixed(2));
      next.extraFee = fRate;
      next.totalAmount = Number((matAmt + frAmt).toFixed(2));

      // Payment recipient split adjustments
      const rType = next.paymentRecipientType || 'split';
      if (updates.paymentRecipientType !== undefined) {
        const currentPaid = parseFloat(String(next.paidAmount)) || 0;
        if (rType === 'hauler_all') {
          next.paidFreight = currentPaid > 0 ? currentPaid : 0;
          next.paidMaterial = 0;
        } else if (rType === 'seller_all') {
          next.paidMaterial = currentPaid > 0 ? currentPaid : 0;
          next.paidFreight = 0;
        }
      }

      if (updates.paidMaterial !== undefined || updates.paidFreight !== undefined) {
        const pMat = parseFloat(String(next.paidMaterial)) || 0;
        const pFr = parseFloat(String(next.paidFreight)) || 0;
        next.paidAmount = Number((pMat + pFr).toFixed(2));
      } else if (updates.paidAmount !== undefined && rType !== 'split') {
        const paid = parseFloat(String(next.paidAmount)) || 0;
        if (rType === 'hauler_all') {
          next.paidFreight = paid;
          next.paidMaterial = 0;
        } else if (rType === 'seller_all') {
          next.paidMaterial = paid;
          next.paidFreight = 0;
        }
      }

      return next;
    });
  };

  const handleInlineCategoryChange = (newCat: ProductCategory) => {
    let defaultUnit = inlineDraft?.unit || 'ตัน';
    if (newCat === 'เหล็ก/วัสดุ') defaultUnit = 'เส้น';
    else if (newCat === 'คอนกรีต') defaultUnit = 'คิว';
    else if (newCat === 'เสาเข็ม') defaultUnit = 'ต้น';
    else if (newCat === 'หินโรงโม่และขนส่ง') defaultUnit = 'ตัน';
    updateInlineField({ category: newCat, unit: defaultUnit });
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveInline();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelInline();
    }
  };

  useEffect(() => {
    if (!inlineEditingId) return;
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelInline();
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [inlineEditingId]);

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

  // Phase 1: Smart Matching Handlers (ฟังก์ชันชนบิล)
  const handleMatchPendingDoc = (
    pendingDoc: PendingDocument,
    targetRecordIds: string[],
    applyToSameTicket: boolean
  ) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (!targetRecordIds.includes(rec.id)) return rec;

        const updated: ConstructionLogRecord = { ...rec };

        if (pendingDoc.docType === 'DEST_TICKET') {
          updated.destTicketNo = pendingDoc.docNo;
          if (pendingDoc.date) updated.destDate = pendingDoc.date;
          if (pendingDoc.destGrossWt !== undefined) updated.destGrossWt = pendingDoc.destGrossWt;
          if (pendingDoc.destTareWt !== undefined) updated.destTareWt = pendingDoc.destTareWt;
          if (pendingDoc.destNetWt !== undefined) {
            updated.destNetWt = pendingDoc.destNetWt;
            if (updated.netWt && updated.netWt > 0) {
              updated.weightDiffKg = Math.round((pendingDoc.destNetWt - updated.netWt) * 1000);
            }
          }
        } else if (pendingDoc.docType === 'PO') {
          updated.poNo = pendingDoc.docNo;
        } else if (pendingDoc.docType === 'RR') {
          updated.rrNo = pendingDoc.docNo;
        }

        return updated;
      })
    );

    // Update pending document status to matched
    setPendingDocs((prev) =>
      prev.map((d) => {
        if (d.id === pendingDoc.id) {
          return {
            ...d,
            status: 'matched',
            matchedRecordId: targetRecordIds[0],
            matchedTicketNo: records.find(r => r.id === targetRecordIds[0])?.ticketNo,
            matchedAt: new Date().toLocaleString('th-TH')
          };
        }
        return d;
      })
    );

    const docTypeLabel = 
      pendingDoc.docType === 'DEST_TICKET' ? 'ตั๋วปลายทาง' : 
      pendingDoc.docType === 'PO' ? 'ใบสั่งซื้อ (PO)' : 'ใบตรวจรับ (RR)';

    addToast(
      `ชนบิลสำเร็จ! เชื่อมโยง ${docTypeLabel} "${pendingDoc.docNo}" เข้ากับ ${targetRecordIds.length} รายการแล้ว`,
      'success'
    );
  };

  const handleUnmatchPendingDoc = (pendingDocId: string) => {
    const doc = pendingDocs.find((d) => d.id === pendingDocId);
    if (!doc) return;

    if (doc.matchedRecordId) {
      setRecords((prev) =>
        prev.map((rec) => {
          if (rec.id !== doc.matchedRecordId) return rec;
          const updated = { ...rec };
          if (doc.docType === 'DEST_TICKET' && rec.destTicketNo === doc.docNo) {
            updated.destTicketNo = '-';
            updated.destDate = '-';
            updated.destGrossWt = 0;
            updated.destTareWt = 0;
            updated.destNetWt = 0;
            updated.weightDiffKg = undefined;
          } else if (doc.docType === 'PO' && rec.poNo === doc.docNo) {
            updated.poNo = '-';
          } else if (doc.docType === 'RR' && rec.rrNo === doc.docNo) {
            updated.rrNo = '-';
          }
          return updated;
        })
      );
    }

    setPendingDocs((prev) =>
      prev.map((d) => {
        if (d.id === pendingDocId) {
          return {
            ...d,
            status: 'pending',
            matchedRecordId: undefined,
            matchedTicketNo: undefined,
            matchedAt: undefined
          };
        }
        return d;
      })
    );

    addToast(`ยกเลิกการชนบิล ${doc.docNo} เรียบร้อยแล้ว`, 'info');
  };

  const handleAddPendingDoc = (newDoc: Omit<PendingDocument, 'id' | 'status'>) => {
    const doc: PendingDocument = {
      ...newDoc,
      id: `PEND-${Date.now()}`,
      status: 'pending'
    };
    setPendingDocs((prev) => [doc, ...prev]);
    addToast(`บันทึกเอกสาร ${doc.docNo} เข้ากล่องพักรอจับคู่แล้ว`, 'success');
  };

  const handleDeletePendingDoc = (docId: string) => {
    setPendingDocs((prev) => prev.filter((d) => d.id !== docId));
    addToast('ลบเอกสารออกจากกล่องพักเรียบร้อย', 'info');
  };

  // แยกรายการสินค้าในตั๋วใบเดียวกัน (Multi-item line item split)
  const handleSplitTicketItem = (record: ConstructionLogRecord) => {
    const newRow: ConstructionLogRecord = {
      ...record,
      id: `R${Date.now()}`,
      description: `${record.description} (รายการที่ 2)`,
      qty: 1,
      pricePerUnit: 0,
      materialAmount: 0,
      freightAmount: 0,
      totalAmount: 0,
      paidAmount: 0,
      paidMaterial: 0,
      paidFreight: 0,
      updatedAt: new Date().toISOString()
    };

    const index = records.findIndex((r) => r.id === record.id);
    if (index !== -1) {
      const nextRecords = [...records];
      nextRecords.splice(index + 1, 0, newRow);
      setRecords(nextRecords);
    } else {
      setRecords((prev) => [newRow, ...prev]);
    }

    handleStartInlineEdit(newRow);
    addToast(`เพิ่มรายการสินค้าในตั๋วเลขที่ "${record.ticketNo || record.id}" แล้ว สามารถพิมพ์แก้ไขได้ทันที`, 'success');
  };

  const handleOpenMatchForRecord = (recordId: string) => {
    setSelectedRecordForMatching(recordId);
    setIsMatchingModalOpen(true);
  };

  const handleResetData = () => {
    if (window.confirm("คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าตัวอย่างเริ่มต้นใช่หรือไม่? (ข้อมูลที่บันทึกไว้ในเครื่องจะถูกแทนที่)")) {
      setRecords([...INITIAL_RECORDS]);
      setPendingDocs([...INITIAL_PENDING_DOCUMENTS]);
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

  // Pending matching counts
  const pendingCount = useMemo(() => {
    return pendingDocs.filter((d) => d.status === 'pending').length;
  }, [pendingDocs]);

  // Helper: ตรวจสอบความครบถ้วนของเอกสารทั้ง 4 ส่วน
  const getDocCompleteness = (r: ConstructionLogRecord) => {
    const hasPO = Boolean(r.poNo && r.poNo !== '-');
    const hasRR = Boolean(r.rrNo && r.rrNo !== '-');
    const hasTicket = Boolean(r.ticketNo && r.ticketNo !== '-');
    const hasDestTicket = Boolean(r.destTicketNo && r.destTicketNo !== '-');
    const score = (hasPO ? 1 : 0) + (hasRR ? 1 : 0) + (hasTicket ? 1 : 0) + (hasDestTicket ? 1 : 0);
    return { score, total: 4, hasPO, hasRR, hasTicket, hasDestTicket };
  };

  // Category Badge Render Helper (Clean, Modern & Professional)
  const renderCategoryBadge = (cat: ProductCategory) => {
    switch (cat) {
      case 'เหล็ก/วัสดุ':
        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCategory('เหล็ก/วัสดุ');
            }}
            title="คลิกเพื่อกรองเฉพาะ: เหล็ก / วัสดุ"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-300/80 shadow-2xs whitespace-nowrap cursor-pointer hover:bg-sky-100 hover:border-sky-400 active:scale-95 transition-all"
          >
            <Boxes className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>เหล็ก / วัสดุ</span>
          </span>
        );
      case 'คอนกรีต':
        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCategory('คอนกรีต');
            }}
            title="คลิกเพื่อกรองเฉพาะ: คอนกรีต"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300/80 shadow-2xs whitespace-nowrap cursor-pointer hover:bg-amber-100 hover:border-amber-400 active:scale-95 transition-all"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>คอนกรีต</span>
          </span>
        );
      case 'เสาเข็ม':
        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCategory('เสาเข็ม');
            }}
            title="คลิกเพื่อกรองเฉพาะ: เสาเข็ม"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-300/80 shadow-2xs whitespace-nowrap cursor-pointer hover:bg-purple-100 hover:border-purple-400 active:scale-95 transition-all"
          >
            <Hammer className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>เสาเข็ม</span>
          </span>
        );
      case 'หินโรงโม่':
      case 'หินคลุก/ขนส่ง':
      case 'หินโรงโม่และขนส่ง':
        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCategory('หินโรงโม่และขนส่ง');
            }}
            title="คลิกเพื่อกรองเฉพาะ: หินโรงโม่และขนส่ง"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300/80 shadow-2xs whitespace-nowrap cursor-pointer hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 transition-all"
          >
            <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>หินโรงโม่และขนส่ง</span>
          </span>
        );
      default:
        return (
          <span 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300/80 shadow-2xs whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{cat}</span>
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

            {/* Phase 1: Smart Matching Hub Button (กล่องพักรอชนบิล) */}
            <button
              onClick={() => {
                setSelectedRecordForMatching(null);
                setIsMatchingModalOpen(true);
              }}
              title="เปิดกล่องพักเอกสารรอจับคู่ (PO, RR, ตั๋วปลายทาง) เพื่อนำมาชนบิล"
              className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-600 active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1.5 border border-blue-500/40 relative"
            >
              <Link2 className="w-4 h-4 text-blue-200" />
              <span>กล่องพักรอชนบิล</span>
              {pendingCount > 0 && (
                <span className="bg-amber-400 text-slate-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full shadow-2xs animate-pulse">
                  {pendingCount}
                </span>
              )}
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

            {/* Payment Recipient Scheme Filter */}
            <select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value as 'ALL' | 'split' | 'hauler_all' | 'seller_all')}
              className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">รูปแบบจ่าย: ทั้งหมด</option>
              <option value="split">🔀 จ่ายแยก (ผู้ขาย / ผู้รับจ้างขน)</option>
              <option value="hauler_all">🚛 จ่ายผู้รับจ้างขน (สินค้า+ขนส่ง)</option>
              <option value="seller_all">🏭 จ่ายผู้ขาย (สินค้า+ขนส่ง)</option>
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
          {/* Active Inline Editing Banner */}
          {inlineEditingId && inlineDraft && (
            <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-amber-500/10 border-b-2 border-blue-500 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                </span>
                <span className="font-bold text-blue-900 text-xs sm:text-sm">
                  ✏️ โหมดแก้ไขในตารางโดยตรง:
                </span>
                <span className="font-semibold text-slate-800 bg-white/90 px-2 py-0.5 rounded border border-blue-200 text-xs shadow-2xs font-mono">
                  {inlineDraft.description || inlineDraft.ticketNo || inlineDraft.id}
                </span>
                <span className="text-xs text-slate-600 hidden md:inline">
                  (สามารถพิมพ์แก้ไขค่าในตารางได้ทันที กด <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[11px] font-bold">Enter</kbd> เพื่อบันทึก หรือ <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[11px] font-bold">Esc</kbd> เพื่อยกเลิก)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveInline}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  title="บันทึกข้อมูลการแก้ไข (Enter)"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>บันทึกการแก้ไข</span>
                </button>
                <button
                  onClick={handleCancelInline}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 text-xs font-semibold rounded-lg transition"
                  title="ยกเลิกการแก้ไข (Esc)"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                  <span>ยกเลิก</span>
                </button>
              </div>
            </div>
          )}

          <div className="table-responsive flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left text-xs whitespace-nowrap table-sticky-grid">
              <thead className="sticky top-0 z-20 shadow-xs bg-slate-100">
                {/* Header Level 1: Pastel Group Headers */}
                <tr className="font-bold border-b border-slate-300 select-none text-[11px]">
                  {/* Group 1: หมวดหมู่ & เอกสาร/วันที่ - Fixed Left */}
                  {group1VisibleCount > 0 && (
                    <th
                      colSpan={group1VisibleCount}
                      style={{ left: 0 }}
                      className="px-3 py-2 text-center bg-blue-100 text-blue-900 sticky left-0 top-0 z-30 font-bold select-none sticky-col-left-last"
                    >
                      1. หมวดหมู่ & เอกสาร / วันที่
                    </th>
                  )}

                  {/* Group 2: สถานที่ & ขนส่ง */}
                  {(colVisibility.quarry || colVisibility.vendor || colVisibility.truckNo) && (
                    <th
                      colSpan={
                        (colVisibility.quarry ? 1 : 0) +
                        (colVisibility.vendor ? 1 : 0) +
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
                  {(colVisibility.paymentRecipientType || colVisibility.paidMaterial || colVisibility.materialBalance || colVisibility.paidFreight || colVisibility.freightBalance || colVisibility.paidAmount || colVisibility.balance || colVisibility.workStructure || colVisibility.remark) && (
                    <th
                      colSpan={
                        (colVisibility.paymentRecipientType ? 1 : 0) +
                        (colVisibility.paidMaterial ? 1 : 0) +
                        (colVisibility.materialBalance ? 1 : 0) +
                        (colVisibility.paidFreight ? 1 : 0) +
                        (colVisibility.freightBalance ? 1 : 0) +
                        (colVisibility.paidAmount ? 1 : 0) +
                        (colVisibility.balance ? 1 : 0) +
                        (colVisibility.workStructure ? 1 : 0) +
                        (colVisibility.remark ? 1 : 0)
                      }
                      className="px-3 py-2 text-center bg-teal-100/80 text-teal-900 border-r border-teal-200 sticky-top"
                    >
                      6. การเงินแยก 2 ฝ่าย (ผู้ขาย vs ผู้รับจ้างขน) & สรุปยอด
                    </th>
                  )}

                  {/* Actions Sticky Column - Fixed Right */}
                  <th
                    rowSpan={2}
                    className="px-3 py-2 text-center bg-slate-200 text-slate-800 sticky right-0 top-0 z-30 no-print font-bold min-w-[136px] w-[136px] sticky-col-right"
                  >
                    จัดการ
                  </th>
                </tr>

                {/* Header Level 2: Specific Columns */}
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 text-[11px]">
                  {/* Group 1: หมวดหมู่ & เอกสาร/วันที่ - Fixed Left */}
                  {colVisibility.category && (
                    <th
                      style={{ left: group1Offsets.category, width: group1Widths.category, minWidth: group1Widths.category, maxWidth: group1Widths.category }}
                      className={`px-3 py-2 sticky top-0 z-30 bg-slate-100 text-center font-bold text-slate-800 ${
                        lastVisibleGroup1Key === 'category'
                          ? 'sticky-col-left-last'
                          : 'sticky-col-left'
                      }`}
                    >
                      หมวดหมู่
                    </th>
                  )}
                  {colVisibility.poNo && (
                    <th
                      style={{ left: group1Offsets.poNo, width: group1Widths.poNo, minWidth: group1Widths.poNo, maxWidth: group1Widths.poNo }}
                      className={`px-3 py-2 sticky top-0 z-30 bg-slate-100 ${
                        lastVisibleGroup1Key === 'poNo'
                          ? 'sticky-col-left-last font-bold'
                          : 'sticky-col-left'
                      }`}
                    >
                      เลขที่ PO
                    </th>
                  )}
                  {colVisibility.rrNo && (
                    <th
                      style={{ left: group1Offsets.rrNo, width: group1Widths.rrNo, minWidth: group1Widths.rrNo, maxWidth: group1Widths.rrNo }}
                      className={`px-3 py-2 sticky top-0 z-30 bg-slate-100 font-semibold ${
                        lastVisibleGroup1Key === 'rrNo'
                          ? 'sticky-col-left-last font-bold'
                          : 'sticky-col-left'
                      }`}
                    >
                      เลขที่ RR
                    </th>
                  )}
                  {colVisibility.date && (
                    <th
                      style={{ left: group1Offsets.date, width: group1Widths.date, minWidth: group1Widths.date, maxWidth: group1Widths.date }}
                      className={`px-3 py-2 sticky top-0 z-30 bg-slate-100 font-mono-numbers ${
                        lastVisibleGroup1Key === 'date'
                          ? 'sticky-col-left-last font-bold'
                          : 'sticky-col-left'
                      }`}
                    >
                      วัน/เดือน/ปี
                    </th>
                  )}
                  {colVisibility.ticketNo && (
                    <th
                      style={{ left: group1Offsets.ticketNo, width: group1Widths.ticketNo, minWidth: group1Widths.ticketNo, maxWidth: group1Widths.ticketNo }}
                      className={`px-3 py-2 sticky top-0 z-30 bg-slate-100 ${
                        lastVisibleGroup1Key === 'ticketNo'
                          ? 'sticky-col-left-last font-bold'
                          : 'sticky-col-left'
                      }`}
                    >
                      เลขใบจ่ายสินค้า/ตั๋ว
                    </th>
                  )}

                  {/* Group 2 */}
                  {colVisibility.quarry && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">โรงโม่ / กิจการ</th>}
                  {colVisibility.vendor && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">ผู้รับเหมา / บริษัท</th>}
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

                  {/* Group 6: การเงินแยก 2 ฝ่าย */}
                  {colVisibility.paymentRecipientType && (
                    <th className="px-3 py-2 sticky-top border-r border-slate-200 text-center bg-teal-50 text-teal-900 font-bold min-w-[135px]">
                      รูปแบบการจ่าย
                    </th>
                  )}
                  {colVisibility.paidMaterial && (
                    <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-amber-50 text-amber-900 font-bold min-w-[105px]">
                      จ่ายผู้ขายแล้ว
                    </th>
                  )}
                  {colVisibility.materialBalance && (
                    <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-amber-100 text-rose-800 font-bold min-w-[105px]">
                      ค้างจ่ายผู้ขาย
                    </th>
                  )}
                  {colVisibility.paidFreight && (
                    <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-sky-50 text-sky-900 font-bold min-w-[115px]">
                      จ่ายผู้รับจ้างขนแล้ว
                    </th>
                  )}
                  {colVisibility.freightBalance && (
                    <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-sky-100 text-rose-800 font-bold min-w-[115px]">
                      ค้างจ่ายผู้รับจ้างขน
                    </th>
                  )}
                  {colVisibility.paidAmount && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-emerald-50 text-emerald-800 font-bold min-w-[105px]">รวมชำระแล้ว</th>}
                  {colVisibility.balance && <th className="px-3 py-2 sticky-top border-r border-slate-200 text-right bg-rose-50 text-rose-800 font-bold min-w-[105px]">คงค้างชำระรวม</th>}
                  {colVisibility.workStructure && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100">โครงสร้างงาน / กม.</th>}
                  {colVisibility.remark && <th className="px-3 py-2 sticky-top border-r border-slate-200 bg-slate-100 min-w-[140px]">หมายเหตุ</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-slate-700 text-xs">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={35} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Layers className="w-10 h-10 text-slate-300" />
                        <div className="font-semibold text-slate-600">ไม่พบรายการข้อมูลตามเงื่อนไขที่เลือก</div>
                        <p className="text-xs text-slate-400">ลองล้างคำค้นหา หรือเลือกหมวดหมู่อื่น หรือกดปุ่ม "+ เพิ่มรายการใหม่"</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((row, idx) => {
                    const isEditingThisRow = inlineEditingId === row.id && inlineDraft !== null;
                    const isOtherRowEditing = inlineEditingId !== null && !isEditingThisRow;
                    const activeRec = isEditingThisRow ? inlineDraft : row;

                    const q = Number(activeRec.qty) || 0;
                    const p = Number(activeRec.pricePerUnit) || 0;
                    const matAmt = activeRec.materialAmount !== undefined ? Number(activeRec.materialAmount) : (q * p);
                    const isHired = activeRec.transportType === 'hired' || (activeRec.freightAmount && Number(activeRec.freightAmount) > 0) || (activeRec.extraFee && Number(activeRec.extraFee) > 0);
                    const frRate = isHired ? (Number(activeRec.freightRate) || Number(activeRec.extraFee) || 0) : 0;
                    const frAmt = isHired 
                      ? (activeRec.freightAmount !== undefined ? Number(activeRec.freightAmount) : (q * frRate))
                      : 0;
                    const total = Number(activeRec.totalAmount) || (matAmt + frAmt);
                    const paid = Number(activeRec.paidAmount) || 0;
                    const balance = total - paid;

                    const scheme = !isHired ? 'seller_all' : (activeRec.paymentRecipientType || 'split');
                    let rowPaidMat = 0;
                    let rowBalMat = 0;
                    let rowPaidFr = 0;
                    let rowBalFr = 0;

                    if (scheme === 'hauler_all') {
                      rowPaidFr = paid;
                      rowBalFr = Math.max(0, total - paid);
                      rowPaidMat = 0;
                      rowBalMat = 0;
                    } else if (scheme === 'seller_all') {
                      rowPaidMat = paid;
                      rowBalMat = Math.max(0, total - paid);
                      rowPaidFr = 0;
                      rowBalFr = 0;
                    } else {
                      // split
                      rowPaidMat = activeRec.paidMaterial !== undefined ? Number(activeRec.paidMaterial) : (paid >= matAmt ? matAmt : paid);
                      rowBalMat = Math.max(0, matAmt - rowPaidMat);
                      rowPaidFr = activeRec.paidFreight !== undefined ? Number(activeRec.paidFreight) : (paid > matAmt ? Math.min(frAmt, paid - matAmt) : 0);
                      rowBalFr = Math.max(0, frAmt - rowPaidFr);
                    }

                    return (
                      <tr 
                        key={row.id} 
                        className={`group transition-all duration-200 border-b ${
                          isEditingThisRow
                            ? 'bg-amber-100/90 ring-2 ring-blue-600 ring-offset-1 shadow-lg z-20 relative font-medium border-amber-300'
                            : isOtherRowEditing
                            ? 'opacity-25 filter blur-[0.2px] grayscale-[30%] pointer-events-none select-none border-slate-200'
                            : `hover:bg-blue-50/50 border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`
                        }`}
                      >
                        {/* Group 1: หมวดหมู่ & เอกสาร/วันที่ - Fixed Left */}
                        {colVisibility.category && (
                          <td
                            style={{ left: group1Offsets.category, width: group1Widths.category, minWidth: group1Widths.category, maxWidth: group1Widths.category }}
                            className={`px-2 py-1.5 text-center sticky z-10 transition-colors ${
                              isEditingThisRow
                                ? 'bg-amber-100 text-slate-900 border-r border-amber-300'
                                : `${idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'} group-hover:bg-[#eff6ff]`
                            } ${
                              lastVisibleGroup1Key === 'category'
                                ? 'sticky-col-left-last'
                                : 'sticky-col-left'
                            }`}
                          >
                            {isEditingThisRow ? (
                              <select
                                value={inlineDraft.category}
                                onChange={(e) => handleInlineCategoryChange(e.target.value as ProductCategory)}
                                className="w-full text-[11px] py-1 px-1.5 rounded-md border border-blue-400 bg-white font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                {PRODUCT_CATEGORIES.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            ) : (
                              renderCategoryBadge(row.category)
                            )}
                          </td>
                        )}
                        {colVisibility.poNo && (
                          <td
                            style={{ left: group1Offsets.poNo, width: group1Widths.poNo, minWidth: group1Widths.poNo, maxWidth: group1Widths.poNo }}
                            className={`px-2.5 py-1.5 font-mono-numbers text-blue-700 font-semibold text-[11px] sticky z-10 transition-colors ${
                              isEditingThisRow
                                ? 'bg-amber-100 text-slate-900 border-r border-amber-300'
                                : `${idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'} group-hover:bg-[#eff6ff]`
                            } ${
                              lastVisibleGroup1Key === 'poNo'
                                ? 'sticky-col-left-last'
                                : 'sticky-col-left'
                            }`}
                          >
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.poNo === '-' ? '' : inlineDraft.poNo}
                                onChange={(e) => updateInlineField({ poNo: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="PO..."
                                className="w-full text-[11px] py-1 px-1.5 rounded border border-blue-400 bg-white font-mono text-blue-700 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              row.poNo !== '-' ? row.poNo : '-'
                            )}
                          </td>
                        )}
                        {colVisibility.rrNo && (
                          <td
                            style={{ left: group1Offsets.rrNo, width: group1Widths.rrNo, minWidth: group1Widths.rrNo, maxWidth: group1Widths.rrNo }}
                            className={`px-2.5 py-1.5 font-mono-numbers text-purple-700 font-semibold text-[11px] sticky z-10 transition-colors ${
                              isEditingThisRow
                                ? 'bg-amber-100 text-slate-900 border-r border-amber-300'
                                : `${idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'} group-hover:bg-[#eff6ff]`
                            } ${
                              lastVisibleGroup1Key === 'rrNo'
                                ? 'sticky-col-left-last'
                                : 'sticky-col-left'
                            }`}
                          >
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.rrNo === '-' ? '' : inlineDraft.rrNo}
                                onChange={(e) => updateInlineField({ rrNo: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="RR..."
                                className="w-full text-[11px] py-1 px-1.5 rounded border border-purple-400 bg-white font-mono text-purple-700 font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              />
                            ) : (
                              row.rrNo !== '-' ? row.rrNo : '-'
                            )}
                          </td>
                        )}
                        {colVisibility.date && (
                          <td
                            style={{ left: group1Offsets.date, width: group1Widths.date, minWidth: group1Widths.date, maxWidth: group1Widths.date }}
                            className={`px-2.5 py-1.5 font-mono-numbers text-slate-600 text-[11px] sticky z-10 transition-colors ${
                              isEditingThisRow
                                ? 'bg-amber-100 text-slate-900 border-r border-amber-300'
                                : `${idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'} group-hover:bg-[#eff6ff]`
                            } ${
                              lastVisibleGroup1Key === 'date'
                                ? 'sticky-col-left-last'
                                : 'sticky-col-left'
                            }`}
                          >
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.date === '-' ? '' : inlineDraft.date}
                                onChange={(e) => updateInlineField({ date: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="ว/ด/ป"
                                className="w-full text-[11px] py-1 px-1.5 rounded border border-slate-300 bg-white font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              row.date || '-'
                            )}
                          </td>
                        )}
                        {colVisibility.ticketNo && (
                          <td
                            style={{ left: group1Offsets.ticketNo, width: group1Widths.ticketNo, minWidth: group1Widths.ticketNo, maxWidth: group1Widths.ticketNo }}
                            className={`px-2.5 py-1.5 font-mono-numbers text-slate-800 text-[11px] sticky z-10 transition-colors ${
                              isEditingThisRow
                                ? 'bg-amber-100 text-slate-900 border-r border-amber-300'
                                : `${idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'} group-hover:bg-[#eff6ff]`
                            } ${
                              lastVisibleGroup1Key === 'ticketNo'
                                ? 'sticky-col-left-last'
                                : 'sticky-col-left'
                            }`}
                          >
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.ticketNo === '-' ? '' : inlineDraft.ticketNo}
                                onChange={(e) => updateInlineField({ ticketNo: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="ตั๋ว..."
                                className="w-full text-[11px] py-1 px-1.5 rounded border border-slate-300 bg-white font-mono text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-slate-900">
                                  {row.ticketNo !== '-' ? row.ticketNo : '-'}
                                </span>
                                {row.ticketNo && row.ticketNo !== '-' && records.filter(r => r.ticketNo === row.ticketNo).length > 1 && (
                                  <span 
                                    className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-700 font-semibold border border-purple-200"
                                    title={`มีสินค้า ${records.filter(r => r.ticketNo === row.ticketNo).length} รายการในตั๋วเลขที่นี้`}
                                  >
                                    <Boxes className="w-2.5 h-2.5" />
                                    <span>{records.filter(r => r.ticketNo === row.ticketNo).length}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        )}

                        {/* Group 2 */}
                        {colVisibility.quarry && (
                          <td className={`px-2.5 py-1.5 border-r transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 text-slate-700'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.quarry === '-' ? '' : inlineDraft.quarry}
                                onChange={(e) => updateInlineField({ quarry: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="โรงโม่ / กิจการ"
                                className="w-full min-w-[110px] text-xs py-1 px-1.5 rounded border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              row.quarry !== '-' ? row.quarry : '-'
                            )}
                          </td>
                        )}
                        {colVisibility.vendor && (
                          <td className={`px-2.5 py-1.5 border-r transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 font-medium text-slate-800'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.vendor === '-' ? '' : inlineDraft.vendor}
                                onChange={(e) => updateInlineField({ vendor: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="ผู้รับเหมา / บริษัท"
                                className="w-full min-w-[110px] text-xs py-1 px-1.5 rounded border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              row.vendor !== '-' ? row.vendor : '-'
                            )}
                          </td>
                        )}
                        {colVisibility.truckNo && (
                          <td className={`px-2.5 py-1.5 border-r font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 text-slate-700'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.truckNo === '-' ? '' : inlineDraft.truckNo}
                                onChange={(e) => updateInlineField({ truckNo: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="ทะเบียนรถ"
                                className="w-full min-w-[100px] text-xs py-1 px-1.5 rounded border border-slate-300 bg-white font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              row.truckNo !== '-' ? row.truckNo : '-'
                            )}
                          </td>
                        )}

                        {/* Group 3 */}
                        {colVisibility.description && (
                          <td className={`px-2.5 py-1.5 border-r font-semibold transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 text-slate-900'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.description || ''}
                                onChange={(e) => updateInlineField({ description: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="รายการสินค้า"
                                className="w-full min-w-[140px] text-xs py-1 px-1.5 rounded border border-blue-400 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              row.description || '-'
                            )}
                          </td>
                        )}
                        {colVisibility.spec && (
                          <td className={`px-2.5 py-1.5 border-r font-mono-numbers text-[11px] transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 text-slate-600'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.spec === '-' ? '' : inlineDraft.spec}
                                onChange={(e) => updateInlineField({ spec: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="สเปก"
                                className="w-full min-w-[90px] text-[11px] py-1 px-1.5 rounded border border-slate-300 bg-white font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              row.spec !== '-' ? row.spec : '-'
                            )}
                          </td>
                        )}

                        {/* Group 4: ต้นทาง, ปลายทาง & ผลต่าง */}
                        {colVisibility.grossWt && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-amber-50/40'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="number"
                                step="any"
                                value={inlineDraft.grossWt || ''}
                                onChange={(e) => updateInlineField({ grossWt: parseFloat(e.target.value) || 0 })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="หนัก"
                                className="w-18 text-right text-xs py-1 px-1 rounded border border-amber-300 bg-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                            ) : (
                              formatNumber(row.grossWt)
                            )}
                          </td>
                        )}
                        {colVisibility.tareWt && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-amber-50/40'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="number"
                                step="any"
                                value={inlineDraft.tareWt || ''}
                                onChange={(e) => updateInlineField({ tareWt: parseFloat(e.target.value) || 0 })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="เบา"
                                className="w-18 text-right text-xs py-1 px-1 rounded border border-amber-300 bg-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                            ) : (
                              formatNumber(row.tareWt)
                            )}
                          </td>
                        )}
                        {colVisibility.netWt && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-bold font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-100/70 text-amber-950' : 'border-slate-200 text-amber-950 bg-amber-100/50'}`}>
                            {activeRec.netWt ? Number(activeRec.netWt).toFixed(2) : '-'}
                          </td>
                        )}
                        {colVisibility.destDate && (
                          <td className={`px-2.5 py-1.5 border-r font-mono-numbers text-[11px] transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 text-sky-800 bg-sky-50/20'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.destDate === '-' ? '' : (inlineDraft.destDate || '')}
                                onChange={(e) => updateInlineField({ destDate: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="วันรับเข้า"
                                className="w-20 text-[11px] py-1 px-1 rounded border border-sky-300 bg-white font-mono text-sky-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                              />
                            ) : (
                              row.destDate && row.destDate !== '-' ? row.destDate : (row.date || '-')
                            )}
                          </td>
                        )}
                        {colVisibility.destTicketNo && (
                          <td className={`px-2.5 py-1.5 border-r font-mono-numbers text-[11px] transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 text-sky-800 bg-sky-50/20'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.destTicketNo === '-' ? '' : (inlineDraft.destTicketNo || '')}
                                onChange={(e) => updateInlineField({ destTicketNo: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="ตั๋วปลายทาง"
                                className="w-20 text-[11px] py-1 px-1 rounded border border-sky-300 bg-white font-mono text-sky-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                              />
                            ) : (
                              row.destTicketNo && row.destTicketNo !== '-' ? row.destTicketNo : '-'
                            )}
                          </td>
                        )}
                        {colVisibility.destGrossWt && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-sky-50/20'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="number"
                                step="any"
                                value={inlineDraft.destGrossWt || ''}
                                onChange={(e) => updateInlineField({ destGrossWt: parseFloat(e.target.value) || 0 })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="หนัก"
                                className="w-16 text-right text-xs py-1 px-1 rounded border border-sky-300 bg-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                              />
                            ) : (
                              row.destGrossWt && Number(row.destGrossWt) > 0 ? formatNumber(row.destGrossWt) : '-'
                            )}
                          </td>
                        )}
                        {colVisibility.destTareWt && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-sky-50/20'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="number"
                                step="any"
                                value={inlineDraft.destTareWt || ''}
                                onChange={(e) => updateInlineField({ destTareWt: parseFloat(e.target.value) || 0 })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="เบา"
                                className="w-16 text-right text-xs py-1 px-1 rounded border border-sky-300 bg-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                              />
                            ) : (
                              row.destTareWt && Number(row.destTareWt) > 0 ? formatNumber(row.destTareWt) : '-'
                            )}
                          </td>
                        )}
                        {colVisibility.destNetWt && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-bold font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-sky-100/70 text-sky-950' : 'border-slate-200 text-sky-950 bg-sky-100/50'}`}>
                            {activeRec.destNetWt && Number(activeRec.destNetWt) > 0 ? Number(activeRec.destNetWt).toFixed(2) : '-'}
                          </td>
                        )}
                        {colVisibility.weightDiff && (
                          <td className={`px-2.5 py-1.5 border-r text-center font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200'}`}>
                            {(() => {
                              const diff = activeRec.weightDiffKg ?? (
                                activeRec.destNetWt && Number(activeRec.destNetWt) > 0 && activeRec.netWt && Number(activeRec.netWt) > 0
                                  ? Math.round((Number(activeRec.destNetWt) - Number(activeRec.netWt)) * 1000)
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
                          <td className={`px-2.5 py-1.5 border-r text-right font-semibold font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="number"
                                step="any"
                                value={inlineDraft.qty ?? ''}
                                onChange={(e) => updateInlineField({ qty: parseFloat(e.target.value) || 0 })}
                                onKeyDown={handleInlineKeyDown}
                                className="w-18 text-right text-xs py-1 px-1 rounded border border-blue-400 bg-white font-bold font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              formatNumber(row.qty)
                            )}
                          </td>
                        )}
                        {colVisibility.unit && (
                          <td className={`px-2.5 py-1.5 border-r text-center transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 text-slate-600'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.unit || ''}
                                onChange={(e) => updateInlineField({ unit: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                className="w-14 text-center text-xs py-1 px-1 rounded border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              row.unit || '-'
                            )}
                          </td>
                        )}
                        {colVisibility.pricePerUnit && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 text-amber-900 bg-amber-50/20'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="number"
                                step="any"
                                value={inlineDraft.pricePerUnit ?? ''}
                                onChange={(e) => updateInlineField({ pricePerUnit: parseFloat(e.target.value) || 0 })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="ราคา/หน่วย"
                                className="w-20 text-right text-xs py-1 px-1.5 rounded border border-blue-400 bg-white font-mono text-amber-950 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              formatNumber(row.pricePerUnit)
                            )}
                          </td>
                        )}
                        {colVisibility.materialAmount && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-bold font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-100/60 text-amber-950' : 'border-slate-200 text-amber-950 bg-amber-100/40'}`}>
                            {formatCurrency(matAmt)}
                          </td>
                        )}
                        {colVisibility.transportType && (
                          <td className={`px-2.5 py-1.5 border-r text-center font-medium text-[11px] transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200'}`}>
                            {isEditingThisRow ? (
                              <select
                                value={inlineDraft.transportType || 'self'}
                                onChange={(e) => updateInlineField({ transportType: e.target.value as 'self' | 'hired' })}
                                className="text-[11px] py-1 px-1 rounded border border-emerald-400 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              >
                                <option value="self">🚗 วิ่งเอง</option>
                                <option value="hired">🚛 จ้างขน</option>
                              </select>
                            ) : (
                              (() => {
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
                              })()
                            )}
                          </td>
                        )}
                        {colVisibility.haulerName && (
                          <td className={`px-2.5 py-1.5 border-r font-medium transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 text-slate-700'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.haulerName === '-' ? '' : (inlineDraft.haulerName || '')}
                                onChange={(e) => updateInlineField({ haulerName: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="ผู้รับจ้างขน"
                                className="w-24 text-xs py-1 px-1.5 rounded border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              row.haulerName && row.haulerName !== '-' ? row.haulerName : (isHired ? (row.vendor || '-') : 'รถบริษัท')
                            )}
                          </td>
                        )}
                        {colVisibility.freightRate && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-sky-50/20 text-sky-900'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="number"
                                step="any"
                                value={inlineDraft.freightRate ?? ''}
                                onChange={(e) => updateInlineField({ freightRate: parseFloat(e.target.value) || 0 })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="ค่าขน/ตัน"
                                disabled={inlineDraft.transportType === 'self'}
                                className={`w-18 text-right text-xs py-1 px-1 rounded border border-sky-300 font-mono text-sky-900 focus:ring-2 focus:ring-sky-500 focus:outline-none ${inlineDraft.transportType === 'self' ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                              />
                            ) : (
                              isHired ? formatNumber(row.freightRate !== undefined ? row.freightRate : row.extraFee) : <span className="text-slate-300">-</span>
                            )}
                          </td>
                        )}
                        {colVisibility.freightAmount && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-bold font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-sky-100/60 text-sky-950' : 'border-slate-200 bg-sky-100/40 text-sky-950'}`}>
                            {isHired ? formatCurrency(frAmt) : <span className="text-slate-400 font-normal">0.00</span>}
                          </td>
                        )}
                        {colVisibility.extraFee && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60 text-slate-600' : 'border-slate-200 text-slate-600'}`}>
                            {formatNumber(activeRec.extraFee || 0)}
                          </td>
                        )}
                        {colVisibility.totalAmount && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-bold font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-blue-100/70 text-blue-900' : 'border-slate-200 text-blue-700 bg-blue-50/60'}`}>
                            {formatCurrency(total)}
                          </td>
                        )}

                        {/* Group 6: การเงินแยก 2 ฝ่าย */}
                        {colVisibility.paymentRecipientType && (
                          <td className={`px-2.5 py-1.5 border-r text-center transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200'}`}>
                            {isEditingThisRow ? (
                              <select
                                value={inlineDraft.paymentRecipientType || 'split'}
                                onChange={(e) => updateInlineField({ paymentRecipientType: e.target.value as any })}
                                className="text-[10px] py-1 px-1 rounded border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                <option value="split">🔀 จ่ายแยก 2 ฝั่ง</option>
                                <option value="hauler_all">🚛 จ่ายขนส่งรวม</option>
                                <option value="seller_all">🏭 จ่ายผู้ขายรวม</option>
                              </select>
                            ) : (
                              (() => {
                                if (!isHired) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <span>🚗 วิ่งเอง</span>
                                    </span>
                                  );
                                }
                                if (scheme === 'hauler_all') {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-300" title="จ่ายให้ผู้รับจ้างขนทั้งก้อน (สินค้า+ขนส่ง)">
                                      <span>🚛 จ่ายผู้รับจ้างขน</span>
                                    </span>
                                  );
                                }
                                if (scheme === 'seller_all') {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300" title="จ่ายให้ผู้ขายทั้งก้อน (สินค้า+ขนส่ง)">
                                      <span>🏭 จ่ายผู้ขายรวม</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200" title="จ่ายแยก 2 ฝั่ง: ผู้ขาย (ค่าหิน) และ ผู้รับจ้างขน (ค่าขนส่ง)">
                                    <span>🔀 จ่ายแยก 2 ฝั่ง</span>
                                  </span>
                                );
                              })()
                            )}
                          </td>
                        )}
                        {colVisibility.paidMaterial && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-amber-50/20 text-amber-900'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="number"
                                step="any"
                                value={inlineDraft.paidMaterial ?? ''}
                                onChange={(e) => updateInlineField({ paidMaterial: parseFloat(e.target.value) || 0 })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="จ่ายค่าหิน"
                                className="w-20 text-right text-xs py-1 px-1 rounded border border-amber-300 bg-white font-mono text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                            ) : (
                              rowPaidMat > 0 ? formatCurrency(rowPaidMat) : <span className="text-slate-300">-</span>
                            )}
                          </td>
                        )}
                        {colVisibility.materialBalance && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-mono-numbers font-semibold transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200'} ${rowBalMat > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-400'}`}>
                            {formatCurrency(rowBalMat)}
                          </td>
                        )}
                        {colVisibility.paidFreight && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-sky-50' : 'border-slate-200 bg-sky-50/20 text-sky-900'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="number"
                                step="any"
                                value={inlineDraft.paidFreight ?? ''}
                                onChange={(e) => updateInlineField({ paidFreight: parseFloat(e.target.value) || 0 })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="จ่ายค่าขน"
                                className="w-20 text-right text-xs py-1 px-1 rounded border border-sky-300 bg-white font-mono text-sky-950 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                              />
                            ) : (
                              rowPaidFr > 0 ? formatCurrency(rowPaidFr) : <span className="text-slate-300">-</span>
                            )}
                          </td>
                        )}
                        {colVisibility.freightBalance && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-mono-numbers font-semibold transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200'} ${rowBalFr > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-400'}`}>
                            {formatCurrency(rowBalFr)}
                          </td>
                        )}
                        {colVisibility.paidAmount && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-bold font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-emerald-700 bg-emerald-50/30'}`}>
                            {isEditingThisRow && inlineDraft.paymentRecipientType !== 'split' ? (
                              <input
                                type="number"
                                step="any"
                                value={inlineDraft.paidAmount ?? ''}
                                onChange={(e) => updateInlineField({ paidAmount: parseFloat(e.target.value) || 0 })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="ยอดชำระ"
                                className="w-20 text-right text-xs py-1 px-1 rounded border border-emerald-400 bg-white font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            ) : (
                              formatCurrency(paid)
                            )}
                          </td>
                        )}
                        {colVisibility.balance && (
                          <td className={`px-2.5 py-1.5 border-r text-right font-bold font-mono-numbers transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200'} ${balance > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-emerald-600'}`}>
                            {formatCurrency(balance)}
                          </td>
                        )}
                        {colVisibility.workStructure && (
                          <td className={`px-2.5 py-1.5 border-r transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 text-slate-600'}`}>
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.workStructure === '-' ? '' : (inlineDraft.workStructure || '')}
                                onChange={(e) => updateInlineField({ workStructure: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="โครงสร้าง/กม."
                                className="w-28 text-xs py-1 px-1.5 rounded border border-slate-300 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              row.workStructure !== '-' ? row.workStructure : '-'
                            )}
                          </td>
                        )}
                        {colVisibility.remark && (
                          <td className={`px-2.5 py-1.5 border-r transition-colors ${isEditingThisRow ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 text-slate-500 italic max-w-xs truncate'}`} title={activeRec.remark}>
                            {isEditingThisRow ? (
                              <input
                                type="text"
                                value={inlineDraft.remark === '-' ? '' : (inlineDraft.remark || '')}
                                onChange={(e) => updateInlineField({ remark: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                placeholder="หมายเหตุ"
                                className="w-24 text-xs py-1 px-1.5 rounded border border-slate-300 bg-white text-slate-600 italic focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              row.remark !== '-' ? row.remark : '-'
                            )}
                          </td>
                        )}

                        {/* Actions Sticky Column on the Right */}
                        <td 
                          style={{ right: 0 }}
                          className={`px-2 py-1 text-center sticky right-0 z-10 no-print min-w-[136px] w-[136px] transition-colors sticky-col-right ${
                            isEditingThisRow
                              ? 'bg-amber-100 text-slate-900 border-l-2 border-amber-400 shadow-sm'
                              : `${idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'} group-hover:bg-[#eff6ff]`
                          }`}
                        >
                          {isEditingThisRow ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={handleSaveInline}
                                className="inline-flex items-center justify-center p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs transition transform active:scale-95"
                                title="บันทึกข้อมูล (Enter)"
                              >
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              </button>
                              <button
                                onClick={handleCancelInline}
                                className="inline-flex items-center justify-center p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-md shadow-xs transition transform active:scale-95"
                                title="ยกเลิกการแก้ไข (Esc)"
                              >
                                <X className="w-4 h-4 stroke-[2.5]" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenMatchForRecord(row.id)}
                                className="text-blue-700 hover:text-blue-900 p-1 hover:bg-blue-100 rounded transition"
                                title="ชนบิล / เชื่อมโยงเอกสาร (PO, RR, ตั๋วปลายทาง)"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleSplitTicketItem(row)}
                                className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-100 rounded transition"
                                title="เพิ่มรายการสินค้าในตั๋วใบนี้ (แตกรายการสินค้า)"
                              >
                                <Split className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleStartInlineEdit(row)}
                                className="text-amber-700 hover:text-amber-900 p-1 hover:bg-amber-100 rounded transition"
                                title="แก้ไขรายการในตารางโดยตรง"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(row)}
                                className="text-slate-500 hover:text-slate-700 p-1 hover:bg-slate-200 rounded transition"
                                title="คัดลอกสร้างรายการใหม่ (Duplicate)"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePrompt(row)}
                                className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-100 rounded transition"
                                title="ลบรายการ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer: Dynamic Totals */}
              <tfoot>
                <tr className="bg-slate-200 text-slate-900 font-bold sticky bottom-0 z-20 border-t-2 border-blue-600 text-xs">
                  {/* Group 1 Footer: Fixed Left */}
                  {group1VisibleCount > 0 && (
                    <td
                      colSpan={group1VisibleCount}
                      style={{ left: 0 }}
                      className="px-3 py-2 text-left font-bold text-slate-800 sticky left-0 bottom-0 z-20 bg-slate-200 sticky-col-left-last"
                    >
                      รวมยอดสรุปตามที่แสดงในตาราง:
                    </td>
                  )}

                  {/* Group 2 & Group 3 non-sticky columns before weights: Quarry, Vendor, Truck, Desc, Spec */}
                  {((colVisibility.quarry ? 1 : 0) +
                    (colVisibility.vendor ? 1 : 0) +
                    (colVisibility.truckNo ? 1 : 0) +
                    (colVisibility.description ? 1 : 0) +
                    (colVisibility.spec ? 1 : 0)) > 0 && (
                    <td
                      colSpan={
                        (colVisibility.quarry ? 1 : 0) +
                        (colVisibility.vendor ? 1 : 0) +
                        (colVisibility.truckNo ? 1 : 0) +
                        (colVisibility.description ? 1 : 0) +
                        (colVisibility.spec ? 1 : 0)
                      }
                      className="px-3 py-2 text-right font-bold text-slate-800"
                    >
                      {group1VisibleCount === 0 ? "รวมยอดสรุปตามที่แสดงในตาราง:" : ""}
                    </td>
                  )}

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

                  {/* Group 6: Totals for Split Payment */}
                  {colVisibility.paymentRecipientType && <td className="px-3 py-2 text-center text-slate-500 font-normal text-[10px]">สรุปยอด</td>}
                  {colVisibility.paidMaterial && (
                    <td className="px-3 py-2 text-right font-bold text-amber-900 bg-amber-100/60 font-mono-numbers">
                      {formatCurrency(tableTotals.sumPaidMaterial)}
                    </td>
                  )}
                  {colVisibility.materialBalance && (
                    <td className="px-3 py-2 text-right font-bold text-rose-700 bg-rose-50/80 font-mono-numbers">
                      {formatCurrency(tableTotals.sumMaterialBalance)}
                    </td>
                  )}
                  {colVisibility.paidFreight && (
                    <td className="px-3 py-2 text-right font-bold text-sky-900 bg-sky-100/60 font-mono-numbers">
                      {formatCurrency(tableTotals.sumPaidFreight)}
                    </td>
                  )}
                  {colVisibility.freightBalance && (
                    <td className="px-3 py-2 text-right font-bold text-rose-700 bg-rose-50/80 font-mono-numbers">
                      {formatCurrency(tableTotals.sumFreightBalance)}
                    </td>
                  )}
                  {colVisibility.paidAmount && (
                    <td className="px-3 py-2 text-right font-bold text-emerald-800 bg-emerald-100/70 font-mono-numbers">
                      {formatCurrency(tableTotals.sumPaid)}
                    </td>
                  )}
                  {colVisibility.balance && (
                    <td className="px-3 py-2 text-right font-bold text-rose-700 bg-rose-100 font-mono-numbers">
                      {formatCurrency(tableTotals.sumBalance)}
                    </td>
                  )}
                  {colVisibility.workStructure && <td className="px-3 py-2"></td>}
                  {colVisibility.remark && <td className="px-3 py-2"></td>}

                  {/* Empty cell for Actions column - Sticky Right */}
                  <td className="px-2 py-2 no-print bg-slate-200 sticky right-0 bottom-0 z-20 min-w-[136px] w-[136px] sticky-col-right"></td>
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

      {/* Phase 1: Smart Matching Hub Modal (กล่องพักเอกสารรอชนบิล) */}
      <PendingMatchingModal
        isOpen={isMatchingModalOpen}
        onClose={() => {
          setIsMatchingModalOpen(false);
          setSelectedRecordForMatching(null);
        }}
        pendingDocs={pendingDocs}
        records={records}
        onMatch={handleMatchPendingDoc}
        onUnmatch={handleUnmatchPendingDoc}
        onAddPendingDoc={handleAddPendingDoc}
        onDeletePendingDoc={handleDeletePendingDoc}
        initialSelectedRecordId={selectedRecordForMatching}
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

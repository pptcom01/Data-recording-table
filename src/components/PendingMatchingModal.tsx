import React, { useState, useMemo } from 'react';
import { 
  X, 
  Layers, 
  Link2, 
  CheckCircle2, 
  Clock, 
  Search, 
  Scale, 
  FileText, 
  Check, 
  Plus, 
  ArrowRight, 
  Undo2, 
  Sparkles, 
  Building2, 
  Truck, 
  Boxes,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { ConstructionLogRecord, PendingDocument, PendingDocType } from '../types.ts';

interface PendingMatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingDocs: PendingDocument[];
  records: ConstructionLogRecord[];
  onMatch: (
    pendingDoc: PendingDocument, 
    targetRecordIds: string[], 
    applyToSameTicket: boolean
  ) => void;
  onUnmatch: (pendingDocId: string) => void;
  onAddPendingDoc: (doc: Omit<PendingDocument, 'id' | 'status'>) => void;
  onDeletePendingDoc: (docId: string) => void;
  initialSelectedRecordId?: string | null;
}

export const PendingMatchingModal: React.FC<PendingMatchingModalProps> = ({
  isOpen,
  onClose,
  pendingDocs,
  records,
  onMatch,
  onUnmatch,
  onAddPendingDoc,
  onDeletePendingDoc,
  initialSelectedRecordId
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'DEST_TICKET' | 'PO' | 'RR' | 'matched'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPendingDoc, setSelectedPendingDoc] = useState<PendingDocument | null>(null);
  const [selectedTargetRecordId, setSelectedTargetRecordId] = useState<string | null>(initialSelectedRecordId || null);
  const [applyToSameTicket, setApplyToSameTicket] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New pending doc form state
  const [newDocType, setNewDocType] = useState<PendingDocType>('DEST_TICKET');
  const [newDocNo, setNewDocNo] = useState('');
  const [newDate, setNewDate] = useState(() => {
    const today = new Date();
    return `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear() + 543}`;
  });
  const [newTruckNo, setNewTruckNo] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newGrossWt, setNewGrossWt] = useState('');
  const [newTareWt, setNewTareWt] = useState('');
  const [newNetWt, setNewNetWt] = useState('');
  const [newPoAmount, setNewPoAmount] = useState('');

  // Auto calculate net weight if gross and tare are typed
  const handleGrossChange = (val: string) => {
    setNewGrossWt(val);
    const g = parseFloat(val);
    const t = parseFloat(newTareWt);
    if (!isNaN(g) && !isNaN(t) && g >= t) {
      setNewNetWt((g - t).toFixed(2));
    }
  };

  const handleTareChange = (val: string) => {
    setNewTareWt(val);
    const g = parseFloat(newGrossWt);
    const t = parseFloat(val);
    if (!isNaN(g) && !isNaN(t) && g >= t) {
      setNewNetWt((g - t).toFixed(2));
    }
  };

  // Pre-select target record if passed via props
  React.useEffect(() => {
    if (initialSelectedRecordId) {
      setSelectedTargetRecordId(initialSelectedRecordId);
    }
  }, [initialSelectedRecordId]);

  // Counts
  const counts = useMemo(() => {
    const pendingOnly = pendingDocs.filter(d => d.status === 'pending');
    return {
      totalPending: pendingOnly.length,
      dest: pendingOnly.filter(d => d.docType === 'DEST_TICKET').length,
      po: pendingOnly.filter(d => d.docType === 'PO').length,
      rr: pendingOnly.filter(d => d.docType === 'RR').length,
      matched: pendingDocs.filter(d => d.status === 'matched').length
    };
  }, [pendingDocs]);

  // Filtered pending documents list
  const filteredPendingDocs = useMemo(() => {
    return pendingDocs.filter(doc => {
      // Tab filter
      if (activeTab === 'matched') {
        if (doc.status !== 'matched') return false;
      } else {
        if (doc.status === 'matched') return false;
        if (activeTab !== 'all' && doc.docType !== activeTab) return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        doc.docNo.toLowerCase().includes(q) ||
        (doc.truckNo && doc.truckNo.toLowerCase().includes(q)) ||
        (doc.vendorOrQuarry && doc.vendorOrQuarry.toLowerCase().includes(q)) ||
        (doc.description && doc.description.toLowerCase().includes(q)) ||
        doc.date.toLowerCase().includes(q)
      );
    });
  }, [pendingDocs, activeTab, searchQuery]);

  // Target records for matching with smart score/suggestions
  const targetRecordsWithScore = useMemo(() => {
    return records.map(record => {
      let score = 0;
      const reasons: string[] = [];

      if (selectedPendingDoc) {
        // Date match
        if (record.date && selectedPendingDoc.date && record.date.trim() === selectedPendingDoc.date.trim()) {
          score += 40;
          reasons.push('วันที่ตรงกัน');
        }

        // Truck match
        if (
          record.truckNo && 
          selectedPendingDoc.truckNo && 
          record.truckNo !== '-' && 
          selectedPendingDoc.truckNo !== '-'
        ) {
          const recTruck = record.truckNo.replace(/\s+/g, '').toLowerCase();
          const docTruck = selectedPendingDoc.truckNo.replace(/\s+/g, '').toLowerCase();
          if (recTruck.includes(docTruck) || docTruck.includes(recTruck)) {
            score += 50;
            reasons.push('ทะเบียนรถตรงกัน');
          }
        }

        // Vendor or Quarry match
        if (
          selectedPendingDoc.vendorOrQuarry && 
          (
            (record.vendor && record.vendor.includes(selectedPendingDoc.vendorOrQuarry)) ||
            (record.quarry && record.quarry.includes(selectedPendingDoc.vendorOrQuarry))
          )
        ) {
          score += 20;
          reasons.push('ผู้ขาย/โรงโม่ตรงกัน');
        }

        // Need this doc type?
        if (selectedPendingDoc.docType === 'DEST_TICKET' && (!record.destTicketNo || record.destTicketNo === '-')) {
          score += 25;
          reasons.push('ยังไม่มีตั๋วปลายทาง');
        }
        if (selectedPendingDoc.docType === 'PO' && (!record.poNo || record.poNo === '-')) {
          score += 25;
          reasons.push('ยังไม่มีเลข PO');
        }
        if (selectedPendingDoc.docType === 'RR' && (!record.rrNo || record.rrNo === '-')) {
          score += 25;
          reasons.push('ยังไม่มีเลข RR');
        }
      }

      return { record, score, reasons };
    }).sort((a, b) => b.score - a.score);
  }, [records, selectedPendingDoc]);

  // Target record details when selected
  const activeTargetRecord = useMemo(() => {
    if (!selectedTargetRecordId) return null;
    return records.find(r => r.id === selectedTargetRecordId) || null;
  }, [records, selectedTargetRecordId]);

  // Sibling records that share the same ticketNo (multi-item tickets)
  const siblingRecords = useMemo(() => {
    if (!activeTargetRecord || !activeTargetRecord.ticketNo || activeTargetRecord.ticketNo === '-') return [];
    return records.filter(r => r.ticketNo === activeTargetRecord.ticketNo && r.id !== activeTargetRecord.id);
  }, [records, activeTargetRecord]);

  if (!isOpen) return null;

  // Execute matching
  const handleConfirmMatch = () => {
    if (!selectedPendingDoc || !selectedTargetRecordId) return;

    let targetIds = [selectedTargetRecordId];
    if (applyToSameTicket && siblingRecords.length > 0) {
      targetIds = [selectedTargetRecordId, ...siblingRecords.map(r => r.id)];
    }

    onMatch(selectedPendingDoc, targetIds, applyToSameTicket);
    setSelectedPendingDoc(null);
  };

  // Submit new pending document
  const handleCreatePendingDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocNo.trim()) return;

    onAddPendingDoc({
      docType: newDocType,
      docNo: newDocNo.trim(),
      date: newDate.trim(),
      truckNo: newTruckNo.trim() || undefined,
      vendorOrQuarry: newVendor.trim() || undefined,
      description: newDescription.trim() || undefined,
      destGrossWt: newGrossWt ? parseFloat(newGrossWt) : undefined,
      destTareWt: newTareWt ? parseFloat(newTareWt) : undefined,
      destNetWt: newNetWt ? parseFloat(newNetWt) : undefined,
      poAmount: newPoAmount ? parseFloat(newPoAmount) : undefined,
      source: 'manual'
    });

    // Reset form
    setNewDocNo('');
    setNewTruckNo('');
    setNewVendor('');
    setNewDescription('');
    setNewGrossWt('');
    setNewTareWt('');
    setNewNetWt('');
    setNewPoAmount('');
    setShowAddForm(false);
  };

  const getDocTypeBadge = (type: PendingDocType) => {
    switch (type) {
      case 'DEST_TICKET':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Scale className="w-3 h-3 text-amber-600" />
            ตั๋วชั่งปลายทาง
          </span>
        );
      case 'PO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <FileText className="w-3 h-3 text-blue-600" />
            ใบสั่งซื้อ (PO)
          </span>
        );
      case 'RR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <Boxes className="w-3 h-3 text-purple-600" />
            ใบตรวจรับ (RR)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  กล่องพักเอกสารรอจับคู่ (Smart Matching Hub)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  รอจับคู่ {counts.totalPending} ใบ
                </span>
              </div>
              <p className="text-xs text-slate-300">
                นำเอกสารที่มาก่อน-หลัง (PO, RR, ตั๋วปลายทาง) มาประกบเข้ากับตั๋วต้นทางในตารางหลัก
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{showAddForm ? 'ปิดแบบฟอร์ม' : 'เพิ่มเอกสารรอจับคู่'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Add Form Drawer (Expandable) */}
        {showAddForm && (
          <form 
            onSubmit={handleCreatePendingDoc}
            className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>บันทึกเอกสารใหม่เข้ารอจับคู่ (นำเข้าล่วงหน้าได้โดยไม่ต้องรอตั๋วต้นทาง)</span>
              </div>
              <span className="text-[11px] text-slate-500">
                * ข้อมูลนี้จะไปอยู่ในกล่องพักรอชนบิล
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">ประเภทเอกสาร</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as PendingDocType)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="DEST_TICKET">ตั๋วชั่งปลายทาง (Destination Ticket)</option>
                  <option value="PO">ใบสั่งซื้อ (PO)</option>
                  <option value="RR">ใบตรวจรับพัสดุ (RR)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  เลขที่เอกสาร <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={newDocType === 'DEST_TICKET' ? 'เช่น DEST-8899' : newDocType === 'PO' ? 'เช่น PO6800199' : 'เช่น RR6812050'}
                  value={newDocNo}
                  onChange={(e) => setNewDocNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-mono-numbers text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">วันที่เอกสาร</label>
                <input
                  type="text"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-mono-numbers text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">ทะเบียนรถ (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น 84-3288"
                  value={newTruckNo}
                  onChange={(e) => setNewTruckNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {newDocType === 'DEST_TICKET' ? 'ตราชั่ง / โครงการ' : newDocType === 'PO' ? 'ผู้ขาย / ซัพพลายเออร์' : 'ผู้ตรวจรับ / สโตร์'}
                </label>
                <input
                  type="text"
                  placeholder="ระบุชื่อหน่วยงาน"
                  value={newVendor}
                  onChange={(e) => setNewVendor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">รายละเอียด / สินค้า</label>
                <input
                  type="text"
                  placeholder="เช่น หินคลุก 32 ตัน"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Specific fields based on docType */}
              {newDocType === 'DEST_TICKET' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-amber-900 mb-1">รถหนักปลายทาง (ตัน)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newGrossWt}
                      onChange={(e) => handleGrossChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md border border-amber-300 bg-amber-50/50 font-mono-numbers text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-amber-900 mb-1">รถเบาปลายทาง (ตัน)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newTareWt}
                      onChange={(e) => handleTareChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md border border-amber-300 bg-amber-50/50 font-mono-numbers text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1">สุทธิかんปลายทาง (ตัน)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newNetWt}
                      onChange={(e) => setNewNetWt(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md border border-amber-400 bg-white font-mono-numbers font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {newDocType === 'PO' && (
                <div>
                  <label className="block text-[11px] font-medium text-blue-900 mb-1">ยอดเงินตาม PO (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newPoAmount}
                    onChange={(e) => setNewPoAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-blue-300 bg-blue-50/50 font-mono-numbers text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
              >
                บันทึกเข้ากล่องพัก
              </button>
            </div>
          </form>
        )}

        {/* Modal Body: Split view (Left: Pending Bucket, Right: Target Records & Match Action) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT COLUMN: Pending Documents List */}
          <div className="w-1/2 md:w-5/12 border-r border-slate-200 flex flex-col bg-slate-50/50">
            
            {/* Filter Tabs */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({counts.totalPending})
                </button>
                <button
                  onClick={() => setActiveTab('DEST_TICKET')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeTab === 'DEST_TICKET'
                      ? 'bg-amber-600 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Scale className="w-3 h-3" />
                  ตั๋วปลายทาง ({counts.dest})
                </button>
                <button
                  onClick={() => setActiveTab('PO')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeTab === 'PO'
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  PO ({counts.po})
                </button>
                <button
                  onClick={() => setActiveTab('RR')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeTab === 'RR'
                      ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Boxes className="w-3 h-3" />
                  RR ({counts.rr})
                </button>
                <button
                  onClick={() => setActiveTab('matched')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeTab === 'matched'
                      ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  ชนแล้ว ({counts.matched})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mt-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่, ทะเบียนรถ, หรือผู้ขาย..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* List of Pending Documents */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredPendingDocs.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-3">
                    <CheckCircle2 className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-600">ไม่มีเอกสารในหมวดหมู่นี้</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {activeTab === 'matched' ? 'ยังไม่มีรายการที่ชนบิล' : 'เอกสารถูกจับคู่ครบหมดแล้ว หรือกดเพิ่มเอกสารใหม่ได้'}
                  </p>
                </div>
              ) : (
                filteredPendingDocs.map((doc) => {
                  const isSelected = selectedPendingDoc?.id === doc.id;
                  const isMatched = doc.status === 'matched';

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedPendingDoc(isSelected ? null : doc)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                          : isMatched
                          ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {getDocTypeBadge(doc.docType)}
                          <span className="font-mono-numbers font-bold text-xs text-slate-900">
                            {doc.docNo}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono-numbers">
                          {doc.date}
                        </span>
                      </div>

                      <div className="mt-2 text-xs space-y-1">
                        {doc.truckNo && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Truck className="w-3 h-3 text-slate-400" />
                            <span className="font-mono-numbers font-medium">{doc.truckNo}</span>
                          </div>
                        )}
                        {doc.vendorOrQuarry && (
                          <div className="flex items-center gap-1.5 text-slate-600 truncate">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{doc.vendorOrQuarry}</span>
                          </div>
                        )}
                        {doc.description && (
                          <p className="text-[11px] text-slate-500 truncate">
                            {doc.description}
                          </p>
                        )}
                      </div>

                      {/* Weight badge if DEST_TICKET */}
                      {doc.docType === 'DEST_TICKET' && doc.destNetWt !== undefined && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">สุทธิปลายทาง:</span>
                          <span className="font-mono-numbers font-bold text-amber-900 bg-amber-100/60 px-1.5 py-0.5 rounded">
                            {doc.destNetWt.toFixed(2)} ตัน
                          </span>
                        </div>
                      )}

                      {/* PO Amount if PO */}
                      {doc.docType === 'PO' && doc.poAmount !== undefined && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">ยอดเงิน PO:</span>
                          <span className="font-mono-numbers font-bold text-blue-900 bg-blue-100/60 px-1.5 py-0.5 rounded">
                            ฿{doc.poAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Source tag & actions */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          {doc.source === 'line_bot' ? '🤖 ได้รับจาก LINE' : doc.source === 'import' ? '📥 นำเข้าไฟล์' : '✍️ บันทึกด้วยมือ'}
                        </span>
                        
                        {isMatched ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnmatch(doc.id);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Undo2 className="w-3 h-3" />
                            <span>ยกเลิกการชน</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePendingDoc(doc.id);
                            }}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="ลบเอกสารนี้"
                          >
                            ลบ
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Master Records Selection & Matching Action */}
          <div className="w-1/2 md:w-7/12 flex flex-col bg-white">
            
            {/* Header / Instructions */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>เลือกตั๋วต้นทางในตารางหลักที่จะชนบิลด้วย</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedPendingDoc ? (
                      <>
                        กำลังเตรียมชนบิลกับ: <strong className="text-blue-700 font-mono-numbers">{selectedPendingDoc.docNo}</strong> ({selectedPendingDoc.date} {selectedPendingDoc.truckNo ? `| ${selectedPendingDoc.truckNo}` : ''})
                      </>
                    ) : (
                      '👈 กรุณาคลิกเลือกเอกสารจากกล่องพักฝั่งซ้ายก่อน'
                    )}
                  </p>
                </div>

                {selectedPendingDoc && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
                    เรียงตามความน่าจะเป็น
                  </span>
                )}
              </div>
            </div>

            {/* Target Records List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {targetRecordsWithScore.map(({ record, score, reasons }) => {
                const isSelected = selectedTargetRecordId === record.id;
                const isHighMatch = score >= 50;

                return (
                  <div
                    key={record.id}
                    onClick={() => setSelectedTargetRecordId(record.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : isHighMatch
                        ? 'bg-amber-50/30 border-amber-300/80 hover:border-amber-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: Category, TicketNo, Date */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {record.category}
                        </span>
                        <span className="font-mono-numbers font-bold text-xs text-blue-800">
                          ตั๋วต้นทาง: {record.ticketNo !== '-' ? record.ticketNo : 'ไม่มีตั๋ว'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isHighMatch && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                            แนะนำ ({score}%)
                          </span>
                        )}
                        <span className="text-[11px] font-mono-numbers text-slate-500">
                          {record.date}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Details & Truck */}
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 text-[11px]">สินค้า: </span>
                        <span className="font-medium text-slate-800">{record.description}</span>
                        {record.spec && record.spec !== '-' && (
                          <span className="text-[10px] text-slate-500 ml-1">({record.spec})</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[11px]">ทะเบียนรถ: </span>
                        <span className="font-mono-numbers font-bold text-slate-800">
                          {record.truckNo}
                        </span>
                      </div>
                    </div>

                    {/* Current Document Links Status */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-3 text-slate-600">
                        <span>PO: <strong className={record.poNo && record.poNo !== '-' ? 'text-blue-700 font-mono-numbers' : 'text-slate-400 font-normal'}>{record.poNo || '-'}</strong></span>
                        <span>RR: <strong className={record.rrNo && record.rrNo !== '-' ? 'text-purple-700 font-mono-numbers' : 'text-slate-400 font-normal'}>{record.rrNo || '-'}</strong></span>
                        <span>ตั๋วปลายทาง: <strong className={record.destTicketNo && record.destTicketNo !== '-' ? 'text-amber-800 font-mono-numbers' : 'text-slate-400 font-normal'}>{record.destTicketNo || '-'}</strong></span>
                      </div>

                      <div className="font-mono-numbers text-xs">
                        {record.netWt > 0 ? (
                          <span className="text-slate-700">สุทธิต้นทาง: <strong>{record.netWt.toFixed(2)} ตัน</strong></span>
                        ) : (
                          <span className="text-slate-700">{record.qty} {record.unit}</span>
                        )}
                      </div>
                    </div>

                    {/* Reasons badge */}
                    {selectedPendingDoc && reasons.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {reasons.map((r, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                            ✓ {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Matching Action Bar */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
              {activeTargetRecord && selectedPendingDoc ? (
                <div className="space-y-3">
                  {/* Multi-item sibling ticket notification */}
                  {siblingRecords.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                      <Boxes className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">
                          ตรวจพบตั๋วต้นทางเลขที่ {activeTargetRecord.ticketNo} มีสินค้า {siblingRecords.length + 1} รายการ!
                        </p>
                        <p className="text-[11px] text-blue-700 mt-0.5">
                          (เช่น {activeTargetRecord.description}, {siblingRecords.map(s => s.description).join(', ')})
                        </p>
                        <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={applyToSameTicket}
                            onChange={(e) => setApplyToSameTicket(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-semibold text-blue-950">
                            ชนบิลเข้าทั้ง {siblingRecords.length + 1} รายการในตั๋วใบนี้พร้อมกัน (Batch Match)
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Preview summary */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-slate-600">
                      <span>จะเชื่อมโยง </span>
                      <strong className="text-slate-900 font-mono-numbers">{selectedPendingDoc.docNo}</strong>
                      <span> เข้ากับตั๋วต้นทาง </span>
                      <strong className="text-blue-800 font-mono-numbers">
                        {activeTargetRecord.ticketNo !== '-' ? activeTargetRecord.ticketNo : activeTargetRecord.description}
                      </strong>
                    </div>

                    <button
                      onClick={handleConfirmMatch}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm active:scale-98"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>ยืนยันการชนบิล</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    <span>
                      {!selectedPendingDoc 
                        ? '1. เลือกเอกสารจากฝั่งซ้าย' 
                        : '2. เลือกตั๋วเป้าหมายจากรายการด้านบน เพื่อทำการชนบิล'}
                    </span>
                  </div>

                  <button
                    disabled
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 text-slate-400 cursor-not-allowed"
                  >
                    ยืนยันการชนบิล
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

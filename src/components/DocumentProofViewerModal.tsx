import React, { useState } from 'react';
import { 
  X, 
  RotateCw, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Download, 
  Eye, 
  FileText, 
  Scale, 
  Truck, 
  Building2, 
  ExternalLink,
  Edit3
} from 'lucide-react';
import { ConstructionLogRecord } from '../types.ts';

interface DocumentProofViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ConstructionLogRecord | null;
  onEditTicketNo?: (recordId: string, newTicketNo: string) => void;
}

export const DocumentProofViewerModal: React.FC<DocumentProofViewerModalProps> = ({
  isOpen,
  onClose,
  record,
  onEditTicketNo
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [editedTicketNo, setEditedTicketNo] = useState('');

  // Reset zoom & rotation when modal opens with a new record
  React.useEffect(() => {
    if (isOpen) {
      setRotation(0);
      setScale(1);
      setIsEditingTicket(false);
      setEditedTicketNo(record?.ticketNo && record.ticketNo !== '-' ? record.ticketNo : '');
    }
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  // Handlers for Rotation & Zoom
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetView = () => {
    setRotation(0);
    setScale(1);
  };

  const handleSaveTicketNo = () => {
    if (onEditTicketNo && record) {
      onEditTicketNo(record.id, editedTicketNo.trim() || '-');
      setIsEditingTicket(false);
    }
  };

  // Sample mock image fallback if record doesn't have an image URL
  const billImage = record.billImageUrl || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in duration-150">
        
        {/* Top Header & Toolbar */}
        <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left: Document Info & Internal Doc ID */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                  {record.internalDocNo || `DOC-${record.id}`}
                </span>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  ภาพถ่ายบิลจริง / เอกสารอ้างอิง
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {record.description} • {record.category} • วันที่ {record.date}
              </p>
            </div>
          </div>

          {/* Center: Image Controls (Rotate, Zoom, Reset) */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700 shadow-inner">
            <button
              onClick={handleRotateLeft}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
              title="หมุนซ้าย 90°"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotateRight}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
              title="หมุนขวา 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-700 mx-1"></div>

            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition active:scale-95"
              title="ซูมออก (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-semibold text-slate-300 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 3.5}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition active:scale-95"
              title="ซูมเข้า (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-700 mx-1"></div>

            <button
              onClick={handleResetView}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="รีเซ็ตมุมมอง (100% มุมปกติ)"
            >
              รีเซ็ต
            </button>
          </div>

          {/* Right: Close button */}
          <div className="flex items-center gap-2">
            <a
              href={billImage}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="เปิดภาพในแท็บใหม่"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="ปิดหน้าต่าง (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content: Split View (Image Canvas vs Side Panel Reference) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: Image Viewer Canvas with interactive Pan/Zoom/Rotation */}
          <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-auto p-4 relative select-none cursor-grab active:cursor-grabbing">
            <div 
              className="transition-transform duration-200 ease-out origin-center flex items-center justify-center max-w-full max-h-full"
              style={{
                transform: `rotate(${rotation}deg) scale(${scale})`,
              }}
            >
              <img
                src={billImage}
                alt="Document Proof"
                className="max-h-[75vh] max-w-full object-contain rounded shadow-2xl border border-slate-700 pointer-events-auto"
                draggable={false}
              />
            </div>

            {/* Quick angle indicator badge */}
            <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700 text-[11px] text-slate-300 font-mono">
              มุมหมุน: {rotation}° | ขยาย: {Math.round(scale * 100)}%
            </div>
          </div>

          {/* RIGHT: Side-by-side Inspection & Ticket Editing Panel */}
          <div className="w-80 md:w-96 bg-slate-850 border-l border-slate-700/80 flex flex-col shrink-0 overflow-y-auto">
            
            {/* Header info */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/40">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>ข้อมูลที่บันทึกในระบบ (ตรวจทานคู่กัน)</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                เทียบข้อความบนรูปภาพจริง หากเลขที่ตั๋วผิด สามารถแก้ไขได้ทันที
              </p>
            </div>

            {/* Ticket No. Quick Correction Box */}
            <div className="p-4 border-b border-slate-700/60 bg-blue-950/20">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-blue-300">
                  เลขใบจ่ายสินค้า / ตั๋วต้นทาง:
                </label>
                {!isEditingTicket && onEditTicketNo && (
                  <button
                    onClick={() => setIsEditingTicket(true)}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-200 inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>แก้ไขเลขตั๋ว</span>
                  </button>
                )}
              </div>

              {isEditingTicket ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editedTicketNo}
                    onChange={(e) => setEditedTicketNo(e.target.value)}
                    placeholder="พิมพ์เลขที่ตั๋วที่ถูกต้อง..."
                    className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-blue-500 font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setIsEditingTicket(false)}
                      className="px-2.5 py-1 rounded text-slate-400 hover:bg-slate-700"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleSaveTicketNo}
                      className="px-3 py-1 rounded font-semibold bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      บันทึกเลขตั๋วใหม่
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-base font-bold font-mono text-white bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700">
                  {record.ticketNo !== '-' ? record.ticketNo : <span className="text-slate-500">ไม่มีเลขตั๋ว</span>}
                </div>
              )}
            </div>

            {/* Key Field Comparison */}
            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">เลขที่เอกสารภายใน (Internal Doc ID):</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {record.internalDocNo || `DOC-${record.id}`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[11px]">เลขที่ PO:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {record.poNo || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">เลขที่ RR:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {record.rrNo || '-'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">โรงโม่ / แหล่งผลิต:</span>
                <span className="font-medium text-slate-200 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>{record.quarry !== '-' ? record.quarry : '-'}</span>
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">ชุด / ทะเบียนรถ:</span>
                <span className="font-mono font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                  <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{record.truckNo !== '-' ? record.truckNo : '-'}</span>
                </span>
              </div>

              {/* Weight Scale Data */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/80 space-y-2">
                <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" />
                  <span>น้ำหนักชั่งต้นทาง</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-800/80 p-1.5 rounded">
                    <span className="text-[10px] text-slate-400 block">รถหนัก</span>
                    <span className="font-mono font-semibold text-slate-200">{record.grossWt || 0}</span>
                  </div>
                  <div className="bg-slate-800/80 p-1.5 rounded">
                    <span className="text-[10px] text-slate-400 block">รถเบา</span>
                    <span className="font-mono font-semibold text-slate-200">{record.tareWt || 0}</span>
                  </div>
                  <div className="bg-amber-950/40 p-1.5 rounded border border-amber-500/30">
                    <span className="text-[10px] text-amber-300 block font-semibold">สุทธิ</span>
                    <span className="font-mono font-bold text-amber-300">{record.netWt || 0}</span>
                  </div>
                </div>
              </div>

              {/* Destination Ticket if matched */}
              {record.destTicketNo && record.destTicketNo !== '-' && (
                <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-600/30 space-y-1.5">
                  <div className="text-[11px] font-bold text-sky-300">
                    ตั๋วชั่งปลายทาง (ชนบิลแล้ว)
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">เลขตั๋วปลายทาง:</span>
                    <span className="font-mono font-bold text-sky-200">{record.destTicketNo}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">สุทธิปลายทาง:</span>
                    <span className="font-mono font-bold text-sky-200">{record.destNetWt} ตัน</span>
                  </div>
                  {record.weightDiffKg !== undefined && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">ผลต่าง (กก.):</span>
                      <span className={`font-mono font-bold ${record.weightDiffKg < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {record.weightDiffKg > 0 ? `+${record.weightDiffKg}` : record.weightDiffKg} กก.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Remark */}
              {record.remark && record.remark !== '-' && (
                <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-700/60">
                  <span>หมายเหตุ: </span>
                  <span className="text-slate-300">{record.remark}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto p-4 border-t border-slate-700 bg-slate-800/60">
              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition"
              >
                ปิดหน้าต่างตรวจบิล
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

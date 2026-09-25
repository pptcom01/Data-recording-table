import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { ConstructionLogRecord } from '../types.ts';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  record: ConstructionLogRecord | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  record
}) => {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        <div className="bg-rose-50 border-b border-rose-100 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>ยืนยันการลบรายการ</span>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-xs text-slate-600">
            คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากตาราง?
          </p>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="font-semibold text-slate-800">{record.description}</div>
            <div className="text-slate-500 flex gap-2">
              <span>หมวด: {record.category}</span>
              <span>•</span>
              <span>วันที่: {record.date}</span>
            </div>
            {record.poNo !== '-' && <div className="text-blue-600 font-mono">PO: {record.poNo}</div>}
          </div>

          <p className="text-[11px] text-slate-400">
            * การลบจะถูกบันทึกลงในเครื่องทันที แต่คุณสามารถรีเซ็ตกลับเป็นข้อมูลตัวอย่างได้ทุกเมื่อ
          </p>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium transition"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>ยืนยันลบรายการ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

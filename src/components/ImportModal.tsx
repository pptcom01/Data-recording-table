import React, { useState, useRef } from 'react';
import { X, Upload, FileCheck, AlertTriangle } from 'lucide-react';
import { ConstructionLogRecord } from '../types.ts';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newRecords: ConstructionLogRecord[], mode: 'replace' | 'merge') => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [parsedRecords, setParsedRecords] = useState<ConstructionLogRecord[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        let records: ConstructionLogRecord[] = [];
        if (Array.isArray(data)) {
          records = data;
        } else if (data && Array.isArray(data.records)) {
          records = data.records;
        } else {
          throw new Error("รูปแบบไฟล์ JSON ไม่ถูกต้อง ไม่พบชุดข้อมูล records");
        }

        if (records.length === 0) {
          setErrorMsg("ไฟล์ไม่มีข้อมูลรายการ");
          setParsedRecords(null);
          return;
        }

        setParsedRecords(records);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "ไม่สามารถอ่านไฟล์ JSON ได้";
        setErrorMsg("เกิดข้อผิดพลาดในการอ่านไฟล์: " + msg);
        setParsedRecords(null);
      }
    };

    reader.readAsText(file);
  };

  const handleApply = (mode: 'replace' | 'merge') => {
    if (!parsedRecords || parsedRecords.length === 0) return;
    onImport(parsedRecords, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-100 text-slate-800 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">นำเข้าข้อมูลสำรอง (Import JSON)</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            เลือกไฟล์ข้อมูลสำรอง <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-mono">.json</code> ที่เคยดาวน์โหลดไว้ เพื่อกู้คืนหรือนำข้อมูลเข้ามาเปิดใช้งาน
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition"
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-700">
              {fileName ? fileName : 'คลิกเพื่อเลือกไฟล์สำรองข้อมูล (.json)'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">รองรับไฟล์ที่ Export ออกจากระบบนี้</p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsedRecords && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>ตรวจสอบไฟล์สำเร็จ! พบข้อมูล {parsedRecords.length} รายการ</span>
              </div>
              <p className="text-emerald-700 text-[11px]">
                กรุณาเลือกวิธีการนำเข้าข้อมูลลงในตารางปัจจุบัน:
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium transition"
          >
            ยกเลิก
          </button>
          
          {parsedRecords && (
            <>
              <button
                type="button"
                onClick={() => handleApply('merge')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                เพิ่มต่อท้ายข้อมูลเดิม (Merge)
              </button>
              <button
                type="button"
                onClick={() => handleApply('replace')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                แทนที่ข้อมูลทั้งหมด (Replace)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

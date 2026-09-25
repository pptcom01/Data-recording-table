import React from 'react';
import { X, CheckSquare, Square, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { DEFAULT_COLUMN_VISIBILITY } from '../initialData.ts';

interface ColumnToggleModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: Record<string, boolean>;
  onChangeVisibility: (newVis: Record<string, boolean>) => void;
}

const COLUMN_GROUPS = [
  {
    groupName: "1. วันที่ & เอกสาร",
    bgColor: "bg-blue-50 text-blue-900 border-blue-200",
    columns: [
      { key: "category", label: "หมวดหมู่รายการ" },
      { key: "date", label: "วัน/เดือน/ปี" },
      { key: "poNo", label: "เลขที่ PO" },
      { key: "ticketNo", label: "เลขใบจ่ายสินค้า/ตั๋วชั่ง" },
      { key: "rrNo", label: "ใบเสนอราคา / RR" }
    ]
  },
  {
    groupName: "2. สถานที่ & ขนส่ง",
    bgColor: "bg-purple-50 text-purple-900 border-purple-200",
    columns: [
      { key: "vendor", label: "ผู้รับเหมา / บริษัท" },
      { key: "quarry", label: "โรงโม่ / กิจการ" },
      { key: "truckNo", label: "ทะเบียนรถ / ชุดรถ" }
    ]
  },
  {
    groupName: "3. รายละเอียดสินค้า",
    bgColor: "bg-emerald-50 text-emerald-900 border-emerald-200",
    columns: [
      { key: "description", label: "รายละเอียด / รายการ" },
      { key: "spec", label: "สเปก / รหัสสินค้า / Strength" }
    ]
  },
  {
    groupName: "4. น้ำหนักชั่ง & เทียบตั๋วปลายทาง",
    bgColor: "bg-amber-50 text-amber-900 border-amber-200",
    columns: [
      { key: "grossWt", label: "รถหนักต้นทาง (ตัน)" },
      { key: "tareWt", label: "รถเบาต้นทาง (ตัน)" },
      { key: "netWt", label: "นน.สุทธิต้นทาง (ตัน)" },
      { key: "destDate", label: "วันที่ชั่งปลายทาง" },
      { key: "destTicketNo", label: "เลขที่บิล/ตั๋วปลายทาง" },
      { key: "destGrossWt", label: "รถหนักปลายทาง (ตัน)" },
      { key: "destTareWt", label: "รถเบาปลายทาง (ตัน)" },
      { key: "destNetWt", label: "นน.สุทธิปลายทาง (ตัน)" },
      { key: "weightDiff", label: "ผลต่างน้ำหนัก (กก.)" }
    ]
  },
  {
    groupName: "5. ราคาหิน, ค่าบรรทุก & รวมเงิน",
    bgColor: "bg-indigo-50 text-indigo-900 border-indigo-200",
    columns: [
      { key: "qty", label: "ปริมาณ/จำนวน" },
      { key: "unit", label: "หน่วย" },
      { key: "pricePerUnit", label: "ราคาหิน/หน่วย (บาท)" },
      { key: "materialAmount", label: "รวมค่าหิน (บาท)" },
      { key: "transportType", label: "ประเภทขนส่ง (วิ่งเอง/จ้างรถ)" },
      { key: "haulerName", label: "ผู้รับจ้างขนส่ง" },
      { key: "freightRate", label: "ค่าบรรทุก/ตัน (บาท)" },
      { key: "freightAmount", label: "รวมค่าบรรทุก (บาท)" },
      { key: "extraFee", label: "ค่าขนส่งเดิม (extraFee)" },
      { key: "totalAmount", label: "รวมเงินทั้งสิ้น" }
    ]
  },
  {
    groupName: "6. การเงิน & โครงการ",
    bgColor: "bg-teal-50 text-teal-900 border-teal-200",
    columns: [
      { key: "paidMaterial", label: "จ่ายผู้ขายแล้ว (ค่าหิน)" },
      { key: "materialBalance", label: "คงค้างจ่ายผู้ขาย" },
      { key: "paidFreight", label: "จ่ายผู้รับจ้างขนแล้ว" },
      { key: "freightBalance", label: "คงค้างจ่ายผู้รับจ้างขน" },
      { key: "paidAmount", label: "รวมชำระแล้วทั้งสิ้น" },
      { key: "balance", label: "คงค้างชำระรวมทั้งสิ้น" },
      { key: "workStructure", label: "โครงสร้างงาน / กม." },
      { key: "remark", label: "หมายเหตุ" }
    ]
  }
];

export const ColumnToggleModal: React.FC<ColumnToggleModalProps> = ({
  isOpen,
  onClose,
  visibility,
  onChangeVisibility
}) => {
  if (!isOpen) return null;

  const toggleColumn = (key: string) => {
    onChangeVisibility({
      ...visibility,
      [key]: !visibility[key]
    });
  };

  const setAll = (val: boolean) => {
    const updated: Record<string, boolean> = {};
    Object.keys(visibility).forEach(k => {
      updated[k] = val;
    });
    onChangeVisibility(updated);
  };

  const resetDefault = () => {
    onChangeVisibility({ ...DEFAULT_COLUMN_VISIBILITY });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-100 text-slate-800 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">กำหนดการแสดงผลคอลัมน์ (22 คอลัมน์)</h3>
              <p className="text-xs text-slate-500">เลือกเปิด/ปิดคอลัมน์ตามความจำเป็นของหน้างาน</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-600 font-medium">จัดการด่วน:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAll(true)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-medium transition"
              >
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={resetDefault}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-medium transition flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ตค่าเริ่มต้น
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COLUMN_GROUPS.map((group, gIdx) => (
              <div key={gIdx} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className={`px-3 py-2 text-xs font-bold border-b flex justify-between items-center ${group.bgColor}`}>
                  <span>{group.groupName}</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    {group.columns.filter(c => visibility[c.key]).length}/{group.columns.length}
                  </span>
                </div>
                <div className="p-2.5 space-y-1.5">
                  {group.columns.map(col => {
                    const isChecked = visibility[col.key] ?? true;
                    return (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => toggleColumn(col.key)}
                        className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 transition text-xs"
                      >
                        <span className={`font-medium ${isChecked ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                          {col.label}
                        </span>
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            เรียบร้อย
          </button>
        </div>
      </div>
    </div>
  );
};

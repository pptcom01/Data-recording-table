import React from 'react';
import { 
  Calculator, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Scale 
} from 'lucide-react';
import { ConstructionLogRecord } from '../types.ts';

interface SummaryCardsProps {
  records: ConstructionLogRecord[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ records }) => {
  const totalRows = records.length;
  let totalAmount = 0;
  let paidAmount = 0;
  let totalNetWt = 0;
  let totalConcreteCubic = 0;
  let totalMaterialAmount = 0;
  let totalFreightAmount = 0;
  let selfHaulCount = 0;
  let hiredHaulCount = 0;

  // Breakdown for Payables: Seller vs Hauler
  let sellerPayable = 0;
  let sellerPaid = 0;
  let sellerBalance = 0;
  let haulerPayable = 0;
  let haulerPaid = 0;
  let haulerBalance = 0;

  // Scheme counts
  let splitCount = 0;
  let haulerAllCount = 0;
  let sellerAllCount = 0;

  records.forEach(r => {
    const q = Number(r.qty) || 0;
    const p = Number(r.pricePerUnit) || 0;
    const mat = r.materialAmount !== undefined ? Number(r.materialAmount) : (q * p);
    totalMaterialAmount += mat;

    const isHired = r.transportType === 'hired' || (r.freightAmount && Number(r.freightAmount) > 0) || (r.extraFee && Number(r.extraFee) > 0);
    const fr = isHired 
      ? (r.freightAmount !== undefined ? Number(r.freightAmount) : (q * Number(r.freightRate || r.extraFee || 0))) 
      : 0;

    if (isHired) {
      hiredHaulCount++;
      totalFreightAmount += fr;
    } else {
      selfHaulCount++;
    }

    const tot = Number(r.totalAmount) || (mat + fr);
    totalAmount += tot;

    const pTot = Number(r.paidAmount) || 0;
    paidAmount += pTot;
    totalNetWt += Number(r.netWt) || 0;

    const scheme = !isHired ? 'seller_all' : (r.paymentRecipientType || 'split');

    if (scheme === 'hauler_all') {
      haulerAllCount++;
      haulerPayable += tot;
      haulerPaid += pTot;
      haulerBalance += Math.max(0, tot - pTot);
    } else if (scheme === 'seller_all') {
      sellerAllCount++;
      sellerPayable += tot;
      sellerPaid += pTot;
      sellerBalance += Math.max(0, tot - pTot);
    } else {
      splitCount++;
      sellerPayable += mat;
      const pMat = r.paidMaterial !== undefined ? Number(r.paidMaterial) : (pTot >= mat ? mat : pTot);
      sellerPaid += pMat;
      sellerBalance += Math.max(0, mat - pMat);

      haulerPayable += fr;
      const pFr = r.paidFreight !== undefined ? Number(r.paidFreight) : (pTot > mat ? Math.min(fr, pTot - mat) : 0);
      haulerPaid += pFr;
      haulerBalance += Math.max(0, fr - pFr);
    }

    if (r.category === 'คอนกรีต' && r.unit === 'คิว') {
      totalConcreteCubic += Number(r.qty) || 0;
    }
  });

  let totalDiffKg = 0;
  let diffCount = 0;
  records.forEach(r => {
    const diff = r.weightDiffKg ?? (
      r.destNetWt && Number(r.destNetWt) > 0 && r.netWt && Number(r.netWt) > 0 
        ? Math.round((Number(r.destNetWt) - Number(r.netWt)) * 1000) 
        : null
    );
    if (diff !== null && diff !== undefined) {
      totalDiffKg += diff;
      diffCount++;
    }
  });

  const remainingBalance = totalAmount - paidAmount;

  return (
    <div className="space-y-2.5 shrink-0">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* 1. รายการทั้งหมด */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">รายการทั้งหมดในตาราง</div>
            <div className="text-lg font-bold text-slate-800 mt-0.5 font-mono-numbers">
              {totalRows.toLocaleString()} <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
            {hiredHaulCount > 0 && (
              <div className="text-[10px] text-slate-500 mt-0.5">
                วิ่งเอง {selfHaulCount} | จ้างขน {hiredHaulCount} เที่ยว
              </div>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        {/* 2. รวมราคาทั้งสิ้น (แยกค่าหิน & ค่าบรรทุก) */}
        <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">รวมราคาทั้งสิ้น</div>
            <div className="text-lg font-bold text-blue-600 mt-0.5 font-mono-numbers">
              ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {totalFreightAmount > 0 ? (
              <div className="text-[10px] font-medium text-slate-600 mt-0.5 font-mono-numbers flex flex-wrap gap-1">
                <span className="text-amber-800">ค่าหิน ฿{totalMaterialAmount.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</span>
                <span>+</span>
                <span className="text-sky-800">ค่าขน ฿{totalFreightAmount.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</span>
              </div>
            ) : null}
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {/* 3. ยอดชำระแล้ว */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">ยอดชำระเงินแล้ว</div>
            <div className="text-lg font-bold text-emerald-600 mt-0.5 font-mono-numbers">
              ฿{paidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono-numbers">
              ชำระแล้ว {totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* 4. ยอดคงค้างชำระ */}
        <div className="bg-white p-3.5 rounded-xl border border-rose-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">ยอดคงค้างชำระรวม</div>
            <div className={`text-lg font-bold mt-0.5 font-mono-numbers ${remainingBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              ฿{remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              ค้างชำระ {records.filter(r => (Number(r.totalAmount) || 0) - (Number(r.paidAmount) || 0) > 0).length} รายการ
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-rose-600" />
          </div>
        </div>

        {/* 5. น้ำหนักสุทธิรวม */}
        <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <div className="text-xs text-slate-500 font-medium">น้ำหนักสุทธิต้นทางรวม</div>
            <div className="text-lg font-bold text-amber-700 mt-0.5 font-mono-numbers">
              {totalNetWt.toFixed(2)} <span className="text-xs font-normal text-amber-900">ตัน</span>
            </div>
            {diffCount > 0 ? (
              <div className={`text-[10px] font-semibold mt-0.5 font-mono-numbers ${totalDiffKg < 0 ? 'text-rose-600' : totalDiffKg > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                เทียบปลายทาง: {totalDiffKg < 0 ? `ขาด ${Math.abs(totalDiffKg).toLocaleString()} กก.` : totalDiffKg > 0 ? `+${totalDiffKg.toLocaleString()} กก.` : 'ตรงกัน'}
              </div>
            ) : totalConcreteCubic > 0 ? (
              <div className="text-[10px] text-slate-400 mt-0.5">
                (คอนกรีตรวม {totalConcreteCubic.toFixed(1)} คิว)
              </div>
            ) : null}
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Bar สรุปยอดค้างจ่ายแยก 2 ฝ่าย: ผู้ขาย vs ผู้รับจ้างขน */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            สรุปยอดคงค้างตามผู้รับเงิน:
          </span>
          <span className="text-slate-500 text-[11px]">
            (รองรับ 3 รูปแบบ: จ่ายแยก {splitCount} | จ้างขนรวม {haulerAllCount} | ผู้ขายรวม {sellerAllCount})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Owed to Sellers */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-amber-900 font-semibold flex items-center gap-1">
              <span>🏭</span> ค้างจ่ายผู้ขาย/โรงโม่:
            </span>
            <span className={`font-bold font-mono-numbers ${sellerBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              ฿{sellerBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-amber-800">
              (จ่ายแล้ว ฿{sellerPaid.toLocaleString('th-TH', { maximumFractionDigits: 0 })})
            </span>
          </div>

          {/* Owed to Haulers */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-200 rounded-lg">
            <span className="text-sky-900 font-semibold flex items-center gap-1">
              <span>🚛</span> ค้างจ่ายผู้รับจ้างขน:
            </span>
            <span className={`font-bold font-mono-numbers ${haulerBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              ฿{haulerBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-sky-800">
              (จ่ายแล้ว ฿{haulerPaid.toLocaleString('th-TH', { maximumFractionDigits: 0 })})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

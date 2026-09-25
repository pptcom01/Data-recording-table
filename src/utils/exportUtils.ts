import { ConstructionLogRecord } from '../types.ts';

export function formatCurrency(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val) || val === 0) return '-';
  return '฿' + val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNumber(val: number | undefined | null, decimals = 2): string {
  if (val === undefined || val === null || isNaN(val) || val === 0) return '-';
  return val.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function exportToCSV(records: ConstructionLogRecord[], filename = 'ตารางบันทึกข้อมูลจัดซื้อและขนส่งรวม.csv') {
  const headers = [
    "ID",
    "หมวดหมู่",
    "เลขที่ PO",
    "เลขที่ RR",
    "วัน/เดือน/ปี",
    "เลขใบจ่ายสินค้า/ตั๋ว",
    "โรงโม่/กิจการ",
    "ผู้รับเหมา/บริษัท",
    "ทะเบียนรถ/ชุด",
    "รายละเอียดสินค้า",
    "สเปก/รหัสสินค้า",
    "รถหนักต้นทาง(ตัน)",
    "รถเบาต้นทาง(ตัน)",
    "นน.สุทธิต้นทาง(ตัน)",
    "วันที่ชั่งปลายทาง",
    "เลขตั๋วชั่งปลายทาง",
    "รถหนักปลายทาง(ตัน)",
    "รถเบาปลายทาง(ตัน)",
    "นน.สุทธิปลายทาง(ตัน)",
    "ผลต่างน้ำหนัก(กก.)",
    "จำนวน",
    "หน่วย",
    "ราคาหิน/หน่วย",
    "รวมเงินค่าหิน",
    "ประเภทขนส่ง",
    "ผู้รับจ้างขนส่ง",
    "ค่าบรรทุกต่อตัน",
    "รวมเงินค่าบรรทุก",
    "รวมเงินทั้งสิ้น",
    "รูปแบบการชำระเงิน",
    "จ่ายผู้ขายแล้ว",
    "คงค้างจ่ายผู้ขาย",
    "จ่ายผู้รับจ้างขนแล้ว",
    "คงค้างจ่ายผู้รับจ้างขน",
    "รวมชำระแล้วทั้งสิ้น",
    "คงค้างชำระรวม",
    "โครงสร้างงาน/กม.",
    "หมายเหตุ"
  ];

  const rows = records.map(r => {
    const q = Number(r.qty) || 0;
    const p = Number(r.pricePerUnit) || 0;
    const matAmt = r.materialAmount ?? (q * p);
    const isHired = r.transportType === 'hired' || (r.freightAmount && Number(r.freightAmount) > 0) || (r.extraFee && Number(r.extraFee) > 0);
    const fRate = isHired ? (Number(r.freightRate) || Number(r.extraFee) || 0) : 0;
    const frAmt = isHired ? (r.freightAmount ?? (q * fRate)) : 0;
    const total = Number(r.totalAmount) || (matAmt + frAmt);
    const paid = Number(r.paidAmount) || 0;
    const balance = total - paid;

    const scheme = !isHired ? 'seller_all' : (r.paymentRecipientType || 'split');
    let schemeLabel = 'จ่ายแยก (ผู้ขาย/ผู้รับจ้างขน)';
    let pMat = 0;
    let balMat = 0;
    let pFr = 0;
    let balFr = 0;

    if (scheme === 'hauler_all') {
      schemeLabel = 'จ่ายผู้รับจ้างขน (สินค้า+ขนส่ง)';
      pFr = paid;
      balFr = Math.max(0, total - paid);
      pMat = 0;
      balMat = 0;
    } else if (scheme === 'seller_all') {
      schemeLabel = !isHired ? 'วิ่งเอง (จ่ายเฉพาะสินค้า)' : 'จ่ายผู้ขาย (สินค้า+ขนส่ง)';
      pMat = paid;
      balMat = Math.max(0, total - paid);
      pFr = 0;
      balFr = 0;
    } else {
      schemeLabel = 'จ่ายแยก 2 ฝั่ง';
      pMat = r.paidMaterial !== undefined ? Number(r.paidMaterial) : (paid >= matAmt ? matAmt : paid);
      balMat = Math.max(0, matAmt - pMat);
      pFr = r.paidFreight !== undefined ? Number(r.paidFreight) : (paid > matAmt ? Math.min(frAmt, paid - matAmt) : 0);
      balFr = Math.max(0, frAmt - pFr);
    }

    const diffKg = (r.destNetWt && r.destNetWt > 0 && r.netWt && r.netWt > 0)
      ? Math.round((r.destNetWt - r.netWt) * 1000)
      : (r.weightDiffKg ?? '-');

    return [
      r.id,
      r.category,
      r.poNo || '-',
      r.rrNo || '-',
      r.date || '',
      r.ticketNo || '-',
      r.quarry || '-',
      r.vendor || '-',
      r.truckNo || '-',
      r.description || '',
      r.spec || '-',
      r.grossWt || 0,
      r.tareWt || 0,
      r.netWt || 0,
      r.destDate || r.date || '-',
      r.destTicketNo || '-',
      r.destGrossWt || '-',
      r.destTareWt || '-',
      r.destNetWt || '-',
      diffKg,
      r.qty || 0,
      r.unit || '',
      r.pricePerUnit || 0,
      matAmt,
      isHired ? 'จ้างขน' : 'วิ่งหินเอง',
      r.haulerName || (isHired ? (r.vendor || '-') : 'รถบริษัท'),
      fRate,
      frAmt,
      total,
      schemeLabel,
      pMat,
      balMat,
      pFr,
      balFr,
      paid,
      balance,
      r.workStructure || '-',
      r.remark || '-'
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
  });

  // \uFEFF for UTF-8 BOM so Microsoft Excel renders Thai characters flawlessly
  const csvContent = "\uFEFF" + [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJSON(records: ConstructionLogRecord[]) {
  const exportPayload = {
    appName: "Unified Construction Master Log",
    exportDate: new Date().toISOString(),
    version: "1.0",
    recordCount: records.length,
    records: records
  };
  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `สำรองข้อมูลจัดซื้อ_ขนส่ง_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

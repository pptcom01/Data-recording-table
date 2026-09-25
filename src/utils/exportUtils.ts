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
    "วัน/เดือน/ปี",
    "เลขที่ PO",
    "เลขใบจ่ายสินค้า/ตั๋ว",
    "ใบเสนอราคา/RR",
    "ผู้รับเหมา/บริษัท",
    "โรงโม่/กิจการ",
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
    "ชำระแล้ว",
    "คงค้างชำระ",
    "โครงสร้างงาน/กม.",
    "หมายเหตุ"
  ];

  const rows = records.map(r => {
    const balance = (Number(r.totalAmount) || 0) - (Number(r.paidAmount) || 0);
    const diffKg = (r.destNetWt && r.destNetWt > 0 && r.netWt && r.netWt > 0)
      ? Math.round((r.destNetWt - r.netWt) * 1000)
      : (r.weightDiffKg ?? '-');

    return [
      r.id,
      r.category,
      r.date || '',
      r.poNo || '-',
      r.ticketNo || '-',
      r.rrNo || '-',
      r.vendor || '-',
      r.quarry || '-',
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
      r.materialAmount ?? ((Number(r.qty) || 0) * (Number(r.pricePerUnit) || 0)),
      r.transportType === 'hired' ? 'จ้างขน' : 'วิ่งหินเอง',
      r.haulerName || (r.transportType === 'hired' ? (r.vendor || '-') : 'รถบริษัท'),
      r.transportType === 'hired' ? (r.freightRate || r.extraFee || 0) : 0,
      r.transportType === 'hired' ? (r.freightAmount ?? ((Number(r.qty) || 0) * (Number(r.freightRate) || Number(r.extraFee) || 0))) : 0,
      r.totalAmount || 0,
      r.paidAmount || 0,
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

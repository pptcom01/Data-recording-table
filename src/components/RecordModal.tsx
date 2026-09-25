import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, Truck, FileText, Scale } from 'lucide-react';
import { ConstructionLogRecord, ProductCategory } from '../types.ts';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: ConstructionLogRecord) => void;
  initialRecord: ConstructionLogRecord | null;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRecord
}) => {
  const [category, setCategory] = useState<ProductCategory>('เหล็ก/วัสดุ');
  const [date, setDate] = useState('');
  const [poNo, setPoNo] = useState('');
  const [ticketNo, setTicketNo] = useState('');
  const [rrNo, setRrNo] = useState('');
  const [vendor, setVendor] = useState('');
  const [quarry, setQuarry] = useState('');
  const [truckNo, setTruckNo] = useState('');
  const [description, setDescription] = useState('');
  const [spec, setSpec] = useState('');
  const [grossWt, setGrossWt] = useState<string>('');
  const [tareWt, setTareWt] = useState<string>('');
  const [netWt, setNetWt] = useState<string>('');

  // Destination scale weights (ใบชั่งน้ำหนักปลายทาง / หน้างาน)
  const [destDate, setDestDate] = useState<string>('');
  const [destTicketNo, setDestTicketNo] = useState<string>('');
  const [destGrossWt, setDestGrossWt] = useState<string>('');
  const [destTareWt, setDestTareWt] = useState<string>('');
  const [destNetWt, setDestNetWt] = useState<string>('');

  // Group 5: ราคาหิน & ค่าบรรทุก (แยก 2 ส่วน)
  const [qty, setQty] = useState<string>('1');
  const [unit, setUnit] = useState('เส้น');
  const [pricePerUnit, setPricePerUnit] = useState<string>('');
  const [materialAmount, setMaterialAmount] = useState<string>('0');

  // ค่าบรรทุก
  const [transportType, setTransportType] = useState<'self' | 'hired'>('self');
  const [haulerName, setHaulerName] = useState<string>('');
  const [freightRate, setFreightRate] = useState<string>('0');
  const [freightFeeType, setFreightFeeType] = useState<'per_unit' | 'flat'>('per_unit');
  const [freightAmount, setFreightAmount] = useState<string>('0');
  const [extraFee, setExtraFee] = useState<string>('0');

  // ยอดรวม & ชำระเงิน
  const [totalAmount, setTotalAmount] = useState<string>('0');
  const [paidMaterial, setPaidMaterial] = useState<string>('0');
  const [paidFreight, setPaidFreight] = useState<string>('0');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [workStructure, setWorkStructure] = useState('');
  const [remark, setRemark] = useState('');

  // Populate data when modal opens or initialRecord changes
  useEffect(() => {
    if (initialRecord) {
      setCategory(initialRecord.category || 'เหล็ก/วัสดุ');
      setDate(initialRecord.date || '');
      setPoNo(initialRecord.poNo !== '-' ? initialRecord.poNo : '');
      setTicketNo(initialRecord.ticketNo !== '-' ? initialRecord.ticketNo : '');
      setRrNo(initialRecord.rrNo !== '-' ? initialRecord.rrNo : '');
      setVendor(initialRecord.vendor !== '-' ? initialRecord.vendor : '');
      setQuarry(initialRecord.quarry !== '-' ? initialRecord.quarry : '');
      setTruckNo(initialRecord.truckNo !== '-' ? initialRecord.truckNo : '');
      setDescription(initialRecord.description || '');
      setSpec(initialRecord.spec !== '-' ? initialRecord.spec : '');
      setGrossWt(initialRecord.grossWt ? String(initialRecord.grossWt) : '');
      setTareWt(initialRecord.tareWt ? String(initialRecord.tareWt) : '');
      setNetWt(initialRecord.netWt ? String(initialRecord.netWt) : '');

      setDestDate(initialRecord.destDate && initialRecord.destDate !== '-' ? initialRecord.destDate : '');
      setDestTicketNo(initialRecord.destTicketNo && initialRecord.destTicketNo !== '-' ? initialRecord.destTicketNo : '');
      setDestGrossWt(initialRecord.destGrossWt ? String(initialRecord.destGrossWt) : '');
      setDestTareWt(initialRecord.destTareWt ? String(initialRecord.destTareWt) : '');
      setDestNetWt(initialRecord.destNetWt ? String(initialRecord.destNetWt) : '');

      const qVal = initialRecord.qty ? Number(initialRecord.qty) : 1;
      const pVal = initialRecord.pricePerUnit ? Number(initialRecord.pricePerUnit) : 0;
      setQty(String(qVal));
      setUnit(initialRecord.unit || 'ตัน');
      setPricePerUnit(pVal ? String(pVal) : '');

      const initialMatAmt = initialRecord.materialAmount !== undefined 
        ? initialRecord.materialAmount 
        : (qVal * pVal);
      setMaterialAmount(initialMatAmt ? String(initialMatAmt) : '0');

      const isHired = initialRecord.transportType === 'hired' || 
        (initialRecord.extraFee && initialRecord.extraFee > 0) || 
        (initialRecord.freightAmount && initialRecord.freightAmount > 0);
      const tType: 'self' | 'hired' = initialRecord.transportType || (isHired ? 'hired' : 'self');
      setTransportType(tType);

      setHaulerName(initialRecord.haulerName && initialRecord.haulerName !== '-' ? initialRecord.haulerName : '');
      const fRate = initialRecord.freightRate !== undefined 
        ? String(initialRecord.freightRate) 
        : (initialRecord.extraFee ? String(initialRecord.extraFee) : '0');
      setFreightRate(fRate);
      setFreightFeeType(initialRecord.freightFeeType || 'per_unit');

      const initialFrAmt = initialRecord.freightAmount !== undefined 
        ? initialRecord.freightAmount 
        : (tType === 'hired' ? (parseFloat(fRate) * qVal) : 0);
      setFreightAmount(initialFrAmt ? String(initialFrAmt) : '0');
      setExtraFee(fRate);

      setTotalAmount(initialRecord.totalAmount ? String(initialRecord.totalAmount) : String(initialMatAmt + initialFrAmt));
      setPaidMaterial(initialRecord.paidMaterial ? String(initialRecord.paidMaterial) : '');
      setPaidFreight(initialRecord.paidFreight ? String(initialRecord.paidFreight) : '');
      setPaidAmount(initialRecord.paidAmount ? String(initialRecord.paidAmount) : '0');
      setWorkStructure(initialRecord.workStructure !== '-' ? initialRecord.workStructure : '');
      setRemark(initialRecord.remark !== '-' ? initialRecord.remark : '');
    } else {
      // Default new record
      const today = new Date();
      const thaiYear = today.getFullYear() + 543;
      const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${thaiYear}`;
      
      setCategory('หินโรงโม่และขนส่ง');
      setDate(formattedDate);
      setPoNo('');
      setTicketNo('');
      setRrNo('');
      setVendor('');
      setQuarry('');
      setTruckNo('');
      setDescription('');
      setSpec('');
      setGrossWt('');
      setTareWt('');
      setNetWt('');

      setDestDate('');
      setDestTicketNo('');
      setDestGrossWt('');
      setDestTareWt('');
      setDestNetWt('');

      setQty('1');
      setUnit('ตัน');
      setPricePerUnit('');
      setMaterialAmount('0');

      setTransportType('self');
      setHaulerName('');
      setFreightRate('0');
      setFreightFeeType('per_unit');
      setFreightAmount('0');
      setExtraFee('0');

      setTotalAmount('0');
      setPaidMaterial('0');
      setPaidFreight('0');
      setPaidAmount('0');
      setWorkStructure('');
      setRemark('');
    }
  }, [initialRecord, isOpen]);

  if (!isOpen) return null;

  // Category switch helper
  const handleCategoryChange = (newCat: ProductCategory) => {
    setCategory(newCat);
    if (!initialRecord) {
      if (newCat === 'เหล็ก/วัสดุ') setUnit('เส้น');
      else if (newCat === 'คอนกรีต') setUnit('คิว');
      else if (newCat === 'เสาเข็ม') setUnit('ต้น');
      else if (newCat === 'หินโรงโม่และขนส่ง' || newCat === 'หินโรงโม่' || newCat === 'หินคลุก/ขนส่ง') setUnit('ตัน');
      else setUnit('รายการ');
    }
  };

  // Weight auto-calculation
  const handleGrossChange = (val: string) => {
    setGrossWt(val);
    const g = parseFloat(val) || 0;
    const t = parseFloat(tareWt) || 0;
    if (g > 0) {
      const net = Math.max(0, g - t);
      setNetWt(net.toFixed(2));
      if (category === 'หินโรงโม่และขนส่ง' || category === 'หินโรงโม่' || category === 'หินคลุก/ขนส่ง') {
        setQty(net.toFixed(2));
        setUnit('ตัน');
        recalcAll(net, parseFloat(pricePerUnit) || 0, transportType, parseFloat(freightRate) || 0, freightFeeType);
      }
    }
  };

  const handleTareChange = (val: string) => {
    setTareWt(val);
    const g = parseFloat(grossWt) || 0;
    const t = parseFloat(val) || 0;
    if (g > 0) {
      const net = Math.max(0, g - t);
      setNetWt(net.toFixed(2));
      if (category === 'หินโรงโม่และขนส่ง' || category === 'หินโรงโม่' || category === 'หินคลุก/ขนส่ง') {
        setQty(net.toFixed(2));
        setUnit('ตัน');
        recalcAll(net, parseFloat(pricePerUnit) || 0, transportType, parseFloat(freightRate) || 0, freightFeeType);
      }
    }
  };

  // Destination Scale Weight Handlers
  const handleDestGrossChange = (val: string) => {
    setDestGrossWt(val);
    const dg = parseFloat(val) || 0;
    const dt = parseFloat(destTareWt) || 0;
    if (dg > 0) {
      const dnet = Math.max(0, dg - dt);
      setDestNetWt(dnet.toFixed(2));
    }
  };

  const handleDestTareChange = (val: string) => {
    setDestTareWt(val);
    const dg = parseFloat(destGrossWt) || 0;
    const dt = parseFloat(val) || 0;
    if (dg > 0) {
      const dnet = Math.max(0, dg - dt);
      setDestNetWt(dnet.toFixed(2));
    }
  };

  const recalcAll = (
    newQty: number,
    newPrice: number,
    tType: 'self' | 'hired',
    fRate: number,
    fFeeType: 'per_unit' | 'flat'
  ) => {
    const matAmt = newQty * newPrice;
    setMaterialAmount(matAmt.toFixed(2));

    let frAmt = 0;
    if (tType === 'hired') {
      frAmt = fFeeType === 'per_unit' ? newQty * fRate : fRate;
    }
    setFreightAmount(frAmt.toFixed(2));
    setTotalAmount((matAmt + frAmt).toFixed(2));
  };

  const handleQtyChange = (val: string) => {
    setQty(val);
    recalcAll(
      parseFloat(val) || 0,
      parseFloat(pricePerUnit) || 0,
      transportType,
      parseFloat(freightRate) || 0,
      freightFeeType
    );
  };

  const handlePriceChange = (val: string) => {
    setPricePerUnit(val);
    recalcAll(
      parseFloat(qty) || 0,
      parseFloat(val) || 0,
      transportType,
      parseFloat(freightRate) || 0,
      freightFeeType
    );
  };

  const handleTransportTypeChange = (tType: 'self' | 'hired') => {
    setTransportType(tType);
    recalcAll(
      parseFloat(qty) || 0,
      parseFloat(pricePerUnit) || 0,
      tType,
      parseFloat(freightRate) || 0,
      freightFeeType
    );
  };

  const handleFreightRateChange = (val: string) => {
    setFreightRate(val);
    setExtraFee(val);
    recalcAll(
      parseFloat(qty) || 0,
      parseFloat(pricePerUnit) || 0,
      transportType,
      parseFloat(val) || 0,
      freightFeeType
    );
  };

  const handleFreightFeeTypeChange = (fFeeType: 'per_unit' | 'flat') => {
    setFreightFeeType(fFeeType);
    recalcAll(
      parseFloat(qty) || 0,
      parseFloat(pricePerUnit) || 0,
      transportType,
      parseFloat(freightRate) || 0,
      fFeeType
    );
  };

  const handlePaidMaterialChange = (val: string) => {
    setPaidMaterial(val);
    const pMat = parseFloat(val) || 0;
    const pFr = parseFloat(paidFreight) || 0;
    setPaidAmount((pMat + pFr).toFixed(2));
  };

  const handlePaidFreightChange = (val: string) => {
    setPaidFreight(val);
    const pMat = parseFloat(paidMaterial) || 0;
    const pFr = parseFloat(val) || 0;
    setPaidAmount((pMat + pFr).toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const g = parseFloat(grossWt) || 0;
    const t = parseFloat(tareWt) || 0;
    const n = parseFloat(netWt) || (g > 0 ? Math.max(0, g - t) : 0);

    const dg = parseFloat(destGrossWt) || 0;
    const dt = parseFloat(destTareWt) || 0;
    const dn = parseFloat(destNetWt) || (dg > 0 ? Math.max(0, dg - dt) : 0);
    const diffKg = (dn > 0 && n > 0) ? Math.round((dn - n) * 1000) : undefined;

    const q = parseFloat(qty) || 0;
    const p = parseFloat(pricePerUnit) || 0;
    const matAmt = parseFloat(materialAmount) || (q * p);
    const fRate = parseFloat(freightRate) || 0;
    const frAmt = transportType === 'hired'
      ? (parseFloat(freightAmount) || (freightFeeType === 'per_unit' ? q * fRate : fRate))
      : 0;
    const total = parseFloat(totalAmount) || (matAmt + frAmt);

    const pMat = parseFloat(paidMaterial) || 0;
    const pFr = parseFloat(paidFreight) || 0;
    const paid = parseFloat(paidAmount) || (pMat + pFr);

    const record: ConstructionLogRecord = {
      id: initialRecord?.id || `R${Date.now()}`,
      category,
      date: date.trim() || '-',
      poNo: poNo.trim() || '-',
      ticketNo: ticketNo.trim() || '-',
      rrNo: rrNo.trim() || '-',
      vendor: vendor.trim() || '-',
      quarry: quarry.trim() || '-',
      truckNo: truckNo.trim() || '-',
      description: description.trim() || '-',
      spec: spec.trim() || '-',
      grossWt: g,
      tareWt: t,
      netWt: n,
      destDate: destDate.trim() || date.trim() || '-',
      destTicketNo: destTicketNo.trim() || '-',
      destGrossWt: dg,
      destTareWt: dt,
      destNetWt: dn,
      weightDiffKg: diffKg,
      qty: q,
      unit: unit.trim() || 'ตัน',
      pricePerUnit: p,
      materialAmount: matAmt,
      transportType,
      haulerName: transportType === 'hired' 
        ? (haulerName.trim() || vendor.trim() || '-') 
        : (haulerName.trim() || 'รถบริษัท (วิ่งเอง)'),
      freightRate: transportType === 'hired' ? fRate : 0,
      freightFeeType,
      freightAmount: frAmt,
      extraFee: transportType === 'hired' ? fRate : 0,
      totalAmount: total,
      paidMaterial: pMat,
      paidFreight: pFr,
      paidAmount: paid,
      workStructure: workStructure.trim() || '-',
      remark: remark.trim() || '-',
      updatedAt: new Date().toISOString()
    };

    onSave(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-100 text-slate-800 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            {initialRecord ? `แก้ไขรายการบันทึก (${initialRecord.id})` : 'บันทึกข้อมูลรายการใหม่ลง Master Table'}
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Section 1: ข้อมูลหลัก & เอกสาร */}
          <div className="border border-blue-100 bg-blue-50/30 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 uppercase tracking-wide">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>1. ข้อมูลเอกสาร & หมวดหมู่</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">หมวดหมู่รายการ *</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as ProductCategory)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="เหล็ก/วัสดุ">เหล็ก / วัสดุสั่งซื้อ (ใบสั่งซื้อ PO)</option>
                  <option value="คอนกรีต">คอนกรีตผสมเสร็จ (ใบส่งของ/ตั๋วคอนกรีต)</option>
                  <option value="เสาเข็ม">เสาเข็ม & ค่าตอก (ใบเสนอราคา / RR)</option>
                  <option value="หินโรงโม่และขนส่ง">หินโรงโม่และขนส่ง (ตั๋วชั่ง / หินคลุก / ค่าบรรทุก)</option>
                  <option value="ทั่วไป/อื่นๆ">ทั่วไป / อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">วัน/เดือน/ปี *</label>
                <input
                  type="text"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="เช่น 28/10/2568 หรือ 16/3/2569"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">เลขที่ใบสั่งซื้อ (PO)</label>
                <input
                  type="text"
                  value={poNo}
                  onChange={(e) => setPoNo(e.target.value)}
                  placeholder="PO6800178"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">เลขใบจ่ายสินค้า / ตั๋วชั่ง</label>
                <input
                  type="text"
                  value={ticketNo}
                  onChange={(e) => setTicketNo(e.target.value)}
                  placeholder="1264000460 หรือ 69022/00041"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono-numbers"
                />
              </div>
            </div>
          </div>

          {/* Section 2: สถานที่, ผู้รับเหมา & รถขนส่ง */}
          <div className="border border-purple-100 bg-purple-50/20 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 uppercase tracking-wide">
              <Truck className="w-4 h-4 text-purple-600" />
              <span>2. สถานที่ ผู้รับเหมา & การขนส่ง</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ผู้รับเหมา / บริษัท</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="ช.หน่อง / บุรีรัมย์ธงชัย"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">โรงโม่ / ชื่อกิจการ</label>
                <input
                  type="text"
                  value={quarry}
                  onChange={(e) => setQuarry(e.target.value)}
                  placeholder="โรงโม่รุ่งนคร / ยั่งยืน"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ชุด / ทะเบียนรถ</label>
                <input
                  type="text"
                  value={truckNo}
                  onChange={(e) => setTruckNo(e.target.value)}
                  placeholder="84-3288 (พี่น้อย)"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">เลขใบเสนอราคา / RR</label>
                <input
                  type="text"
                  value={rrNo}
                  onChange={(e) => setRrNo(e.target.value)}
                  placeholder="RR6811089"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono-numbers"
                />
              </div>
            </div>
          </div>

          {/* Section 3: รายละเอียดสินค้า & ชั่งน้ำหนัก */}
          <div className="border border-amber-200 bg-amber-50/30 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wide">
              <Scale className="w-4 h-4 text-amber-700" />
              <span>3. รายละเอียดสินค้า & ชั่งน้ำหนัก (ตัน)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">รายละเอียด / รายการสินค้า *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="เหล็กข้ออ้อย 25 มม. / คอนกรีตผสมเสร็จ / หินเบอร์ 1/2"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">สเปก / รหัสสินค้า / Strength</label>
                <input
                  type="text"
                  value={spec}
                  onChange={(e) => setSpec(e.target.value)}
                  placeholder="SD40TATA / ZBDQ3P412B (สิน)"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono-numbers"
                />
              </div>
            </div>

            {/* Origin & Destination Weighing Section */}
            <div className="space-y-3">
              {/* Origin Scale (ต้นทาง) */}
              <div className="bg-amber-100/40 p-3 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>ใบชั่งน้ำหนักต้นทาง (โรงโม่ / ท่าทราย)</span>
                  <span className="text-[11px] font-normal text-amber-800">
                    เลขตั๋วต้นทาง: {ticketNo || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-amber-900 mb-1">รถหนักต้นทาง (ตัน)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={grossWt}
                      onChange={(e) => handleGrossChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono-numbers"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-amber-900 mb-1">รถเบาต้นทาง (ตัน)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tareWt}
                      onChange={(e) => handleTareChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono-numbers"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1">สุทธิต้นทาง (ตัน)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={netWt}
                      onChange={(e) => setNetWt(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs p-2 bg-amber-200/70 border border-amber-300 font-bold text-amber-950 rounded-lg font-mono-numbers"
                    />
                  </div>
                </div>
              </div>

              {/* Destination Scale (ปลายทาง / หน้างาน) */}
              <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                  <span>ใบชั่งน้ำหนักปลายทาง (ชั่งหน้างาน / ตรวจรับไซต์งาน)</span>
                  <span className="text-[11px] font-normal text-sky-800">
                    สำหรับเทียบน้ำหนัก ขาด-เกิน
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-sky-900 mb-1">วันที่ชั่งปลายทาง</label>
                    <input
                      type="text"
                      value={destDate}
                      onChange={(e) => setDestDate(e.target.value)}
                      placeholder="เช่น วันเดียวกับต้นทาง หรือ 17/3/2569"
                      className="w-full text-xs p-2 bg-white border border-sky-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono-numbers"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-sky-900 mb-1">เลขที่บิล / ตั๋วชั่งปลายทาง</label>
                    <input
                      type="text"
                      value={destTicketNo}
                      onChange={(e) => setDestTicketNo(e.target.value)}
                      placeholder="เช่น DS-001 หรือ ตั๋วหน้างาน"
                      className="w-full text-xs p-2 bg-white border border-sky-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono-numbers"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-sky-900 mb-1">รถหนักปลายทาง (ตัน)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={destGrossWt}
                      onChange={(e) => handleDestGrossChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs p-2 bg-white border border-sky-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono-numbers"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-sky-900 mb-1">รถเบาปลายทาง (ตัน)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={destTareWt}
                      onChange={(e) => handleDestTareChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs p-2 bg-white border border-sky-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono-numbers"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-sky-950 mb-1">สุทธิปลายทาง (ตัน)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={destNetWt}
                      onChange={(e) => setDestNetWt(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs p-2 bg-sky-100 border border-sky-300 font-bold text-sky-950 rounded-lg font-mono-numbers"
                    />
                  </div>
                </div>
              </div>

              {/* Weight Discrepancy Comparison Bar */}
              {parseFloat(netWt) > 0 && parseFloat(destNetWt) > 0 && (
                <div className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                  parseFloat(destNetWt) < parseFloat(netWt)
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : parseFloat(destNetWt) > parseFloat(netWt)
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">ผลต่างน้ำหนัก (ปลายทาง เทียบ ต้นทาง):</span>
                    <span className="font-mono-numbers font-semibold">
                      {parseFloat(destNetWt).toFixed(2)} - {parseFloat(netWt).toFixed(2)} = {(parseFloat(destNetWt) - parseFloat(netWt)).toFixed(2)} ตัน
                    </span>
                  </div>

                  <div className="font-bold font-mono-numbers">
                    {parseFloat(destNetWt) < parseFloat(netWt) ? (
                      <span className="text-rose-600 bg-rose-100 px-2.5 py-1 rounded-md">
                        น้ำหนักขาด: {Math.abs(Math.round((parseFloat(destNetWt) - parseFloat(netWt)) * 1000)).toLocaleString()} กก.
                      </span>
                    ) : parseFloat(destNetWt) > parseFloat(netWt) ? (
                      <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                        น้ำหนักเกิน: +{Math.round((parseFloat(destNetWt) - parseFloat(netWt)) * 1000).toLocaleString()} กก.
                      </span>
                    ) : (
                      <span className="text-slate-600 bg-slate-200 px-2.5 py-1 rounded-md">
                        น้ำหนักตรงกันพอดี (0 กก.)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: การเงินแยก 2 ส่วน (ราคาหิน & ค่าบรรทุก) */}
          <div className="border border-slate-200 bg-white p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>4. การเงินแยก 2 ส่วน: ราคาหิน และ ค่าจ้างบรรทุก</span>
              </div>
              <span className="text-[11px] text-slate-500">
                แยกบัญชีจ่ายโรงโม่ และ จ่ายรถขนส่ง
              </span>
            </div>

            {/* ส่วนที่ 1: ค่าหิน / ค่าวัสดุ (จ่ายโรงโม่) */}
            <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  ส่วนที่ 1: ราคาหิน / ค่าวัสดุ (จ่ายโรงโม่ / ร้านค้า)
                </span>
                <span className="text-[11px] font-semibold text-amber-800">
                  รวมค่าหิน: {(parseFloat(materialAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-amber-900 mb-1">ปริมาณ / จำนวน *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={qty}
                    onChange={(e) => handleQtyChange(e.target.value)}
                    placeholder="1"
                    className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-amber-900 mb-1">หน่วย *</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="ตัน / คิว / เส้น"
                    className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-amber-900 mb-1">ราคาหิน/หน่วย (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pricePerUnit}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">รวมเงินค่าหิน (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialAmount}
                    onChange={(e) => {
                      setMaterialAmount(e.target.value);
                      const m = parseFloat(e.target.value) || 0;
                      const f = parseFloat(freightAmount) || 0;
                      setTotalAmount((m + f).toFixed(2));
                    }}
                    placeholder="0.00"
                    className="w-full text-xs p-2 bg-amber-100 border border-amber-300 font-bold text-amber-950 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>
            </div>

            {/* ส่วนที่ 2: ค่าบรรทุก / ขนส่ง (Hauling / Freight) */}
            <div className="bg-sky-50/50 p-3.5 rounded-xl border border-sky-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-sky-950">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  ส่วนที่ 2: ค่าบรรทุก / ขนส่ง (จ่ายคนขับ / รถรับจ้าง)
                </span>
                
                {/* ปุ่มเลือกประเภทขนส่ง: วิ่งหินเอง vs จ้างรถขน */}
                <div className="inline-flex rounded-lg border border-sky-300 p-0.5 bg-white text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleTransportTypeChange('self')}
                    className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                      transportType === 'self'
                        ? 'bg-sky-600 text-white shadow-xs font-bold'
                        : 'text-sky-800 hover:bg-sky-50'
                    }`}
                  >
                    🚗 วิ่งหินเอง (จ่ายแค่ค่าหิน)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransportTypeChange('hired')}
                    className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                      transportType === 'hired'
                        ? 'bg-sky-600 text-white shadow-xs font-bold'
                        : 'text-sky-800 hover:bg-sky-50'
                    }`}
                  >
                    🚛 จ้างรถขน (จ่ายค่าบรรทุก)
                  </button>
                </div>
              </div>

              {transportType === 'self' ? (
                <div className="p-3 bg-white/80 rounded-lg border border-sky-100 flex items-center justify-between text-xs text-sky-800">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏢</span>
                    <span><strong>วิ่งหินเอง / รถบริษัท / มารับเอง</strong>: ไม่คิดค่าจ้างบรรทุก (ค่าบรรทุก = 0.00 บาท) จ่ายเฉพาะค่าหินโรงโม่</span>
                  </div>
                  <span className="font-bold text-sky-900 bg-sky-100 px-2 py-0.5 rounded font-mono-numbers">
                    ค่าบรรทุก: 0.00 บาท
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-sky-900 mb-1">ผู้รับจ้างขนส่ง / ทะเบียนรถ</label>
                    <input
                      type="text"
                      value={haulerName}
                      onChange={(e) => setHaulerName(e.target.value)}
                      placeholder="เช่น พี่น้อย, รถร่วม 82-4278"
                      className="w-full text-xs p-2 bg-white border border-sky-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-sky-900 mb-1">การคิดค่าบรรทุก</label>
                    <select
                      value={freightFeeType}
                      onChange={(e) => handleFreightFeeTypeChange(e.target.value as 'per_unit' | 'flat')}
                      className="w-full text-xs p-2 bg-white border border-sky-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-medium text-sky-950"
                    >
                      <option value="per_unit">ตามน้ำหนัก (บาท/ตัน)</option>
                      <option value="flat">เหมาต่อเที่ยว (บาท)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-sky-900 mb-1">
                      {freightFeeType === 'per_unit' ? 'ค่าบรรทุก/ตัน (บาท)' : 'ค่าบรรทุกเหมาเที่ยว (บาท)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={freightRate}
                      onChange={(e) => handleFreightRateChange(e.target.value)}
                      placeholder="เช่น 65.00"
                      className="w-full text-xs p-2 bg-white border border-sky-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono-numbers"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-sky-950 mb-1">รวมเงินค่าบรรทุก (บาท)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={freightAmount}
                      onChange={(e) => {
                        setFreightAmount(e.target.value);
                        const m = parseFloat(materialAmount) || 0;
                        const f = parseFloat(e.target.value) || 0;
                        setTotalAmount((m + f).toFixed(2));
                      }}
                      placeholder="0.00"
                      className="w-full text-xs p-2 bg-sky-100 border border-sky-300 font-bold text-sky-950 rounded-lg font-mono-numbers"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ส่วนที่ 3: สรุปยอดรวมทั้งสิ้น & ชำระเงินแยก 2 ส่วน */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  การชำระเงิน (แยกจ่ายให้ผู้ขาย และ ผู้รับจ้างขน)
                </span>
                <span className="text-[11px] text-slate-500">
                  บันทึกแยกยอดชำระของโรงโม่ และ รถขนส่ง
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. ชำระให้ผู้ขาย (ค่าหิน) */}
                <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      1. ชำระให้ผู้ขาย (โรงโม่/ร้านค้า)
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePaidMaterialChange(materialAmount)}
                      className="text-[10px] px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-semibold transition-colors"
                    >
                      จ่ายครบเต็มจำนวน
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-amber-900 mb-1">ชำระค่าหินแล้ว (บาท)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paidMaterial}
                      onChange={(e) => handlePaidMaterialChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono-numbers"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 text-amber-900">
                    <span>ยอดค่าหิน: {(parseFloat(materialAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บ.</span>
                    <span className={`font-semibold ${
                      (parseFloat(materialAmount) || 0) - (parseFloat(paidMaterial) || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}>
                      ค้างจ่ายผู้ขาย: {Math.max(0, (parseFloat(materialAmount) || 0) - (parseFloat(paidMaterial) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บ.
                    </span>
                  </div>
                </div>

                {/* 2. ชำระให้ผู้รับจ้างขน */}
                <div className="bg-sky-50/70 p-3 rounded-lg border border-sky-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      2. ชำระให้ผู้รับจ้างขน (ค่าบรรทุก)
                    </span>
                    {transportType === 'hired' && (
                      <button
                        type="button"
                        onClick={() => handlePaidFreightChange(freightAmount)}
                        className="text-[10px] px-2 py-0.5 bg-sky-200 hover:bg-sky-300 text-sky-900 rounded font-semibold transition-colors"
                      >
                        จ่ายครบเต็มจำนวน
                      </button>
                    )}
                  </div>
                  {transportType === 'self' ? (
                    <div className="text-xs text-sky-800 py-3.5 text-center bg-white/70 rounded-lg border border-sky-100 font-medium">
                      🚗 วิ่งหินเอง (ไม่มีค่าจ้างบรรทุกที่ต้องจ่าย)
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] font-medium text-sky-900 mb-1">
                          ชำระค่าบรรทุกแล้ว ({haulerName || 'รถร่วม'}) (บาท)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={paidFreight}
                          onChange={(e) => handlePaidFreightChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full text-xs p-2 bg-white border border-sky-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono-numbers"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 text-sky-900">
                        <span>ยอดค่าขน: {(parseFloat(freightAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บ.</span>
                        <span className={`font-semibold ${
                          (parseFloat(freightAmount) || 0) - (parseFloat(paidFreight) || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}>
                          ค้างจ่ายค่าขน: {Math.max(0, (parseFloat(freightAmount) || 0) - (parseFloat(paidFreight) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บ.
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* สรุปรวมทั้ง 2 ส่วน */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center pt-1 border-t border-slate-200/80">
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-blue-900">รวมเงินทั้งสิ้น (ค่าหิน + ค่าขน)</div>
                  <div className="text-base font-bold text-blue-950 font-mono-numbers mt-0.5">
                    {(parseFloat(totalAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">บาท</span>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-emerald-900">รวมชำระแล้วทั้งหมด</div>
                  <div className="text-base font-bold text-emerald-800 font-mono-numbers mt-0.5">
                    {(parseFloat(paidAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">บาท</span>
                  </div>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-slate-600">คงค้างชำระสุทธิรวม</div>
                  <div className={`text-base font-bold font-mono-numbers mt-0.5 ${
                    (parseFloat(totalAmount) || 0) - (parseFloat(paidAmount) || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {((parseFloat(totalAmount) || 0) - (parseFloat(paidAmount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">บาท</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-200/80">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">โครงสร้างงาน / กม. / โครงการ</label>
                  <input
                    type="text"
                    value={workStructure}
                    onChange={(e) => setWorkStructure(e.target.value)}
                    placeholder="เทงานสะพาน กม.202+018"
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">หมายเหตุ</label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="เช่น เทียบน้ำหนัก ขาด 230 กก."
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{initialRecord ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลลงตาราง'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

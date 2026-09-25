export type ProductCategory = 
  | 'เหล็ก/วัสดุ' 
  | 'คอนกรีต' 
  | 'เสาเข็ม' 
  | 'หินโรงโม่และขนส่ง'
  | 'ทั่วไป/อื่นๆ'
  | string;

// ประเภทเอกสารรอจับคู่ (PO, RR, ตั๋วชั่งปลายทาง)
export type PendingDocType = 'PO' | 'RR' | 'DEST_TICKET';

export interface PendingDocument {
  id: string;
  docType: PendingDocType;
  docNo: string;               // เช่น "PO6800178", "RR6811089", "TK-DEST-8891"
  date: string;                // วันที่เอกสาร เช่น "1/12/2568"
  truckNo?: string;            // ทะเบียนรถ (ถ้ามี)
  vendorOrQuarry?: string;     // ผู้ขาย / โรงโม่ / ผู้ตรวจรับ
  description?: string;        // รายละเอียด / หมายเหตุ
  
  // ข้อมูลเฉพาะตามประเภท
  poAmount?: number;           // ยอดเงินตาม PO (ถ้ามี)
  poItems?: string[];          // รายการสินค้าใน PO
  
  // กรณีตั๋วปลายทาง
  destGrossWt?: number;        // รถหนักปลายทาง (ตัน)
  destTareWt?: number;         // รถเบาปลายทาง (ตัน)
  destNetWt?: number;          // น้ำหนักสุทธิปลายทาง (ตัน)
  
  // สถานะการจับคู่
  status: 'pending' | 'matched';
  matchedRecordId?: string;    // ID ของแถวในตารางหลักที่ชนบิลด้วย
  matchedTicketNo?: string;    // เลขตั๋วต้นทางที่ผูก
  matchedAt?: string;          // วันเวลาที่ทำการชนบิล
  source?: 'manual' | 'line_bot' | 'import';
  imageUrl?: string;           // รูปถ่ายบิล (ถ้ามี)
}

export interface ConstructionLogRecord {
  id: string;
  // Internal System Document ID (เลขที่เอกสารรันอัตโนมัติภายในระบบ เพื่ออ้างอิงถาวร)
  internalDocNo?: string;      // เช่น "DOC-2509-0001", "DOC-2509-0002"
  billImageUrl?: string;       // ภาพถ่ายบิลจริง / ใบชั่ง สำหรับตรวจสอบหรือเปรียบเทียบ

  // Group 1: ข้อมูลวันที่ & เอกสาร
  category: ProductCategory;
  poNo: string;            // เช่น "PO6800178"
  rrNo: string;            // เช่น "RR6811089"
  date: string;            // เช่น "1/12/2568"
  ticketNo: string;        // เช่น "1264000460"

  // Group 2: สถานที่ & ขนส่ง
  vendor: string;          // ผู้รับเหมา / บริษัท เช่น "ช.หน่อง"
  quarry: string;          // โรงโม่ / แหล่งผลิต เช่น "โรงโม่ยั่งยืน"
  truckNo: string;         // ทะเบียนรถ / ชุดรถ เช่น "84-3288 (พี่น้อย)"

  // Group 3: รายละเอียดสินค้า
  description: string;     // เช่น "เหล็กข้ออ้อย 25 มม. 10 ม."
  spec: string;            // เช่น "SD40TATA", "ZBDQ3P412B"

  // Group 4: น้ำหนักชั่งต้นทาง (ตัน)
  grossWt: number;         // รถหนักต้นทาง
  tareWt: number;          // รถเบาต้นทาง
  netWt: number;           // สุทธิかんต้นทาง (grossWt - tareWt)

  // Group 4.2: ใบชั่งน้ำหนักปลายทาง / หน้างาน (Destination Scale)
  destDate?: string;       // วันที่ชั่งปลายทาง / วันที่รับเข้าหน้างาน
  destTicketNo?: string;   // เลขตั๋วชั่งปลายทาง
  destGrossWt?: number;    // รถหนักปลายทาง (ตัน)
  destTareWt?: number;     // รถเบาปลายทาง (ตัน)
  destNetWt?: number;      // สุทธิかんปลายทาง (destGrossWt - destTareWt)
  weightDiffKg?: number;   // ผลต่างน้ำหนัก (กก.) = (destNetWt - netWt) * 1000

  // Group 5: ราคาหิน/วัสดุ & ค่าบรรทุกขนส่ง (แยก 2 ส่วน)
  qty: number;             // ปริมาณ (เช่น 57.69 ตัน)
  unit: string;            // เส้น, คิว, ต้น, ตัน, แผ่น, กก.
  pricePerUnit: number;    // ราคาหินต่อหน่วย (บาท)
  materialAmount?: number; // รวมเงินค่าหิน = qty * pricePerUnit

  // ส่วนค่าบรรทุก/ขนส่ง
  transportType?: 'self' | 'hired'; // 'self' = วิ่งหินเอง (จ่ายแค่ค่าหิน), 'hired' = จ้างรถขนส่ง (จ่ายค่าจ้างบรรทุก)
  haulerName?: string;             // ผู้รับจ้างขนส่ง เช่น "พี่น้อย", "รถร่วม"
  freightRate?: number;            // ค่าบรรทุกต่อตัน (บาท) เช่น 65.00
  freightFeeType?: 'per_unit' | 'flat'; // 'per_unit' = ต่อตัน/ต่อหน่วย, 'flat' = เหมาเที่ยว
  freightAmount?: number;          // รวมเงินค่าบรรทุก (บาท)
  extraFee: number;                // ค่าบรรทุกต่อหน่วยเดิม (backward compatibility)
  totalAmount: number;     // รวมเงินทั้งสิ้น = (materialAmount + freightAmount)

  // รูปแบบการชำระเงิน (3 รูปแบบหลักสำหรับงานหินและขนส่ง)
  // 'split' = จ่ายแยก (ผู้ขาย: ค่าสินค้า, ผู้รับจ้างขน: ค่าขนส่ง)
  // 'hauler_all' = จ่ายให้ผู้รับจ้างขน (ค่าสินค้า + ค่าขนส่ง)
  // 'seller_all' = จ่ายให้ผู้ขาย (ค่าสินค้า + ค่าขนส่ง)
  paymentRecipientType?: 'split' | 'hauler_all' | 'seller_all';

  // Group 6: การเงิน & สถานะการชำระเงินแยกส่วน
  paidMaterial?: number;   // ชำระให้ผู้ขายแล้ว (ค่าสินค้า)
  paidFreight?: number;    // ชำระให้ผู้รับจ้างขนแล้ว (ค่าบรรทุก)
  paidAmount: number;      // ยอดที่ชำระแล้วรวม (paidMaterial + paidFreight หรือยอดรวมที่ชำระ)
  workStructure: string;   // โครงสร้างงาน / กม. / โครงการ เช่น "สะพาน กม.202+018"
  remark: string;          // หมายเหตุ
  
  // Dynamic custom tags or experimental fields
  updatedAt?: string;
  inspectorName?: string;  // ผู้ตรวจรับหน้างาน (ฟิลด์เสริมที่ผู้ใช้อาจทดลอง)
}

export interface ColumnVisibilityState {
  internalDocNo?: boolean;
  category: boolean;
  date: boolean;
  poNo: boolean;
  ticketNo: boolean;
  rrNo: boolean;
  vendor: boolean;
  quarry: boolean;
  truckNo: boolean;
  description: boolean;
  spec: boolean;
  grossWt: boolean;
  tareWt: boolean;
  netWt: boolean;
  destDate?: boolean;
  destTicketNo?: boolean;
  destGrossWt?: boolean;
  destTareWt?: boolean;
  destNetWt?: boolean;
  weightDiff?: boolean;
  qty: boolean;
  unit: boolean;
  pricePerUnit: boolean;
  materialAmount?: boolean;
  transportType?: boolean;
  haulerName?: boolean;
  freightRate?: boolean;
  freightAmount?: boolean;
  extraFee: boolean;
  totalAmount: boolean;
  paymentRecipientType?: boolean;
  paidMaterial?: boolean;
  materialBalance?: boolean;
  paidFreight?: boolean;
  freightBalance?: boolean;
  paidAmount: boolean;
  balance: boolean;
  workStructure: boolean;
  remark: boolean;
}

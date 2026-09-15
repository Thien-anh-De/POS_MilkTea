// ============================================================
// POS Molliee — Thermal Receipt Print Utility
// Generates clean, printer-ready HTML and prints via isolated iframe
// ============================================================

import { printerService, type PrinterSettings } from '@/services/printerService'
import { formatCurrency, formatDateTime } from '@/utils/helpers'

export interface PrintableOrderItem {
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  note?: string
}

export interface PrintableOrder {
  invoice_number?: string
  table_name: string
  cashier_name?: string
  created_at?: string
  items: PrintableOrderItem[]
  subtotal: number
  discount: number
  total: number
  payment_method?: 'CASH' | 'BANK_TRANSFER' | string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Sinh mã HTML cho một liên hóa đơn
 */
export function generateReceiptHtml(
  order: PrintableOrder,
  settings: PrinterSettings,
  isPreBill: boolean = false,
  copyLabel?: string
): string {
  const isK58 = settings.paperSize === 'K58'
  const fontScale = settings.fontScale || 'standard'

  // K58 độ rộng đầu in nhiệt thực tế là 48mm (384 dots); K80 là ~70mm.
  // Đặt lề an toàn để máy in bill không bao giờ bị cắt mép chữ bên phải.
  let paperWidth = isK58 ? '48mm' : '70mm'
  if (fontScale === 'compact') {
    paperWidth = isK58 ? '46mm' : '68mm'
  } else if (fontScale === 'large') {
    paperWidth = isK58 ? '50mm' : '72mm'
  }

  // Cỡ chữ được tinh chỉnh giảm gọn gàng để bill thoáng và không tràn dòng
  let fontSize = isK58 ? '9.5px' : '11px'
  let storeSize = isK58 ? '13.5px' : '16px'
  let titleSize = isK58 ? '12px' : '13.5px'
  let totalSize = isK58 ? '12.5px' : '14px'
  let metaSize = isK58 ? '9px' : '10px'
  let noteSize = isK58 ? '8px' : '9px'
  let priceSize = isK58 ? '9px' : '10.5px'

  if (fontScale === 'compact') {
    fontSize = isK58 ? '8.5px' : '10px'
    storeSize = isK58 ? '12px' : '14.5px'
    titleSize = isK58 ? '11px' : '12.5px'
    totalSize = isK58 ? '11.5px' : '13px'
    metaSize = isK58 ? '8.5px' : '9.5px'
    noteSize = isK58 ? '7.5px' : '8.5px'
    priceSize = isK58 ? '8.5px' : '9.5px'
  } else if (fontScale === 'large') {
    fontSize = isK58 ? '10.5px' : '12px'
    storeSize = isK58 ? '15px' : '17.5px'
    titleSize = isK58 ? '13px' : '15px'
    totalSize = isK58 ? '13.5px' : '15.5px'
    metaSize = isK58 ? '9.5px' : '11px'
    noteSize = isK58 ? '8.5px' : '9.5px'
    priceSize = isK58 ? '9.5px' : '11px'
  }

  // Tỷ lệ độ rộng các cột bảng món (cố định để không tràn bill)
  const qtyWidth = isK58 ? '18px' : '22px'
  const unitPriceWidth = isK58 ? '40px' : '48px'
  const totalPriceWidth = isK58 ? '46px' : '56px'

  const methodLabel: Record<string, string> = {
    CASH: 'Tiền mặt',
    BANK_TRANSFER: 'Chuyển khoản',
  }

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 2px 2px 2px 0; font-weight: 500; word-break: break-word; overflow-wrap: break-word; vertical-align: top;">
          <div>${escapeHtml(item.product_name)}</div>
          ${item.note ? `<div style="font-size: ${noteSize}; color: #333; font-style: italic; padding-left: 2px; margin-top: 1px;">&bull; ${escapeHtml(item.note)}</div>` : ''}
        </td>
        <td style="padding: 2px 0; text-align: center; white-space: nowrap; vertical-align: top;">${item.quantity}</td>
        <td style="padding: 2px 0; text-align: right; white-space: nowrap; vertical-align: top; font-size: ${priceSize};">${formatCurrency(item.unit_price)}</td>
        <td style="padding: 2px 0; text-align: right; font-weight: 600; white-space: nowrap; vertical-align: top; font-size: ${priceSize};">${formatCurrency(item.subtotal)}</td>
      </tr>
    `
    )
    .join('')

  return `
    <div class="receipt" style="
      width: ${paperWidth};
      max-width: ${paperWidth};
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: ${fontSize};
      line-height: 1.3;
      color: #000;
      background: #fff;
      padding: 2px 1.5mm 8px 1.5mm;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: break-word;
    ">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 5px;">
        <div style="font-size: ${storeSize}; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase;">
          ${escapeHtml(settings.shopName)}
        </div>
        ${settings.shopAddress ? `<div style="font-size: ${metaSize}; margin-top: 2px; line-height: 1.25;">${escapeHtml(settings.shopAddress)}</div>` : ''}
        ${settings.shopPhone ? `<div style="font-size: ${metaSize};">Hotline: ${escapeHtml(settings.shopPhone)}</div>` : ''}
      </div>

      <!-- Title -->
      <div style="text-align: center; margin: 6px 0 4px 0;">
        <div style="font-size: ${titleSize}; font-weight: 800; text-transform: uppercase;">
          ${isPreBill ? 'PHIẾU TẠM TÍNH' : 'HÓA ĐƠN THANH TOÁN'}
        </div>
        ${copyLabel ? `<div style="font-size: ${noteSize}; font-style: italic;">(${escapeHtml(copyLabel)})</div>` : ''}
      </div>

      <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>

      <!-- Meta Info -->
      <div style="font-size: ${metaSize}; margin-bottom: 5px;">
        <div style="display: flex; justify-content: space-between; gap: 4px;">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>Bàn:</strong> ${escapeHtml(order.table_name)}</span>
          <span style="white-space: nowrap;"><strong>Mã HĐ:</strong> ${escapeHtml(order.invoice_number || 'Tạm tính')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
          <span><strong>Ngày:</strong> ${formatDateTime(order.created_at || new Date().toISOString())}</span>
        </div>
        ${
          order.cashier_name
            ? `<div style="margin-top: 2px;"><strong>Thu ngân:</strong> ${escapeHtml(order.cashier_name)}</div>`
            : ''
        }
      </div>

      <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: ${fontSize}; table-layout: fixed;">
        <colgroup>
          <col style="width: auto;" />
          <col style="width: ${qtyWidth};" />
          <col style="width: ${unitPriceWidth};" />
          <col style="width: ${totalPriceWidth};" />
        </colgroup>
        <thead>
          <tr style="border-bottom: 1px dashed #000;">
            <th style="text-align: left; padding-bottom: 3px; font-weight: 700;">Món</th>
            <th style="text-align: center; padding-bottom: 3px; font-weight: 700;">SL</th>
            <th style="text-align: right; padding-bottom: 3px; font-weight: 700;">Đ.Giá</th>
            <th style="text-align: right; padding-bottom: 3px; font-weight: 700;">T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>

      <!-- Totals -->
      <div style="margin-top: 4px; font-size: ${fontSize};">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>Tạm tính:</span>
          <span>${formatCurrency(order.subtotal)}</span>
        </div>
        ${
          order.discount > 0
            ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Giảm giá:</span>
            <span>-${formatCurrency(order.discount)}</span>
          </div>
        `
            : ''
        }
        <div style="border-top: 1px solid #000; margin: 3px 0;"></div>
        <div style="display: flex; justify-content: space-between; font-size: ${totalSize}; font-weight: 800;">
          <span>TỔNG TIỀN:</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
        ${
          !isPreBill && order.payment_method
            ? `
          <div style="display: flex; justify-content: space-between; margin-top: 3px; font-size: ${metaSize};">
            <span>Hình thức:</span>
            <span><strong>${methodLabel[order.payment_method] || order.payment_method}</strong></span>
          </div>
        `
            : ''
        }
      </div>

      <div style="border-top: 1px dashed #000; margin: 6px 0 5px 0;"></div>

      <!-- Footer Info -->
      <div style="text-align: center; font-size: ${metaSize}; margin-top: 4px;">
        ${settings.wifi ? `<div style="margin-bottom: 3px; font-size: ${noteSize};">${escapeHtml(settings.wifi)}</div>` : ''}
        <div style="font-weight: 600; margin-bottom: 2px;">${escapeHtml(settings.footerMessage)}</div>
        <div style="font-size: ${noteSize}; color: #666; margin-top: 4px;">
          Powered by POS Molliee
        </div>
      </div>
    </div>
  `
}

/**
 * Thực hiện in hóa đơn ra máy in qua iframe ẩn
 */
export function printReceipt(
  order: PrintableOrder,
  customSettings?: PrinterSettings,
  isPreBill: boolean = false
): void {
  const settings = customSettings || printerService.getSettings()
  const copies = isPreBill ? 1 : Math.max(1, settings.numberOfCopies || 1)

  let fullHtml = ''
  for (let i = 1; i <= copies; i++) {
    const copyLabel = copies > 1 ? (i === 1 ? 'Liên 1: Khách hàng' : 'Liên 2: Quầy pha chế') : undefined
    fullHtml += generateReceiptHtml(order, settings, isPreBill, copyLabel)
    if (i < copies) {
      fullHtml += '<div style="page-break-after: always; height: 16px; border-bottom: 2px dashed #999; margin: 16px 0;"></div>'
    }
  }

  // Tạo hoặc lấy iframe in ẩn
  let iframe = document.getElementById('receipt-print-iframe') as HTMLIFrameElement | null
  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.id = 'receipt-print-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
  }

  const doc = iframe.contentWindow?.document
  if (!doc) {
    window.print()
    return
  }

  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${isPreBill ? 'Tam_Tinh' : 'Hoa_Don'}_${order.invoice_number || 'bill'}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm !important;
          }
          * {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
          }
          .receipt {
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }
        </style>
      </head>
      <body>
        ${fullHtml}
      </body>
    </html>
  `)
  doc.close()

  // Chờ nạp xong nội dung rồi kích hoạt lệnh in
  setTimeout(() => {
    iframe?.contentWindow?.focus()
    iframe?.contentWindow?.print()
  }, 150)
}

/**
 * Đơn hàng mẫu dùng để xem trước và in thử
 */
export const SAMPLE_PRINT_ORDER: PrintableOrder = {
  invoice_number: 'INV-SAMPLE-01',
  table_name: 'Bàn 01',
  cashier_name: 'Thu ngân 1',
  created_at: new Date().toISOString(),
  items: [
    { product_name: 'Cà phê nâu', quantity: 2, unit_price: 30000, subtotal: 60000 },
    { product_name: 'Bạc xỉu', quantity: 1, unit_price: 35000, subtotal: 35000 },
    { product_name: 'Trà đào cam sả', quantity: 1, unit_price: 35000, subtotal: 35000 },
    { product_name: 'Khô gà lá chanh', quantity: 1, unit_price: 30000, subtotal: 30000 },
  ],
  subtotal: 160000,
  discount: 10000,
  total: 150000,
  payment_method: 'CASH',
}

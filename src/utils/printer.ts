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
  const paperWidth = isK58 ? '54mm' : '72mm'
  const fontSize = isK58 ? '11px' : '12px'
  const titleSize = isK58 ? '15px' : '17px'
  const storeSize = isK58 ? '16px' : '19px'

  const methodLabel: Record<string, string> = {
    CASH: 'Tiền mặt',
    BANK_TRANSFER: 'Chuyển khoản',
  }

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 3px 0; font-weight: 500; word-break: break-word;">
          <div>${escapeHtml(item.product_name)}</div>
          ${item.note ? `<div style="font-size: 10px; color: #333; font-style: italic; padding-left: 4px; margin-top: 1px;">&bull; ${escapeHtml(item.note)}</div>` : ''}
        </td>
        <td style="padding: 3px 0; text-align: center; white-space: nowrap; vertical-align: top;">${item.quantity}</td>
        <td style="padding: 3px 0; text-align: right; white-space: nowrap; vertical-align: top;">${formatCurrency(item.unit_price)}</td>
        <td style="padding: 3px 0; text-align: right; font-weight: 600; white-space: nowrap; vertical-align: top;">${formatCurrency(item.subtotal)}</td>
      </tr>
    `
    )
    .join('')

  return `
    <div class="receipt" style="
      width: ${paperWidth};
      max-width: ${paperWidth};
      margin: 0 auto;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: ${fontSize};
      line-height: 1.35;
      color: #000;
      background: #fff;
      padding: 4px 2px;
      box-sizing: border-box;
    ">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 6px;">
        <div style="font-size: ${storeSize}; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
          ${escapeHtml(settings.shopName)}
        </div>
        ${settings.shopAddress ? `<div style="font-size: 10px; margin-top: 2px;">${escapeHtml(settings.shopAddress)}</div>` : ''}
        ${settings.shopPhone ? `<div style="font-size: 10px;">Hotline: ${escapeHtml(settings.shopPhone)}</div>` : ''}
      </div>

      <!-- Title -->
      <div style="text-align: center; margin: 8px 0 4px 0;">
        <div style="font-size: ${titleSize}; font-weight: 800; text-transform: uppercase;">
          ${isPreBill ? 'PHIẾU TẠM TÍNH' : 'HÓA ĐƠN THANH TOÁN'}
        </div>
        ${copyLabel ? `<div style="font-size: 10px; font-style: italic;">(${escapeHtml(copyLabel)})</div>` : ''}
      </div>

      <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

      <!-- Meta Info -->
      <div style="font-size: 11px; margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between;">
          <span><strong>Bàn:</strong> ${escapeHtml(order.table_name)}</span>
          <span><strong>Mã HĐ:</strong> ${escapeHtml(order.invoice_number || 'Tạm tính')}</span>
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

      <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: ${fontSize};">
        <thead>
          <tr style="border-bottom: 1px dashed #000;">
            <th style="text-align: left; padding-bottom: 4px; font-weight: 700;">Món</th>
            <th style="text-align: center; padding-bottom: 4px; font-weight: 700; width: 26px;">SL</th>
            <th style="text-align: right; padding-bottom: 4px; font-weight: 700; width: 55px;">Đ.Giá</th>
            <th style="text-align: right; padding-bottom: 4px; font-weight: 700; width: 60px;">T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

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
        <div style="border-top: 1px solid #000; margin: 4px 0;"></div>
        <div style="display: flex; justify-content: space-between; font-size: ${titleSize}; font-weight: 800;">
          <span>TỔNG TIỀN:</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
        ${
          !isPreBill && order.payment_method
            ? `
          <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px;">
            <span>Hình thức:</span>
            <span><strong>${methodLabel[order.payment_method] || order.payment_method}</strong></span>
          </div>
        `
            : ''
        }
      </div>

      <div style="border-top: 1px dashed #000; margin: 8px 0 6px 0;"></div>

      <!-- Footer Info -->
      <div style="text-align: center; font-size: 11px; margin-top: 4px;">
        ${settings.wifi ? `<div style="margin-bottom: 4px; font-size: 10px;">${escapeHtml(settings.wifi)}</div>` : ''}
        <div style="font-weight: 600; margin-bottom: 2px;">${escapeHtml(settings.footerMessage)}</div>
        <div style="font-size: 9px; color: #555; margin-top: 6px;">
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
            margin: 0mm;
          }
          body {
            margin: 0;
            padding: 0;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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

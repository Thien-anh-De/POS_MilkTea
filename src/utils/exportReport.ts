import type { ShiftClosingData } from '@/types'
import { formatCurrency } from './helpers'

/**
 * Xuất dữ liệu báo cáo ra file CSV có gắn UTF-8 BOM (\uFEFF)
 * Tương thích 100% với Microsoft Excel (không bị lỗi font tiếng Việt)
 */
export function exportReportToCsv(
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  summaryRow?: (string | number)[]
) {
  const escapeCell = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const lines: string[] = []

  // Thông tin tiêu đề quán & báo cáo
  lines.push(escapeCell('MOLLIEE - HỆ THỐNG POS BÁN HÀNG'))
  lines.push(escapeCell(title))
  lines.push(escapeCell(subtitle))
  lines.push(escapeCell(`Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`))
  lines.push('') // dòng trống

  // Header bảng
  lines.push(headers.map(escapeCell).join(','))

  // Dữ liệu dòng
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','))
  }

  // Dòng tổng cộng nếu có
  if (summaryRow) {
    lines.push('')
    lines.push(summaryRow.map(escapeCell).join(','))
  }

  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * In hoặc xuất PDF báo cáo doanh thu với giao diện văn bản chuẩn kế toán
 */
export function printReportHtml(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  summaryRow?: (string | number)[]
) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Vui lòng cho phép trình duyệt mở popup để in báo cáo')
    return
  }

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>${title} - Molliee</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 24px;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 24px;
          border-bottom: 2px solid #78350f;
          padding-bottom: 16px;
        }
        .brand {
          font-size: 20px;
          font-weight: 800;
          color: #78350f;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .title {
          font-size: 18px;
          font-weight: 700;
          margin-top: 6px;
          color: #0f172a;
        }
        .subtitle {
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
          font-size: 13px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
        }
        th {
          background-color: #f8fafc;
          font-weight: 600;
          color: #334155;
          text-align: left;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .summary-row {
          font-weight: 700;
          background-color: #fef3c7;
          color: #78350f;
        }
        .footer {
          margin-top: 36px;
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          text-align: center;
        }
        .sign-box {
          width: 200px;
        }
        .sign-space {
          height: 70px;
        }
        @media print {
          body { padding: 0; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">MOLLIEE - HỆ THỐNG POS</div>
        <div class="title">${title}</div>
        <div class="subtitle">${subtitle} &bull; Thời gian in: ${new Date().toLocaleString('vi-VN')}</div>
      </div>

      <table>
        <thead>
          <tr>
            ${headers
              .map((h, i) => `<th class="${i > 0 ? 'text-right' : ''}">${h}</th>`)
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              ${r
                .map((cell, i) => `<td class="${i > 0 ? 'text-right' : ''}">${cell}</td>`)
                .join('')}
            </tr>
          `
            )
            .join('')}
          ${
            summaryRow
              ? `
            <tr class="summary-row">
              ${summaryRow
                .map((cell, i) => `<td class="${i > 0 ? 'text-right' : ''}">${cell}</td>`)
                .join('')}
            </tr>
          `
              : ''
          }
        </tbody>
      </table>

      <div class="footer">
        <div class="sign-box">
          <div><strong>Người lập báo cáo</strong></div>
          <div class="subtitle">(Ký và ghi rõ họ tên)</div>
          <div class="sign-space"></div>
        </div>
        <div class="sign-box">
          <div><strong>Quản lý / Chủ quán</strong></div>
          <div class="subtitle">(Ký và ghi rõ họ tên)</div>
          <div class="sign-space"></div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

/**
 * In phiếu chốt ca / chốt két cuối ngày (Thermal 80mm format)
 */
export function printShiftClosingSlip(data: ShiftClosingData) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Vui lòng cho phép trình duyệt mở popup để in phiếu')
    return
  }

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>Phiếu Chốt Ca - Molliee</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          font-family: 'Courier New', Courier, monospace, system-ui;
          width: 72mm;
          margin: 0 auto;
          padding: 8px 4px;
          color: #000;
          font-size: 12px;
          line-height: 1.4;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .double-divider {
          border-top: 2px solid #000;
          margin: 8px 0;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .highlight-box {
          border: 1px solid #000;
          padding: 6px;
          margin: 6px 0;
          background: #fdfdfd;
        }
        .sign-grid {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          text-align: center;
          font-size: 11px;
        }
        .sign-area { height: 45px; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <div style="font-size: 15px; font-weight: bold;">MOLLIEE</div>
        <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">PHIẾU BÀN GIAO CA / CHỐT KÉT</div>
        <div style="font-size: 11px;">${data.period_title}</div>
      </div>

      <div class="divider"></div>

      <div class="row">
        <span>Thời gian in:</span>
        <span>${data.closing_time}</span>
      </div>
      <div class="row">
        <span>Người chốt:</span>
        <span class="bold">${data.cashier_name}</span>
      </div>

      <div class="double-divider"></div>

      <div class="highlight-box">
        <div class="row" style="font-size: 14px;">
          <span class="bold">DOANH THU THUẦN:</span>
          <span class="bold">${formatCurrency(data.net_revenue)}</span>
        </div>
      </div>

      <div class="row">
        <span>Tổng tiền trước giảm:</span>
        <span>${formatCurrency(data.gross_revenue)}</span>
      </div>
      <div class="row">
        <span>Tổng tiền giảm giá:</span>
        <span>-${formatCurrency(data.discount_total)}</span>
      </div>
      <div class="row">
        <span>Tổng số hóa đơn:</span>
        <span class="bold">${data.total_orders}</span>
      </div>

      <div class="divider"></div>
      <div class="bold" style="margin-bottom: 4px;">ĐỐI SOÁT DÒNG TIỀN:</div>

      <div class="row">
        <span>💵 Tiền mặt két (${data.cash_orders} đơn):</span>
        <span class="bold">${formatCurrency(data.cash_amount)}</span>
      </div>
      <div class="row">
        <span>💳 Chuyển khoản (${data.bank_orders} đơn):</span>
        <span class="bold">${formatCurrency(data.bank_amount)}</span>
      </div>

      <div class="divider"></div>
      <div class="bold" style="margin-bottom: 4px;">RỦI RO & HỦY ĐƠN:</div>
      <div class="row">
        <span>Số đơn bị hủy:</span>
        <span class="bold">${data.cancelled_orders_count}</span>
      </div>
      <div class="row">
        <span>Tổng giá trị đơn hủy:</span>
        <span>${formatCurrency(data.cancelled_orders_amount)}</span>
      </div>

      ${
        data.top_items.length > 0
          ? `
        <div class="divider"></div>
        <div class="bold" style="margin-bottom: 4px;">TOP MÓN BÁN CHẠY TRONG CA:</div>
        ${data.top_items
          .map(
            (item, i) => `
          <div class="row" style="font-size: 11px;">
            <span>${i + 1}. ${item.name}</span>
            <span>${item.qty} ly (${formatCurrency(item.revenue)})</span>
          </div>
        `
          )
          .join('')}
      `
          : ''
      }

      <div class="double-divider"></div>

      <div class="sign-grid">
        <div>
          <div>Người nộp tiền</div>
          <div style="font-size: 10px;">(Thu ngân)</div>
          <div class="sign-area"></div>
          <div>...................</div>
        </div>
        <div>
          <div>Người nhận tiền</div>
          <div style="font-size: 10px;">(Quản lý/Chủ quán)</div>
          <div class="sign-area"></div>
          <div>...................</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

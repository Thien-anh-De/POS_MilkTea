import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import {
  printerService,
  type PrinterSettings,
  DEFAULT_PRINTER_SETTINGS,
} from '@/services/printerService'
import {
  printReceipt,
  generateReceiptHtml,
  SAMPLE_PRINT_ORDER,
} from '@/utils/printer'
import { ToastContainer } from '@/components/ui'
import {
  Printer,
  Save,
  RotateCcw,
  HelpCircle,
  Receipt,
  Store,
  Sliders,
} from 'lucide-react'

export default function PrinterPage() {
  const { toasts, success, removeToast } = useToast()
  const [settings, setSettings] = useState<PrinterSettings>(
    DEFAULT_PRINTER_SETTINGS
  )

  useEffect(() => {
    setSettings(printerService.getSettings())
  }, [])

  const handleSave = () => {
    printerService.saveSettings(settings)
    success('Đã lưu cấu hình máy in thành công')
  }

  const handleReset = () => {
    const defaultVal = printerService.resetSettings()
    setSettings(defaultVal)
    success('Đã khôi phục cài đặt mặc định')
  }

  const handleTestPrint = () => {
    printReceipt(SAMPLE_PRINT_ORDER, settings, false)
  }

  const previewHtml = generateReceiptHtml(SAMPLE_PRINT_ORDER, settings, false)

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--color-coffee-500), var(--color-coffee-700))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Printer size={22} />
          </div>
          <div>
            <h1 className="page-title">Máy in hóa đơn</h1>
            <p className="page-subtitle">
              Cấu hình khổ giấy, thông tin quán và kiểm tra in thử hóa đơn nhiệt
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Form on Left, Live Preview on Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* LEFT: Settings Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Card 1: Khổ giấy & Tùy chọn in */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Sliders size={18} color="var(--color-coffee-600)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Khổ giấy & Tùy chọn in
              </h3>
            </div>

            {/* Paper Size Selector */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label">Khổ giấy in nhiệt</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, paperSize: 'K80' })}
                  className={`btn ${settings.paperSize === 'K80' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.75rem', flexDirection: 'column', gap: '0.25rem' }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Khổ K80 (80mm)</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>Phổ biến cho quầy thu ngân</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, paperSize: 'K58' })}
                  className={`btn ${settings.paperSize === 'K58' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.75rem', flexDirection: 'column', gap: '0.25rem' }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Khổ K58 (58mm)</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>Máy in mini / cầm tay</span>
                </button>
              </div>
            </div>

            {/* Switches / Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={settings.autoPrintOnPay}
                  onChange={(e) => setSettings({ ...settings, autoPrintOnPay: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--color-coffee-600)', cursor: 'pointer' }}
                />
                <span>Tự động kích hoạt in hóa đơn ngay khi thanh toán</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={settings.printPreBill}
                  onChange={(e) => setSettings({ ...settings, printPreBill: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--color-coffee-600)', cursor: 'pointer' }}
                />
                <span>Cho phép in phiếu tạm tính tại bàn trước khi thanh toán</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border-light)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Số liên in mỗi đơn:</span>
                <select
                  className="select"
                  value={settings.numberOfCopies}
                  onChange={(e) => setSettings({ ...settings, numberOfCopies: Number(e.target.value) || 1 })}
                  style={{ width: 'auto', padding: '0.375rem 2rem 0.375rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  <option value={1}>1 liên (Giao khách)</option>
                  <option value={2}>2 liên (Khách + Pha chế)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Thông tin cửa hàng trên bill */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Store size={18} color="var(--color-coffee-600)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Thông tin quán trên hóa đơn
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label className="input-label">Tên quán (Tiêu đề in đậm)</label>
                <input
                  className="input"
                  value={settings.shopName}
                  onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                  placeholder="TIỆM TRÀ SỮA MOLLIEE"
                />
              </div>

              <div>
                <label className="input-label">Địa chỉ</label>
                <input
                  className="input"
                  value={settings.shopAddress}
                  onChange={(e) => setSettings({ ...settings, shopAddress: e.target.value })}
                  placeholder="123 Đường Cà Phê, Quận 1, TP.HCM"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="input-label">Hotline / SĐT</label>
                  <input
                    className="input"
                    value={settings.shopPhone}
                    onChange={(e) => setSettings({ ...settings, shopPhone: e.target.value })}
                    placeholder="0901 994 994"
                  />
                </div>
                <div>
                  <label className="input-label">Thông tin Wifi</label>
                  <input
                    className="input"
                    value={settings.wifi}
                    onChange={(e) => setSettings({ ...settings, wifi: e.target.value })}
                    placeholder="Wifi: Molliee - Pass: molliee88"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Lời cảm ơn chân trang</label>
                <input
                  className="input"
                  value={settings.footerMessage}
                  onChange={(e) => setSettings({ ...settings, footerMessage: e.target.value })}
                  placeholder="Cảm ơn Quý khách & Hẹn gặp lại!"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
              <Save size={16} />
              Lưu cấu hình
            </button>
            <button className="btn btn-secondary" onClick={handleReset} title="Khôi phục mặc định">
              <RotateCcw size={16} />
              Mặc định
            </button>
          </div>
        </div>

        {/* RIGHT: Live Receipt Preview & Test Print */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={18} color="var(--color-coffee-600)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                  Xem trước hóa đơn in nhiệt
                </h3>
              </div>
              <span className="badge badge-coffee">Khổ {settings.paperSize}</span>
            </div>

            {/* Simulated Thermal Paper Mockup */}
            <div
              style={{
                background: '#f1f5f9',
                padding: '1.5rem 1rem',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                justifyContent: 'center',
                overflowX: 'auto',
              }}
            >
              <div
                style={{
                  background: '#ffffff',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                  padding: '12px 10px',
                  borderRadius: '2px',
                  borderTop: '3px solid #cbd5e1',
                  borderBottom: '3px dashed #cbd5e1',
                  width: settings.paperSize === 'K58' ? 240 : 310,
                  transition: 'width 0.2s ease',
                }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>

            {/* Test Print Button */}
            <div style={{ marginTop: '1.25rem' }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleTestPrint}
                style={{ width: '100%' }}
              >
                <Printer size={20} />
                In thử hóa đơn mẫu
              </button>
            </div>
          </div>

          {/* Guide Card */}
          <div
            className="glass-card"
            style={{
              padding: '1.25rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-coffee-700)' }}>
              <HelpCircle size={18} />
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>
                Mẹo cài đặt máy in hóa đơn trên trình duyệt
              </h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              <li>
                <strong>Chọn máy in:</strong> Trong hộp thoại in của Windows, chọn đúng tên máy in bill quầy (ví dụ: Xprinter, Rongta, POS-80...).
              </li>
              <li>
                <strong>Phần Lề (Margins):</strong> Chọn <strong>"Không có" (None)</strong> để hóa đơn vừa khít khổ giấy và không bị thụt lề trắng.
              </li>
              <li>
                <strong>Tiêu đề và chân trang (Headers & Footers):</strong> Bỏ tích để không in ngày giờ và đường dẫn URL của trình duyệt lên hóa đơn.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

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

            {/* Font Scale & Margin Selector */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label">Cỡ chữ & Căn lề chống tràn</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, fontScale: 'compact' })}
                  className={`btn ${(settings.fontScale || 'standard') === 'compact' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 0.25rem', flexDirection: 'column', gap: '0.125rem' }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Nhỏ gọn</span>
                  <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>Chống tràn mép tối đa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, fontScale: 'standard' })}
                  className={`btn ${(settings.fontScale || 'standard') === 'standard' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 0.25rem', flexDirection: 'column', gap: '0.125rem' }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Tiêu chuẩn</span>
                  <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>Vừa vặn (Khuyên dùng)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, fontScale: 'large' })}
                  className={`btn ${(settings.fontScale || 'standard') === 'large' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 0.25rem', flexDirection: 'column', gap: '0.125rem' }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Rõ nét</span>
                  <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>Chữ to đậm nét</span>
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
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-coffee">Khổ {settings.paperSize}</span>
                <span className="badge" style={{ background: '#e2e8f0', color: '#334155' }}>
                  {settings.fontScale === 'compact'
                    ? 'Cỡ nhỏ gọn'
                    : settings.fontScale === 'large'
                    ? 'Cỡ rõ nét'
                    : 'Cỡ tiêu chuẩn'}
                </span>
              </div>
            </div>

            {/* Simulated Thermal Paper Mockup */}
            <div
              style={{
                background: '#f1f5f9',
                padding: '1.25rem 0.75rem',
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
                  padding: '8px 4px',
                  borderRadius: '2px',
                  borderTop: '3px solid #cbd5e1',
                  borderBottom: '3px dashed #cbd5e1',
                  width:
                    settings.paperSize === 'K58'
                      ? settings.fontScale === 'compact'
                        ? 200
                        : 220
                      : settings.fontScale === 'compact'
                      ? 270
                      : 290,
                  transition: 'width 0.2s ease',
                  boxSizing: 'border-box',
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
                Mẹo cài đặt máy in để bill không bao giờ bị tràn / mất mép
              </h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              <li>
                <strong>Khổ giấy:</strong> Chọn đúng khổ giấy máy in của bạn (<strong>K80</strong> cho máy quầy 80mm như Xprinter/Rongta, hoặc <strong>K58</strong> cho máy nhỏ 58mm).
              </li>
              <li>
                <strong>Cỡ chữ:</strong> Nếu máy in của bạn bị mất chữ bên mép phải (cột Thành tiền), hãy chọn mức <strong>"Nhỏ gọn"</strong> để co hẹp lề và thu nhỏ cỡ chữ an toàn.
              </li>
              <li>
                <strong>Phần Lề (Margins) trong hộp thoại in trình duyệt:</strong> Chọn <strong>"Không có" (None)</strong> hoặc <strong>"Tối thiểu" (Minimum)</strong> để hóa đơn không bị đẩy dạt sang một bên.
              </li>
              <li>
                <strong>Tỷ lệ (Scale):</strong> Đặt là <strong>100%</strong> hoặc <strong>"Mặc định" (Default)</strong>.
              </li>
              <li>
                <strong>Tiêu đề và chân trang (Headers & Footers):</strong> Bỏ tích để ẩn ngày giờ và liên kết URL mặc định của trình duyệt.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

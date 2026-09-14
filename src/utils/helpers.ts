/**
 * Format number as Vietnamese currency (VNĐ)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

/**
 * Format date to Vietnamese locale
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format datetime to Vietnamese locale
 */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Generate invoice number: INV-YYYYMMDD-NNNN
 */
export function generateInvoiceNumber(sequenceNum: number): string {
  const now = new Date()
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const seq = String(sequenceNum).padStart(4, '0')
  return `INV-${dateStr}-${seq}`
}

/**
 * Get today's date range (start and end of day in ISO)
 */
export function getTodayRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Simple class name merger
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Chuyển chuỗi tiếng Việt có dấu thành không dấu để tìm kiếm nhanh
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

export interface GoldenHourItem {
  hour: number
  label: string
  revenue: number
  order_count: number
  ratioVsMean: number
}

export interface GoldenHourAnalysis {
  isEvenDistribution: boolean
  statusLabel: 'Đều khách' | 'Có giờ vàng' | 'Chưa đủ dữ liệu'
  message: string
  goldenHours: GoldenHourItem[]
  goldenHourSet: Set<number>
  meanRevenue: number
  threshold: number
}

/**
 * Thuật toán phát hiện top 3 khung giờ vàng dựa trên giá trị ngoại lai (Outlier Detection)
 * - Nếu cả ngày đông đều đều (độ biến thiên thấp hoặc không vượt ngưỡng outlier): Nhận xét "Đều khách"
 * - Nếu có giá trị ngoại lai (vượt trội hơn hẳn so với trung bình và Q3 + 1.2*IQR): Lấy tối đa top 3 khung giờ
 */
export function calculateGoldenHourOutliers(
  hourlyList: { hour: number; label: string; revenue: number; order_count: number }[]
): GoldenHourAnalysis {
  const activeHours = hourlyList.filter((h) => h.revenue > 0)

  // Nếu chưa có dữ liệu bán hàng
  if (activeHours.length === 0) {
    return {
      isEvenDistribution: true,
      statusLabel: 'Chưa đủ dữ liệu',
      message: 'Chưa có dữ liệu bán hàng để phân tích',
      goldenHours: [],
      goldenHourSet: new Set(),
      meanRevenue: 0,
      threshold: 0,
    }
  }

  // Nếu chỉ có 1 hoặc 2 giờ bán được hàng trong ngày
  if (activeHours.length < 3) {
    return {
      isEvenDistribution: false,
      statusLabel: 'Có giờ vàng',
      message: `Tập trung bán vào ${activeHours.length} khung giờ`,
      goldenHours: activeHours.map((h) => ({
        hour: h.hour,
        label: h.label,
        revenue: h.revenue,
        order_count: h.order_count,
        ratioVsMean: 1,
      })),
      goldenHourSet: new Set(activeHours.map((h) => h.hour)),
      meanRevenue: Math.round(activeHours.reduce((s, h) => s + h.revenue, 0) / activeHours.length),
      threshold: 0,
    }
  }

  // 1. Tính toán Thống kê: Trung bình (Mean) & Độ lệch chuẩn (StdDev)
  const revs = activeHours.map((h) => h.revenue).sort((a, b) => a - b)
  const N = revs.length
  const sum = revs.reduce((s, v) => s + v, 0)
  const mean = sum / N

  const variance = revs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / N
  const stdDev = Math.sqrt(variance)
  const cv = mean > 0 ? stdDev / mean : 0 // Hệ số phân tán

  // 2. Tính Tứ phân vị (IQR: Q1 và Q3)
  const getPercentile = (arr: number[], p: number) => {
    const idx = (arr.length - 1) * p
    const lower = Math.floor(idx)
    const upper = Math.ceil(idx)
    const weight = idx - lower
    return arr[lower] * (1 - weight) + arr[upper] * weight
  }

  const q1 = getPercentile(revs, 0.25)
  const q3 = getPercentile(revs, 0.75)
  const iqr = q3 - q1

  // 3. Xác định ngưỡng Ngoại Lai (Outlier Threshold)
  // Ngưỡng IQR (Q3 + 1.2*IQR) kết hợp Z-Score (Mean + 1.15*StdDev)
  const iqrThreshold = iqr > 0 ? q3 + 1.2 * iqr : mean + 1.2 * stdDev
  const zThreshold = mean + 1.15 * stdDev
  const outlierThreshold = Math.max(iqrThreshold, zThreshold, mean * 1.3)

  // 4. Kiểm tra điều kiện "Đều khách"
  // Nếu hệ số phân tán rất nhỏ (CV < 0.22, tức chênh lệch giữa các giờ dưới 22%)
  if (cv < 0.22) {
    return {
      isEvenDistribution: true,
      statusLabel: 'Đều khách',
      message: 'Đều khách (Doanh thu các khung giờ phân bổ ổn định, không có khung giờ ngoại lai đột biến)',
      goldenHours: [],
      goldenHourSet: new Set(),
      meanRevenue: Math.round(mean),
      threshold: Math.round(outlierThreshold),
    }
  }

  // 5. Lọc các khung giờ đạt tiêu chuẩn Ngoại Lai (Outlier)
  const outlierCandidates = activeHours
    .filter((h) => h.revenue >= outlierThreshold)
    .sort((a, b) => b.revenue - a.revenue) // Sắp xếp theo doanh thu giảm dần

  // Lấy tối đa Top 3 khung giờ
  const top3Outliers = outlierCandidates.slice(0, 3)

  if (top3Outliers.length === 0) {
    return {
      isEvenDistribution: true,
      statusLabel: 'Đều khách',
      message: 'Đều khách (Doanh thu các khung giờ phân bổ ổn định, không có khung giờ ngoại lai đột biến)',
      goldenHours: [],
      goldenHourSet: new Set(),
      meanRevenue: Math.round(mean),
      threshold: Math.round(outlierThreshold),
    }
  }

  return {
    isEvenDistribution: false,
    statusLabel: 'Có giờ vàng',
    message: `Phát hiện ${top3Outliers.length} khung giờ vàng có doanh thu đột biến cao (giá trị ngoại lai)`,
    goldenHours: top3Outliers.map((h) => ({
      hour: h.hour,
      label: h.label,
      revenue: h.revenue,
      order_count: h.order_count,
      ratioVsMean: mean > 0 ? Number((h.revenue / mean).toFixed(1)) : 1,
    })),
    goldenHourSet: new Set(top3Outliers.map((h) => h.hour)),
    meanRevenue: Math.round(mean),
    threshold: Math.round(outlierThreshold),
  }
}



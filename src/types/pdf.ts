/** PDF 页面信息 */
export interface PageInfo {
  /** 原始页码（从 0 开始） */
  originalIndex: number
  /** 当前显示顺序位置 */
  order: number
  /** 是否被选中 */
  selected: boolean
  /** 旋转角度 (0 | 90 | 180 | 270) */
  rotation: number
  /** 缩略图 dataURL */
  thumbnail: string
  /** 页面宽度（PDF 原始单位） */
  width: number
  /** 页面高度（PDF 原始单位） */
  height: number
}

/** 空白页检测结果 */
export interface BlankPageResult {
  pageIndex: number
  isBlank: boolean
  whitePixelRatio: number
  hasTextContent: boolean
}

/** 文件信息 */
export interface FileInfo {
  name: string
  size: number
  pageCount: number
  arrayBuffer: ArrayBuffer
  thumbnail?: string
}

/** 任务状态 */
export type TaskStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error'

/** 任务进度 */
export interface TaskProgress {
  current: number
  total: number
  message: string
}

/** Worker 请求类型 */
export type WorkerRequest =
  | {
      type: 'processPages'
      arrayBuffer: ArrayBuffer
      operations: PageOperation[]
    }
  | {
      type: 'mergePdfs'
      files: { arrayBuffer: ArrayBuffer; name: string }[]
    }
  | {
      type: 'splitPdf'
      arrayBuffer: ArrayBuffer
      ranges: [number, number][]
    }

/** 页面操作 */
export type PageOperation =
  | { type: 'delete'; indices: number[] }
  | { type: 'rotate'; index: number; degrees: number }
  | { type: 'reorder'; newOrder: number[] }
  | { type: 'extract'; indices: number[] }

/** Worker 响应类型 */
export type WorkerResponse =
  | { type: 'processed'; data: Uint8Array }
  | { type: 'merged'; data: Uint8Array }
  | { type: 'split'; data: Uint8Array[] }
  | { type: 'progress'; current: number; total: number; message: string }
  | { type: 'error'; message: string }

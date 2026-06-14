/**
 * 本地文件转换服务 — 调用 LibreOffice 命令行实现 PDF ↔ Word 排版级互转
 *
 * 用法: node server/convert-server.cjs  →  http://localhost:3001
 */

const express = require('express')
const multer = require('multer')
const cors = require('cors')
const { execFile } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const tmpDir = path.join(os.tmpdir(), 'file-converter')
fs.mkdirSync(tmpDir, { recursive: true })
const upload = multer({ dest: tmpDir, limits: { fileSize: 200 * 1024 * 1024 } })

// ======== 查找 LibreOffice ========
let sofficePath = null
let loDir = null

function findLibreOffice() {
  const candidates = [
    ['C:\\Program Files\\LibreOffice\\program', 'soffice.com'],
    ['C:\\Program Files (x86)\\LibreOffice\\program', 'soffice.com'],
    ['/Applications/LibreOffice.app/Contents/MacOS', 'soffice'],
    ['/usr/bin', 'soffice'],
  ]
  for (const [dir, name] of candidates) {
    const full = path.join(dir, name)
    if (fs.existsSync(full)) { loDir = dir; return full }
  }
  return null
}

sofficePath = findLibreOffice()
const installed = sofficePath !== null
console.log('[convert-server] LibreOffice:', installed ? sofficePath : '❌ 未找到')

// ======== 健康检查（只看文件在不在，不运行 --version，Win下容易超时）========
app.get('/health', (req, res) => {
  // 重新检测一次（可能在服务运行后装了 LO）
  if (!installed) {
    sofficePath = findLibreOffice()
  }
  res.json({
    available: sofficePath !== null,
    path: sofficePath || '(未找到)',
    hint: sofficePath ? '已就绪' : '请从 https://www.libreoffice.org/download/ 安装',
  })
})

// ======== 转换配置 ========
const CONVERT_MODES = {
  'pdf-to-docx': { to: 'docx', infilter: 'writer_pdf_import' },
  'docx-to-pdf': { to: 'pdf', infilter: null },
}

// ======== 转换接口 ========
app.post('/convert', upload.single('file'), (req, res) => {
  const { mode } = req.body
  const file = req.file

  if (!file) return res.status(400).json({ error: '未上传文件' })
  const cfg = CONVERT_MODES[mode]
  if (!cfg) return res.status(400).json({ error: '不支持的模式' })
  if (!sofficePath) {
    return res.status(503).json({ error: 'LibreOffice 未安装，请从 libreoffice.org 下载安装' })
  }

  const id = crypto.randomUUID()
  const workDir = path.join(tmpDir, id)
  fs.mkdirSync(workDir, { recursive: true })

  // 保留原始扩展名，LibreOffice 靠扩展名识别格式
  const ext = path.extname(file.originalname).toLowerCase()
  const srcFile = path.join(workDir, `source${ext}`)
  fs.copyFileSync(file.path, srcFile)
  try { fs.unlinkSync(file.path) } catch {}

  console.log(`[convert-server] ${file.originalname} → ${cfg.to}`)

  // 参数：headless 模式运行
  const args = ['--headless']
  if (cfg.infilter) args.push('--infilter=' + cfg.infilter)
  args.push('--convert-to', cfg.to)
  args.push('--outdir', workDir)
  args.push(srcFile)

  execFile(sofficePath, args, {
    cwd: loDir,
    timeout: 180000,
    env: { ...process.env },
  }, (err, stdout, stderr) => {
    if (err) {
      console.error('[convert-server] 失败:', err.message)
      try { fs.rmSync(workDir, { recursive: true }) } catch {}
      // 提取有效错误信息
      const msg = (stderr || err.message || '').split('\n').filter(l => l.includes('Error') || l.includes('error')).slice(0, 3).join('; ')
      return res.status(500).json({ error: msg || '转换失败，请确认文件未损坏且 LibreOffice 安装完整' })
    }

    // 找输出文件
    const outputs = fs.readdirSync(workDir).filter(f => f.endsWith('.' + cfg.to) && f !== path.basename(srcFile))
    if (outputs.length === 0) {
      try { fs.rmSync(workDir, { recursive: true }) } catch {}
      return res.status(500).json({ error: 'LibreOffice 未生成输出文件，文件可能已损坏或格式不支持' })
    }

    const outFile = path.join(workDir, outputs[0])
    const outName = file.originalname.replace(/\.[^.]+$/, '') + '.' + cfg.to

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(outName)}`)
    const stream = fs.createReadStream(outFile)
    stream.pipe(res)
    stream.on('end', () => {
      try { fs.rmSync(workDir, { recursive: true }) } catch {}
      console.log(`[convert-server] 完成 → ${outName}`)
    })
  })
})

app.listen(PORT, () => {
  console.log(`[convert-server] http://localhost:${PORT}`)
  console.log(installed
    ? '[convert-server] ✅ 就绪：PDF ↔ Word'
    : '[convert-server] ⚠️  LibreOffice 未安装，转换不可用')
})

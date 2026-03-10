'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { usePortfolioUpload } from '@/hooks/usePortfolioUpload'
import Dialog from '@/components/ui/dialog'
import type { Holding } from '@/types'

export type UploadZoneContentProps = {
  onUploadSuccess: (holdings: Holding[]) => void
}

export function UploadZoneContent({ onUploadSuccess }: UploadZoneContentProps) {
  const { parseFile } = usePortfolioUpload()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadCount, setUploadCount] = useState(0)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      const result = await parseFile(acceptedFiles[0])
      if (result.error || !result.holdings) {
        setStatus('error')
        setErrorMessage(result.error ?? 'Unknown error')
      } else {
        setStatus('success')
        setUploadCount(result.holdings.length)
        onUploadSuccess(result.holdings)
      }
    },
    [parseFile, onUploadSuccess],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    onDrop,
  })

  const borderColor =
    isDragActive    ? 'rgba(96,165,250,0.5)' :
    status === 'error'   ? '#ef4444' :
    status === 'success' ? '#10b981' :
    '#334155'

  const bgColor =
    isDragActive    ? 'rgba(96,165,250,0.05)' :
    status === 'error'   ? 'rgba(239,68,68,0.05)' :
    'rgba(15,23,42,0.5)'

  const mainTextColor =
    isDragActive    ? '#60a5fa' :
    status === 'error'   ? '#ef4444' :
    '#f8fafc'

  return (
    <>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${borderColor}`,
          backgroundColor: bgColor,
          borderRadius: 0,
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 200ms',
          minHeight: 140,
          gap: 8,
          textAlign: 'center',
        }}
      >
        <input {...getInputProps()} />

        <span
          className="material-symbols-outlined text-slate-600 mb-3"
          style={{ fontSize: 32, color: status === 'success' ? '#10b981' : isDragActive ? '#60a5fa' : '#475569' }}
        >
          upload_file
        </span>

        {status === 'success' ? (
          <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600 }}>
            ✓ Portfolio loaded — {uploadCount} holdings
          </span>
        ) : (
          <>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: mainTextColor }}>
              {isDragActive
                ? 'Drop your CSV here…'
                : 'Drop your portfolio CSV here, or click to browse'}
            </span>
            <span className="text-slate-500 text-xs font-medium">
              Expected columns: security_name_report, weight_pct, fed_industry_id,
              fed_industry_name
            </span>
          </>
        )}
      </div>

      {status === 'error' && errorMessage && (
        <div
          style={{
            marginTop: 6,
            fontFamily: 'var(--font-family-mono), monospace',
            fontSize: '0.75rem',
            color: '#ef4444',
          }}
        >
          {errorMessage}
        </div>
      )}

      <div className="flex justify-between items-center mt-2">
        <a
          href="#"
          onClick={e => e.preventDefault()}
          className="text-slate-500 text-[11px] font-mono hover:text-slate-300 transition-colors"
          style={{ textDecoration: 'none' }}
        >
          Download template
        </a>
      </div>
    </>
  )
}

export default function UploadZoneModal({ onUploadSuccess }: { onUploadSuccess: (h: Holding[]) => void }) {
  const [open, setOpen] = useState(false)

  const handleSuccess = (holdings: Holding[]) => {
    setOpen(false)
    onUploadSuccess(holdings)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-wider hover:border-slate-500 hover:text-slate-300 transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>upload</span>
        Import Portfolio
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <div style={{ maxWidth: 640, width: '100%', padding: 20, position: 'relative' }}>
          {/* X close button */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>

          <header style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: '1rem', margin: 0, color: 'var(--color-text)', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
              Import Portfolio
            </h2>
            <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
              Upload a CSV with columns: security_name_report, weight_pct, fed_industry_id, fed_industry_name
            </p>
          </header>

          <div>
            <UploadZoneContent onUploadSuccess={handleSuccess} />
          </div>
        </div>
      </Dialog>
    </>
  )
}

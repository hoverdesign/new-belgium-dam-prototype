import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from './api.js'

// -------------------------------------------------------
// File type detection
// -------------------------------------------------------
const EXT_MAP = {
  // Images
  jpg: { format: 'JPG', type: 'image', label: 'JPEG Image' },
  jpeg:{ format: 'JPG', type: 'image', label: 'JPEG Image' },
  png: { format: 'PNG', type: 'image', label: 'PNG Image' },
  webp:{ format: 'WEBP',type: 'image', label: 'WebP Image' },
  gif: { format: 'GIF', type: 'image', label: 'GIF Image' },
  svg: { format: 'SVG', type: 'vector',label: 'SVG Vector' },
  // Print / design
  pdf: { format: 'PDF', type: 'print', label: 'PDF Document' },
  eps: { format: 'EPS', type: 'print', label: 'EPS Vector' },
  ai:  { format: 'AI',  type: 'print', label: 'Adobe Illustrator' },
  psd: { format: 'PSD', type: 'print', label: 'Photoshop File' },
  // Video
  mp4: { format: 'MP4', type: 'video', label: 'MP4 Video' },
  mov: { format: 'MOV', type: 'video', label: 'QuickTime Video' },
  avi: { format: 'AVI', type: 'video', label: 'AVI Video' },
  webm:{ format: 'WEBM',type: 'video', label: 'WebM Video' },
  // Audio
  mp3: { format: 'MP3', type: 'audio', label: 'MP3 Audio' },
  wav: { format: 'WAV', type: 'audio', label: 'WAV Audio' },
  // Docs
  zip: { format: 'ZIP', type: 'archive',label: 'ZIP Archive' },
}

const TYPE_ICONS = {
  image:   '🖼',
  vector:  '✦',
  print:   '🖨',
  video:   '🎬',
  audio:   '🎵',
  archive: '🗜',
  file:    '📄',
}

const TYPE_COLORS = {
  image:   'bg-blue-50 text-blue-700 border-blue-200',
  vector:  'bg-purple-50 text-purple-700 border-purple-200',
  print:   'bg-red-50 text-red-700 border-red-200',
  video:   'bg-pink-50 text-pink-700 border-pink-200',
  audio:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  archive: 'bg-gray-50 text-gray-700 border-gray-200',
  file:    'bg-gray-50 text-gray-600 border-gray-200',
}

function detectFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const info = EXT_MAP[ext] ?? { format: ext.toUpperCase() || 'FILE', type: 'file', label: 'File' }
  const size = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(0)} KB`
    : `${(file.size / 1024 / 1024).toFixed(1)} MB`
  return { ...info, size, ext }
}

function isPreviewable(type) {
  return ['image', 'vector'].includes(type)
}

function getToken() { return localStorage.getItem('dam_token') }
function clearToken() { localStorage.removeItem('dam_token') }

// -------------------------------------------------------
// AddAssetPage
// -------------------------------------------------------
export default function AddAssetPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  const [product,    setProduct]    = useState(null)
  const [loadingProd,setLoadingProd]= useState(true)

  const [file,       setFile]       = useState(null)      // File object
  const [fileInfo,   setFileInfo]   = useState(null)      // { format, type, label, size, ext }
  const [preview,    setPreview]    = useState(null)      // object URL or null
  const [uploading,  setUploading]  = useState(false)
  const [uploadedUrl,setUploadedUrl]= useState(null)

  const [name,       setName]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  const [dragging,   setDragging]   = useState(false)
  const dropRef = useRef(null)
  const inputRef = useRef(null)

  // Load product info
  useEffect(() => {
    fetch(`${API_URL}/assets/${id}`)
      .then(r => r.json())
      .then(d => setProduct(d))
      .catch(() => setError('Could not load product.'))
      .finally(() => setLoadingProd(false))
  }, [id])

  // Upload file to server as soon as it's selected
  async function uploadFile(f) {
    const info = detectFromFile(f)
    setFile(f)
    setFileInfo(info)
    setUploadedUrl(null)
    setError(null)

    // Auto-suggest name from filename (strip extension)
    if (!name) setName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))

    // Show local preview for images
    if (isPreviewable(info.type)) setPreview(URL.createObjectURL(f))
    else setPreview(null)

    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', f)
      const res = await fetch(`${API_URL}/admin/upload-asset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body,
      })
      if (res.status === 401) { clearToken(); navigate('/admin'); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUploadedUrl(data.url)
      // Use server-detected size/format if available
      setFileInfo(prev => ({ ...prev, size: data.size, format: data.format }))
    } catch (err) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  // Drag and drop handlers
  const handleDragOver = useCallback(e => { e.preventDefault(); setDragging(true) }, [])
  const handleDragLeave = useCallback(e => { if (!dropRef.current?.contains(e.relatedTarget)) setDragging(false) }, [])
  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) uploadFile(f)
  }, [name])

  function handleInputChange(e) {
    const f = e.target.files[0]
    if (f) uploadFile(f)
  }

  async function handleSave() {
    if (!uploadedUrl) return setError('Please wait for the file to finish uploading.')
    if (!name.trim()) return setError('Please enter an asset name.')
    setSaving(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/assets/${id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: name.trim(),
          type: fileInfo.type,
          format: fileInfo.format,
          size: fileInfo.size,
          fileUrl: uploadedUrl,
        }),
      })
      if (res.status === 401) { clearToken(); navigate('/admin'); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loadingProd) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900">Add Brand Asset</h1>
            {product && <p className="text-xs text-gray-400 truncate">{product.productName}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Drop zone */}
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
          className={`relative rounded-3xl border-2 border-dashed transition-all mb-6 overflow-hidden
            ${dragging
              ? 'border-blue-400 bg-blue-50 scale-[1.01]'
              : file
              ? 'border-gray-200 bg-white cursor-default'
              : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer'
            }`}
        >
          <input ref={inputRef} type="file" onChange={handleInputChange} className="hidden" />

          {/* Empty state */}
          {!file && (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${dragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 transition-colors ${dragging ? 'text-blue-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-1">
                {dragging ? 'Drop to upload' : 'Drag & drop a file here'}
              </p>
              <p className="text-sm text-gray-400 mb-4">or click to browse</p>
              <p className="text-xs text-gray-300 max-w-sm leading-relaxed">
                PNG · JPG · WebP · SVG · GIF · PDF · EPS · AI · MP4 · MP3 · ZIP · and more
              </p>
            </div>
          )}

          {/* File loaded state */}
          {file && (
            <div className="p-6">
              <div className="flex gap-5 items-start">
                {/* Preview or icon */}
                <div className="shrink-0 w-28 h-28 rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {preview
                    ? <img src={preview} alt="preview" className="w-full h-full object-contain p-2" />
                    : <span className="text-4xl">{TYPE_ICONS[fileInfo?.type] ?? '📄'}</span>
                  }
                </div>

                {/* File details */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm font-semibold text-gray-900 truncate mb-1">{file.name}</p>

                  {fileInfo && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${TYPE_COLORS[fileInfo.type] ?? TYPE_COLORS.file}`}>
                        <span>{TYPE_ICONS[fileInfo.type] ?? '📄'}</span>
                        {fileInfo.label}
                      </span>
                      <span className="inline-flex items-center text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        {fileInfo.format}
                      </span>
                      <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                        {fileInfo.size}
                      </span>
                    </div>
                  )}

                  {/* Upload status */}
                  {uploading && (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Uploading…
                    </div>
                  )}
                  {uploadedUrl && !uploading && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Upload complete
                    </p>
                  )}
                </div>

                {/* Replace button */}
                <button
                  onClick={() => inputRef.current?.click()}
                  className="shrink-0 text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  Replace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Asset Name field — only shown after a file is selected */}
        {file && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Asset Name <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">Give this file a clear, descriptive name so it's easy to find.</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Can Shot Front View, Product Logo White"
              autoFocus
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!uploadedUrl || !name.trim() || saving}
            className="text-sm font-semibold bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Asset'}
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="text-sm font-semibold bg-white text-gray-600 px-6 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </main>
    </div>
  )
}

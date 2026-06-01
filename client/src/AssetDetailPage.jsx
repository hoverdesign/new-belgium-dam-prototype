import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

const SEASON_COLORS = {
  'year-round': 'bg-blue-100 text-blue-700',
  'summer':     'bg-yellow-100 text-yellow-700',
  'winter':     'bg-indigo-100 text-indigo-700',
  'spring':     'bg-green-100 text-green-700',
  'fall':       'bg-orange-100 text-orange-700',
  'limited':    'bg-purple-100 text-purple-700',
}

const FORMAT_COLORS = {
  PNG: 'bg-blue-50 text-blue-600',
  JPG: 'bg-green-50 text-green-600',
  PDF: 'bg-red-50 text-red-600',
  SVG: 'bg-purple-50 text-purple-600',
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function FileCard({ file, productName }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(file.fileUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${productName} - ${file.name}.${file.format.toLowerCase()}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(file.fileUrl, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <img
        src={file.fileUrl}
        alt={file.name}
        className="w-full aspect-square object-contain bg-white p-4"
      />
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 font-semibold text-sm leading-tight">{file.name}</h3>
            <p className="text-gray-400 text-xs mt-0.5">{file.size}</p>
          </div>
          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md font-mono ${FORMAT_COLORS[file.format] ?? 'bg-gray-100 text-gray-600'}`}>
            {file.format}
          </span>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="mt-auto flex items-center justify-center gap-2 w-full text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <DownloadIcon />
          {downloading ? 'Downloading…' : 'Download'}
        </button>
      </div>
    </div>
  )
}

export default function AssetDetailPage() {
  const { id } = useParams()
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/assets/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Asset not found')
        return res.json()
      })
      .then(data => setAsset(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500 font-medium">{error ?? 'Asset not found'}</p>
        <Link to="/" className="text-sm text-blue-500 hover:underline">← Back to library</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          <h1 className="text-base font-semibold text-gray-900 truncate">New Belgium Asset Library</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Product hero */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="flex flex-col sm:flex-row gap-0">
            <div className="sm:w-48 shrink-0 bg-white flex items-center justify-center p-6">
              <img
                src={asset.imageUrl}
                alt={asset.productName}
                className="w-full max-w-[160px] aspect-square object-contain"
              />
            </div>
            <div className="flex-1 p-6 sm:border-l border-t sm:border-t-0 border-gray-100">
              <div className="flex flex-wrap items-start gap-2 mb-2">
                <h2 className="text-xl font-bold text-gray-900">{asset.productName}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SEASON_COLORS[asset.season] ?? 'bg-gray-100 text-gray-600'}`}>
                  {asset.season}
                </span>
              </div>
              <p className="text-sm text-gray-400 font-mono mb-3">{asset.sku}</p>
              <p className="text-sm text-gray-500 mb-4 capitalize">Category: <span className="font-medium text-gray-700">{asset.category}</span></p>
              <div className="flex flex-wrap gap-1">
                {asset.tags.map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Brand assets grid */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Brand Assets
            <span className="ml-2 text-gray-400 font-normal">{asset.files?.length ?? 0} files</span>
          </h3>
        </div>

        {asset.files && asset.files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {asset.files.map(file => (
              <FileCard key={file.id} file={file} productName={asset.productName} />
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No brand assets available for this product.</p>
        )}
      </main>
    </div>
  )
}

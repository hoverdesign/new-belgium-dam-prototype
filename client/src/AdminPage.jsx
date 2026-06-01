import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
const API_URL = import.meta.env.VITE_API_URL ?? ''

const CATEGORIES = ['ale', 'ipa', 'sour', 'lager']
const SEASONS    = ['year-round', 'spring', 'summer', 'fall', 'winter', 'limited']
const FILE_TYPES = ['can', 'logo', 'label', 'lifestyle', 'social', 'other']
const FORMATS    = ['PNG', 'JPG', 'SVG', 'PDF', 'WEBP', 'GIF']

const EMPTY_PRODUCT = { productName: '', sku: '', category: 'ale', season: 'year-round', tags: '', imageUrl: '' }
const EMPTY_FILE    = { name: '', type: 'can', format: 'PNG', size: '', fileUrl: '' }

// -------------------------------------------------------
// Auth helpers — local credential check, no backend required
// -------------------------------------------------------
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'newbelgium'
const SESSION_KEY    = 'dam_authed'

function isAuthed()   { return localStorage.getItem(SESSION_KEY) === 'true' }
function signIn()     { localStorage.setItem(SESSION_KEY, 'true') }
function signOut()    { localStorage.removeItem(SESSION_KEY) }

// authFetch is kept for future backend use; on Vercel write operations are no-ops
function getToken()   { return '' }
function authHeaders(){ return { 'Content-Type': 'application/json' } }
async function authFetch(path, options = {}) {
  if (!API_URL) throw new Error('No backend configured. Write operations require a deployed API.')
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...authHeaders(), ...options.headers } })
  return res
}

// -------------------------------------------------------
// LoginForm
// -------------------------------------------------------
function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      signIn(); onLogin()
    } else {
      setError('Invalid credentials.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Login</h1>
        <p className="text-sm text-gray-400 mb-6">New Belgium Asset Library</p>
        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Sign In
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-6 text-center">
          <Link to="/" className="text-blue-500 hover:underline">← Back to library</Link>
        </p>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// ProductForm — inline edit form inside the table row
// -------------------------------------------------------
function ProductForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_PRODUCT)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(initial?.imageUrl || '')
  const ref = useRef(null)

  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleFileChange(e) {
    const file = e.target.files[0]; if (!file) return
    setPreview(URL.createObjectURL(file)); setUploading(true)
    try {
      const body = new FormData(); body.append('image', file)
      const res  = await fetch(`${API_URL}/admin/upload`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body })
      if (res.status === 401) { clearToken(); window.location.reload(); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set('imageUrl', data.url); setPreview(data.url)
    } catch (err) { setError(`Upload failed: ${err.message}`); setPreview(form.imageUrl || '') }
    finally { setUploading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(null)
    try { await onSave(form) } catch (err) { setError(err.message) }
  }

  return (
    <tr ref={ref}>
      <td colSpan={5} className="px-6 py-5 bg-blue-50 border-t border-b border-blue-100">
        <form onSubmit={handleSubmit}>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-4">Editing Product</p>
          {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Product Name */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Product Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.productName} onChange={e => set('productName', e.target.value)} required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none" />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SKU <span className="text-red-500">*</span></label>
              <input type="text" value={form.sku} onChange={e => set('sku', e.target.value)} required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none" />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category <span className="text-red-500">*</span></label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 capitalize appearance-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Season */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Season <span className="text-red-500">*</span></label>
              <select value={form.season} onChange={e => set('season', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 capitalize appearance-none">
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
              <input type="text" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="hoppy, citrus, flagship"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none" />
            </div>

            {/* Cover Image */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Cover Image</label>
              <div className="flex gap-3 items-start">
                <label className={`relative flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors ${uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-400 bg-white'}`}>
                  {preview
                    ? <img src={preview} alt="preview" className="w-full h-full object-contain p-1" />
                    : <span className="absolute inset-0 flex items-center justify-center text-gray-300 text-2xl">+</span>
                  }
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
                </label>
                <input type="url" value={form.imageUrl} onChange={e => { set('imageUrl', e.target.value); setPreview(e.target.value) }}
                  placeholder="Or paste an image URL"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              {uploading && <p className="text-xs text-blue-500 mt-1">Uploading…</p>}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="text-sm bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" onClick={onCancel}
              className="text-sm bg-white text-gray-600 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </td>
    </tr>
  )
}

// -------------------------------------------------------
// AddFileModal — modal to add a downloadable file to a product
// -------------------------------------------------------
function AddFileModal({ asset, onSave, onClose, saving }) {
  const [form, setForm] = useState(EMPTY_FILE)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleFileChange(e) {
    const file = e.target.files[0]; if (!file) return
    const ext = file.name.split('.').pop().toUpperCase()
    setPreview(URL.createObjectURL(file)); setUploading(true)
    set('format', FORMATS.includes(ext) ? ext : form.format)
    set('size', `${(file.size / 1024 / 1024).toFixed(1)} MB`)
    try {
      const body = new FormData(); body.append('image', file)
      const res  = await fetch(`${API_URL}/admin/upload`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body })
      if (res.status === 401) { clearToken(); window.location.reload(); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set('fileUrl', data.url); setPreview(data.url)
    } catch (err) { setError(`Upload failed: ${err.message}`) }
    finally { setUploading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(null)
    try { await onSave(form) } catch (err) { setError(err.message) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add Brand Asset</h2>
            <p className="text-xs text-gray-400 mt-0.5">{asset.productName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

          {/* File upload area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File <span className="text-red-500">*</span></label>
            <label className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors ${uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}>
              {preview ? (
                <div className="relative w-full">
                  <img src={preview} alt="preview" className="w-full h-32 object-contain bg-white p-2" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium">Click to replace</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-400">Click to upload</p>
                  <p className="text-xs text-gray-300 mt-0.5">JPG, PNG, SVG, PDF, WebP · max 5 MB</p>
                </div>
              )}
              <input type="file" accept="image/*,.pdf,.svg" onChange={handleFileChange} className="hidden" disabled={uploading} />
            </label>
            {uploading && <p className="text-xs text-blue-500 mt-1">Uploading…</p>}
            <div className="mt-2">
              <input type="url" value={form.fileUrl} onChange={e => { set('fileUrl', e.target.value); setPreview(e.target.value) }}
                placeholder="Or paste a file URL directly"
                className="w-full text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Asset Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Can Shot, Product Logo"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 capitalize appearance-none">
                {FILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select value={form.format} onChange={e => set('format', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none">
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Size */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">File Size <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={form.size} onChange={e => set('size', e.target.value)} placeholder="e.g. 2.4 MB"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving || uploading}
              className="flex-1 text-sm bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? 'Adding…' : 'Add Asset'}
            </button>
            <button type="button" onClick={onClose}
              className="text-sm bg-gray-100 text-gray-600 font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Main AdminPage
// -------------------------------------------------------
export default function AdminPage() {
  const navigate = useNavigate()
  const [authed,   setAuthed]   = useState(isAuthed())
  const [assets,   setAssets]   = useState([])
  const [loading,  setLoading]  = useState(false)
  const [creating, setCreating] = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState(null)
  const [rowSize,  setRowSize]  = useState('S') // 'S' | 'M' | 'L'

  // Row size configs — image size, cell padding, thumbnail dimensions
  const SIZE = {
    S: { cell: 'py-1.5', img: 'w-9 h-9',   imgPad: 'p-0.5' },
    M: { cell: 'py-1',   img: 'w-16 h-16', imgPad: 'p-1'   },
    L: { cell: 'py-1',   img: 'w-24 h-24', imgPad: 'p-1.5' },
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadAssets() {
    setLoading(true)
    try { const res = await fetch(`${API_URL}/assets`); const data = await res.json(); setAssets(data.assets) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (authed) loadAssets() }, [authed])

  function handleLogout() {
    signOut(); setAuthed(false)
  }

  async function handleCreate(form) {
    setSaving(true)
    try {
      const res  = await authFetch('/assets', { method: 'POST', body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadAssets(); setCreating(false)
      showToast(`"${data.productName}" created.`)
    } finally { setSaving(false) }
  }

  async function handleEdit(form) {
    setSaving(true)
    try {
      const res  = await authFetch(`/assets/${editId}`, { method: 'PUT', body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadAssets(); setEditId(null)
      showToast(`"${data.productName}" updated.`)
    } finally { setSaving(false) }
  }

  async function handleDelete(asset) {
    if (!confirm(`Delete "${asset.productName}"? This cannot be undone.`)) return
    const res  = await authFetch(`/assets/${asset.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) return showToast(data.error, 'error')
    if (editId === asset.id) setEditId(null)
    await loadAssets()
    showToast(`"${asset.productName}" deleted.`)
  }

  function toggleEditRow(asset) {
    // Clicking the active row collapses it; clicking a different row switches to it
    setEditId(prev => prev === asset.id ? null : asset.id)
    setCreating(false)
  }

  if (!authed) return <LoginForm onLogin={() => setAuthed(true)} />

  const editTarget = assets.find(a => a.id === editId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <Link to="/admin" className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">Admin Panel</Link>
            <p className="text-xs text-gray-400">New Belgium Asset Library</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-blue-500 hover:underline hidden sm:inline">← Public library</Link>
            <button onClick={handleLogout}
              className="text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-medium">
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* New Product form (above table) */}
        {creating && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">New Product</h2>
              <ProductFormPanel
              onSave={handleCreate}
              onCancel={() => setCreating(false)}
              saving={saving}
            />
          </div>
        )}

        {/* Asset table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between gap-3 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-900">
              {loading ? 'Loading…' : `${assets.length} product${assets.length !== 1 ? 's' : ''}`}
            </p>
            <div className="flex items-center gap-2">
              {/* Row size toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {['S', 'M', 'L'].map(s => (
                  <button
                    key={s}
                    onClick={() => setRowSize(s)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      rowSize === s
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {!creating && (
                <button onClick={() => { setCreating(true); setEditId(null) }}
                  className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  + New Product
                </button>
              )}
            </div>
          </div>

          {/* Hint text — desktop only (mobile uses tap-on-card) */}
          {!loading && assets.length > 0 && (
            <p className="hidden sm:block px-6 py-2 text-xs text-gray-400 border-b border-gray-50 bg-gray-50/50">
              Click any row to edit product details
            </p>
          )}

          {/* ── Mobile card grid (< sm) ── */}
          <div className="sm:hidden p-4 grid grid-cols-2 gap-3">
            {assets.map(asset => {
              const isOpen = editId === asset.id
              const fileCount = asset.files?.length ?? 0
              return (
                <div key={asset.id} className="contents">
                  {/* Card */}
                  <div
                    onClick={() => toggleEditRow(asset)}
                    className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col cursor-pointer select-none transition-all ${
                      isOpen
                        ? 'border-blue-300 shadow-blue-100'
                        : 'border-gray-100 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Image */}
                    <img
                      src={asset.imageUrl}
                      alt={asset.productName}
                      className="w-full aspect-square object-contain bg-white p-3"
                    />

                    {/* Body */}
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <div>
                        <h3 className="text-gray-900 font-semibold text-sm leading-tight">
                          {asset.productName}
                        </h3>
                        {isOpen && <span className="text-xs text-blue-500">Editing…</span>}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex gap-1 items-baseline">
                          <span className="text-xs text-gray-400 w-12 shrink-0">SKU</span>
                          <span className="text-xs font-mono text-gray-600 truncate">{asset.sku}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                          <span className="text-xs text-gray-400 w-12 shrink-0">Cat.</span>
                          <span className="text-xs capitalize text-gray-600">{asset.category}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                          <span className="text-xs text-gray-400 w-12 shrink-0">Files</span>
                          <span className="text-xs text-gray-600">{fileCount}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1.5 mt-auto pt-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/admin/product/${asset.id}/add-asset`)}
                          className="flex-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 py-1.5 rounded-lg transition-colors"
                        >
                          + Add
                        </button>
                        <button
                          onClick={() => handleDelete(asset)}
                          className="flex-1 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 py-1.5 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline edit — spans both columns when open */}
                  {isOpen && editTarget && (
                    <div className="col-span-2 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-5">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-4">Editing Product</p>
                      <ProductFormPanel
                        initial={{ ...editTarget, tags: editTarget.tags.join(', ') }}
                        onSave={handleEdit}
                        onCancel={() => setEditId(null)}
                        saving={saving}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Desktop table (≥ sm) ── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">SKU</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Files</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets.map(asset => {
                  const isOpen = editId === asset.id
                  return (
                    <>
                      {/* Product row — fully clickable */}
                      <tr
                        key={asset.id}
                        onClick={() => toggleEditRow(asset)}
                        className={`cursor-pointer transition-colors select-none ${isOpen ? 'bg-blue-50' : 'hover:bg-blue-50/40'}`}
                      >
                        <td className={`px-6 ${SIZE[rowSize].cell}`}>
                          <div className="flex items-center gap-3">
                            <img src={asset.imageUrl} alt={asset.productName}
                              className={`${SIZE[rowSize].img} rounded-lg object-contain bg-white ${SIZE[rowSize].imgPad} shrink-0 border border-gray-100 transition-all`} />
                            <div>
                              <span className="font-medium text-gray-900 leading-tight block">{asset.productName}</span>
                              {isOpen && <span className="text-xs text-blue-500">Editing…</span>}
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 ${SIZE[rowSize].cell} text-gray-400 font-mono text-xs hidden sm:table-cell`}>{asset.sku}</td>
                        <td className={`px-4 ${SIZE[rowSize].cell} hidden md:table-cell`}>
                          <span className="capitalize bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{asset.category}</span>
                        </td>
                        <td className={`px-4 ${SIZE[rowSize].cell} text-gray-400 text-xs hidden md:table-cell`}>
                          {asset.files?.length ?? 0} file{(asset.files?.length ?? 0) !== 1 ? 's' : ''}
                        </td>
                        <td className={`px-4 ${SIZE[rowSize].cell} text-right`} onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => navigate(`/admin/product/${asset.id}/add-asset`)}
                              className="text-sm text-gray-300 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                            >
                              + Add Asset
                            </button>
                            <button
                              onClick={() => handleDelete(asset)}
                              className="text-sm text-gray-300 hover:text-red-500 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline edit row — expands below when row is clicked */}
                      {isOpen && editTarget && (
                        <ProductForm
                          key={`edit-${asset.id}`}
                          initial={{ ...editTarget, tags: editTarget.tags.join(', ') }}
                          onSave={handleEdit}
                          onCancel={() => setEditId(null)}
                          saving={saving}
                        />
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

// -------------------------------------------------------
// ProductFormPanel — standalone version for the "New Product" panel
// (identical fields to ProductForm but renders as a div, not a <tr>)
// -------------------------------------------------------
function ProductFormPanel({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_PRODUCT)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(initial?.imageUrl || '')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleFileChange(e) {
    const file = e.target.files[0]; if (!file) return
    setPreview(URL.createObjectURL(file)); setUploading(true)
    try {
      const body = new FormData(); body.append('image', file)
      const res  = await fetch(`${API_URL}/admin/upload`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body })
      if (res.status === 401) { clearToken(); window.location.reload(); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set('imageUrl', data.url); setPreview(data.url)
    } catch (err) { setError(`Upload failed: ${err.message}`) }
    finally { setUploading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(null)
    try { await onSave(form) } catch (err) { setError(err.message) }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
          <input type="text" value={form.productName} onChange={e => set('productName', e.target.value)} required placeholder="e.g. Voodoo Ranger IPA"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU <span className="text-red-500">*</span></label>
          <input type="text" value={form.sku} onChange={e => set('sku', e.target.value)} required placeholder="e.g. NBB-VR-001"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
          <label className={`flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors ${uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'}`}>
            {preview ? (
              <div className="relative w-full">
                <img src={preview} alt="Cover preview" className="w-full h-56 object-contain bg-white p-4" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl">
                  <span className="text-white text-sm font-medium">Click to replace</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Drag & drop or click to upload</p>
                <p className="text-xs text-gray-400">JPG, PNG, WebP, SVG · max 5 MB</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
          </label>
          {uploading && <p className="text-xs text-blue-500 mt-2">Uploading…</p>}
          <div className="mt-2">
            <input type="url" value={form.imageUrl} onChange={e => { set('imageUrl', e.target.value); setPreview(e.target.value) }}
              placeholder="Or paste an image URL directly"
              className="w-full text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 capitalize appearance-none">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Season <span className="text-red-500">*</span></label>
          <select value={form.season} onChange={e => set('season', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 capitalize appearance-none">
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input type="text" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="comma-separated, e.g. hoppy, citrus, flagship"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="text-sm bg-blue-600 text-white font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Create Product'}
        </button>
        <button type="button" onClick={onCancel}
          className="text-sm bg-gray-100 text-gray-600 font-medium px-5 py-2 rounded-lg hover:bg-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

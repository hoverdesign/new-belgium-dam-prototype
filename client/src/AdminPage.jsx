import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const CATEGORIES = ['ale', 'ipa', 'sour', 'lager']
const SEASONS = ['year-round', 'spring', 'summer', 'fall', 'winter', 'limited']

const EMPTY_FORM = {
  productName: '',
  sku: '',
  category: 'ale',
  season: 'year-round',
  tags: '',
  imageUrl: '',
}

// -------------------------------------------------------
// Auth helpers — token stored in localStorage
// -------------------------------------------------------
function getToken() { return localStorage.getItem('dam_token') }
function setToken(t) { localStorage.setItem('dam_token', t) }
function clearToken() { localStorage.removeItem('dam_token') }

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
}

// Wraps fetch for authenticated requests — auto-clears token on 401
async function authFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...options.headers } })
  if (res.status === 401) {
    clearToken()
    window.location.reload()
    throw new Error('Session expired. Please log in again.')
  }
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
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setToken(data.token)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Login</h1>
        <p className="text-sm text-gray-400 mb-6">New Belgium Asset Library</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
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
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
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
// AssetForm — used for both create and edit
// -------------------------------------------------------
function AssetForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(initial?.imageUrl || '')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    // Show a local preview immediately while uploading
    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const body = new FormData()
      body.append('image', file)
      // Don't use authFetch here — FormData needs the browser to set
      // Content-Type: multipart/form-data automatically (with boundary).
      // Manually setting Content-Type breaks multer's parser.
      const res = await fetch('/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body,
      })
      if (res.status === 401) { clearToken(); window.location.reload(); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set('imageUrl', data.url)
      setPreview(data.url)
    } catch (err) {
      setError(`Upload failed: ${err.message}`)
      setPreview(form.imageUrl || '')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await onSave(form)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.productName}
            onChange={e => set('productName', e.target.value)}
            required
            placeholder="e.g. Voodoo Ranger IPA"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.sku}
            onChange={e => set('sku', e.target.value)}
            required
            placeholder="e.g. NBB-VR-001"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>

          {/* Upload area */}
          <label className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}>
            {preview ? (
              <div className="relative w-full">
                <img src={preview} alt="Cover preview" className="w-full h-40 object-contain bg-white p-3" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Click to replace</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-400">Click to upload an image</p>
                <p className="text-xs text-gray-300 mt-1">JPG, PNG, GIF, WebP, SVG · max 5 MB</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
          </label>

          {uploading && <p className="text-xs text-blue-500 mt-1">Uploading…</p>}

          {/* Manual URL fallback */}
          <div className="mt-2">
            <input
              type="url"
              value={form.imageUrl}
              onChange={e => { set('imageUrl', e.target.value); setPreview(e.target.value) }}
              placeholder="Or paste an image URL directly"
              className="w-full text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white capitalize"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Season <span className="text-red-500">*</span></label>
          <select
            value={form.season}
            onChange={e => set('season', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white capitalize"
          >
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input
            type="text"
            value={form.tags}
            onChange={e => set('tags', e.target.value)}
            placeholder="comma-separated, e.g. hoppy, citrus, flagship"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">Separate tags with commas.</p>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Asset'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium px-5 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// -------------------------------------------------------
// Main AdminPage
// -------------------------------------------------------
export default function AdminPage() {
  const [authed, setAuthed] = useState(!!getToken())
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'edit'
  const [editTarget, setEditTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadAssets() {
    setLoading(true)
    try {
      const res = await fetch('/assets')
      const data = await res.json()
      setAssets(data.assets)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authed) loadAssets()
  }, [authed])

  async function handleLogout() {
    try {
      await authFetch('/auth/logout', { method: 'POST' })
    } catch {}
    clearToken()
    setAuthed(false)
  }

  async function handleCreate(form) {
    setSaving(true)
    try {
      const res = await authFetch('/assets', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadAssets()
      setMode('list')
      showToast(`"${data.productName}" created.`)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(form) {
    setSaving(true)
    try {
      const res = await authFetch(`/assets/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadAssets()
      setMode('list')
      showToast(`"${data.productName}" updated.`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(asset) {
    if (!confirm(`Delete "${asset.productName}"? This cannot be undone.`)) return
    const res = await authFetch(`/assets/${asset.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) return showToast(data.error, 'error')
    await loadAssets()
    showToast(`"${asset.productName}" deleted.`)
  }

  if (!authed) return <LoginForm onLogin={() => setAuthed(true)} />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-400">New Belgium Asset Library</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-blue-500 hover:underline hidden sm:inline">
              ← Public library
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.msg}
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Create / Edit form */}
        {mode === 'create' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-5">New Asset</h2>
            <AssetForm
              onSave={handleCreate}
              onCancel={() => setMode('list')}
              saving={saving}
            />
          </div>
        )}

        {mode === 'edit' && editTarget && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Edit Asset</h2>
            <AssetForm
              initial={{ ...editTarget, tags: editTarget.tags.join(', ') }}
              onSave={handleEdit}
              onCancel={() => { setMode('list'); setEditTarget(null) }}
              saving={saving}
            />
          </div>
        )}

        {/* Asset list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-900">
              {loading ? 'Loading…' : `${assets.length} asset${assets.length !== 1 ? 's' : ''}`}
            </p>
            {mode === 'list' && (
              <button
                onClick={() => setMode('create')}
                className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                + New Asset
              </button>
            )}
          </div>

          {/* Table — scrollable on mobile */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">SKU</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Season</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets.map(asset => (
                  <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={asset.imageUrl}
                          alt={asset.productName}
                          className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 shrink-0 border border-gray-100"
                        />
                        <span className="font-medium text-gray-900 leading-tight">{asset.productName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden sm:table-cell">{asset.sku}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="capitalize bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{asset.category}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize hidden md:table-cell">{asset.season}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setEditTarget(asset); setMode('edit') }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(asset)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

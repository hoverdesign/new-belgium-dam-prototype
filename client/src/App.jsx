import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import AdminPage from './AdminPage.jsx'
import AssetDetailPage from './AssetDetailPage.jsx'
import AddAssetPage from './AddAssetPage.jsx'

const CATEGORIES = ['all', 'ale', 'ipa', 'sour', 'lager']

const SEASON_COLORS = {
  'year-round': 'bg-blue-100 text-blue-700',
  'summer':     'bg-yellow-100 text-yellow-700',
  'winter':     'bg-indigo-100 text-indigo-700',
  'spring':     'bg-green-100 text-green-700',
  'fall':       'bg-orange-100 text-orange-700',
  'limited':    'bg-purple-100 text-purple-700',
}

function AssetCard({ asset }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/product/${asset.id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <img
        src={asset.imageUrl}
        alt={asset.productName}
        className="w-full aspect-square object-contain bg-white p-4"
      />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <h2 className="text-gray-900 font-semibold text-base leading-tight">{asset.productName}</h2>
          <p className="text-gray-400 text-xs mt-0.5 font-mono">{asset.sku}</p>
        </div>

        <span className={`self-start text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SEASON_COLORS[asset.season] ?? 'bg-gray-100 text-gray-600'}`}>
          {asset.season}
        </span>

        <div className="flex flex-wrap gap-1 mt-auto pt-2">
          {asset.tags.map(tag => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [assets, setAssets] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchAssets(url) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      setAssets(data.assets)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Load all assets on first render
  useEffect(() => {
    fetchAssets('/assets')
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    if (!searchInput.trim()) return
    setActiveCategory('all')
    fetchAssets(`/assets/search?q=${encodeURIComponent(searchInput.trim())}`)
  }

  function handleCategoryClick(category) {
    setActiveCategory(category)
    setSearchInput('')
    if (category === 'all') {
      fetchAssets('/assets')
    } else {
      fetchAssets(`/assets/filter?category=${category}`)
    }
  }

  return (
    <Routes>
      <Route path="/admin/*" element={<AdminPage />} />
      <Route path="/admin/product/:id/add-asset" element={<AddAssetPage />} />
      <Route path="/product/:id" element={<AssetDetailPage />} />
      <Route path="/*" element={<PublicLibrary assets={assets} loading={loading} error={error} searchInput={searchInput} setSearchInput={setSearchInput} activeCategory={activeCategory} handleSearch={handleSearch} handleCategoryClick={handleCategoryClick} />} />
    </Routes>
  )
}

function PublicLibrary({ assets, loading, error, searchInput, setSearchInput, activeCategory, handleSearch, handleCategoryClick }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="shrink-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">New Belgium Asset Library</h1>
            <p className="text-xs text-gray-400 mt-0.5">Mock DAM · {assets.length} assets</p>
          </div>

          {/* Search — full width on mobile, capped on larger screens */}
          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:flex-1 sm:max-w-md sm:ml-auto">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by name, SKU, or tag…"
              className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              className="shrink-0 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Search
            </button>
          </form>
        </div>

        {/* Category filters — horizontally scrollable on mobile */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`shrink-0 text-sm px-4 py-1.5 rounded-full font-medium capitalize transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading && (
          <p className="text-center text-gray-400 py-16">Loading assets…</p>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-red-500 font-medium">Could not load assets</p>
            <p className="text-gray-400 text-sm mt-1">{error}</p>
            <p className="text-gray-400 text-sm">Make sure the API server is running on port 3000.</p>
          </div>
        )}

        {!loading && !error && assets.length === 0 && (
          <p className="text-center text-gray-400 py-16">No assets found.</p>
        )}

        {!loading && !error && assets.length > 0 && (
          <>
            <p className="text-sm text-gray-400 mb-4">Showing {assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {assets.map(asset => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

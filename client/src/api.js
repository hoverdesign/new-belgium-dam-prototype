// Local data layer — no backend required.
// All reads are performed against the bundled asset list.
// The app works fully as a static site on Vercel.

import assets from './data/assets.js'

export function getAllAssets() {
  return assets
}

export function searchAssets(query) {
  const kw = query.toLowerCase().trim()
  if (!kw) return assets
  return assets.filter(a =>
    a.productName.toLowerCase().includes(kw) ||
    a.sku.toLowerCase().includes(kw) ||
    a.tags.some(t => t.toLowerCase().includes(kw))
  )
}

export function filterAssets(category) {
  if (!category || category === 'all') return assets
  return assets.filter(a => a.category.toLowerCase() === category.toLowerCase())
}

export function getAsset(id) {
  return assets.find(a => a.id === Number(id)) ?? null
}

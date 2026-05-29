export const PRODUCTS = [
  { id: 'vein',       name: 'Vein',       status: 'live' as const, version: 'v1.4 · in progress', colorClass: 'peri',  url: 'https://vein.taliaduvet.com'   },
  { id: 'ledger',     name: 'Ledger',     status: 'beta' as const, version: 'v0.9 · in progress', colorClass: 'mauv',  url: 'https://ledger.taliaduvet.com' },
  { id: 'production', name: 'Production', status: 'soon' as const, version: 'concept phase',       colorClass: 'peach', url: ''                              },
]

export const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p])) as Record<string, typeof PRODUCTS[number]>

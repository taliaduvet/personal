export const T2125_CATEGORIES = [
  { id: '8521', label: 'Advertising' },
  { id: '8590', label: 'Bad debts' },
  { id: '8760', label: 'Business taxes and fees' },
  { id: '8760-licenses', label: 'Licenses / Subscriptions (CRA line 8760)' },
  { id: '8360', label: 'Sub-contractors' },
  { id: '8690', label: 'Insurance' },
  { id: '8710', label: 'Interest' },
  { id: '8860', label: 'Legal and professional services' },
  { id: '8871', label: 'Management and admin fees' },
  { id: '8960', label: 'Maintenance and repairs' },
  { id: '8910', label: 'Rent' },
  { id: '8810', label: 'Office expenses' },
  { id: '8811', label: 'Supplies' },
  { id: '8523', label: 'Meals and entertainment' },
  { id: '9060', label: 'Salaries and wages' },
  { id: '9224', label: 'Fuel (non-auto)' },
  { id: '9275', label: 'Delivery and freight' },
  { id: '9281', label: 'Motor vehicle expenses' },
  { id: '9200', label: 'Travel' },
  { id: '9220', label: 'Phone/Utilities/Internet/Rent' },
  { id: '9936', label: 'Capital cost allowance (CCA)' },
  { id: '9270', label: 'Other' },
  { id: 'personal', label: 'Personal (non-business)' },
  { id: 'medical', label: 'Medical (personal)' }
];

export const INCOME_TYPES = [
  { id: 'gig', label: 'Gigs / performance' },
  { id: 'royalties', label: 'Royalties' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'sync', label: 'Sync / licensing' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'merch', label: 'Merch' },
  { id: 'contract', label: 'Contract work' },
  { id: 'other', label: 'Other' }
];

export const INCOME_TYPE_IDS = new Set(INCOME_TYPES.map(t => t.id));

export function categoryDisplayLabel(cat) {
  return cat ? cat.label + ' (' + cat.id + ')' : '';
}

export function isBusinessExpense(category) {
  return category !== 'personal' && category !== 'medical';
}

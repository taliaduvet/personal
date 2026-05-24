import type { Tag, VeinData } from './types'

export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function findTagByName(data: VeinData, name: string): Tag | undefined {
  const key = normalizeTagName(name).toLowerCase()
  if (!key) return undefined
  return data.tags.find((t) => t.name.toLowerCase() === key)
}

export function getTagsForIds(data: VeinData, tagIds: string[]): Tag[] {
  return tagIds
    .map((id) => data.tags.find((t) => t.id === id))
    .filter((t): t is Tag => !!t)
}

export function tagNamesForIds(data: VeinData, tagIds: string[]): string[] {
  return getTagsForIds(data, tagIds).map((t) => t.name)
}

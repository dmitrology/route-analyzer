import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
  })
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  
  const endStr = end.toLocaleDateString('en-US', {
    month: 'short', 
    day: 'numeric',
  })
  
  return `${startStr} - ${endStr}`
}

export function getDaysFromNow(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function getRarityLabel(rarity: number): string {
  if (rarity <= 0.1) return 'Extremely Rare'
  if (rarity <= 0.25) return 'Very Rare'
  if (rarity <= 0.5) return 'Rare'
  if (rarity <= 0.75) return 'Uncommon'
  return 'Common'
}

export function getRarityColor(rarity: number): string {
  if (rarity <= 0.1) return 'text-red-600 bg-red-50'
  if (rarity <= 0.25) return 'text-orange-600 bg-orange-50' 
  if (rarity <= 0.5) return 'text-yellow-600 bg-yellow-50'
  if (rarity <= 0.75) return 'text-blue-600 bg-blue-50'
  return 'text-gray-600 bg-gray-50'
} 
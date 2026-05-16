import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M'
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    file: '#3b82f6',
    class: '#8b5cf6',
    function: '#10b981',
    variable: '#f59e0b',
    interface: '#ef4444',
    method: '#ec4899',
  }
  return colors[type] || '#64748b'
}

export function getTypeName(type: string): string {
  const names: Record<string, string> = {
    file: '文件',
    class: '类',
    function: '函数',
    variable: '变量',
    interface: '接口',
    method: '方法',
  }
  return names[type] || type
}

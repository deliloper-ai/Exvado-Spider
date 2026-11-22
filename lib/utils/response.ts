import { NextResponse } from 'next/server'

export function success<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function paginated<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number }
) {
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
    },
  })
}

export function error(message: string, status: number = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

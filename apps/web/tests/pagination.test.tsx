import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Pagination } from '../src/components/shared/pagination'

afterEach(cleanup)

describe('Pagination', () => {
  test('shows the visible range and disables Previous on the first page', () => {
    render(<Pagination page={1} pageSize={20} total={45} onPageChange={() => {}} />)

    expect(screen.getByText('Showing 1–20 of 45')).toBeDefined()
    expect(screen.getByText('Page 1 of 3')).toBeDefined()
    expect((screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(false)
  })

  test('moves between pages and resets to page one when page size changes', () => {
    const pages: number[] = []
    render(
      <Pagination
        page={2}
        pageSize={20}
        total={45}
        onPageChange={(page) => pages.push(page)}
        onPageSizeChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } })

    expect(pages).toEqual([3, 1, 1])
  })
})

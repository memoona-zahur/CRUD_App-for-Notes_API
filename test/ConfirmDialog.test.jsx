import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from '../src/components/ConfirmDialog.jsx'

describe('ConfirmDialog', () => {
  test('renders the message and confirm label', () => {
    render(
      <ConfirmDialog
        title="Delete this note?"
        message="This cannot be undone."
        confirmLabel="Delete note"
        onConfirm={() => {}}
        onCancel={() => {}}
        busy={false}
      />,
    )

    expect(screen.getByRole('alertdialog', { name: 'Delete this note?' })).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete note' })).toBeInTheDocument()
  })

  test('confirm calls onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <ConfirmDialog
        title="Delete this note?"
        message="This cannot be undone."
        onConfirm={onConfirm}
        onCancel={() => {}}
        busy={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalled()
  })

  test('cancel calls onCancel, not onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        title="Delete this note?"
        message="This cannot be undone."
        onConfirm={onConfirm}
        onCancel={onCancel}
        busy={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('Escape cancels', () => {
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        title="Delete this note?"
        message="This cannot be undone."
        onConfirm={() => {}}
        onCancel={onCancel}
        busy={false}
      />,
    )

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onCancel).toHaveBeenCalled()
  })
})

import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NoteFormModal from '../src/components/NoteFormModal.jsx'

describe('NoteFormModal', () => {
  test('create mode starts blank and submits trimmed values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<NoteFormModal note={null} onSubmit={onSubmit} onClose={() => {}} submitting={false} />)

    expect(screen.getByRole('heading', { name: 'New note' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('')
    expect(screen.getByLabelText('Body')).toHaveValue('')

    await user.type(screen.getByLabelText('Title'), '  Grocery list  ')
    await user.type(screen.getByLabelText('Body'), '  milk and eggs  ')
    await user.click(screen.getByRole('button', { name: 'Create note' }))

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Grocery list', body: 'milk and eggs' })
  })

  test('edit mode starts pre-filled with the note being edited', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const note = { id: 7, title: 'Existing title', body: 'Existing body' }

    render(<NoteFormModal note={note} onSubmit={onSubmit} onClose={() => {}} submitting={false} />)

    expect(screen.getByRole('heading', { name: 'Edit note' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Existing title')
    expect(screen.getByLabelText('Body')).toHaveValue('Existing body')

    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Edited title')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Edited title', body: 'Existing body' })
  })

  test('cancel button closes without submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onClose = vi.fn()

    render(<NoteFormModal note={null} onSubmit={onSubmit} onClose={onClose} submitting={false} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('Escape closes the dialog', () => {
    const onClose = vi.fn()

    render(<NoteFormModal note={null} onSubmit={() => {}} onClose={onClose} submitting={false} />)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(onClose).toHaveBeenCalled()
  })
})

import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '../src/api.js'
import Login from '../src/components/Login.jsx'

vi.mock('../src/api.js', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
  },
}))

describe('Login', () => {
  test('signs in with email/password and passes the token up', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    api.login.mockResolvedValue({ access_token: 'jwt-abc' })

    render(<Login onLogin={onLogin} />)

    await user.type(screen.getByLabelText('Email address'), 'a@b.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in to Notes' }))

    expect(api.login).toHaveBeenCalledWith('a@b.com', 'password123')
    expect(onLogin).toHaveBeenCalledWith('jwt-abc', 'a@b.com')
  })

  test('creates an account then auto-signs-in, passing the token up', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    api.register.mockResolvedValue({ id: 1, email: 'a@b.com' })
    api.login.mockResolvedValue({ access_token: 'jwt-new' })

    render(<Login onLogin={onLogin} />)

    await user.click(screen.getByRole('button', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Email address'), 'a@b.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create my account' }))

    expect(api.register).toHaveBeenCalledWith('a@b.com', 'password123')
    expect(api.login).toHaveBeenCalledWith('a@b.com', 'password123')
    expect(onLogin).toHaveBeenCalledWith('jwt-new', 'a@b.com')
  })

  test('shows the backend error message on a failed sign-in', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    const error = new Error('Incorrect email or password')
    error.status = 401
    api.login.mockRejectedValue(error)

    render(<Login onLogin={onLogin} />)

    await user.type(screen.getByLabelText('Email address'), 'a@b.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in to Notes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password')
    expect(onLogin).not.toHaveBeenCalled()
  })

  test('shows an initial error (e.g. session expired) passed from the parent', () => {
    render(<Login onLogin={() => {}} initialError="Your session has expired. Please log in again." />)

    expect(screen.getByRole('alert')).toHaveTextContent('Your session has expired')
  })

  test('toggles the password field between hidden and visible', async () => {
    const user = userEvent.setup()

    render(<Login onLogin={() => {}} />)

    const passwordInput = screen.getByLabelText('Password')
    expect(passwordInput).toHaveAttribute('type', 'password')

    const toggle = screen.getByRole('button', { name: 'Show password' })
    await user.click(toggle)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})

import { useEffect, useState } from 'react'

const customerTokenKey = 'raacaseCustomerToken'
const customerKey = 'raacaseCustomer'
const customerSessionEvent = 'raacase-customer-session'

function getStoredCustomer() {
  try {
    return JSON.parse(sessionStorage.getItem(customerKey) || 'null')
  } catch {
    return null
  }
}

function LoginPage() {
  const [customer, setCustomer] = useState(getStoredCustomer)
  const [email, setEmail] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [authMethod, setAuthMethod] = useState('password')
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationCodeRequested, setRegistrationCodeRequested] = useState(false)
  const [registrationCode, setRegistrationCode] = useState('')
  const [code, setCode] = useState('')
  const [codeRequested, setCodeRequested] = useState(false)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem(customerTokenKey)
    if (!token) return undefined

    let isActive = true
    fetch('/api/auth/customer/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Customer session expired.')
        return response.json()
      })
      .then((currentCustomer) => {
        if (!isActive) return
        sessionStorage.setItem(customerKey, JSON.stringify(currentCustomer))
        setCustomer(currentCustomer)
      })
      .catch(() => {
        sessionStorage.removeItem(customerTokenKey)
        sessionStorage.removeItem(customerKey)
        if (isActive) setCustomer(null)
      })

    return () => {
      isActive = false
    }
  }, [])

  const saveSession = (result) => {
    sessionStorage.setItem(customerTokenKey, result.token)
    sessionStorage.setItem(customerKey, JSON.stringify(result.customer))
    window.dispatchEvent(new CustomEvent(customerSessionEvent, { detail: result.token }))
    setCustomer(result.customer)
    setStatus('')
  }

  const readError = async (response, fallback) => {
    const result = await response.json()
    const message = Array.isArray(result.message) ? result.message.join(' ') : result.message
    return new Error(message || fallback)
  }

  const requestCode = async (event) => {
    event?.preventDefault()
    setStatus('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/customer/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) throw await readError(response, 'Could not send a sign-in code.')

      setCodeRequested(true)
      setStatus('Check your email for the 6-digit sign-in code.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send a sign-in code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyCode = async (event) => {
    event.preventDefault()
    setStatus('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/customer/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, name }),
      })
      if (!response.ok) throw await readError(response, 'Could not verify the code.')
      saveSession(await response.json())
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not verify the code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitPassword = async (event) => {
    event.preventDefault()
    setStatus('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/auth/customer/${isRegistering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isRegistering
          ? { email, code: registrationCode, name, phone: phone.trim() || undefined, password }
          : { identifier, password }),
      })
      if (!response.ok) throw await readError(response, 'Could not sign in.')
      saveSession(await response.json())
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sign in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestRegistrationCode = async (event) => {
    event?.preventDefault()
    setStatus('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/customer/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) throw await readError(response, 'Could not send an email verification code.')
      setRegistrationCodeRequested(true)
      setStatus('Check your email for the 6-digit verification code.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send an email verification code.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitPasswordForm = (event) => {
    if (isRegistering && !registrationCodeRequested) {
      return requestRegistrationCode(event)
    }
    return submitPassword(event)
  }

  const logout = async () => {
    setStatus('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/customer/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionStorage.getItem(customerTokenKey)}` },
      })
      if (!response.ok) throw await readError(response, 'Could not sign out. Please try again.')
      sessionStorage.removeItem(customerTokenKey)
      sessionStorage.removeItem(customerKey)
      window.dispatchEvent(new CustomEvent(customerSessionEvent, { detail: '' }))
      setCustomer(null)
      setCodeRequested(false)
      setCode('')
      setPassword('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sign out. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="account-login-page section-page">
      <div className="account-login-card">
        <span className="section-label">Raacase account</span>
        {customer ? (
          <>
            <h1>Welcome, {customer.name}</h1>
            <p className="account-login-copy">You’re signed in as {customer.email || customer.phone}.</p>
            <button className="primary-button" type="button" onClick={logout} disabled={isSubmitting}>
              {isSubmitting ? 'Signing out…' : 'Sign out'}
            </button>
            {status && <p className="contact-status" role="status">{status}</p>}
          </>
        ) : (
          <>
            <h1>Sign in or create an account</h1>
            <p className="account-login-copy">Use email and password, or choose an email sign-in code.</p>
            <div className="account-login-links">
              <button
                className="account-login-link"
                type="button"
                aria-pressed={authMethod === 'password'}
                onClick={() => { setAuthMethod('password'); setStatus('') }}
              >
                Email and password
              </button>
              <button
                className="account-login-link"
                type="button"
                aria-pressed={authMethod === 'code'}
                onClick={() => { setAuthMethod('code'); setStatus('') }}
              >
                Email code
              </button>
            </div>
            {authMethod === 'password' ? (
              <form className="contact-form" onSubmit={submitPasswordForm}>
                {isRegistering ? (
                  <>
                    <div className="form-row">
                      <label htmlFor="customer-name">Name</label>
                      <input
                        id="customer-name"
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor="customer-email-register">Email</label>
                      <input
                        id="customer-email-register"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor="customer-phone">Phone <span>(optional; sign-in after SMS verification is set up)</span></label>
                      <input
                        id="customer-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+15551234567"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                    </div>
                    {registrationCodeRequested && (
                      <div className="form-row">
                        <label htmlFor="customer-registration-code">Email verification code</label>
                        <input
                          id="customer-registration-code"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          value={registrationCode}
                          onChange={(event) => setRegistrationCode(event.target.value.replace(/\D/g, ''))}
                          required
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="form-row">
                    <label htmlFor="customer-identifier">Email or phone</label>
                    <input
                      id="customer-identifier"
                      autoComplete="username"
                      placeholder="Email (phone sign-in requires SMS verification)"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="form-row">
                  <label htmlFor="customer-password">Password</label>
                  <input
                    id="customer-password"
                    type="password"
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <button className="primary-button form-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? 'Please wait…'
                    : isRegistering
                      ? registrationCodeRequested ? 'Verify email and create account' : 'Send verification code'
                      : 'Sign in'}
                </button>
                {isRegistering && registrationCodeRequested && (
                  <button className="account-login-link" type="button" onClick={requestRegistrationCode} disabled={isSubmitting}>
                    Resend verification code
                  </button>
                )}
                <button className="account-login-link" type="button" onClick={() => {
                  setIsRegistering(!isRegistering)
                  setRegistrationCodeRequested(false)
                  setRegistrationCode('')
                  setStatus('')
                }}>
                  {isRegistering ? 'Already have an account? Sign in' : 'New customer? Create an account'}
                </button>
                {status && <p className="contact-status" role="status">{status}</p>}
              </form>
            ) : (
              <form className="contact-form" onSubmit={codeRequested ? verifyCode : requestCode}>
                {!codeRequested ? (
                  <div className="form-row">
                    <label htmlFor="customer-email">Email</label>
                    <input
                      id="customer-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-row">
                      <label htmlFor="customer-name-code">Name <span>(new customers)</span></label>
                      <input
                        id="customer-name-code"
                        autoComplete="name"
                        placeholder="Your name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor="customer-code">Email code</label>
                      <input
                        id="customer-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="6-digit code"
                        value={code}
                        onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>
                  </>
                )}
                <button className="primary-button form-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait…' : codeRequested ? 'Verify and sign in' : 'Email me a code'}
                </button>
                {codeRequested && (
                  <div className="account-login-links">
                    <button className="account-login-link" type="button" onClick={() => requestCode()}>
                      Resend code
                    </button>
                    <button className="account-login-link" type="button" onClick={() => { setCodeRequested(false); setStatus('') }}>
                      Use a different email
                    </button>
                  </div>
                )}
                {status && <p className="contact-status" role="status">{status}</p>}
              </form>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default LoginPage

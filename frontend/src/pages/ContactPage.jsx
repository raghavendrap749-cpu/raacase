import { useState } from 'react'

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [status, setStatus] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('Sending your message…')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Unable to send message')
      }

      setStatus('Thanks! Your message has been sent.')
      setFormData({ name: '', email: '', message: '' })
    } catch {
      setStatus('We could not send your message. Please try again later.')
    }
  }

  return (
    <section className="contact-page section-page">
      <div className="section-heading centered">
        <span className="section-label">Contact Us</span>
        <h1>We are here to help.</h1>
      </div>

      <div className="contact-grid">
        <div className="contact-info">
          <div className="contact-card">
            <span className="contact-icon">☎</span>
            <div>
              <span className="contact-label">Customer Support</span>
              <span className="contact-value">+91 9986974526</span>
            </div>
          </div>
          <div className="contact-card">
            <span className="contact-icon">✉</span>
            <div>
              <span className="contact-label">Email</span>
              <span className="contact-value">raacase.18@gmail.com</span>
            </div>
          </div>
          <div className="contact-card">
            <span className="contact-icon">◎</span>
            <div>
              <span className="contact-label">Instagram</span>
              <a className="contact-value" href="https://www.instagram.com/raacase.18?stkn=NHNwOTdsdmlqNmx2&utm_source=qr" target="_blank" rel="noreferrer">@raacase.18</a>
            </div>
          </div>
          <div className="contact-card">
            <span className="contact-icon">⌕</span>
            <div>
              <span className="contact-label">Since</span>
              <span className="contact-value">2026</span>
            </div>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" placeholder="Your name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="Your email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <label htmlFor="message">Message</label>
            <textarea id="message" name="message" rows="5" placeholder="How can we help?" value={formData.message} onChange={handleChange} required />
          </div>
          <button className="primary-button form-button" type="submit">Send Message</button>
          {status && <p className="contact-status">{status}</p>}
        </form>
      </div>
    </section>
  )
}

export default ContactPage

import { useEffect, useRef, useState } from 'react'
import './App.css'
import HomePage from './pages/HomePage.jsx'
import ShopPage from './pages/ShopPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { addProductToCart, getCartCount, getCartTotal, mergeCarts, removeCartItemByProductId, updateCartItemQuantity } from './data/cartUtils.js'

const customerTokenKey = 'raacaseCustomerToken'
const customerSessionEvent = 'raacase-customer-session'

function getPageFromLocation() {
  if (window.location.pathname.replace(/\/+$/, '') === '/admin') return 'admin'
  return new URLSearchParams(window.location.search).has('product') ? 'shop' : 'home'
}

function App() {
  const [activePage, setActivePage] = useState(getPageFromLocation)
  const [cart, setCart] = useState([])
  const [customerToken, setCustomerToken] = useState(() => sessionStorage.getItem(customerTokenKey) || '')
  const [cartReadyToken, setCartReadyToken] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [theme, setTheme] = useState('light')
  const [searchTerm, setSearchTerm] = useState('')
  const [notifications, setNotifications] = useState([])
  const cartSaveQueue = useRef(Promise.resolve())

  const navigateToPage = (nextPage) => {
    if (activePage === 'admin' && nextPage !== 'admin') {
      const token = sessionStorage.getItem('raacaseAdminToken')
      sessionStorage.removeItem('raacaseAdminToken')
      if (token) {
        fetch('/api/auth/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
      window.history.pushState({}, '', '/')
    } else if (nextPage === 'admin' && getPageFromLocation() !== 'admin') {
      window.history.pushState({}, '', '/admin')
    }
    setActivePage(nextPage)
  }

  useEffect(() => {
    const handlePopState = () => {
      if (activePage === 'admin' && getPageFromLocation() !== 'admin') {
        const token = sessionStorage.getItem('raacaseAdminToken')
        sessionStorage.removeItem('raacaseAdminToken')
        if (token) {
          fetch('/api/auth/admin/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {})
        }
      }
      setActivePage(getPageFromLocation())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [activePage])

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setNotifications((current) => [...current, { id, message, type }])

    window.setTimeout(() => {
      setNotifications((current) => current.filter((notification) => notification.id !== id))
    }, 2400)
  }

  useEffect(() => {
    const handleCustomerSession = (event) => {
      const nextToken = event.detail || ''
      setCustomerToken(nextToken)
      setCartReadyToken('')
      if (!nextToken) setCart([])
    }

    window.addEventListener(customerSessionEvent, handleCustomerSession)
    return () => window.removeEventListener(customerSessionEvent, handleCustomerSession)
  }, [])

  useEffect(() => {
    if (!customerToken) return undefined

    let active = true
    fetch('/api/auth/customer/cart', {
      headers: { Authorization: `Bearer ${customerToken}` },
    })
      .then(async (response) => {
        const result = await response.json().catch(() => null)
        if (!response.ok) throw new Error(result?.message || 'Could not load your saved cart.')
        return result
      })
      .then((savedCart) => {
        if (!active) return
        setCart((currentCart) => mergeCarts(savedCart, currentCart))
        setCartReadyToken(customerToken)
      })
      .catch((error) => {
        if (active) showToast(error instanceof Error ? error.message : 'Could not load your saved cart.', 'error')
      })

    return () => {
      active = false
    }
  }, [customerToken])

  useEffect(() => {
    if (!customerToken || cartReadyToken !== customerToken) return undefined

    const cartSnapshot = cart.map((item) => ({
      productId: item.product.id,
      selectedModel: item.product.selectedModel || '',
      quantity: item.quantity,
    }))
    const timeoutId = window.setTimeout(() => {
      cartSaveQueue.current = cartSaveQueue.current
        .catch(() => {})
        .then(async () => {
          const response = await fetch('/api/auth/customer/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
            body: JSON.stringify({ items: cartSnapshot }),
          })
          if (!response.ok) {
            const result = await response.json().catch(() => null)
            throw new Error(result?.message || 'Could not save your cart.')
          }
        })
        .catch((error) => {
          showToast(error instanceof Error ? error.message : 'Could not save your cart.', 'error')
        })
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [cart, cartReadyToken, customerToken])

  const addToCart = (product) => {
    setCart((currentCart) => addProductToCart(currentCart, product))
    const modelLabel = product.selectedModel ? ` for ${product.selectedModel}` : ''
    showToast(`${product.name}${modelLabel} added to cart`, 'success')
  }

  const removeFromCart = (productId, selectedModel) => {
    setCart((currentCart) => removeCartItemByProductId(currentCart, productId, selectedModel))
    showToast('Item removed from cart', 'info')
  }

  const updateCartQuantity = (productId, quantity, selectedModel) => {
    setCart((currentCart) => updateCartItemQuantity(currentCart, productId, quantity, selectedModel))
  }

  return (
    <div className={`store-app theme-${theme}`}>
      <SiteHeader
        activePage={activePage}
        setActivePage={navigateToPage}
        cartCount={getCartCount(cart)}
        theme={theme}
        setTheme={setTheme}
        onCartOpen={() => setCartOpen(true)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      <main className="app-main">
        {activePage === 'home' && <HomePage setActivePage={navigateToPage} addToCart={addToCart} />}
        {activePage === 'shop' && <ShopPage addToCart={addToCart} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
        {activePage === 'about' && <AboutPage />}
        {activePage === 'contact' && <ContactPage />}
        {activePage === 'login' && <LoginPage />}
        {activePage === 'admin' && <AdminPage />}
      </main>
      <SiteFooter setActivePage={navigateToPage} />
      {cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          removeFromCart={removeFromCart}
          updateCartQuantity={updateCartQuantity}
          getCartTotal={getCartTotal}
        />
      )}
      <ToastStack notifications={notifications} />
    </div>
  )
}

function ToastStack({ notifications }) {
  if (!notifications.length) return null

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {notifications.map((notification) => (
        <div key={notification.id} className={`toast-item ${notification.type}`}>
          <span className="toast-dot" />
          <span>{notification.message}</span>
        </div>
      ))}
    </div>
  )
}

function SiteHeader({ activePage, setActivePage, cartCount, theme, setTheme, onCartOpen, searchTerm, setSearchTerm }) {
  return (
    <header className="site-header">
      <div className="brand-wrap">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault()
            setActivePage('home')
          }}
        >
          <span className="brand-text">raacase</span>
        </a>
      </div>

      <nav className="main-nav">
        <button className={activePage === 'home' ? 'active' : ''} onClick={() => setActivePage('home')}>Home</button>
        <button className={activePage === 'shop' ? 'active' : ''} onClick={() => setActivePage('shop')}>Shop</button>
        <button className={activePage === 'about' ? 'active' : ''} onClick={() => setActivePage('about')}>About</button>
        <button className={activePage === 'contact' ? 'active' : ''} onClick={() => setActivePage('contact')}>Contact</button>
        <button className={activePage === 'login' ? 'active' : ''} onClick={() => setActivePage('login')}>Sign in</button>
      </nav>

      <div className="header-actions">
        <div className="header-search">
          <span className="search-icon">⌕</span>
          <input
            className="header-search-input"
            type="text"
            value={searchTerm}
            placeholder="Search products"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className="theme-icon">{theme === 'dark' ? '☀' : '☾'}</span>
          <span className="theme-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        <button className="cart-button" onClick={onCartOpen}>
          <span className="cart-icon">🛒</span>
          <span className="cart-count">{cartCount}</span>
        </button>
      </div>
    </header>
  )
}

function CartDrawer({ cart, onClose, removeFromCart, updateCartQuantity, getCartTotal }) {
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(false)

  const cartTotal = getCartTotal(cart)
  const normalizedCoupon = couponCode.trim().toUpperCase()
  const validCoupon = normalizedCoupon === 'RAACASE10'
  const couponDiscount = appliedCoupon && validCoupon ? Math.round(cartTotal * 0.10) : 0
  const finalTotal = Math.max(cartTotal - couponDiscount, 0)

  const checkoutText = encodeURIComponent(
    `Hi Raacase, I want to buy these back covers: ${cart.map((item) => `${item.product.name}${item.product.selectedModel ? ` for ${item.product.selectedModel}` : ''} x${item.quantity} - ₹${item.product.price}`).join(', ')}. Subtotal: ₹${cartTotal}. Coupon: ${appliedCoupon && validCoupon ? 'RAACASE10 applied' : 'No coupon applied'}. Discount: ₹${couponDiscount}. Final total: ₹${finalTotal}.`
  )

  return (
    <div className="cart-backdrop" onClick={onClose}>
      <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="cart-drawer-head">
          <div>
            <span className="cart-drawer-label">Raacase Cart</span>
            <h2>My Back Covers</h2>
          </div>
          <button className="cart-close" onClick={onClose}>×</button>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <span className="cart-empty-icon">🛒</span>
            <p>Your cart is empty.</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item) => {
                const selectedModel = item.product.selectedModel || ''
                const itemLabel = `${item.product.name}${selectedModel ? ` for ${selectedModel}` : ''}`

                return (
                <div className="cart-item" key={`${item.product.id}-${selectedModel || 'default'}`}>
                  <img
                    className="cart-thumb"
                    src={item.product.images ? item.product.images[0] : item.product.image}
                    alt={item.product.name}
                  />
                  <div className="cart-item-copy">
                    <span className="cart-item-name">{item.product.name}</span>
                    {selectedModel && <span className="cart-item-model">Phone model: {selectedModel}</span>}
                    <span className="cart-item-category">{item.product.category}</span>
                    <div className="quantity-control" aria-label={`Quantity for ${itemLabel}`}>
                      <button type="button" onClick={() => updateCartQuantity(item.product.id, item.quantity - 1, selectedModel)} aria-label={`Decrease ${itemLabel} quantity`}>−</button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button type="button" onClick={() => updateCartQuantity(item.product.id, item.quantity + 1, selectedModel)} aria-label={`Increase ${itemLabel} quantity`}>+</button>
                    </div>
                    <span className="cart-item-price">₹{item.product.price} × {item.quantity}</span>
                  </div>
                  <button className="cart-remove" onClick={() => removeFromCart(item.product.id, selectedModel)} aria-label={`Remove ${itemLabel}`}>×</button>
                </div>
                )
              })}
            </div>

            <div className="cart-coupon-section">
              <div className="cart-coupon-head">
                <span className="cart-coupon-label">Raacase Offer</span>
                <span className="cart-coupon-code">RAACASE10</span>
              </div>
              <div className="cart-coupon-form">
                <input
                  type="text"
                  className="cart-coupon-input"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Enter coupon code"
                />
                <button className="cart-coupon-button" onClick={() => setAppliedCoupon(true)}>Apply</button>
              </div>
              {appliedCoupon && (
                <span className={validCoupon ? 'cart-coupon-message success' : 'cart-coupon-message error'}>
                  {validCoupon ? 'RAACASE10 applied' : 'Invalid coupon'}
                </span>
              )}
            </div>

            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span className="cart-total">₹{cartTotal}</span>
              </div>
              {appliedCoupon && validCoupon && (
                <div className="cart-summary-row">
                  <span>Discount</span>
                  <span className="cart-discount">-₹{couponDiscount}</span>
                </div>
              )}
              <div className="cart-summary-row final-row">
                <span>Final Total</span>
                <span className="cart-final-total">₹{finalTotal}</span>
              </div>
              <a className="checkout-button" href={`https://wa.me/919986974526?text=${checkoutText}`} target="_blank" rel="noreferrer">Checkout on WhatsApp</a>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

function SiteFooter({ setActivePage }) {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <span className="brand-text">raacase</span>
      </div>
      <div className="footer-links">
        <a href="#">Shipping</a>
        <a href="#">Returns</a>
        <a href="#" onClick={(event) => {
          event.preventDefault()
          setActivePage('contact')
        }}>Support</a>
        <a href="#">Instagram</a>
      </div>
      <span className="copyright">Since June 2026 • Raacase.18@gmail.com • +91 9986974526</span>
    </footer>
  )
}

export default App

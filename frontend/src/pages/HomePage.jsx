import { useEffect, useState } from 'react'

function HomePage({ setActivePage, addToCart }) {
  const [products, setProducts] = useState([])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products')
        if (!response.ok) {
          throw new Error(`Product request failed with status ${response.status}`)
        }

        const backendProducts = await response.json()
        if (Array.isArray(backendProducts)) {
          setProducts(backendProducts)
        }
      } catch (error) {
        console.error('Unable to load bestseller products.', error)
        setProducts([])
      }
    }

    loadProducts()
  }, [])

  const bestsellers = [...products]
    .filter((product) => Number(product.stockQuantity ?? 20) > 0)
    .sort((first, second) => Number(second.rating ?? 0) - Number(first.rating ?? 0))
    .slice(0, 4)

  const openProductInShop = (product) => {
    const url = new URL(window.location.href)
    url.searchParams.set('product', product.id)
    window.history.pushState({}, '', url)
    setActivePage('shop')
  }

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="section-label">Phone Back Covers Store</span>
          <h1>Back covers for your everyday style.</h1>
          <p className="hero-text">Discover soft-touch, printed, glossy, and minimalist back covers made to protect and personalize your phone.</p>
          <div className="hero-buttons">
            <button className="primary-button" onClick={() => setActivePage('shop')}>Shop Back Covers</button>
            <button className="secondary-button" onClick={() => setActivePage('about')}>Our Story</button>
          </div>
          <div className="hero-stats">
            <div>
              <span className="stat-number">{products.length}</span>
              <span className="stat-label">Available Styles</span>
            </div>
            <div>
              <span className="stat-number">48hr</span>
              <span className="stat-label">Express Delivery</span>
            </div>
            <div>
              <span className="stat-number">4.9</span>
              <span className="stat-label">Customer Rating</span>
            </div>
          </div>
        </div>

        <div className="hero-image-wrap">
          <div className="hero-card main-card">
            <div className="floating-card top-card">
              <span className="mini-icon">✦</span>
              <div>
                <span className="mini-title">Everyday fit</span>
                <span className="mini-price">Made for you</span>
              </div>
            </div>
            <div className="device-image">
              <span className="phone-orbit">✦</span>
              <div className="phone-frame">
                <span className="phone-inner">
                  <span className="phone-logo">raacase</span>
                  <span className="phone-icons">
                    <span>●</span>
                    <span>◌</span>
                    <span>◈</span>
                  </span>
                </span>
              </div>
              <div className="floating-tag tag-one">Soft</div>
              <div className="floating-tag tag-two">Grip</div>
            </div>
            <div className="floating-card bottom-card">
              <span className="mini-icon">⟡</span>
              <div>
                <span className="mini-title">Everyday protection</span>
                <span className="mini-price">Raacase</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="category-strip">
        <div className="category-card">
          <span className="category-icon">✦</span>
          <div>
            <span className="category-title">Soft Finish</span>
            <span className="category-copy">Smooth touch</span>
          </div>
        </div>
        <div className="category-card">
          <span className="category-icon">🎨</span>
          <div>
            <span className="category-title">Printed Editions</span>
            <span className="category-copy">Bold collection</span>
          </div>
        </div>
        <div className="category-card">
          <span className="category-icon">📱</span>
          <div>
            <span className="category-title">Daily Protection</span>
            <span className="category-copy">Slim design</span>
          </div>
        </div>
        <div className="category-card">
          <span className="category-icon">✤</span>
          <div>
            <span className="category-title">Premium Range</span>
            <span className="category-copy">Designer cases</span>
          </div>
        </div>
      </section>

      {bestsellers.length > 0 && (
        <section className="bestseller-section">
          <div className="section-heading">
            <div>
              <span className="section-label">Popular picks</span>
              <h2>Bestsellers</h2>
            </div>
            <button className="secondary-button" onClick={() => setActivePage('shop')}>Shop all</button>
          </div>
          <div className="bestseller-grid">
            {bestsellers.map((product) => (
              <article className="bestseller-card" key={product.id}>
                <button
                  className="bestseller-image-button"
                  onClick={() => openProductInShop(product)}
                  aria-label={`Browse ${product.name}`}
                >
                  <img
                    className="bestseller-image"
                    src={product.images?.[0] || product.image}
                    alt={product.name}
                    loading="lazy"
                  />
                  <span className="bestseller-badge">{product.badge || 'Popular pick'}</span>
                </button>
                <div className="bestseller-details">
                  <span className="bestseller-rating">★ {product.rating ?? 'New'}</span>
                  <h3>{product.name}</h3>
                  <div className="bestseller-footer">
                    <span className="bestseller-price">₹{product.price}</span>
                    <button
                      className="bestseller-add"
                      onClick={() => {
                        if (product.models?.length > 1) {
                          openProductInShop(product)
                          return
                        }
                        addToCart(product.models?.length
                          ? { ...product, selectedModel: product.models[0] }
                          : product)
                      }}
                    >
                      {product.models?.length > 1 ? 'Choose model' : 'Add to cart'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="home-feature">
        <div className="section-heading centered">
          <span className="section-label">Store Collection</span>
          <h2>Everyday back cover essentials.</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-icon">✦</span>
            <h3>Soft Protection</h3>
            <p>Soft-touch quality with grip and everyday phone protection.</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon">🎨</span>
            <h3>Fresh Designs</h3>
            <p>Bright patterns and premium finishes for every personal style.</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon">📲</span>
            <h3>Simple Fit</h3>
            <p>Lightweight back covers with a clean, stylish phone profile.</p>
          </article>
        </div>
      </section>
    </>
  )
}

export default HomePage

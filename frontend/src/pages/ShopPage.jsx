import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function getProductImages(product) {
  return product.images?.length ? product.images : [product.image]
}

function getImageUrl(source, width) {
  if (!source) return ''

  try {
    const url = new URL(source, 'http://local')
    if (url.pathname.startsWith('/api/uploads/')) {
      url.searchParams.set('w', String(width > 800 ? 1600 : 800))
      return `${url.pathname}${url.search}`
    }
    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('w', String(width))
      url.searchParams.set('fit', 'max')
      url.searchParams.set('fm', 'webp')
      url.searchParams.delete('auto')
      url.searchParams.delete('crop')
    }
    return url.toString()
  } catch {
    return source
  }
}

function getProductShareUrl(product) {
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('product', product.id)
  url.hash = ''
  return url.toString()
}

function ShareIcon() {
  return (
    <svg className="share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m8.5 10.7 7-3.6M8.5 13.3l7 3.6" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
    </svg>
  )
}

function getStockDetails(quantity = 20) {
  const stockQuantity = Number(quantity)
  if (stockQuantity <= 0) return { label: 'Out of stock', state: 'out' }
  if (stockQuantity <= 5) return { label: `Only ${stockQuantity} left`, state: 'low' }
  return { label: 'In stock', state: 'in' }
}

function ProductCard({ product, addedProductId, triggerAddToCart, shareProduct, onSelect, onImageOpen, isPriority }) {
  const images = getProductImages(product)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedModels, setSelectedModels] = useState(product.models?.length === 1 ? [product.models[0]] : [])
  const pointerStartXRef = useRef(null)
  const suppressClickRef = useRef(false)
  const stock = getStockDetails(product.stockQuantity)

  const toggleModel = (model) => {
    setSelectedModels((current) => current.includes(model)
      ? current.filter((selectedModel) => selectedModel !== model)
      : [...current, model])
  }

  const showPreviousImage = (event) => {
    event.stopPropagation()
    setActiveIndex((currentIndex) => (currentIndex === 0 ? images.length - 1 : currentIndex - 1))
  }

  const showNextImage = (event) => {
    event.stopPropagation()
    setActiveIndex((currentIndex) => (currentIndex === images.length - 1 ? 0 : currentIndex + 1))
  }

  const handleSwipe = (event) => {
    if (pointerStartXRef.current === null) return

    const deltaX = event.clientX - pointerStartXRef.current
    pointerStartXRef.current = null

    if (Math.abs(deltaX) < 40) return

    suppressClickRef.current = true
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)

    if (deltaX < 0) {
      showNextImage(event)
    } else {
      showPreviousImage(event)
    }
  }

  const handleGalleryKeyDown = (event) => {
    if (event.key === 'ArrowLeft' && images.length > 1) {
      event.preventDefault()
      setActiveIndex((index) => (index === 0 ? images.length - 1 : index - 1))
    }
    if (event.key === 'ArrowRight' && images.length > 1) {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % images.length)
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onImageOpen(product, activeIndex)
    }
  }

  return (
    <article
      className="product-card"
      data-category={product.category}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return
        event.preventDefault()
        event.stopPropagation()
        suppressClickRef.current = false
      }}
      onClick={() => onSelect(product, selectedModels)}
    >
      <div className="product-image">
        <button className="share-button product-share" onClick={(event) => {
          event.stopPropagation()
          shareProduct(product)
        }} title="Share product" aria-label="Share product"><ShareIcon /></button>

        <div
          className="product-image-gallery"
          role="region"
          aria-label={`${product.name} image carousel`}
          tabIndex={0}
          onKeyDown={handleGalleryKeyDown}
          onClick={(event) => {
            if (event.target.closest('button')) return
            event.stopPropagation()
            onImageOpen(product, activeIndex)
          }}
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return
            if (event.target.closest('button')) {
              pointerStartXRef.current = null
              return
            }
            pointerStartXRef.current = event.clientX
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerUp={handleSwipe}
          onPointerCancel={() => {
            pointerStartXRef.current = null
          }}
        >
          {images.length > 1 && (
            <button type="button" className="gallery-arrow prev" onClick={showPreviousImage} aria-label="Previous image">‹</button>
          )}

          <img
            className="product-main-image"
            src={getImageUrl(images[activeIndex], 800)}
            srcSet={`${getImageUrl(images[activeIndex], 480)} 480w, ${getImageUrl(images[activeIndex], 800)} 800w`}
            sizes="(max-width: 720px) 90vw, (max-width: 1080px) 45vw, 30vw"
            alt={`${product.name}, image ${activeIndex + 1}`}
            loading={isPriority ? 'eager' : 'lazy'}
            fetchPriority={isPriority ? 'high' : 'auto'}
            decoding="async"
          />

          {images.length > 1 && (
            <button type="button" className="gallery-arrow next" onClick={showNextImage} aria-label="Next image">›</button>
          )}
          {images.length > 1 && (
            <div className="gallery-dots" role="group" aria-label="Choose product image">
              {images.map((image, index) => (
                <button
                  key={`${product.id}-dot-${index}`}
                  type="button"
                  className={`gallery-dot ${index === activeIndex ? 'active' : ''}`}
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  onClick={(event) => {
                    event.stopPropagation()
                    setActiveIndex(index)
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <span className="badge">{product.badge}</span>
      </div>

      <div className="product-details">
        <div className="product-meta">
          <span className="category-tag">{product.category}</span>
          <span className="rating">★ {product.rating}</span>
        </div>
        <span className={`stock-status ${stock.state}`}>{stock.label}</span>
        <h3>{product.name}</h3>
        <p>{product.desc}</p>
        {product.models?.length > 0 && (
          <div className="product-model-picker card-model-picker" onClick={(event) => event.stopPropagation()}>
            <span className="product-model-picker-label">Choose one or more models</span>
            <div className="product-model-options card-model-options" role="group" aria-label={`Choose a phone model for ${product.name}`}>
              {product.models.map((model) => (
                <button
                  key={model}
                  type="button"
                  className={`product-model-chip ${selectedModels.includes(model) ? 'selected' : ''}`}
                  aria-pressed={selectedModels.includes(model)}
                  onClick={() => toggleModel(model)}
                >{model}</button>
              ))}
            </div>
          </div>
        )}
        <div className="product-footer">
          <div className="price-block">
            <span className="price">₹{product.price}</span>
            <span className="old-price">₹{product.oldPrice}</span>
          </div>
          <div className="product-actions">
            <button disabled={stock.state === 'out'} className={`add-button ${addedProductId === product.id ? 'cart-add-bump' : ''}`} onClick={(event) => {
              event.stopPropagation()
              triggerAddToCart(product.models?.length ? { ...product, selectedModels } : product)
            }}>{product.models?.length
              ? selectedModels.length ? `Add ${selectedModels.length} ${selectedModels.length === 1 ? 'model' : 'models'}`
                : 'Choose model'
              : 'Add to Cart'}</button>
            <a className="whatsapp-button" href={`https://wa.me/919986974526?text=${encodeURIComponent(`Hi Raacase, I want to buy ${product.name} for ₹${product.price}.`)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>WhatsApp</a>
          </div>
        </div>
      </div>
    </article>
  )
}

function ProductDetailGallery({ product, onImageOpen }) {
  const images = getProductImages(product)
  const [activeIndex, setActiveIndex] = useState(0)

  const showImage = (direction) => {
    setActiveIndex((index) => (index + direction + images.length) % images.length)
  }

  return (
    <div
      className="modal-image-gallery"
      role="region"
      aria-label={`${product.name} product images`}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && images.length > 1) {
          event.preventDefault()
          showImage(-1)
        }
        if (event.key === 'ArrowRight' && images.length > 1) {
          event.preventDefault()
          showImage(1)
        }
      }}
    >
      {images.length > 1 && (
        <button className="gallery-arrow prev" type="button" onClick={() => showImage(-1)} aria-label="Previous image">‹</button>
      )}
      <button
        className="modal-gallery-image-button"
        type="button"
        onClick={() => onImageOpen(product, activeIndex)}
        aria-label={`Open image ${activeIndex + 1} full screen`}
      >
        <img
          className="modal-gallery-image"
          src={getImageUrl(images[activeIndex], 800)}
          alt={`${product.name}, image ${activeIndex + 1}`}
          loading="lazy"
          decoding="async"
        />
      </button>
      {images.length > 1 && (
        <button className="gallery-arrow next" type="button" onClick={() => showImage(1)} aria-label="Next image">›</button>
      )}
      {images.length > 1 && (
        <div className="gallery-dots modal-gallery-dots" role="group" aria-label="Choose product image">
          {images.map((image, index) => (
            <button
              key={`${product.id}-modal-dot-${index}`}
              type="button"
              className={`gallery-dot ${index === activeIndex ? 'active' : ''}`}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductImageLightbox({ product, startIndex, onClose }) {
  const images = getProductImages(product)
  const [activeIndex, setActiveIndex] = useState(startIndex)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const closeButtonRef = useRef(null)
  const pointersRef = useRef(new Map())
  const gestureRef = useRef(null)
  const pinchStartRef = useRef(null)

  const resetZoom = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const navigate = (direction) => {
    setActiveIndex((index) => (index + direction + images.length) % images.length)
    resetZoom()
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft' && images.length > 1) {
        event.preventDefault()
        setActiveIndex((index) => (index - 1 + images.length) % images.length)
        setZoom(1)
        setOffset({ x: 0, y: 0 })
      }
      if (event.key === 'ArrowRight' && images.length > 1) {
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % images.length)
        setZoom(1)
        setOffset({ x: 0, y: 0 })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [images.length, onClose])

  const handlePointerDown = (event) => {
    if (event.target.closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size === 1) {
      gestureRef.current = {
        type: zoom > 1 ? 'pan' : 'swipe',
        startX: event.clientX,
        startY: event.clientY,
        startOffset: offset,
      }
    } else if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()]
      pinchStartRef.current = {
        distance: Math.hypot(first.x - second.x, first.y - second.y),
        zoom,
      }
      gestureRef.current = { type: 'pinch' }
    }
  }

  const handlePointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const [first, second] = [...pointersRef.current.values()]
      const distance = Math.hypot(first.x - second.x, first.y - second.y)
      const nextZoom = Math.min(4, Math.max(1, pinchStartRef.current.zoom * distance / pinchStartRef.current.distance))
      setZoom(nextZoom)
      if (nextZoom === 1) setOffset({ x: 0, y: 0 })
      return
    }

    const gesture = gestureRef.current
    if (pointersRef.current.size !== 1 || gesture?.type !== 'pan') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const maxX = bounds.width * (zoom - 1) / 2
    const maxY = bounds.height * (zoom - 1) / 2
    setOffset({
      x: Math.min(maxX, Math.max(-maxX, gesture.startOffset.x + event.clientX - gesture.startX)),
      y: Math.min(maxY, Math.max(-maxY, gesture.startOffset.y + event.clientY - gesture.startY)),
    })
  }

  const handlePointerUp = (event) => {
    const gesture = gestureRef.current
    const shouldSwipe = pointersRef.current.size === 1 && gesture?.type === 'swipe'
      && Math.abs(event.clientX - gesture.startX) > 55
    const direction = event.clientX < gesture?.startX ? 1 : -1
    pointersRef.current.delete(event.pointerId)

    if (pointersRef.current.size === 0) {
      gestureRef.current = null
      pinchStartRef.current = null
      if (shouldSwipe) navigate(direction)
    } else if (pointersRef.current.size === 1) {
      const [remaining] = pointersRef.current.values()
      pinchStartRef.current = null
      gestureRef.current = {
        type: zoom > 1 ? 'pan' : 'swipe',
        startX: remaining.x,
        startY: remaining.y,
        startOffset: offset,
      }
    }
  }

  return createPortal(
    <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} image viewer`} onClick={onClose}>
      <button ref={closeButtonRef} className="lightbox-close" type="button" onClick={onClose} aria-label="Close image viewer">×</button>
      <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
        <div
          className="lightbox-stage"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={(event) => {
            pointersRef.current.delete(event.pointerId)
            gestureRef.current = null
            pinchStartRef.current = null
          }}
        >
          {images.length > 1 && (
            <button className="lightbox-arrow prev" type="button" onClick={() => navigate(-1)} aria-label="Previous image">‹</button>
          )}
          <img
            className="lightbox-image"
            src={getImageUrl(images[activeIndex], 1600)}
            alt={`${product.name}, image ${activeIndex + 1}`}
            draggable="false"
            fetchPriority="high"
            decoding="async"
            style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})` }}
          />
          {images.length > 1 && (
            <button className="lightbox-arrow next" type="button" onClick={() => navigate(1)} aria-label="Next image">›</button>
          )}
        </div>
        <div className="lightbox-footer">
          <span className="lightbox-counter" aria-live="polite">{activeIndex + 1} / {images.length}</span>
          {images.length > 1 && (
            <div className="lightbox-dots" role="group" aria-label="Choose product image">
              {images.map((image, index) => (
                <button
                  key={`${product.id}-lightbox-dot-${index}`}
                  type="button"
                  className={`gallery-dot ${index === activeIndex ? 'active' : ''}`}
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  onClick={() => {
                    setActiveIndex(index)
                    resetZoom()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ProductShareSheet({ product, onClose }) {
  const closeButtonRef = useRef(null)
  const [copyStatus, setCopyStatus] = useState('')
  const productUrl = getProductShareUrl(product)
  const shareText = `Check out ${product.name} by Raacase for ₹${product.price}.`
  const encodedText = encodeURIComponent(`${shareText} ${productUrl}`)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [onClose])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl)
      setCopyStatus('Link copied')
    } catch {
      setCopyStatus('Copy is unavailable in this browser')
    }
  }

  return createPortal(
    <div className="product-share-backdrop" onClick={onClose}>
      <section className="product-share-sheet" role="dialog" aria-modal="true" aria-labelledby="product-share-title" onClick={(event) => event.stopPropagation()}>
        <div className="product-share-heading">
          <div>
            <span className="section-label">Share product</span>
            <h2 id="product-share-title">{product.name}</h2>
          </div>
          <button ref={closeButtonRef} className="modal-close" type="button" onClick={onClose} aria-label="Close share options">×</button>
        </div>
        <div className="product-share-options">
          <a className="product-share-option" href={`https://wa.me/?text=${encodedText}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="product-share-option" href={`https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">Telegram</a>
          <a className="product-share-option" href={`mailto:?subject=${encodeURIComponent(product.name)}&body=${encodedText}`}>Email</a>
          <button className="product-share-option" type="button" onClick={copyLink}>Copy link</button>
        </div>
        <p className="product-share-status" aria-live="polite">{copyStatus}</p>
      </section>
    </div>,
    document.body,
  )
}

function ShopPage({ addToCart, searchTerm = '', setSearchTerm = () => {} }) {
  const [products, setProducts] = useState([])
  const [sortBy, setSortBy] = useState('featured')
  const sharedProductId = new URLSearchParams(window.location.search).get('product')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedModels, setSelectedModels] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [addedProductId, setAddedProductId] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [shareSheetProduct, setShareSheetProduct] = useState(null)
  const selectedStock = selectedProduct ? getStockDetails(selectedProduct.stockQuantity) : null
  const selectedProductModels = selectedProduct
    ? selectedModels.length ? selectedModels
      : selectedProduct.models?.length === 1 ? [selectedProduct.models[0]] : []
    : []

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products')
        if (!response.ok) {
          throw new Error('Backend API unreachable')
        }

        const backendProducts = await response.json()
        if (Array.isArray(backendProducts)) {
          setProducts(backendProducts)
          const sharedProduct = backendProducts.find((product) => String(product.id) === sharedProductId)
          setSelectedProduct(sharedProduct || null)
        }
      } catch (error) {
        console.error('Unable to load shop products.', error)
        setProducts([])
        setSelectedProduct(null)
      }
    }

    loadProducts()
  }, [sharedProductId])

  const openProductDetails = (product, chosenModels = []) => {
    setSelectedProduct(product)
    setSelectedModels(chosenModels.length ? chosenModels : (product.models?.length === 1 ? [product.models[0]] : []))
  }

  const triggerAddToCart = (product) => {
    const chosenModels = product.selectedModels || (product.selectedModel
      ? [product.selectedModel]
      : product.models?.length === 1 ? [product.models[0]] : [])
    if (product.models?.length && !chosenModels.length) {
      openProductDetails(product, chosenModels)
      return
    }

    if (product.models?.length) {
      for (const selectedModel of chosenModels) {
        addToCart({ ...product, selectedModel })
      }
    } else {
      addToCart(product)
    }
    setAddedProductId(product.id)
    window.setTimeout(() => setAddedProductId(null), 420)
  }

  const shareProduct = async (product) => {
    const productUrl = getProductShareUrl(product)
    const shareText = `Check out ${product.name} by Raacase for ₹${product.price}.`

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: productUrl,
        })
      } catch (error) {
        if (error.name !== 'AbortError') setShareSheetProduct(product)
      }
    } else {
      setShareSheetProduct(product)
    }
  }

  const categories = [...new Set(products.map((product) => product.category))]
  const companies = [...new Set(products.map((product) => product.company))]
  const materials = [...new Set(products.map((product) => product.material))]
  const models = [...new Set(products.flatMap((product) => product.models || []))].sort()
  const priceRanges = [
    { value: 'under-500', label: 'Under ₹500' },
    { value: '500-999', label: '₹500 – ₹999' },
    { value: '1000-1499', label: '₹1000 – ₹1499' },
    { value: '1500-plus', label: '₹1500+' },
  ]

  const matchesSelectedFilter = (product) => {
    if (selectedFilter === 'all') return true

    const [parameter, value] = selectedFilter.split(':')
    if (parameter === 'category') return product.category === value
    if (parameter === 'company') return product.company === value
    if (parameter === 'material') return product.material === value
    if (parameter === 'model') return (product.models || []).includes(value)

    if (parameter === 'price') {
      if (value === 'under-500') return product.price < 500
      if (value === '500-999') return product.price >= 500 && product.price < 1000
      if (value === '1000-1499') return product.price >= 1000 && product.price < 1500
      if (value === '1500-plus') return product.price >= 1500
    }

    return true
  }

  const filteredProducts = products.filter((product) => {
    const matchesFilter = matchesSelectedFilter(product)
    const term = searchTerm.trim().toLocaleLowerCase()
    const searchableFields = [
      product.name,
      product.category,
      product.company,
      product.material,
      product.desc,
      ...(product.models || []),
    ]
    const matchesSearch = !term || searchableFields.some((value) => value?.toLocaleLowerCase().includes(term))

    return matchesFilter && matchesSearch
  })

  const sortedProducts = [...filteredProducts]

  if (sortBy === 'low-high') {
    sortedProducts.sort((a, b) => a.price - b.price)
  }

  if (sortBy === 'high-low') {
    sortedProducts.sort((a, b) => b.price - a.price)
  }

  if (sortBy === 'rating') {
    sortedProducts.sort((a, b) => b.rating - a.rating)
  }

  return (
    <section className="shop-page section-page">
      <div className="section-heading shop-heading">
        <div>
          <span className="section-label">Shop Back Covers</span>
          <h1>Raacase Collection</h1>
        </div>
      </div>

      <div className="shop-toolbar">
        <div className="shop-search-control">
          <label htmlFor="shop-product-search">Search the collection</label>
          <div className="shop-search-input-wrap">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              id="shop-product-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Name, category, material, or phone model"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} aria-label="Clear product search">×</button>
            )}
          </div>
        </div>
        <div className="shop-filter-row">
          <div className="sort-wrap">
            <label className="sort-label" htmlFor="sort-by">Sort by</label>
            <select className="sort-select" id="sort-by" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="featured">Featured</option>
              <option value="low-high">Price: Low to High</option>
              <option value="high-low">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          <div className="sort-wrap filter-select-wrap">
            <label className="sort-label" htmlFor="product-filter">Filter products</label>
            <select className="sort-select" id="product-filter" value={selectedFilter} onChange={(event) => setSelectedFilter(event.target.value)}>
              <option value="all">All products</option>
              <optgroup label="Category">
                {categories.map((category) => <option key={category} value={`category:${category}`}>{category}</option>)}
              </optgroup>
              <optgroup label="Company">
                {companies.map((company) => <option key={company} value={`company:${company}`}>{company}</option>)}
              </optgroup>
              <optgroup label="Material">
                {materials.map((material) => <option key={material} value={`material:${material}`}>{material}</option>)}
              </optgroup>
              {models.length > 0 && (
                <optgroup label="Phone model">
                  {models.map((model) => <option key={model} value={`model:${model}`}>{model}</option>)}
                </optgroup>
              )}
              <optgroup label="Price">
                {priceRanges.map((range) => <option key={range.value} value={`price:${range.value}`}>{range.label}</option>)}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      <div className="shop-product-count">
        <span aria-live="polite">
          {sortedProducts.length} {sortedProducts.length === 1 ? 'back cover' : 'back covers'}
          {searchTerm.trim() && ` matching “${searchTerm.trim()}”`}
        </span>
      </div>

      <div className="product-grid">
        {sortedProducts.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            addedProductId={addedProductId}
            triggerAddToCart={triggerAddToCart}
            shareProduct={shareProduct}
            onSelect={openProductDetails}
            onImageOpen={(selected, imageIndex) => setLightbox({ product: selected, index: imageIndex })}
            isPriority={index === 0}
          />
        ))}
      </div>

      {sortedProducts.length === 0 && (
        <div className="empty-products">
          <span>No matching back covers found.</span>
        </div>
      )}

      {selectedProduct && (
        <div className="product-modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProduct(null)}>×</button>
            <ProductDetailGallery
              key={selectedProduct.id}
              product={selectedProduct}
              onImageOpen={(product, index) => setLightbox({ product, index })}
            />
            <div className="modal-details">
              <span className="modal-category">{selectedProduct.category}</span>
              <h2>{selectedProduct.name}</h2>
              <p>{selectedProduct.desc}</p>
              {selectedProduct.models?.length > 0 && (
                <div className="product-model-picker modal-model-picker">
                  <span className="product-model-picker-label">Choose one or more phone models</span>
                  <div className="product-model-options modal-model-options" role="group" aria-label={`Choose a phone model for ${selectedProduct.name}`}>
                    {selectedProduct.models.map((model) => (
                      <button
                        key={model}
                        type="button"
                        className={`product-model-chip ${selectedProductModels.includes(model) ? 'selected' : ''}`}
                        aria-pressed={selectedProductModels.includes(model)}
                        onClick={() => setSelectedModels((current) => current.includes(model)
                          ? current.filter((selectedModel) => selectedModel !== model)
                          : [...current, model])}
                      >{model}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-meta">
                <span className="modal-rating">★ {selectedProduct.rating}</span>
                <span className="modal-badge">{selectedProduct.badge}</span>
                <span className={`stock-status ${selectedStock.state}`}>{selectedStock.label}</span>
              </div>
              <div className="modal-price-row">
                <span className="modal-price">₹{selectedProduct.price}</span>
                <span className="modal-old-price">₹{selectedProduct.oldPrice}</span>
              </div>
              <div className="modal-actions">
                <button disabled={selectedStock.state === 'out' || (selectedProduct.models?.length > 1 && !selectedProductModels.length)} className={`primary-button modal-add ${addedProductId === selectedProduct.id ? 'cart-add-bump' : ''}`} onClick={(event) => {
                  event.stopPropagation()
                  triggerAddToCart({ ...selectedProduct, selectedModels: selectedProductModels })
                  window.setTimeout(() => setSelectedProduct(null), 280)
                }}>{selectedProduct.models?.length > 1
                  ? selectedProductModels.length ? `Add ${selectedProductModels.length} ${selectedProductModels.length === 1 ? 'model' : 'models'}`
                    : 'Choose model'
                  : 'Add to Cart'}</button>
                <button className="share-button modal-share" onClick={(event) => {
                  event.stopPropagation()
                  shareProduct(selectedProduct)
                }} title="Share product" aria-label="Share product"><ShareIcon /></button>
                <a className="whatsapp-button modal-whatsapp" href={`https://wa.me/919986974526?text=${encodeURIComponent(`Hi Raacase, I want to buy ${selectedProduct.name}${selectedProductModels.length ? ` for ${selectedProductModels.join(', ')}` : ''} for ₹${selectedProduct.price}.`)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Buy on WhatsApp</a>
              </div>
            </div>
          </div>
        </div>
      )}
      {lightbox && (
        <ProductImageLightbox
          product={lightbox.product}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
      {shareSheetProduct && (
        <ProductShareSheet product={shareSheetProduct} onClose={() => setShareSheetProduct(null)} />
      )}
    </section>
  )
}

export default ShopPage

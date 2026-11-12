import { useEffect, useRef, useState } from 'react'

const emptyProduct = {
  name: '', company: '', material: '', category: '', desc: '', price: '', oldPrice: '', badge: '', image: '', models: [], stockQuantity: 10,
}

const phoneModelOptions = [
  'iPhone 14', 'iPhone 15', 'iPhone 16', 'iPhone 17',
  'Samsung Galaxy S24', 'Samsung Galaxy S25', 'Samsung Galaxy S26',
  'Google Pixel 9', 'Google Pixel 10',
]

async function createImageVariants(file) {
  const bitmap = await createImageBitmap(file)

  try {
    const createVariant = async (maxEdge) => {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Could not prepare the selected image.')
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result?.type === 'image/webp') resolve(result)
          else reject(new Error('This browser could not convert the image to WebP.'))
        }, 'image/webp', 0.86)
      })

      const baseName = file.name.replace(/\.[^.]+$/, '')
      return new File([blob], `${baseName}-${maxEdge}.webp`, { type: 'image/webp' })
    }

    return {
      small: await createVariant(800),
      large: await createVariant(1600),
    }
  } finally {
    bitmap.close()
  }
}

function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem('raacaseAdminToken') || '')
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [loginChallenge, setLoginChallenge] = useState(null)
  const [loginCode, setLoginCode] = useState('')
  const [loginMode, setLoginMode] = useState('')
  const [isVerifyingLogin, setIsVerifyingLogin] = useState(false)
  const [products, setProducts] = useState([])
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryCategory, setInventoryCategory] = useState('')
  const [inventoryStockFilter, setInventoryStockFilter] = useState('all')
  const [inventorySort, setInventorySort] = useState('name-asc')
  const [product, setProduct] = useState(emptyProduct)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editImageFiles, setEditImageFiles] = useState([])
  const [editImagePreviews, setEditImagePreviews] = useState([])
  const [editStatus, setEditStatus] = useState('')
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [newModel, setNewModel] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const imageInputRef = useRef(null)
  const editImageInputRef = useRef(null)

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  const availableModels = [...new Set([...phoneModelOptions, ...products.flatMap((item) => item.models || []), ...product.models, ...(editingProduct?.models || [])])]

  const lowStockCount = products.filter((item) => Number(item.stockQuantity ?? 0) <= 5).length
  const inventoryValue = products.reduce((total, item) => total + Number(item.price || 0) * Number(item.stockQuantity || 0), 0)
  const categories = [...new Set(products.map((item) => item.category).filter(Boolean))]
  const visibleProducts = products
    .filter((item) => {
      const query = inventorySearch.trim().toLocaleLowerCase()
      const matchesSearch = !query || [item.name, item.category].some((value) => value?.toLocaleLowerCase().includes(query))
      const matchesCategory = !inventoryCategory || item.category === inventoryCategory
      const stock = Number(item.stockQuantity ?? 0)
      const matchesStock = inventoryStockFilter === 'all'
        || (inventoryStockFilter === 'low' && stock <= 5)
        || (inventoryStockFilter === 'in-stock' && stock > 0)
        || (inventoryStockFilter === 'out' && stock === 0)
      return matchesSearch && matchesCategory && matchesStock
    })
    .sort((a, b) => {
      switch (inventorySort) {
        case 'name-desc': return (b.name || '').localeCompare(a.name || '')
        case 'category-asc': return (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || '')
        case 'price-asc': return Number(a.price || 0) - Number(b.price || 0)
        case 'price-desc': return Number(b.price || 0) - Number(a.price || 0)
        case 'stock-asc': return Number(a.stockQuantity ?? 0) - Number(b.stockQuantity ?? 0)
        case 'stock-desc': return Number(b.stockQuantity ?? 0) - Number(a.stockQuantity ?? 0)
        default: return (a.name || '').localeCompare(b.name || '')
      }
    })

  const loadProducts = async () => {
    const response = await fetch('/api/products')
    if (response.ok) setProducts(await response.json())
  }

  useEffect(() => {
    if (token) loadProducts()
  }, [token])

  useEffect(() => () => imagePreviews.forEach((preview) => URL.revokeObjectURL(preview)), [imagePreviews])
  useEffect(() => () => editImagePreviews.forEach((preview) => URL.revokeObjectURL(preview)), [editImagePreviews])

  const login = async (event) => {
    event.preventDefault()
    setStatus('')
    setLoginMode('')
    let response
    try {
      response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })
    } catch {
      setStatus('Cannot reach the backend. Start the API and try again.')
      return
    }

    if (!response.ok) {
      setStatus(response.status === 401
        ? 'Incorrect username or password.'
        : `The admin API is unavailable (${response.status}). Check that the backend is running.`)
      return
    }

    const result = await response.json()
    setLoginChallenge(result.challengeId)
    setLoginMode(result.mode)
    setStatus(result.mode === 'email' ? 'A sign-in code was sent to the admin email.' : '')
  }

  const verifyLoginCode = async (event) => {
    event.preventDefault()
    if (!loginChallenge) return
    setStatus('')
    setIsVerifyingLogin(true)
    try {
      const response = await fetch('/api/auth/admin/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: loginChallenge, code: loginCode }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.message || (response.status === 401 ? 'Incorrect or expired OTP.' : 'Could not verify the OTP.'))
      }

      sessionStorage.setItem('raacaseAdminToken', result.token)
      setToken(result.token)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not verify the OTP.')
    } finally {
      setIsVerifyingLogin(false)
    }
  }

  const addProduct = async (event) => {
    event.preventDefault()
    setStatus('')
    setIsSubmitting(true)

    try {
      let uploadedImages = []
      if (imageFiles.length) {
        setStatus('Preparing images...')
        const formData = new FormData()
        for (const file of imageFiles) {
          const variants = await createImageVariants(file)
          formData.append('smallImages', variants.small)
          formData.append('largeImages', variants.large)
        }

        setStatus('Uploading images...')
        const uploadResponse = await fetch('/api/products/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        const uploadResult = await uploadResponse.json().catch(() => null)
        if (!uploadResponse.ok) {
          throw new Error(uploadResult?.message || 'Could not upload product images.')
        }
        uploadedImages = uploadResult.images || []
      }

      const imageUrls = [...(product.image.trim() ? [product.image.trim()] : []), ...uploadedImages]
      const payload = {
        ...product,
        image: imageUrls[0] || undefined,
        price: Number(product.price),
        oldPrice: product.oldPrice ? Number(product.oldPrice) : undefined,
        stockQuantity: Number(product.stockQuantity),
        rating: 4.8,
        images: imageUrls.length ? imageUrls : undefined,
      }
      const response = await fetch('/api/products', { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message || 'Could not add product. Check all required fields.')

      setProduct(emptyProduct)
      setImageFiles([])
      setImagePreviews([])
      if (imageInputRef.current) imageInputRef.current.value = ''
      setStatus('Product added.')
      loadProducts()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not add product.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectImages = (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    const files = selectedFiles.slice(0, 8)
    setImageFiles(files)
    setImagePreviews(files.map((file) => URL.createObjectURL(file)))
    setStatus(selectedFiles.length > 8 ? 'Choose up to 8 images.' : '')
  }

  const toggleModel = (model) => {
    setProduct((current) => ({
      ...current,
      models: current.models.includes(model)
        ? current.models.filter((selectedModel) => selectedModel !== model)
        : [...current.models, model],
    }))
  }

  const addModel = () => {
    const model = newModel.trim()
    if (!model) return
    setProduct((current) => ({
      ...current,
      models: current.models.some((selectedModel) => selectedModel.toLowerCase() === model.toLowerCase())
        ? current.models
        : [...current.models, model],
    }))
    setNewModel('')
  }

  const startEditingProduct = (item) => {
    setEditingProduct({
      id: item.id,
      name: item.name || '',
      company: item.company || '',
      material: item.material || '',
      category: item.category || '',
      desc: item.desc || '',
      price: String(item.price ?? ''),
      oldPrice: item.oldPrice == null ? '' : String(item.oldPrice),
      rating: String(item.rating ?? 4.8),
      badge: item.badge || '',
      stockQuantity: String(item.stockQuantity ?? 0),
      imageUrls: (item.images?.length ? item.images : (item.image ? [item.image] : [])).join('\n'),
      models: [...(item.models || [])],
      newModel: '',
    })
    setEditImageFiles([])
    setEditImagePreviews([])
    setEditStatus('')
  }

  const toggleProductModel = (model) => {
    if (!editingProduct.models.includes(model) && editingProduct.models.length >= 32) {
      setEditStatus('A product can have up to 32 compatible models.')
      return
    }
    setEditingProduct((current) => ({
      ...current,
      models: current.models.includes(model)
        ? current.models.filter((selectedModel) => selectedModel !== model)
        : [...current.models, model],
    }))
    setEditStatus('')
  }

  const addProductModel = () => {
    const model = editingProduct?.newModel.trim()
    if (!model) return
    if (editingProduct.models.some((selectedModel) => selectedModel.toLowerCase() === model.toLowerCase())) {
      setEditingProduct((current) => ({ ...current, newModel: '' }))
      return
    }
    if (editingProduct.models.length >= 32) {
      setEditStatus('A product can have up to 32 compatible models.')
      return
    }
    setEditingProduct((current) => ({ ...current, models: [...current.models, model], newModel: '' }))
    setEditStatus('')
  }

  const selectEditImages = (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    const files = selectedFiles.slice(0, 8)
    setEditImageFiles(files)
    setEditImagePreviews(files.map((file) => URL.createObjectURL(file)))
    setEditStatus(selectedFiles.length > 8 ? 'Choose up to 8 new images.' : '')
  }

  const cancelProductEdit = () => {
    setEditingProduct(null)
    setEditImageFiles([])
    setEditImagePreviews([])
    setEditStatus('')
    if (editImageInputRef.current) editImageInputRef.current.value = ''
  }

  const saveProduct = async (event) => {
    event.preventDefault()
    if (!editingProduct) return
    setIsSavingProduct(true)
    setEditStatus('')
    try {
      let uploadedImages = []
      if (editImageFiles.length) {
        setEditStatus('Preparing images...')
        const formData = new FormData()
        for (const file of editImageFiles) {
          const variants = await createImageVariants(file)
          formData.append('smallImages', variants.small)
          formData.append('largeImages', variants.large)
        }

        setEditStatus('Uploading images...')
        const uploadResponse = await fetch('/api/products/upload', {
          method: 'POST',
          headers: { Authorization: authHeaders.Authorization },
          body: formData,
        })
        const uploadResult = await uploadResponse.json().catch(() => null)
        if (!uploadResponse.ok) throw new Error(uploadResult?.message || 'Could not upload product images.')
        uploadedImages = uploadResult.images || []
      }

      const imageUrls = [...new Set([
        ...editingProduct.imageUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean),
        ...uploadedImages,
      ])]
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          name: editingProduct.name.trim(),
          company: editingProduct.company.trim(),
          material: editingProduct.material.trim(),
          category: editingProduct.category.trim(),
          desc: editingProduct.desc.trim(),
          price: Number(editingProduct.price),
          oldPrice: editingProduct.oldPrice ? Number(editingProduct.oldPrice) : null,
          rating: Number(editingProduct.rating),
          badge: editingProduct.badge.trim(),
          stockQuantity: Number(editingProduct.stockQuantity),
          image: imageUrls[0] || '/product-sample.png',
          images: imageUrls.length ? imageUrls : ['/product-sample.png'],
          models: editingProduct.models,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message || 'Could not update product.')
      setProducts((current) => current.map((item) => item.id === result.id ? result : item))
      setEditingProduct(null)
      setStatus('Product updated.')
      setEditImageFiles([])
      setEditImagePreviews([])
      if (editImageInputRef.current) editImageInputRef.current.value = ''
    } catch (error) {
      setEditStatus(error instanceof Error ? error.message : 'Could not update product.')
    } finally {
      setIsSavingProduct(false)
    }
  }

  const changeStock = async (item, adjustment) => {
    const stockQuantity = Math.max(0, Number(item.stockQuantity || 0) + adjustment)
    const response = await fetch(`/api/products/${item.id}/stock`, {
      method: 'PATCH', headers: authHeaders, body: JSON.stringify({ stockQuantity }),
    })
    if (response.ok) loadProducts()
  }

  const deleteProduct = async (item) => {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return
    const response = await fetch(`/api/products/${item.id}`, { method: 'DELETE', headers: authHeaders })
    if (response.ok) loadProducts()
  }

  const logout = async () => {
    await fetch('/api/auth/admin/logout', { method: 'POST', headers: authHeaders })
    sessionStorage.removeItem('raacaseAdminToken')
    setToken('')
  }

  if (!token) {
    return (
      <section className="admin-page section-page">
        <div className="admin-login-panel">
          <span className="section-label">Restricted area</span>
          <h1>Admin sign in</h1>
          <p>Use the credentials configured on the server.</p>
          {!loginChallenge ? (
            <form className="admin-form" onSubmit={login}>
              <label>Username<input required value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })} /></label>
              <label>Password<input required type="password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} /></label>
              <button className="primary-button" type="submit">Continue</button>
            </form>
          ) : (
            <form className="admin-form" onSubmit={verifyLoginCode}>
              <p>{loginMode === 'email' ? 'Enter the sign-in code sent to your admin email.' : 'Enter the six-digit code to continue.'}</p>
              <label>One-time password<input required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={loginCode} onChange={(event) => setLoginCode(event.target.value)} /></label>
              <button className="primary-button" type="submit" disabled={isVerifyingLogin}>{isVerifyingLogin ? 'Verifying...' : 'Verify and sign in'}</button>
              <button className="secondary-button" type="button" onClick={() => { setLoginChallenge(null); setLoginCode(''); setLoginMode(''); setStatus('') }}>Back to sign in</button>
            </form>
          )}
          {status && (
            <p className={`admin-status${loginMode === 'dummy' ? '' : ' error'}`} role="status">{status}</p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="admin-page section-page">
      <div className="admin-heading">
        <div><span className="section-label">Store management</span><h1>Raacase Admin</h1></div>
        <button className="secondary-button" onClick={logout}>Sign out</button>
      </div>
      <div className="admin-summary" aria-label="Store summary">
        <article className="admin-summary-card">
          <span>Products</span>
          <strong>{products.length}</strong>
          <small>Active catalog items</small>
        </article>
        <article className="admin-summary-card">
          <span>Low stock</span>
          <strong>{lowStockCount}</strong>
          <small>5 or fewer units remaining</small>
        </article>
        <article className="admin-summary-card">
          <span>Inventory value</span>
          <strong>₹{inventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
          <small>Current price × units in stock</small>
        </article>
      </div>
      <div className="admin-grid">
        <form className="admin-form admin-product-form" onSubmit={addProduct}>
          <h2>Add product</h2>
          <div className="admin-two-column">
            {['name', 'company', 'material', 'category', 'badge', 'image'].map((field) => (
              <label key={field}>{field === 'image' ? 'Image URL' : field[0].toUpperCase() + field.slice(1)}
                <input type={field === 'image' ? 'url' : 'text'} required={['name', 'company', 'material', 'category'].includes(field)} value={product[field]} onChange={(event) => setProduct({ ...product, [field]: event.target.value })} />
              </label>
            ))}
            <label>Price (₹)<input required min="0" type="number" value={product.price} onChange={(event) => setProduct({ ...product, price: event.target.value })} /></label>
            <label>Old price (₹)<input min="0" type="number" value={product.oldPrice} onChange={(event) => setProduct({ ...product, oldPrice: event.target.value })} /></label>
            <label>Starting stock<input required min="0" type="number" value={product.stockQuantity} onChange={(event) => setProduct({ ...product, stockQuantity: event.target.value })} /></label>
          </div>
          <fieldset className="admin-models-fieldset">
            <legend>Compatible phone models</legend>
            <div className="admin-model-options">
              {availableModels.map((model) => (
                <label className="admin-model-option" key={model}>
                  <input type="checkbox" checked={product.models.includes(model)} onChange={() => toggleModel(model)} />
                  <span>{model}</span>
                </label>
              ))}
            </div>
            <div className="admin-model-add">
              <input
                value={newModel}
                aria-label="Add a phone model"
                placeholder="Add a model not listed"
                onChange={(event) => setNewModel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addModel()
                  }
                }}
              />
              <button className="secondary-button" type="button" onClick={addModel} disabled={!newModel.trim()}>Add model</button>
            </div>
          </fieldset>
          <label className="admin-image-upload">Product image files
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={selectImages} />
          </label>
          {imagePreviews.length > 0 && (
            <div className="admin-image-previews" aria-label="Selected product image previews">
              {imagePreviews.map((preview, index) => (
                <img key={`${imageFiles[index].name}-${index}`} src={preview} alt={`Selected product image ${index + 1}`} />
              ))}
            </div>
          )}
          <label>Description<textarea required rows="4" value={product.desc} onChange={(event) => setProduct({ ...product, desc: event.target.value })} /></label>
          <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Uploading...' : 'Add product'}</button>
          {status && <p className="admin-status">{status}</p>}
        </form>
        <div className="admin-inventory">
          <div className="admin-inventory-heading">
            <h2>Inventory ({visibleProducts.length}{visibleProducts.length !== products.length ? ` of ${products.length}` : ''})</h2>
            <div className="admin-inventory-filters">
              <label>
                <span>Search products</span>
                <input type="search" value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Name or category" />
              </label>
              <label>
                <span>Category</span>
                <select value={inventoryCategory} onChange={(event) => setInventoryCategory(event.target.value)}>
                  <option value="">All categories</option>
                  {categories.sort((a, b) => a.localeCompare(b)).map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label>
                <span>Stock</span>
                <select value={inventoryStockFilter} onChange={(event) => setInventoryStockFilter(event.target.value)}>
                  <option value="all">All stock levels</option>
                  <option value="low">Low stock (5 or fewer)</option>
                  <option value="in-stock">In stock</option>
                  <option value="out">Out of stock</option>
                </select>
              </label>
              <label>
                <span>Sort by</span>
                <select value={inventorySort} onChange={(event) => setInventorySort(event.target.value)}>
                  <option value="name-asc">Name (A–Z)</option>
                  <option value="name-desc">Name (Z–A)</option>
                  <option value="category-asc">Category</option>
                  <option value="price-asc">Price (low to high)</option>
                  <option value="price-desc">Price (high to low)</option>
                  <option value="stock-asc">Stock (low to high)</option>
                  <option value="stock-desc">Stock (high to low)</option>
                </select>
              </label>
            </div>
          </div>
          <div className="admin-product-list">
            {visibleProducts.length === 0 && <p className="admin-empty-results">No products match these filters.</p>}
            {visibleProducts.map((item) => (
              <article className="admin-product-row" key={item.id}>
                <div className="admin-product-row-main">
                  <div><strong>{item.name}</strong><span>₹{item.price} · {item.stockQuantity ?? 20} in stock</span><span>Fits: {(item.models || []).join(', ') || 'No models selected'}</span></div>
                  <div className="admin-row-actions">
                    <button onClick={() => changeStock(item, -1)} disabled={(item.stockQuantity ?? 20) === 0} aria-label={`Decrease ${item.name} stock`}>−</button>
                    <button onClick={() => changeStock(item, 1)} aria-label={`Increase ${item.name} stock`}>+</button>
                    <button onClick={() => startEditingProduct(item)}>Edit product</button>
                    <button className="admin-delete" onClick={() => deleteProduct(item)}>Delete</button>
                  </div>
                </div>
                {editingProduct?.id === item.id && (
                  <form className="admin-form admin-product-editor" onSubmit={saveProduct}>
                    <h3>Edit {item.name}</h3>
                    <div className="admin-two-column">
                      {['name', 'company', 'material', 'category', 'badge'].map((field) => (
                        <label key={field}>{field[0].toUpperCase() + field.slice(1)}
                          <input
                            required={['name', 'company', 'material', 'category'].includes(field)}
                            value={editingProduct[field]}
                            onChange={(event) => setEditingProduct({ ...editingProduct, [field]: event.target.value })}
                          />
                        </label>
                      ))}
                      <label>Price (₹)<input required min="0" step="0.01" type="number" value={editingProduct.price} onChange={(event) => setEditingProduct({ ...editingProduct, price: event.target.value })} /></label>
                      <label>Old price (₹)<input min="0" step="0.01" type="number" value={editingProduct.oldPrice} onChange={(event) => setEditingProduct({ ...editingProduct, oldPrice: event.target.value })} /></label>
                      <label>Rating<input required min="0" max="5" step="0.1" type="number" value={editingProduct.rating} onChange={(event) => setEditingProduct({ ...editingProduct, rating: event.target.value })} /></label>
                      <label>Stock quantity<input required min="0" type="number" value={editingProduct.stockQuantity} onChange={(event) => setEditingProduct({ ...editingProduct, stockQuantity: event.target.value })} /></label>
                    </div>
                    <fieldset className="admin-models-fieldset">
                      <legend>Compatible phone models</legend>
                      <div className="admin-model-options">
                        {availableModels.map((model) => (
                          <label className="admin-model-option" key={model}>
                            <input type="checkbox" checked={editingProduct.models.includes(model)} onChange={() => toggleProductModel(model)} />
                            <span>{model}</span>
                          </label>
                        ))}
                      </div>
                      <div className="admin-model-add">
                        <input
                          value={editingProduct.newModel}
                          aria-label={`Add a compatible model for ${item.name}`}
                          placeholder="Add a model not listed"
                          onChange={(event) => setEditingProduct({ ...editingProduct, newModel: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              addProductModel()
                            }
                          }}
                        />
                        <button className="secondary-button" type="button" onClick={addProductModel} disabled={!editingProduct.newModel.trim()}>Add model</button>
                      </div>
                    </fieldset>
                    <label>Image URLs (one per line; remove URLs to remove images)
                      <textarea rows="3" value={editingProduct.imageUrls} onChange={(event) => setEditingProduct({ ...editingProduct, imageUrls: event.target.value })} />
                    </label>
                    <label className="admin-image-upload">Add more product images
                      <input ref={editImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={selectEditImages} />
                    </label>
                    {editImagePreviews.length > 0 && (
                      <div className="admin-image-previews" aria-label="New product image previews">
                        {editImagePreviews.map((preview, index) => (
                          <img key={`${editImageFiles[index].name}-${index}`} src={preview} alt={`New product image ${index + 1}`} />
                        ))}
                      </div>
                    )}
                    <label>Description<textarea required rows="4" value={editingProduct.desc} onChange={(event) => setEditingProduct({ ...editingProduct, desc: event.target.value })} /></label>
                    <div className="admin-model-editor-actions">
                      <button className="primary-button" type="submit" disabled={isSavingProduct}>{isSavingProduct ? 'Saving...' : 'Save product'}</button>
                      <button className="secondary-button" type="button" onClick={cancelProductEdit} disabled={isSavingProduct}>Cancel</button>
                    </div>
                    {editStatus && <p className="admin-status error">{editStatus}</p>}
                  </form>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default AdminPage

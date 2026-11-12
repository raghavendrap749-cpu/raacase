export function addProductToCart(cart, product) {
  const selectedModel = product.selectedModel || ''
  const matchesVariant = (item) => item.product.id === product.id
    && (item.product.selectedModel || '') === selectedModel
  const existingItem = cart.find(matchesVariant)

  if (!existingItem) {
    return [...cart, { product, quantity: 1 }]
  }

  return cart.map((item) =>
    matchesVariant(item)
      ? { ...item, quantity: item.quantity + 1 }
      : item,
  )
}

export function mergeCarts(primaryCart, secondaryCart) {
  const mergedCart = [...primaryCart]

  for (const item of secondaryCart) {
    const selectedModel = item.product.selectedModel || ''
    const existingIndex = mergedCart.findIndex((entry) =>
      entry.product.id === item.product.id && (entry.product.selectedModel || '') === selectedModel,
    )
    if (existingIndex === -1) {
      mergedCart.push(item)
    } else {
      mergedCart[existingIndex] = {
        ...mergedCart[existingIndex],
        quantity: mergedCart[existingIndex].quantity + item.quantity,
      }
    }
  }

  return mergedCart
}

export function removeCartItemByProductId(cart, productId, selectedModel) {
  return cart.filter((item) => item.product.id !== productId
    || (selectedModel !== undefined && (item.product.selectedModel || '') !== selectedModel))
}

export function updateCartItemQuantity(cart, productId, quantity, selectedModel) {
  if (quantity <= 0) {
    return removeCartItemByProductId(cart, productId, selectedModel)
  }

  return cart.map((item) =>
    item.product.id === productId
      && (selectedModel === undefined || (item.product.selectedModel || '') === selectedModel)
      ? { ...item, quantity }
      : item,
  )
}

export function getCartCount(cart) {
  return cart.reduce((sum, item) => sum + item.quantity, 0)
}

export function getCartTotal(cart) {
  return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
}

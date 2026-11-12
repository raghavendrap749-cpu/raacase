import test from 'node:test'
import assert from 'node:assert/strict'
import { addProductToCart, mergeCarts, removeCartItemByProductId, updateCartItemQuantity, getCartCount, getCartTotal } from './cartUtils.js'

test('adds a new product line with quantity 1', () => {
  const cart = []
  const product = { id: 1, name: 'Urban Floral Back Cover', price: 399 }

  const nextCart = addProductToCart(cart, product)

  assert.equal(nextCart.length, 1)
  assert.equal(nextCart[0].product.id, 1)
  assert.equal(nextCart[0].quantity, 1)
})

test('groups repeated products and increases quantities instead of duplicating the line', () => {
  const cart = [
    { product: { id: 1, name: 'Urban Floral Back Cover', price: 399 }, quantity: 1 },
  ]
  const product = { id: 1, name: 'Urban Floral Back Cover', price: 399 }

  const nextCart = addProductToCart(cart, product)

  assert.equal(nextCart.length, 1)
  assert.equal(nextCart[0].quantity, 2)
})

test('merges guest cart items with saved items, keeping phone models separate', () => {
  const product = { id: 1, name: 'Case', price: 399 }
  const savedCart = [{ product: { ...product, selectedModel: 'iPhone 15' }, quantity: 2 }]
  const guestCart = [
    { product: { ...product, selectedModel: 'iPhone 15' }, quantity: 1 },
    { product: { ...product, selectedModel: 'iPhone 16' }, quantity: 1 },
  ]

  const mergedCart = mergeCarts(savedCart, guestCart)

  assert.equal(mergedCart.length, 2)
  assert.equal(mergedCart[0].quantity, 3)
  assert.equal(mergedCart[1].product.selectedModel, 'iPhone 16')
  assert.equal(mergedCart[1].quantity, 1)
})

test('keeps the same product as separate cart lines for different phone models', () => {
  const product = { id: 1, name: 'Urban Floral Back Cover', price: 399 }
  const withIphone12 = addProductToCart([], { ...product, selectedModel: 'iPhone 12' })
  const withIphone16 = addProductToCart(withIphone12, { ...product, selectedModel: 'iPhone 16' })
  const repeatedIphone12 = addProductToCart(withIphone16, { ...product, selectedModel: 'iPhone 12' })

  assert.equal(repeatedIphone12.length, 2)
  assert.equal(repeatedIphone12[0].quantity, 2)
  assert.equal(repeatedIphone12[1].quantity, 1)
})

test('updates and removes only the selected phone model variant', () => {
  const product = { id: 1, name: 'Urban Floral Back Cover', price: 399 }
  const cart = [
    { product: { ...product, selectedModel: 'iPhone 12' }, quantity: 1 },
    { product: { ...product, selectedModel: 'iPhone 16' }, quantity: 1 },
  ]

  const updatedCart = updateCartItemQuantity(cart, 1, 3, 'iPhone 12')
  assert.equal(updatedCart[0].quantity, 3)
  assert.equal(updatedCart[1].quantity, 1)

  const remainingCart = removeCartItemByProductId(updatedCart, 1, 'iPhone 12')
  assert.equal(remainingCart.length, 1)
  assert.equal(remainingCart[0].product.selectedModel, 'iPhone 16')
})

test('removes a product by product id and gives accurate cart totals', () => {
  const cart = [
    { product: { id: 1, name: 'Urban Floral Back Cover', price: 399 }, quantity: 2 },
    { product: { id: 2, name: 'Soft Silicone Grip Cover', price: 299 }, quantity: 1 },
  ]

  const nextCart = removeCartItemByProductId(cart, 1)

  assert.equal(nextCart.length, 1)
  assert.equal(nextCart[0].product.id, 2)
  assert.equal(getCartCount(nextCart), 1)
  assert.equal(getCartTotal(nextCart), 299)
})

test('updates quantity and removes an item when quantity reaches zero', () => {
  const cart = [{ product: { id: 1, name: 'Urban Floral Back Cover', price: 399 }, quantity: 2 }]

  const increasedCart = updateCartItemQuantity(cart, 1, 3)
  assert.equal(increasedCart[0].quantity, 3)
  assert.deepEqual(updateCartItemQuantity(increasedCart, 1, 0), [])
})

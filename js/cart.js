const CART_KEY = "cart_v1";

/*
  Cart item structure (recommended):
  {
    id: "123",         // product id (string or number)
    qty: 2,            // quantity
    priceSnapshot: 100000, // optional
    size: "12cm"           // optional
  }
*/

function getCartItemSize(item) {
  return String(item?.size || "");
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    console.error("Invalid cart data:", e);
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  // optional: dispatchEvent to (header badge, mini cart)
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: { count: getCartCount() } }));
}

function addToCart(item) {
  // item = { id, qty = 1, priceSnapshot?, size? }
  const cart = getCart();
  const id = String(item.id);
  const qtyToAdd = Number(item.qty) || 1;
  const size = String(item.size || "");

  const exist = cart.find(i => String(i.id) === id && getCartItemSize(i) === size);
  if (exist) {
    exist.qty = Number(exist.qty) + qtyToAdd;
    if (item.priceSnapshot !== undefined) {
      exist.priceSnapshot = item.priceSnapshot;
    }
  } else {
    cart.push({
      id,
      qty: qtyToAdd,
      ...(item.priceSnapshot !== undefined ? { priceSnapshot: item.priceSnapshot } : {}),
      ...(size ? { size } : {})
    });
  }
  saveCart(cart);
}

// cập nhật số lượng (nếu qty <= 0 thì xóa)
function updateCartQty(id, qty, size = "") {
  const cart = getCart();
  const normalizedSize = String(size || "");
  const idx = cart.findIndex(i => String(i.id) === String(id) && getCartItemSize(i) === normalizedSize);
  if (idx === -1) return;
  qty = Number(qty);
  if (qty > 0) {
    cart[idx].qty = qty;
  }
  saveCart(cart);
}

function removeFromCart(id, size = "") {
  const normalizedSize = String(size || "");
  const cart = getCart().filter(i => !(String(i.id) === String(id) && getCartItemSize(i) === normalizedSize));
  saveCart(cart);
}

// clear toàn bộ cart
function clearCart() {
  saveCart([]);
}

function getCartCount() {
  return getCart().reduce((s, i) => s + Number(i.qty), 0);
}

// tính tổng tiền dựa vào productsData (mảng sản phẩm từ products.json)
// productsData phải có trường id và price
// nếu cart item có priceSnapshot thì ưu tiên dùng snapshot
function getCartTotal(productsData = []) {
  const cart = getCart();
  let total = 0;
  cart.forEach(ci => {
    const id = String(ci.id);
    const qty = Number(ci.qty) || 0;
    const product = productsData.find(p => String(p.id) === id || String(p.Id) === id);
    const price = (ci.priceSnapshot !== undefined)
      ? Number(ci.priceSnapshot)
      : (product ? Number(product.price || product.Price || 0) : 0);
    total += price * qty;
  });
  return Math.round(total);
}

// render badge (selector ví dụ: "#cart-badge")
function renderCartBadge(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  const count = getCartCount();

  el.textContent = count > 0 ? String(count) : "";
  el.style.display = count > 0 ? "inline-flex" : "none";
  if (el.classList.contains("hidden")) {
    el.classList.toggle("hidden", count <= 0);
  }
}

// Ví dụ: bắt event cập nhật badge tự động
window.addEventListener("cart:updated", () => {
  renderCartBadge("#cart-badge");
});

window.addEventListener("header:loaded", () => {
  renderCartBadge("#cart-badge");
});

window.addEventListener("storage", () => {
  renderCartBadge("#cart-badge");
});

// Khởi tạo badge khi load
document.addEventListener("DOMContentLoaded", () => {
  renderCartBadge("#cart-badge");
});

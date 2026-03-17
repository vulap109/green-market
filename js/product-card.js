function getProductSlug(product) {
    if (product.slug) return product.slug;

    return String(product.name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function productCard(p) {
    const productSlug = getProductSlug(p);

    return `
        <div class="product-card bg-white border border-gray-100 rounded-xl overflow-hidden transition-all flex flex-col group relative shadow-sm hover:shadow-xl">
            <div class="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                <img src="${p.img}"
                    class="img-cover group-hover:scale-105 transition-all duration-500">
                <span class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded">${p.discount}</span>
            </div>
            <div class="p-5 flex-1 flex flex-col text-center">
                <h3 class="text-sm font-bold text-gray-800 line-clamp-2 mb-2 leading-tight hover:text-primary transition cursor-pointer">${p.name}</h3>
                <div class="mt-auto">
                    <div class="flex justify-center items-center gap-2">
                        <span class="text-red-600 font-black text-base">${p.price.toLocaleString()} ₫</span>
                        <span class="text-gray-400 line-through text-xs font-medium">${p.finalPrice.toLocaleString()} ₫</span>
                    </div>
                    <button onclick="handleAddToCartAndOrder('${productSlug}')"
                        class="w-full mt-4 bg-white border border-primary text-primary py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
                        CHỌN MUA
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderProducts(products, containerId) {
	const container = document.getElementById(containerId);
	if (!container) return;

	container.innerHTML = products
		.map(productCard)
		.join("");
}

function loadProducts(category = null, limit = null, ids = null, containerId = "productList"){
    fetch("data/products.json")
    .then(res => res.json())
    .then(products => {
        if (Array.isArray(ids) && ids.length > 0) {
            products = ids
                .map(id => products.find(p => String(p.id) === String(id)))
                .filter(Boolean);
        }

        //fillter by category
        if(category){
            products = products.filter(p => p.category === category);
        }

        if(limit){
            products = products.slice(0, limit);
        }

        //Calculate discount & final price
        products.forEach(p => {
            p.finalPrice = p.price * (1 - p.discount);
            p.discount = "-" + (p.discount * 100) + "%";
        });

        renderProducts(products, containerId);
    })
    .catch(err => console.error("loadProducts Err:" +  err));
}

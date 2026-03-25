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
    const discountPercent = "-" + p.discount + "%";
    const flashSaleIcon = p.discount >= 11
        ? '<img id="icon-flash-sale" src="./images/icon_flash_sale.png" class="absolute top-0 right-2 img-conver" width="80px">'
        : "";
    let discountSpan = "";
    let priceSpan = "";
    if (p.discount > 0){
        discountSpan = `<span class="absolute top-2 left-2 bg-red-600 text-white text-xs font-medium px-2 py-1 rounded">${discountPercent}</span>`;
        priceSpan = `<span class="text-gray-400 line-through text-xs font-medium">${p.price.toLocaleString()} ₫</span>`;
    }

    return `
        <div class="product-card bg-white border border-gray-100 rounded-xl overflow-hidden transition-all flex flex-col group relative shadow-sm hover:shadow-xl">
            <a href="product.html?slug=${encodeURIComponent(productSlug)}" class="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                <img src="${p.img}"
                    class="img-cover group-hover:scale-105 transition-all duration-500">
                ${discountSpan}
                ${flashSaleIcon}
            </a>
            <div class="py-5 px-2 sm:px-5 flex-1 flex flex-col text-center">
                <a href="product.html?slug=${encodeURIComponent(productSlug)}" class="text-sm font-bold text-gray-800 line-clamp-2 mb-2 leading-tight hover:text-primary transition cursor-pointer">${p.name}</a>
                <div class="mt-auto">
                    <div class="flex flex-col sm:flex-row justify-center items-center gap-2">
                        <span class="text-red-600 font-black text-base">${p.finalprice.toLocaleString()} ₫</span>
                        ${priceSpan}
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

    if (!Array.isArray(products) || !products.length) {
        container.innerHTML = `
            <div class="col-span-full rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
                Khong tim thay san pham phu hop.
            </div>
        `;
        return;
    }

    container.innerHTML = products
        .map(productCard)
        .join("");
}

function loadProducts(category = null, limit = null, ids = null, containerId = "productList", options = {}) {
    const productsPromise = typeof getProductsData === "function"
        ? getProductsData()
        : fetch("/data/products.json").then(res => res.json());

    return productsPromise
        .then(products => {
            products = Array.isArray(products) ? products.slice() : [];

            if (Array.isArray(ids) && ids.length > 0) {
                products = ids
                    .map(id => products.find(p => String(p.id) === String(id)))
                    .filter(Boolean);
            }

            //fillter by category
            if (category) {
                products = products.filter(p => p.category === category);
            }

            if (options.keyword) {
                if (typeof filterProductsByKeyword === "function") {
                    products = filterProductsByKeyword(products, options.keyword);
                } else {
                    const fallbackKeyword = String(options.keyword || "").toLowerCase().trim();
                    products = products.filter(function (product) {
                        return String(product.name || "").toLowerCase().includes(fallbackKeyword);
                    });
                }
            }

            const hasLimit = Number(limit) > 0;
            const totalProducts = products.length;
            const pageSize = hasLimit ? Number(limit) : totalProducts;
            const totalPages = totalProducts === 0 ? 0 : (hasLimit ? Math.ceil(totalProducts / pageSize) : 1);
            const requestedPage = Number(options.page) || 1;
            const currentPage = totalPages === 0 ? 1 : Math.min(Math.max(requestedPage, 1), totalPages);
            let pagedProducts = products.slice();

            if (hasLimit) {
                const startIndex = (currentPage - 1) * pageSize;
                pagedProducts = products.slice(startIndex, startIndex + pageSize);
            }

            //Calculate discount
            pagedProducts = pagedProducts.map(function (product) {
                return {
                    ...product,
                    discount: getProductDiscount(product)
                };
            });

            renderProducts(pagedProducts, containerId);

            const pageInfo = {
                currentPage,
                totalPages,
                totalProducts,
                pageSize
            };

            if (typeof options.onPageInfo === "function") {
                options.onPageInfo(pageInfo);
            }

            return pageInfo;
        })
        .catch(err => {
            console.error("loadProducts Err:" + err);
            renderProducts([], containerId);

            const pageInfo = {
                currentPage: 1,
                totalPages: 0,
                totalProducts: 0,
                pageSize: 0
            };

            if (typeof options.onPageInfo === "function") {
                options.onPageInfo(pageInfo);
            }

            return pageInfo;
        });
}

function getProductDiscount(product) {
    const originalPrice = Number(product.price || 0);
    const finalPrice = Number(product.finalprice || 0);

    if (!originalPrice || finalPrice >= originalPrice) {
        return 0;
    }

    const percent = ((originalPrice - finalPrice) / originalPrice) * 100;
    return Math.floor(percent * 2) / 2;
}

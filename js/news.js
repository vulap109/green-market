const NEWS_DATA_URL = "/data/news.json";
let newsDataPromise = null;
let currentNewsArticle = null;

function getNewsElements() {
    return {
        article: document.getElementById("newsArticle"),
        status: document.getElementById("newsStatus"),
        statusTitle: document.getElementById("newsStatusTitle"),
        statusDescription: document.getElementById("newsStatusDescription"),
        breadcrumbTitle: document.getElementById("breadcrumbArticleTitle"),
        title: document.getElementById("articleTitle"),
        author: document.getElementById("articleAuthor"),
        date: document.getElementById("articleDate"),
        heroImage: document.getElementById("articleHeroImage"),
        content: document.getElementById("articleContent")
    };
}

function resolveNewsAssetPath(path) {
    const normalizedPath = String(path || "").trim();

    if (!normalizedPath) {
        return "";
    }

    if (/^https?:\/\//i.test(normalizedPath)) {
        return normalizedPath;
    }

    return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
}

function setNewsStatus(title, description) {
    const elements = getNewsElements();
    if (!elements.status || !elements.statusTitle || !elements.statusDescription || !elements.article) {
        return;
    }

    elements.statusTitle.textContent = title;
    elements.statusDescription.textContent = description || "";
    elements.status.classList.remove("hidden");
    elements.article.classList.add("hidden");
}

function showNewsArticle() {
    const elements = getNewsElements();
    if (!elements.status || !elements.article) {
        return;
    }

    elements.status.classList.add("hidden");
    elements.article.classList.remove("hidden");
}

function getNewsData() {
    if (!newsDataPromise) {
        newsDataPromise = fetch(NEWS_DATA_URL)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Can not load news.json");
                }

                return response.json();
            })
            .then(function (newsItems) {
                return Array.isArray(newsItems) ? newsItems : [];
            })
            .catch(function (error) {
                newsDataPromise = null;
                throw error;
            });
    }

    return newsDataPromise;
}

function getRequestedNewsSlug() {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("slug") || "").trim().toLowerCase();
}

function syncNewsSlugInUrl(slug) {
    const nextSlug = String(slug || "").trim();
    if (!nextSlug) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("slug") === nextSlug) {
        return;
    }

    params.set("slug", nextSlug);
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
}

function renderNewsShell(article) {
    const elements = getNewsElements();
    if (!elements.title || !elements.author || !elements.date || !elements.heroImage || !elements.breadcrumbTitle) {
        return;
    }

    const heroImagePath = resolveNewsAssetPath(article.hero || article.thumbnail);
    const heroImageAlt = article.heroAlt || article.thumbnailAlt || article.title || "Ảnh bài viết";

    elements.title.textContent = article.title || "Tin tức";
    elements.author.textContent = `bởi: ${article.author || "Green Market"}`;
    elements.date.textContent = article.dateLabel || article.date || "";
    elements.heroImage.src = heroImagePath;
    elements.heroImage.alt = heroImageAlt;
    elements.breadcrumbTitle.textContent = article.title || "Tin tức";
    document.title = `${article.title || "Tin tức"} | Green Market`;
}

function renderNewsArticle(article, contentHtml) {
    const elements = getNewsElements();
    if (!elements.content) {
        return;
    }

    currentNewsArticle = article;
    renderNewsShell(article);
    elements.content.innerHTML = contentHtml;
    showNewsArticle();

    if (window.location.hash) {
        window.setTimeout(function () {
            const targetSection = document.querySelector(window.location.hash);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 0);
    }
}

function createContentUnavailableMarkup() {
    return `
        <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-sm text-gray-500">
            Không tải được nội dung bài viết. Vui lòng thử tải lại trang sau ít phút.
        </div>
    `;
}

function loadNewsContent(article) {
    const contentFile = resolveNewsAssetPath(article && article.contentFile);

    if (!contentFile) {
        renderNewsArticle(article, createContentUnavailableMarkup());
        return Promise.resolve();
    }

    return fetch(contentFile)
        .then(function (response) {
            if (!response.ok) {
                throw new Error(`Can not load article content: ${contentFile}`);
            }

            return response.text();
        })
        .then(function (contentHtml) {
            renderNewsArticle(article, contentHtml);
        })
        .catch(function (error) {
            console.error("loadNewsContent error:", error);
            renderNewsArticle(article, createContentUnavailableMarkup());
        });
}

function renderNewsNotFound() {
    const elements = getNewsElements();
    if (elements.breadcrumbTitle) {
        elements.breadcrumbTitle.textContent = "Không tìm thấy bài viết";
    }

    document.title = "Không tìm thấy bài viết | Green Market";
    setNewsStatus(
        "Không tìm thấy bài viết",
        "Đường dẫn bài viết không hợp lệ hoặc nội dung này chưa được xuất bản."
    );
}

function renderNewsLoadError(error) {
    console.error("loadNewsArticle error:", error);
    document.title = "Không tải được bài viết | Green Market";
    setNewsStatus(
        "Không tải được dữ liệu bài viết",
        "Vui lòng thử tải lại trang hoặc kiểm tra lại file dữ liệu news."
    );
}

function loadNewsArticle() {
    setNewsStatus("Đang tải bài viết...", "Mình đang lấy dữ liệu bài viết từ news.json.");

    getNewsData()
        .then(function (newsItems) {
            if (!newsItems.length) {
                setNewsStatus(
                    "Chưa có bài viết nào",
                    "Hãy thêm dữ liệu vào /data/news.json để hiển thị trang chi tiết."
                );
                document.title = "Chưa có bài viết | Green Market";
                return null;
            }

            const requestedSlug = getRequestedNewsSlug();
            const article = requestedSlug
                ? newsItems.find(function (item) {
                    return String((item && item.slug) || "").trim().toLowerCase() === requestedSlug;
                })
                : newsItems[0];

            if (!article) {
                renderNewsNotFound();
                return null;
            }

            syncNewsSlugInUrl(article.slug);
            return loadNewsContent(article);
        })
        .catch(renderNewsLoadError);
}

function toggleTOC() {
    const tocList = document.getElementById("tocList");
    const tocToggleBtn = document.getElementById("tocToggleBtn");

    if (!tocList || !tocToggleBtn) {
        return;
    }

    const shouldHide = !tocList.classList.contains("hidden");
    tocList.classList.toggle("hidden", shouldHide);
    tocToggleBtn.textContent = shouldHide ? "[Hiện]" : "[Ẩn]";
}

function showAllProductsPage(categoryName) {
    window.location.href = `all-products.html?q=${encodeURIComponent(categoryName)}`;
}

function showShareFeedback(text) {
    if (window.Swal && typeof window.Swal.fire === "function") {
        window.Swal.fire({
            text,
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: "top-end"
        });
        return;
    }

    window.alert(text);
}

function copyArticleLink() {
    const articleUrl = window.location.href;

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(articleUrl)
            .then(function () {
                showShareFeedback("Đã sao chép link bài viết.");
            })
            .catch(function () {
                window.prompt("Sao chép link bài viết:", articleUrl);
            });
        return;
    }

    window.prompt("Sao chép link bài viết:", articleUrl);
}

function shareArticle(platform) {
    const articleUrl = window.location.href;
    const articleTitle = currentNewsArticle && currentNewsArticle.title
        ? currentNewsArticle.title
        : document.title;

    if (platform === "facebook") {
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`,
            "_blank",
            "noopener,noreferrer"
        );
        return;
    }

    if (platform === "twitter") {
        window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(articleTitle)}`,
            "_blank",
            "noopener,noreferrer"
        );
        return;
    }

    copyArticleLink();
}

loadNewsArticle();

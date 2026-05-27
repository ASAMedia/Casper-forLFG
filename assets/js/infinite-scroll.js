/* eslint-env browser */

/**
 * Infinite Scroll + Manual Load-More
 *
 * Default behaviour matches Casper's original: when the page is scrolled to
 * within 300px of the bottom, the next page of posts is fetched via the
 * <link rel="next"> URL emitted by {{ghost_head}} and the resulting
 * article.post-card elements are appended to .post-feed.
 *
 * In addition, the script wires up two optional controls (rendered by the
 * list templates after .post-feed):
 *   - #load-more-btn  : manually fetches the next page on click.
 *   - #autoload-toggle: checkbox that turns scroll-driven loading on/off.
 *                       The choice is persisted in localStorage so it sticks
 *                       across visits.
 */

(function (window, document) {
    if (document.documentElement.classList.contains('no-infinite-scroll')) return;

    var nextElement = document.querySelector('link[rel=next]');
    var feedElement = document.querySelector('.post-feed');
    var loadMoreWrapper = document.querySelector('.load-more-wrapper');
    var loadMoreBtn = document.getElementById('load-more-btn');
    var autoloadToggle = document.getElementById('autoload-toggle');

    if (!feedElement) return;
    if (!nextElement && !loadMoreBtn) return;

    var buffer = 50;
    var ticking = false;
    var loading = false;

    var lastScrollY = window.scrollY;
    var lastWindowHeight = window.innerHeight;
    var lastDocumentHeight = document.documentElement.scrollHeight;

    var autoloadEnabled = true;
    try {
        var stored = window.localStorage.getItem('autoload-enabled');
        if (stored !== null) autoloadEnabled = stored === 'true';
    } catch (e) { /* localStorage unavailable */ }

    if (autoloadToggle) {
        autoloadToggle.checked = autoloadEnabled;
        autoloadToggle.addEventListener('change', function () {
            autoloadEnabled = autoloadToggle.checked;
            try {
                window.localStorage.setItem('autoload-enabled', autoloadEnabled);
            } catch (e) {}
            if (autoloadEnabled) requestTick();
        });
    }

    function hideLoadMore() {
        if (loadMoreWrapper) loadMoreWrapper.style.display = 'none';
    }

    function onPageLoad() {
        if (this.status === 404) {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            nextElement = null;
            hideLoadMore();
            loading = false;
            ticking = false;
            return;
        }

        var postElements = this.response.querySelectorAll('article.post-card');
        postElements.forEach(function (item) {
            feedElement.appendChild(document.importNode(item, true));
        });

        var resNextElement = this.response.querySelector('link[rel=next]');
        if (resNextElement) {
            nextElement.href = resNextElement.href;
        } else {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            nextElement = null;
            hideLoadMore();
        }

        lastDocumentHeight = document.documentElement.scrollHeight;
        ticking = false;
        loading = false;
        if (loadMoreBtn) loadMoreBtn.disabled = false;
    }

    function loadNext() {
        if (loading || !nextElement) return;
        loading = true;
        if (loadMoreBtn) loadMoreBtn.disabled = true;

        var xhr = new window.XMLHttpRequest();
        xhr.responseType = 'document';
        xhr.addEventListener('load', onPageLoad);
        xhr.open('GET', nextElement.href);
        xhr.send(null);
    }

    function onUpdate() {
        if (!autoloadEnabled) { ticking = false; return; }
        if (loading) return;
        if (lastScrollY + lastWindowHeight <= lastDocumentHeight - buffer) {
            ticking = false;
            return;
        }
        loadNext();
    }

    function requestTick() {
        ticking || window.requestAnimationFrame(onUpdate);
        ticking = true;
    }

    function onScroll() {
        lastScrollY = window.scrollY;
        requestTick();
    }

    function onResize() {
        lastWindowHeight = window.innerHeight;
        lastDocumentHeight = document.documentElement.scrollHeight;
        requestTick();
    }

    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadNext);

    if (!nextElement) {
        hideLoadMore();
        return;
    }

    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onResize);
    requestTick();
})(window, document);

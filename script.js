// If absolute URL from the remote server is provided, configure the CORS
// header on that server.
var url = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';

// Loaded via <script> tag, create shortcut to access PDF.js exports.
var pdfjsLib = window['pdfjs-dist/build/pdf'];

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.js';

var pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    lastPageRender = false,
    pageNumPending = null,
    scale = 2.0,
    canvas = document.getElementById('the-canvas'),
    ctx = canvas.getContext('2d');

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
async function renderPage(num) {
    pageRendering = true;
    // Using promise to fetch the page
    let curPage = 1;
    if (num != 'lastPage') {
        curPage = num;
    } else {
        lastPageRender = false;
    }

    let page = await pdfDoc.getPage(curPage);
    var viewport = page.getViewport({ scale: scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.border = '2px solid black';

    if (num == 'lastPage') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, viewport.height, viewport.width);
        
    } else {
        // Render PDF page into canvas context
        var renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        var renderTask = page.render(renderContext);
        // Wait for rendering to finish
        renderTask.promise.then(function () {
            pageRendering = false;
            if (pageNumPending !== null) {
                // New page rendering is pending
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    }

    // Update page counters
    if (num == 'lastPage') {
        curPage = pdfDoc.numPages + 1
    }
    document.getElementById('page_num').textContent = curPage;
}

/**
 * If another page rendering in progress, waits until the rendering is
 * finised. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
    if (pageRendering && lastPageRender) {
        pageNumPending = num;
    } else if (num == 'lastPage') {
        lastPageRender = true;
        renderPage(num)
    } else {
        renderPage(num);
    }
}

/**
 * Displays previous page.
 */
function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    if (!pageRendering && !lastPageRender) {
        pageNum--;
    }
    queueRenderPage(pageNum);
}
document.getElementById('prev').addEventListener('click', onPrevPage);

/**
 * Displays next page.
 */
function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        queueRenderPage('lastPage');
        return;
    } else {
        pageNum++;
        queueRenderPage(pageNum);
    }
}
document.getElementById('next').addEventListener('click', onNextPage);

/**
 * Asynchronously downloads PDF.
 */
pdfjsLib.getDocument(url).promise.then(function (pdfDoc_) {
    pdfDoc = pdfDoc_;
    document.getElementById('page_count').textContent = pdfDoc.numPages + 1;

    // Initial/first page rendering
    renderPage(pageNum);
});

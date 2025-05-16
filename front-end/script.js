document.getElementById('scrape').addEventListener('click', function() {
    const url = document.getElementById('url').value;
    document.getElementById('results').innerText = 'Scraping...';

    fetch(`http://127.0.0.1:8002/scrape?url=${url}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('results').innerText = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById('results').innerText = 'Error occurred while scraping.';
        });
});

// Dynamic field logic
function removeField(btn) {
    const row = btn.parentElement;
    const list = document.getElementById('fields-list');
    if (list.children.length > 1) {
        list.removeChild(row);
    }
}

document.getElementById('add-field').addEventListener('click', function() {
    const list = document.getElementById('fields-list');
    const row = document.createElement('div');
    row.className = 'field-row';
    row.innerHTML = `
        <input type="text" class="field-name" placeholder="Field Name">
        <input type="text" class="field-selector" placeholder="Field CSS Selector">
        <button class="remove-field" onclick="removeField(this)">Remove</button>
    `;
    list.appendChild(row);
});

// Dynamic scrape logic
document.getElementById('dynamic-scrape').addEventListener('click', function() {
    const url = document.getElementById('dyn-url').value;
    const containerSelector = document.getElementById('container-selector').value;
    const enableScrolling = document.getElementById('enable-scrolling').checked;
    const maxScrolls = parseInt(document.getElementById('max-scrolls').value, 10) || 5;

    // Collect custom fields
    const fields = [];
    document.querySelectorAll('#fields-list .field-row').forEach(row => {
        const name = row.querySelector('.field-name').value.trim();
        const selector = row.querySelector('.field-selector').value.trim();
        if (name && selector) {
            fields.push({ name, selector });
        }
    });

    if (!url || !containerSelector || fields.length === 0) {
        document.getElementById('results').innerText = 'Please fill all dynamic scrape fields.';
        return;
    }

    document.getElementById('results').innerText = 'Scraping dynamically...';

    fetch('http://127.0.0.1:8002/scrape-dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url: url,
            container_selector: containerSelector,
            custom_fields: fields,
            enable_scrolling: enableScrolling,
            max_scrolls: maxScrolls
        })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('results').innerText = JSON.stringify(data, null, 2);
    })
    .catch(error => {
        document.getElementById('results').innerText = 'Dynamic scrape failed.';
    });
});

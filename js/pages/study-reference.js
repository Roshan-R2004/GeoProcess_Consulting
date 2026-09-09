// Pure Vanilla Interactive Core for Fast DOM Processing
        document.addEventListener('DOMContentLoaded', () => {
            const expandAllBtn = document.getElementById('expandAllBtn');
            const collapseAllBtn = document.getElementById('collapseAllBtn');
            const searchInput = document.getElementById('libSearchInput');
            const pages = document.querySelectorAll('.source-page');

            // Expand / Collapse Functional Control
            expandAllBtn.addEventListener('click', () => {
                pages.forEach(p => p.setAttribute('open', 'true'));
            });

            collapseAllBtn.addEventListener('click', () => {
                pages.forEach(p => p.removeAttribute('open'));
            });

            // Interactive Real-Time Search Filter
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();

                pages.forEach(page => {
                    const text = page.textContent.toLowerCase();
                    if (query === '' || text.includes(query)) {
                        page.style.display = 'block';
                        if (query !== '') {
                            page.setAttribute('open', 'true');
                        }
                    } else {
                        page.style.display = 'none';
                    }
                });
            });
        });

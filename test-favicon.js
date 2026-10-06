const https = require('https');

https.get('https://github.com', (res) => {
    let html = '';
    res.on('data', d => html += d);
    res.on('end', () => {
        let favicon = '';
        const faviconPatterns = [
            /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i,
            /<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
            /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/i,
            // what about `rel="alternate icon"`?
            /<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']*)["']/i,
        ];
        for (const pattern of faviconPatterns) {
            const match = html.match(pattern);
            if (match) {
                favicon = match[1].trim();
                console.log('Matched pattern:', pattern);
                break;
            }
        }
        console.log('Favicon extracted:', favicon);
    });
});

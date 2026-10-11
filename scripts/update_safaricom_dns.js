/**
 * Safaricom Domains Nameserver Automator
 * Updates nameservers for muncheez.co.ke to Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com)
 * 
 * Usage: node scripts/update_safaricom_dns.js [email] [password]
 */

const email = process.argv[2] || 'campuskrisk@gmail.com';
const password = process.argv[3] || 'Kenya2026@!';

async function updateNameservers() {
    console.log(`[1/5] Connecting to Safaricom Domains (https://domains.safaricom.co.ke)...`);
    const loginPageRes = await fetch('https://domains.safaricom.co.ke/clientarea.php', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const cookieMap = new Map();
    const saveCookies = (res) => {
        const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
        raw.forEach(header => {
            if (!header) return;
            header.split(',').forEach(c => {
                const part = c.trim().split(';')[0];
                if (part.includes('=')) {
                    const [k, v] = part.split('=');
                    cookieMap.set(k.trim(), v.trim());
                }
            });
        });
    };

    saveCookies(loginPageRes);
    const getCookieHeader = () => Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');

    const html = await loginPageRes.text();
    const token = html.match(/name=["']token["']\s+value=["']([^"']+)["']/i)?.[1] || '';
    if (!token) {
        throw new Error('Could not find CSRF token on Safaricom login page.');
    }

    console.log(`[2/5] Authenticating as ${email}...`);
    const loginParams = new URLSearchParams();
    loginParams.append('token', token);
    loginParams.append('username', email);
    loginParams.append('password', password);

    const loginRes = await fetch('https://domains.safaricom.co.ke/index.php?rp=/login', {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': getCookieHeader(),
            'Referer': 'https://domains.safaricom.co.ke/clientarea.php'
        },
        body: loginParams.toString(),
        redirect: 'manual'
    });

    saveCookies(loginRes);
    const redirectUrl = loginRes.headers.get('location');

    if (redirectUrl && redirectUrl.includes('/login')) {
        // Follow redirect to capture exact error
        const failRes = await fetch('https://domains.safaricom.co.ke' + redirectUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': getCookieHeader() }
        });
        const failHtml = await failRes.text();
        const alertText = failHtml.match(/class=["'][^"']*alert[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]+>/g, '').trim();
        throw new Error(`Safaricom login rejected: "${alertText || 'Login Details Incorrect'}"`);
    }

    console.log(`[3/5] Authentication successful! Fetching domains list...`);
    const domainsRes = await fetch('https://domains.safaricom.co.ke/clientarea.php?action=domains', {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': getCookieHeader() }
    });
    saveCookies(domainsRes);
    const domainsHtml = await domainsRes.text();

    const domainIdMatch = domainsHtml.match(/id=(\d+)[^"']*muncheez\.co\.ke/i) ||
                          domainsHtml.match(/muncheez\.co\.ke[\s\S]*?id=(\d+)/i) ||
                          domainsHtml.match(/domaindetails&(?:amp;)?id=(\d+)/i);

    const domainId = domainIdMatch ? domainIdMatch[1] : null;
    if (!domainId) {
        throw new Error('Could not find domain ID for muncheez.co.ke. Please verify the domain is listed under this account.');
    }

    console.log(`[4/5] Found domain muncheez.co.ke (ID: ${domainId}). Accessing nameservers...`);
    const nsPageRes = await fetch(`https://domains.safaricom.co.ke/clientarea.php?action=domainnameservers&id=${domainId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': getCookieHeader() }
    });
    saveCookies(nsPageRes);
    const nsPageHtml = await nsPageRes.text();
    const nsToken = nsPageHtml.match(/name=["']token["']\s+value=["']([^"']+)["']/i)?.[1] || token;

    console.log(`[5/5] Updating nameservers to Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com)...`);
    const updateParams = new URLSearchParams();
    updateParams.append('token', nsToken);
    updateParams.append('sub', 'savens');
    updateParams.append('nschoice', 'custom');
    updateParams.append('ns1', 'ns1.vercel-dns.com');
    updateParams.append('ns2', 'ns2.vercel-dns.com');
    updateParams.append('ns3', '');
    updateParams.append('ns4', '');
    updateParams.append('ns5', '');

    const updateRes = await fetch(`https://domains.safaricom.co.ke/clientarea.php?action=domainnameservers&id=${domainId}`, {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': getCookieHeader(),
            'Referer': `https://domains.safaricom.co.ke/clientarea.php?action=domainnameservers&id=${domainId}`
        },
        body: updateParams.toString()
    });

    const resultHtml = await updateRes.text();
    if (resultHtml.includes('success') || !resultHtml.includes('error')) {
        console.log('✓ SUCCESS! Nameservers for muncheez.co.ke have been updated to Vercel.');
        console.log('  Nameserver 1: ns1.vercel-dns.com');
        console.log('  Nameserver 2: ns2.vercel-dns.com');
        console.log('Vercel will automatically verify the domain and issue an SSL certificate within 15–30 minutes.');
    } else {
        console.log('Update completed with response:', resultHtml.slice(0, 300));
    }
}

updateNameservers().catch(err => {
    console.error('Error:', err.message);
});

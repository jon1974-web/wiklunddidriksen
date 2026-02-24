# DNS Setup for wiklunddidriksen.com

## GitHub Pages DNS Configuration

To connect your custom domain `wiklunddidriksen.com` to GitHub Pages, you need to add the following DNS records with your domain registrar.

### A Records (for apex domain - wiklunddidriksen.com)

Add these 4 A records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ (or blank) | 185.199.108.153 | 3600 |
| A | @ (or blank) | 185.199.109.153 | 3600 |
| A | @ (or blank) | 185.199.110.153 | 3600 |
| A | @ (or blank) | 185.199.111.153 | 3600 |

### CNAME Record (for www subdomain)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | jon1974-web.github.io | 3600 |

## Steps to Configure

1. Log in to your domain registrar (where you bought wiklunddidriksen.com)
2. Go to DNS Management / DNS Settings
3. Add the 4 A records listed above
4. Add the CNAME record for www
5. Save the changes

## After DNS Configuration

1. Wait for DNS propagation (can take a few minutes to 48 hours, usually within an hour)
2. Go to your repository settings: https://github.com/jon1974-web/wiklunddidriksen/settings/pages
3. Under "Custom domain", you should see `wiklunddidriksen.com`
4. Check "Enforce HTTPS" (GitHub will provision SSL certificate automatically)
5. Your site will be available at:
   - https://wiklunddidriksen.com
   - https://www.wiklunddidriksen.com

## Verify DNS Propagation

You can check if DNS has propagated using:
- https://dnschecker.org/#A/wiklunddidriksen.com
- Or run: `dig wiklunddidriksen.com +short`

## Notes

- The CNAME file in the repository tells GitHub Pages which domain to use
- GitHub will automatically provision an SSL certificate for HTTPS
- DNS changes can take up to 48 hours to fully propagate globally
- Once DNS is configured, GitHub Pages will automatically enable HTTPS


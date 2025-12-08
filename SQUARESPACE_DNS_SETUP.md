# Squarespace DNS Setup for wiklunddidriksen.com

## Step-by-Step Instructions for Squarespace Domains

### 1. Access DNS Settings
1. Go to [squarespace.com](https://squarespace.com) and sign in
2. Navigate to **Settings** → **Domains** (or look for your domain in the dashboard)
3. Click on **wiklunddidriksen.com**
4. Look for **DNS Settings** or **DNS Records** tab/section

### 2. Add A Records (for wiklunddidriksen.com)

You need to add **4 A records** for the root domain:

1. Find the section for adding DNS records (may be called "Custom Records" or "DNS Records")
2. Click **Add Record** or **+** button
3. For each of the 4 records, fill in:
   - **Type**: Select `A`
   - **Host/Name**: `@` or leave blank (for root domain)
   - **Points to/Value**: Enter one of these IP addresses:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - **TTL**: `3600` (or leave default)
4. Click **Save** or **Add** after each record

**Repeat this 4 times** - once for each IP address listed above.

### 3. Add CNAME Record (for www.wiklunddidriksen.com)

1. Still in the DNS Records section
2. Click **Add Record** or **+** button
3. Fill in:
   - **Type**: Select `CNAME`
   - **Host/Name**: `www`
   - **Points to/Value**: `jon1974-web.github.io`
   - **TTL**: `3600` (or leave default)
4. Click **Save** or **Add**

### 4. Verify Your Records

After adding all records, you should see:

| Type | Host/Name | Points to/Value |
|------|-----------|-----------------|
| A | @ (or blank) | 185.199.108.153 |
| A | @ (or blank) | 185.199.109.153 |
| A | @ (or blank) | 185.199.110.153 |
| A | @ (or blank) | 185.199.111.153 |
| CNAME | www | jon1974-web.github.io |

### 5. Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate globally
- Usually works within **30-60 minutes**
- You can check propagation at: https://dnschecker.org/#A/wiklunddidriksen.com

### 6. Verify on GitHub

Once DNS has propagated:
1. Go to: https://github.com/jon1974-web/wiklunddidriksen/settings/pages
2. Under "Custom domain", you should see `wiklunddidriksen.com`
3. The error should disappear
4. Check the box for **"Enforce HTTPS"** (GitHub will provision SSL automatically)

### Troubleshooting

**If you can't find DNS settings:**
- Look for "Advanced DNS" or "DNS Management" 
- Some Squarespace interfaces have DNS under "Website" → "Domains" → "DNS Settings"
- If your domain is connected to a Squarespace site, you may need to disconnect it first or use "Advanced DNS" settings

**If records don't appear:**
- Make sure you're adding custom DNS records (not using Squarespace's default records)
- Refresh the page after adding records
- Check that you used `@` or left Host/Name blank for A records

**If still not working after 1 hour:**
- Verify records are saved correctly
- Check DNS propagation: `dig wiklunddidriksen.com +short`
- Make sure GitHub Pages is enabled and set to deploy from `main` branch

### Alternative: Using Squarespace's DNS Panel

If Squarespace has a specific DNS panel:
1. Look for **"DNS"** or **"DNS Records"** in the domain settings
2. You may see existing records - don't delete them unless they conflict
3. Add the new records as described above
4. Make sure to save changes


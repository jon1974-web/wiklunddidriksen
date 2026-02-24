# Google Domains DNS Setup for wiklunddidriksen.com

## Step-by-Step Instructions for Google Domains

### 1. Access DNS Settings
1. Go to [domains.google.com](https://domains.google.com)
2. Sign in to your Google account
3. Click on **wiklunddidriksen.com** in your domain list
4. In the left sidebar, click on **DNS**

### 2. Add A Records (for wiklunddidriksen.com)

You need to add **4 A records** for the root domain:

1. Scroll down to the **Custom resource records** section
2. Click **+ Create new record**
3. For each of the 4 records, fill in:
   - **DNS name**: `@` (or leave blank for root domain)
   - **Record type**: `A`
   - **TTL**: `3600` (or leave default)
   - **Data**: Enter one of these IP addresses:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
4. Click **Save** after each record

**Repeat this 4 times** - once for each IP address listed above.

### 3. Add CNAME Record (for www.wiklunddidriksen.com)

1. Still in the **Custom resource records** section
2. Click **+ Create new record**
3. Fill in:
   - **DNS name**: `www`
   - **Record type**: `CNAME`
   - **TTL**: `3600` (or leave default)
   - **Data**: `jon1974-web.github.io`
4. Click **Save**

### 4. Verify Your Records

After adding all records, you should see:

| DNS name | Record type | Data |
|----------|-------------|------|
| @ | A | 185.199.108.153 |
| @ | A | 185.199.109.153 |
| @ | A | 185.199.110.153 |
| @ | A | 185.199.111.153 |
| www | CNAME | jon1974-web.github.io |

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

**If records don't appear:**
- Make sure you're in the **Custom resource records** section (not the default records)
- Refresh the page after adding records
- Check that you used `@` or left DNS name blank for A records

**If still not working after 1 hour:**
- Verify records are saved correctly
- Check DNS propagation: `dig wiklunddidriksen.com +short`
- Make sure GitHub Pages is enabled and set to deploy from `main` branch


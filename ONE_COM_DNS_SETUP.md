# one.com DNS Setup for jwd.info

## Step-by-Step Instructions for one.com

### 1. Access DNS Settings
1. Log in to your [one.com](https://www.one.com) account
2. Go to **Domain** → **DNS settings** (or look for DNS management)
3. Select **jwd.info** from your domain list
4. Find the **DNS records** or **DNS management** section

### 2. Add A Records (for jwd.info)

You need to add **4 A records** for the root domain:

1. Look for **Add record** or **+** button
2. For each of the 4 records, fill in:
   - **Type**: Select `A`
   - **Host/Name**: `@` or leave blank (for root domain)
   - **Points to/Value**: Enter one of these IP addresses:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - **TTL**: `3600` (or leave default)
3. Click **Save** or **Add** after each record

**Repeat this 4 times** - once for each IP address listed above.

### 3. Add CNAME Record (for www.jwd.info)

1. Still in the DNS Records section
2. Click **Add record** or **+** button
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
- You can check propagation at: https://dnschecker.org/#A/jwd.info

### 6. Verify on GitHub

Once DNS has propagated:
1. Go to: https://github.com/jon1974-web/wiklunddidriksen/settings/pages
2. Under "Custom domain", you should see `jwd.info`
3. The error should disappear
4. Check the box for **"Enforce HTTPS"** (GitHub will provision SSL automatically)

### Troubleshooting

**If you can't find DNS settings:**
- Look for "DNS" or "DNS Management" in the domain settings
- In one.com, it's usually under **Domain** → **DNS settings**
- You may need to click on the specific domain first

**If records don't appear:**
- Make sure you're adding custom DNS records
- Refresh the page after adding records
- Check that you used `@` or left Host/Name blank for A records

**If still not working after 1 hour:**
- Verify records are saved correctly
- Check DNS propagation: `dig jwd.info +short`
- Make sure GitHub Pages is enabled and set to deploy from `main` branch

### Note about www.jwd.info

Since you mentioned you bought "www.jwd.info", make sure you also configure the root domain `jwd.info` (without www) with the A records above. This ensures both `jwd.info` and `www.jwd.info` work correctly.


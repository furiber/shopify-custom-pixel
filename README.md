# Shopify Custom Pixel for Server-Side Google Tag Manager (sGTM)

A production-ready custom web pixel for Shopify that routes all GA4 tracking data through your server-side GTM endpoint, maintaining session continuity and enabling advanced tracking capabilities.

## Why Use This?

**Problem:** Shopify's native Google & YouTube app sends data directly to `google-analytics.com`, which breaks session continuity when your main domain uses a custom sGTM endpoint. This results in fragmented user journeys and inaccurate attribution.

**Solution:** This custom pixel routes all tracking through your sGTM endpoint while maintaining complete e-commerce event tracking and session persistence across your entire funnel.

## Features

✅ **Complete E-commerce Tracking**
- Page views with clean URLs (no sandbox pollution)
- Product impressions and views
- Add to cart / Remove from cart
- Checkout funnel (begin_checkout, shipping info, payment info)
- Purchase events with transaction deduplication
- Search tracking
- Collection/category views

✅ **Session Continuity**
- All data routes through your custom sGTM endpoint
- Maintains consistent user sessions across domains
- First-party cookie support with extended lifetimes

✅ **Production Ready**
- Handles Shopify's sandbox environment constraints
- Clean data mapping to GA4 event schema
- Consent management integration
- Debug mode for testing

## Prerequisites

- Shopify store upgraded to Checkout Extensibility
- Active server-side GTM container with configured endpoint
- GA4 property
- Basic understanding of GTM and GA4

## Installation

### 1. Configure the Pixel Code

Copy the pixel code from `shopify-custom-pixel.js` and update these values:

```javascript
const SETTINGS = {
  measurementId: 'G-XXXXXXXXXX',           // Your GA4 Measurement ID
  serverContainerUrl: 'https://your-sgtm-endpoint.com',  // Your sGTM endpoint
  debug: true,                              // Set false for production
  affiliation: init.data.shop?.name || 'Shopify Store'
};
```

### 2. Deploy to Shopify

1. Navigate to **Settings → Customer events → Add custom pixel**
2. Name it "sGTM Tracking Pixel"
3. Paste the complete pixel code
4. Set **Permission** to "Not required"
5. Set **Data sale** to "Does not qualify as data sale"
6. Click **Save** then **Connect**

### 3. Configure Server-Side GTM

In your sGTM container:

**GA4 Client Setup:**
1. Verify GA4 Client is active (comes pre-installed)
2. Enable "Default gtag.js paths" if available
3. Enable "Server Managed Cookie (FPID)" for extended cookie lifetimes

**GA4 Event Tag:**
1. Create tag: **Google Analytics: GA4**
2. **Measurement ID**: Your GA4 property ID
3. **Event Name**: `{{Event Name}}` variable
4. **Trigger**: Custom Event where `Client Name` equals `GA4`
5. Enable **"Send Ecommerce data"** from Data Layer

### 4. Configure GA4 Property

1. **Admin → Data Streams → Enhanced Measurement** → Disable all automatic events (prevents conflicts with custom pixel)
2. Add `myshopify.com` to **Admin → Data Streams → Configure tag settings → List unwanted referrals**

## Event Mapping

| Shopify Customer Event | GA4 Event | Parameters |
|------------------------|-----------|------------|
| `page_viewed` | `page_view` | page_location, page_title, page_referrer |
| `collection_viewed` | `view_item_list` | item_list_id, item_list_name, items[] |
| `product_viewed` | `view_item` | currency, value, items[] |
| `product_added_to_cart` | `add_to_cart` | currency, value, items[] |
| `cart_viewed` | `view_cart` | currency, value, items[] |
| `product_removed_from_cart` | `remove_from_cart` | currency, value, items[] |
| `checkout_started` | `begin_checkout` | currency, value, coupon, items[] |
| `checkout_shipping_info_submitted` | `add_shipping_info` | shipping_tier, coupon, items[] |
| `payment_info_submitted` | `add_payment_info` | payment_type, coupon, items[] |
| `checkout_completed` | `purchase` | transaction_id, value, tax, shipping, items[] |
| `search_submitted` | `view_search_results` | search_term |

## Testing

**GTM Preview Mode does NOT work** with Shopify custom pixels due to sandbox isolation. Use these alternatives:

### Browser Console
1. Open DevTools (F12)
2. Switch JavaScript context from "top" to `web-pixel-sandbox-CUSTOM-[digits]`
3. Type `dataLayer` to view pushed events

### Network Tab
Filter by `collect?v=2` or your sGTM domain to verify:
- Script loads from: `www.googletagmanager.com/gtag/js` (200 OK)
- Data routes to: `your-sgtm-endpoint/g/collect` (200 OK)

### GA4 DebugView
1. Install Google Analytics Debugger Chrome extension
2. Enable debug mode in pixel settings (`debug: true`)
3. Navigate to **GA4 Admin → DebugView**
4. Verify all events fire with correct parameters

### DataLayer Checker Plus
Install from Chrome Web Store and enable "Shopify Custom Pixel DataLayer Checker" in settings.

## Common Issues

### Scroll Events Showing Sandbox URLs

**Solution:** In sGTM, create a blocking trigger for scroll events:
- **Trigger Type**: Custom Event
- **Event name**: `scroll`
- **Condition**: `{{Page Location}}` contains `/wpm@` OR `sandbox`
- Add as **Exception** to your GA4 tag

### Duplicate Transactions

**Causes:**
- Google & YouTube app still enabled → Disable in Sales channels settings
- Multiple tracking implementations → Remove old scripts from theme.liquid
- Old additional scripts → Clear Settings → Checkout → Order status page additional scripts

### Item Name Inconsistencies

This pixel ensures `item_name` always uses the base product title without variant information. Variant details (color, size, price tier) are passed separately in the `item_variant` field for consistent reporting across all events.

## Item Data Structure

```javascript
{
  item_id: "123456789",              // Shopify Product ID (cleaned)
  item_name: "Resqme Car Escape Tool",  // Base product name
  item_variant: "Red - AA Member price", // Variant details
  item_brand: "Resqme",
  item_category: "Safety",
  price: 17.99,
  quantity: 1
}
```

## Production Checklist

Before going live:

- [ ] Custom pixel shows "Connected" status
- [ ] sGTM container published with GA4 client/tag
- [ ] Test order completes with correct data
- [ ] DebugView shows all expected events
- [ ] Requests route to your sGTM endpoint (not google-analytics.com)
- [ ] Google & YouTube app conversion tracking disabled
- [ ] Enhanced Measurement disabled in GA4
- [ ] `myshopify.com` added to referral exclusion list
- [ ] Production pixel has `debug: false`

## Configuration Options

### Toggle Events
Enable/disable specific event categories:

```javascript
trackPageViews: true,    // Page view tracking
trackEcommerce: true,    // All e-commerce events
trackSearch: true,       // Search submissions
trackFormSubmit: true,   // Form submissions (excludes add-to-cart)
```

### Custom Affiliation
Set store name for purchase attribution:

```javascript
affiliation: init.data.shop?.name || 'Your Store Name'
```

### Debug Mode
Enable detailed console logging:

```javascript
debug: true  // Set false for production
```

## Architecture

**Script Loading:**
- gtag.js loads from Google's CDN (`www.googletagmanager.com`)
- Ensures compatibility without requiring sGTM script serving

**Data Routing:**
- All tracking requests route to your sGTM endpoint via `server_container_url` config
- Maintains session continuity and enables server-side processing

**Sandbox Handling:**
- Extracts clean URLs from Shopify's sandbox context
- Prevents pollution of GA4 reports with sandbox identifiers

## Browser Compatibility

Tested and working on:
- Chrome/Edge (Chromium)
- Firefox
- Safari (with extended cookie lifetime via FPID)

## Support & Contributions

For issues or improvements, please open an issue in this repository.

## License

MIT License - Free to use and modify for your Shopify implementations.

## Credits

Based on methodologies from:
- Analytics Mania (Karol Krajcir)
- Official Shopify Customer Events documentation
- Google Tag Manager server-side tagging best practices

---

**Note:** This pixel is completely self-contained and requires NO theme.liquid modifications. All tracking is handled within the Customer Events sandbox.

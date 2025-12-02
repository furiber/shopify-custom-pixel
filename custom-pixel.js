// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const SETTINGS = {
  measurementId: 'G-PNYJZGH4F3',           // Your GA4 Measurement ID
  serverContainerUrl: 'https://analytics.aa.co.nz',  // Your sGTM endpoint
  debug: true,                              // Set false for production
  
  // Event toggles
  trackPageViews: true,
  trackEcommerce: true,
  trackSearch: true,
  trackFormSubmit: true,
  
  // Store settings
  affiliation: init.data.shop?.name || 'Shopify Store'
};

// ============================================
// GTAG INITIALIZATION WITH CUSTOM TRANSPORT
// ============================================
// Load gtag.js from Google's CDN
const script = document.createElement('script');
script.setAttribute('src', `https://www.googletagmanager.com/gtag/js?id=${SETTINGS.measurementId}`);
script.setAttribute('async', '');
document.head.appendChild(script);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

gtag('js', new Date());
// Route data collection through sGTM endpoint
gtag('config', SETTINGS.measurementId, {
  server_container_url: SETTINGS.serverContainerUrl,
  send_page_view: false,
  debug_mode: SETTINGS.debug
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Extract clean page URL from sandbox context
function getCleanPageLocation(event) {
  return event.context?.document?.location?.href || 
         event.context?.window?.location?.href || 
         window.location.href;
}

function getCleanPageReferrer(event) {
  return event.context?.document?.referrer || document.referrer;
}

function getCleanPageTitle(event) {
  return event.context?.document?.title || document.title;
}

// Format monetary values
function formatMoney(amount) {
  return amount ? parseFloat(amount) : 0;
}

// Get currency from checkout or shop
function getCurrency(event) {
  return event.data?.checkout?.currencyCode || 
         event.data?.cart?.cost?.totalAmount?.currencyCode ||
         init.data?.shop?.paymentSettings?.currencyCode || 
         'NZD';
}

// Build GA4 items array from Shopify line items
function buildItems(lineItems, listName = null) {
  if (!lineItems || !Array.isArray(lineItems)) return [];
  
  return lineItems.map((item, index) => {
    const merchandise = item.merchandise || item.variant;
    const product = merchandise?.product || {};
    
    return {
      item_id: product.id?.toString()?.replace('gid://shopify/Product/', '') || merchandise?.sku,
      item_name: item.title || product.title || merchandise?.title,
      item_brand: product.vendor,
      item_category: product.type,
      item_variant: merchandise?.title !== product.title ? merchandise?.title : undefined,
      price: formatMoney(merchandise?.price?.amount || item.variant?.price?.amount),
      quantity: item.quantity || 1,
      index: index,
      item_list_name: listName,
      discount: item.discountAllocations?.reduce((sum, d) => sum + formatMoney(d.amount?.amount), 0) || 0
    };
  }).filter(item => item.item_id || item.item_name);
}

// Build items from checkout format
function buildCheckoutItems(lineItems) {
  if (!lineItems || !Array.isArray(lineItems)) return [];
  
  return lineItems.map((item, index) => ({
    item_id: item.variant?.id?.toString()?.replace('gid://shopify/ProductVariant/', '') || item.variant?.sku,
    item_name: item.title,
    item_brand: item.variant?.product?.vendor,
    item_category: item.variant?.product?.type,
    item_variant: item.variant?.title,
    price: formatMoney(item.variant?.price?.amount),
    quantity: item.quantity || 1,
    index: index,
    coupon: item.discountAllocations?.map(d => d.code).filter(Boolean).join(',') || undefined,
    discount: item.discountAllocations?.reduce((sum, d) => sum + formatMoney(d.amount?.amount), 0) || 0
  }));
}

// Extract coupon codes from discount applications
function getCoupons(discountApplications) {
  if (!discountApplications) return undefined;
  const codes = discountApplications
    .filter(d => d.type === 'DISCOUNT_CODE')
    .map(d => d.title || d.code)
    .filter(Boolean);
  return codes.length ? codes.join(',') : undefined;
}

// ============================================
// PAGE VIEW TRACKING
// ============================================
if (SETTINGS.trackPageViews) {
  analytics.subscribe('page_viewed', (event) => {
    gtag('event', 'page_view', {
      page_location: getCleanPageLocation(event),
      page_referrer: getCleanPageReferrer(event),
      page_title: getCleanPageTitle(event)
    });
    
    if (SETTINGS.debug) {
      console.log('[sGTM] page_view', {
        page_location: getCleanPageLocation(event)
      });
    }
  });
}

// ============================================
// E-COMMERCE EVENTS
// ============================================
if (SETTINGS.trackEcommerce) {
  
  // Collection/Category viewed
  analytics.subscribe('collection_viewed', (event) => {
    const collection = event.data?.collection;
    
    gtag('event', 'view_item_list', {
      page_location: getCleanPageLocation(event),
      page_title: getCleanPageTitle(event),
      item_list_id: collection?.id,
      item_list_name: collection?.title,
      items: buildItems(collection?.productVariants, collection?.title)
    });
    
    if (SETTINGS.debug) console.log('[sGTM] view_item_list', collection?.title);
  });

  // Product viewed
  analytics.subscribe('product_viewed', (event) => {
    const variant = event.data?.productVariant;
    const product = variant?.product;
    
    gtag('event', 'view_item', {
      page_location: getCleanPageLocation(event),
      page_title: getCleanPageTitle(event),
      currency: getCurrency(event),
      value: formatMoney(variant?.price?.amount),
      items: [{
        item_id: product?.id?.toString()?.replace('gid://shopify/Product/', ''),
        item_name: product?.title,
        item_brand: product?.vendor,
        item_category: product?.type,
        item_variant: variant?.title !== product?.title ? variant?.title : undefined,
        price: formatMoney(variant?.price?.amount),
        quantity: 1
      }]
    });
    
    if (SETTINGS.debug) console.log('[sGTM] view_item', product?.title);
  });

  // Add to cart
  analytics.subscribe('product_added_to_cart', (event) => {
    const cartLine = event.data?.cartLine;
    const merchandise = cartLine?.merchandise;
    const product = merchandise?.product;
    
    gtag('event', 'add_to_cart', {
      page_location: getCleanPageLocation(event),
      currency: getCurrency(event),
      value: formatMoney(cartLine?.cost?.totalAmount?.amount),
      items: [{
        item_id: product?.id?.toString()?.replace('gid://shopify/Product/', ''),
        item_name: product?.title,
        item_brand: product?.vendor,
        item_category: product?.type,
        item_variant: merchandise?.title !== product?.title ? merchandise?.title : undefined,
        price: formatMoney(merchandise?.price?.amount),
        quantity: cartLine?.quantity || 1
      }]
    });
    
    if (SETTINGS.debug) console.log('[sGTM] add_to_cart', product?.title);
  });

  // Cart viewed
  analytics.subscribe('cart_viewed', (event) => {
    const cart = event.data?.cart;
    
    gtag('event', 'view_cart', {
      page_location: getCleanPageLocation(event),
      currency: getCurrency(event),
      value: formatMoney(cart?.cost?.totalAmount?.amount),
      items: buildItems(cart?.lines)
    });
    
    if (SETTINGS.debug) console.log('[sGTM] view_cart');
  });

  // Remove from cart
  analytics.subscribe('product_removed_from_cart', (event) => {
    const cartLine = event.data?.cartLine;
    const merchandise = cartLine?.merchandise;
    const product = merchandise?.product;
    
    gtag('event', 'remove_from_cart', {
      page_location: getCleanPageLocation(event),
      currency: getCurrency(event),
      value: formatMoney(cartLine?.cost?.totalAmount?.amount),
      items: [{
        item_id: product?.id?.toString()?.replace('gid://shopify/Product/', ''),
        item_name: product?.title,
        item_brand: product?.vendor,
        item_category: product?.type,
        item_variant: merchandise?.title !== product?.title ? merchandise?.title : undefined,
        price: formatMoney(merchandise?.price?.amount),
        quantity: cartLine?.quantity || 1
      }]
    });
    
    if (SETTINGS.debug) console.log('[sGTM] remove_from_cart', product?.title);
  });

  // Checkout started
  analytics.subscribe('checkout_started', (event) => {
    const checkout = event.data?.checkout;
    
    gtag('event', 'begin_checkout', {
      page_location: getCleanPageLocation(event),
      currency: checkout?.currencyCode,
      value: formatMoney(checkout?.totalPrice?.amount),
      coupon: getCoupons(checkout?.discountApplications),
      items: buildCheckoutItems(checkout?.lineItems)
    });
    
    if (SETTINGS.debug) console.log('[sGTM] begin_checkout', formatMoney(checkout?.totalPrice?.amount));
  });

  // Shipping info submitted
  analytics.subscribe('checkout_shipping_info_submitted', (event) => {
    const checkout = event.data?.checkout;
    
    gtag('event', 'add_shipping_info', {
      page_location: getCleanPageLocation(event),
      currency: checkout?.currencyCode,
      value: formatMoney(checkout?.totalPrice?.amount),
      coupon: getCoupons(checkout?.discountApplications),
      shipping_tier: checkout?.delivery?.selectedDeliveryOptions?.[0]?.title,
      items: buildCheckoutItems(checkout?.lineItems)
    });
    
    if (SETTINGS.debug) console.log('[sGTM] add_shipping_info');
  });

  // Payment info submitted
  analytics.subscribe('payment_info_submitted', (event) => {
    const checkout = event.data?.checkout;
    
    gtag('event', 'add_payment_info', {
      page_location: getCleanPageLocation(event),
      currency: checkout?.currencyCode,
      value: formatMoney(checkout?.totalPrice?.amount),
      coupon: getCoupons(checkout?.discountApplications),
      payment_type: checkout?.transactions?.[0]?.gateway,
      items: buildCheckoutItems(checkout?.lineItems)
    });
    
    if (SETTINGS.debug) console.log('[sGTM] add_payment_info');
  });

  // Purchase completed
  analytics.subscribe('checkout_completed', (event) => {
    const checkout = event.data?.checkout;
    
    // Extract clean order ID (remove gid://shopify/Order/ prefix)
    const orderId = checkout?.order?.id?.toString()?.replace('gid://shopify/Order/', '') || 
                    checkout?.token;
    
    gtag('event', 'purchase', {
      page_location: getCleanPageLocation(event),
      transaction_id: orderId,
      currency: checkout?.currencyCode,
      value: formatMoney(checkout?.totalPrice?.amount),
      tax: formatMoney(checkout?.totalTax?.amount),
      shipping: formatMoney(checkout?.shippingLine?.price?.amount),
      coupon: getCoupons(checkout?.discountApplications),
      affiliation: SETTINGS.affiliation,
      items: buildCheckoutItems(checkout?.lineItems)
    });
    
    if (SETTINGS.debug) console.log('[sGTM] purchase', orderId, formatMoney(checkout?.totalPrice?.amount));
  });
}

// ============================================
// SEARCH TRACKING
// ============================================
if (SETTINGS.trackSearch) {
  analytics.subscribe('search_submitted', (event) => {
    gtag('event', 'view_search_results', {
      page_location: getCleanPageLocation(event),
      page_title: getCleanPageTitle(event),
      search_term: event.data?.searchResult?.query
    });
    
    if (SETTINGS.debug) console.log('[sGTM] view_search_results', event.data?.searchResult?.query);
  });
}

// ============================================
// FORM SUBMISSION TRACKING
// ============================================
if (SETTINGS.trackFormSubmit) {
  analytics.subscribe('form_submitted', (event) => {
    // Exclude add-to-cart form submissions (tracked separately)
    if (event.data?.element?.action?.includes('/cart/add')) return;
    
    gtag('event', 'form_submit', {
      page_location: getCleanPageLocation(event),
      page_title: getCleanPageTitle(event),
      form_id: event.data?.element?.id,
      form_action: event.data?.element?.action
    });
    
    if (SETTINGS.debug) console.log('[sGTM] form_submit', event.data?.element?.id);
  });
}

// ============================================
// CONSENT HANDLING (OPTIONAL)
// ============================================
let privacyStatus = init.customerPrivacy;

// Subscribe to consent changes
if (typeof customerPrivacy !== 'undefined') {
  customerPrivacy.subscribe('visitorConsentCollected', (event) => {
    privacyStatus = event.customerPrivacy;
    
    gtag('consent', 'update', {
      analytics_storage: privacyStatus.analyticsProcessingAllowed ? 'granted' : 'denied',
      ad_storage: privacyStatus.marketingAllowed ? 'granted' : 'denied',
      ad_personalization: privacyStatus.preferencesProcessingAllowed ? 'granted' : 'denied',
      ad_user_data: privacyStatus.marketingAllowed ? 'granted' : 'denied'
    });
  });
}

console.log('[sGTM Pixel] Initialized - sending to', SETTINGS.serverContainerUrl);

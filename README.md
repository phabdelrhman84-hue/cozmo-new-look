# Cozmo Station Theme

A custom Shopify theme (Online Store 2.0) for cozmostation.com. Arabic RTL, mobile first, built for cash on delivery.

## 1. Upload to GitHub and connect to Shopify

1. Create a new **private** repository on GitHub, for example `cozmo-station-theme`.
2. Upload **the contents of this folder** (not the folder itself). `layout/`, `sections/`, `templates/` and the rest must sit at the root of the repo.
3. In Shopify: **Online Store → Themes → Add theme → Connect from GitHub**, then choose the repo and the `main` branch.
4. The theme is added **unpublished**. Your current theme is not touched.
5. Open **Customize** and follow the steps below. When you're happy, click **Publish**.

> Any change you save in the Customizer, Shopify commits back to GitHub automatically.

## 2. Required setup, in order

### A) Price format, so it shows "620 ج.م"
Settings → General → Store currency → Change formatting. Set both "HTML with currency" and "HTML without currency" to:
```
{{amount_no_decimals}} ج.م
```

### B) Theme settings (Customize → Theme settings)
- **Store & shipping**:
  - shipping fee (75)
  - free-shipping threshold (1500)
  - WhatsApp number in `2010xxxxxxx` format
  - "2 units" offer discount (10%)
- **Logo & favicon**: upload the logo.
- **Social media**: the account links.

### C) Settings the theme can't do in code
1. **Free shipping**: Settings → Shipping and delivery → add a free rate for orders **1500 and above**, and keep the 75 rate below it. Without this, the bar promises free shipping that never gets applied.
2. **"2 units" offer**: Discounts → Automatic discount → Amount off products → "Minimum quantity 2" → **the same %** as theme settings. Apply it to the products you want.
3. **Filters**: install **Search & Discovery** (from Shopify, free) → Filters → add: Availability, Price, Product type, Vendor, Tag (for the concern).
4. **Reviews**: install a reviews app (e.g. Judge.me). Stars only appear when the app has real reviews.

### D) Metafields (Settings → Custom data → Products → Add definition)
| Name | Namespace and key | Type | Used for |
|---|---|---|---|
| Short title | `custom.short_title` | Single line text | Product name on cards and the product page instead of the long SEO title |
| For who | `custom.for_who` | Single line text | "للشعر المصبوغ والمتقصف" |
| Size | `custom.size` | Single line text | "100 مل" |
| Benefits | `custom.benefits` | Multi-line text | One benefit per line (becomes ✓ ticks) |
| How to use | `custom.how_to_use` | Multi-line text | One step per line (becomes numbered steps) |
| Ingredients | `custom.ingredients` | Multi-line text or Rich text | "Ingredients" accordion |
| Routine / bundle | `custom.bundle_product` | Product reference | The routine offer on the product page |
| Complete your routine | `custom.complementary_products` | List of product references | "كمّلي روتينك" + the cart suggestion |

Start with your **top 10 sellers**. Any product without metafields still works; the empty parts just don't show.

### E) Badges
Add a product tag in this format: `badge:الأكثر مبيعًا` or `badge:ألماني أصلي`. The badge appears on the card and in the gallery. The discount badge (‎-6%) is automatic from the compare-at price.

### F) Home page (Customize → Home page)
- **Hero card**: upload the image and set the button link.
- **Shop by concern**: give each tile a collection link.
- **Best sellers**: choose the collection.
- **Routines**: choose your bundles collection (put a compare-at price on each bundle so the saving shows).
- **Customer reviews**: add only real reviews, or add your reviews app block.

### G) Menus (Online Store → Navigation)
- `main-menu`: header and mobile menu (supports sub-menus).
- `footer`: footer links.

## 3. What does NOT carry over from the Impulse theme
- Any custom code added to Impulse earlier (the "أضيفي لروتينك" button and the routine basket). The routine idea is now covered by the bundle offer on the product page and the cart suggestion.
- The Impulse theme settings and section content (images, texts). You set them up again from the Customizer.
- Apps that add code to the theme: check **App embeds** in the Customizer and turn them on again.

## 4. Pre-publish checklist (on your phone)
- [ ] Add to cart from a product card, and from the product page with each of the 3 offers
- [ ] "Order now" takes you straight to checkout
- [ ] The free-shipping bar: below 1500, and above 1500
- [ ] The cart suggestion appears, and disappears once the product is added
- [ ] Filters and sorting on collection pages
- [ ] Search
- [ ] Prices display as "620 ج.م"
- [ ] A complete test order through to checkout

## File structure
```
assets/     base.css, theme.js, fonts (woff2 + OFL licenses)
config/     theme settings
layout/     theme.liquid, password.liquid
locales/    ar.default.json (all the Arabic texts)
sections/   cz-* home sections, main-* pages, header/footer/cart-drawer
snippets/   product-card, price, icons, cart parts
templates/  JSON templates for every page type + customers/
```

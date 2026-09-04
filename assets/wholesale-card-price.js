(() => {
  const existing = window.RorryWholesaleCardDisplay;
  if (existing) {
    existing.refresh();
    existing.syncProduct?.();
    return;
  }

  const rowSelector = '[data-wholesale-price-list] [data-wholesale-card-row]';
  let observedList;
  let observer;
  let refreshTimer;
  let productSyncTimer;
  let lastProductSync = '';
  let configRetryCount = 0;

  const getConfig = () => window.wiB2bOffer || window.wiB2bOfferBootstrap;

  const getPublishVersion = (config) => config?.publishVersion || config?.manifest?.publishVersion;

  const normalizeVariantId = (variantId) => String(variantId ?? '').split('/').pop();

  const formatMoney = (amount, currencyCode, locale) => {
    const value = Number(amount);
    if (!Number.isFinite(value) || !currencyCode) return '';

    try {
      return new Intl.NumberFormat(locale || document.documentElement.lang || 'en', {
        style: 'currency',
        currency: currencyCode
      }).format(value);
    }
    catch (error) {
      return value.toFixed(2);
    }
  };

  const renderPrice = (row, pricing, config) => {
    if (!pricing?.quantityEligible) return;

    const display = row.querySelector('[data-wholesale-card-display]');
    const moq = Number.parseInt(row.dataset.wholesaleMoq, 10);
    const configuredPrice = pricing.configuredShopPrice;
    let amount = configuredPrice?.amount ?? pricing.resolvedPrice;
    let currencyCode = configuredPrice?.currencyCode || pricing.currencyCode || config.currencyCode;

    if (
      configuredPrice?.currencyCode
      && config.currencyCode
      && configuredPrice.currencyCode !== config.currencyCode
    ) {
      const currencyRate = Number(config.currencyRate);
      if (Number.isFinite(currencyRate) && currencyRate > 0) {
        amount = Number(amount) * currencyRate;
        currencyCode = config.currencyCode;
      }
    }

    const money = formatMoney(
      amount,
      currencyCode,
      config.locale
    );
    if (!display || !Number.isFinite(moq) || !money) return;

    display.textContent = `${moq} at ${money}`;
    display.hidden = false;
    row.classList.add('is-wholesale-resolved');
  };

  const scheduleRefresh = (delay = 50) => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refresh, delay);
  };

  const syncProduct = () => {
    if (!document.body.classList.contains('template-product')) return;

    const quantityInput = document.querySelector('product-info input[name="quantity"]');
    const variantInput = document.querySelector('product-info form[action*="/cart/add"] input[name="id"]');
    const quantity = Number.parseInt(quantityInput?.value, 10);
    const variantId = normalizeVariantId(variantInput?.value);
    if (!quantityInput || !Number.isFinite(quantity) || quantity < 1 || !variantId) return;

    const resolvedForQuantity = Object.values(window.wiB2bLastResolved || {}).some((pricing) => (
      normalizeVariantId(pricing?.variantId) === variantId
      && Number(pricing?.quantity) === quantity
    ));
    if (resolvedForQuantity) return;

    const signature = `${variantId}:${quantity}`;
    if (lastProductSync === signature) return;
    lastProductSync = signature;

    quantityInput.dispatchEvent(new CustomEvent('quantity-selector:update', {
      bubbles: true,
      detail: { quantity }
    }));
  };

  const scheduleProductSync = (delay = 80) => {
    window.clearTimeout(productSyncTimer);
    productSyncTimer = window.setTimeout(syncProduct, delay);
  };

  const ensureObserver = () => {
    const list = document.querySelector('[data-wholesale-price-list]');
    if (list === observedList) return;

    observer?.disconnect();
    observedList = list;
    if (!observedList) return;

    observer = new MutationObserver(() => scheduleRefresh());
    observer.observe(observedList, { childList: true, subtree: true });
  };

  const refresh = async () => {
    ensureObserver();

    const config = getConfig();
    const publishVersion = getPublishVersion(config);
    if (!config || !publishVersion || !config.proxyUrl) {
      if (configRetryCount < 8) {
        configRetryCount += 1;
        scheduleRefresh(250);
      }
      return;
    }
    configRetryCount = 0;

    const rows = Array.from(document.querySelectorAll(rowSelector))
      .filter((row) => row.dataset.wholesalePriceState !== 'loading' && row.dataset.wholesalePriceState !== 'ready');
    if (!rows.length) return;

    const entries = rows.map((row) => {
      const variantId = row.dataset.variantId;
      const productId = row.dataset.productId;
      const quantity = Number.parseInt(row.dataset.wholesaleMoq, 10);

      if (!variantId || !productId || !Number.isFinite(quantity) || quantity < 1) return null;

      return {
        row,
        line: {
          variantId,
          quantity,
          productId: `gid://shopify/Product/${productId}`
        }
      };
    }).filter(Boolean);
    if (!entries.length) return;

    const lines = entries.map((entry) => entry.line);

    entries.forEach(({ row }) => {
      row.dataset.wholesalePriceState = 'loading';
    });

    try {
      const response = await fetch(config.proxyUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publishVersion,
          lines,
          countryCode: config.countryCode,
          locale: config.locale,
          currencyCode: config.currencyCode
        })
      });
      if (!response.ok) throw new Error(`Wholesale pricing request failed: ${response.status}`);

      const result = await response.json();
      const pricingByVariant = new Map(
        (result.variants || []).map((pricing) => [normalizeVariantId(pricing.variantId), pricing])
      );

      entries.forEach(({ row }) => {
        const pricing = pricingByVariant.get(normalizeVariantId(row.dataset.variantId));
        renderPrice(row, pricing, config);
        row.dataset.wholesalePriceState = 'ready';
      });
    }
    catch (error) {
      entries.forEach(({ row }) => {
        row.dataset.wholesalePriceState = 'error';
      });
    }
  };

  window.RorryWholesaleCardDisplay = { refresh, syncProduct };
  window.addEventListener('wi-b2b:pricing-resolved', () => scheduleProductSync());
  document.addEventListener('variant:change', () => {
    lastProductSync = '';
    scheduleProductSync(600);
  });
  document.addEventListener('shopify:section:load', () => {
    scheduleRefresh();
    scheduleProductSync(600);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scheduleRefresh(0);
      scheduleProductSync(1200);
    }, { once: true });
  }
  else {
    scheduleRefresh(0);
    scheduleProductSync(1200);
  }
})();

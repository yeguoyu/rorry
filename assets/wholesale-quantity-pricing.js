/**
 * Syncs Wi2B wholesale tier table with title price and sticky bar on load + qty change.
 */
(function () {
  function parseMoney(text) {
    if (!text) return 0;
    var normalized = String(text).replace(/,/g, '');
    var match = normalized.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  function formatMoney(dollars) {
    var cents = Math.round(dollars * 100);
    if (window.theme && window.theme.Currency && window.theme.Currency.formatMoney) {
      var format = window.theme.settings && window.theme.settings.currencyCodeEnabled
        ? window.theme.settings.moneyWithCurrencyFormat
        : window.theme.settings.moneyFormat;
      return window.theme.Currency.formatMoney(cents, format);
    }
    if (window.Shopify && window.Shopify.formatMoney) {
      return window.Shopify.formatMoney(cents);
    }
    return '$' + dollars.toFixed(2);
  }

  function findTierTable(root) {
    var tables = root.querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) {
      var header = tables[i].textContent.toLowerCase();
      if (header.indexOf('quantity') !== -1 && header.indexOf('unit price') !== -1) {
        return tables[i];
      }
    }
    return root.querySelector('[class*="wi2b"] table');
  }

  function parseTierRows(table) {
    var tiers = [];
    table.querySelectorAll('tr').forEach(function (row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 2) return;

      var qtyText = cells[0].textContent.trim();
      var priceText = cells[1].textContent.trim();
      if (!/\d/.test(qtyText) || !/[\d$€£]/.test(priceText)) return;

      var min;
      var max = Infinity;

      if (qtyText.indexOf('-') !== -1) {
        var range = qtyText.split('-');
        min = parseInt(range[0], 10);
        max = parseInt(range[1], 10);
      } else if (qtyText.indexOf('+') !== -1) {
        min = parseInt(qtyText.replace('+', ''), 10);
      } else {
        min = parseInt(qtyText, 10);
        max = min;
      }

      if (isNaN(min)) return;

      tiers.push({
        min: min,
        max: max,
        price: parseMoney(priceText),
        priceHtml: cells[1].innerHTML
      });
    });

    return tiers.sort(function (a, b) { return a.min - b.min; });
  }

  function getTierForQty(tiers, qty) {
    var matched = tiers[0];
    for (var i = 0; i < tiers.length; i++) {
      if (qty >= tiers[i].min) matched = tiers[i];
    }
    return matched;
  }

  function restoreTablePrices(table, tiers) {
    if (!table || !tiers.length) return;

    var rowIndex = 0;
    table.querySelectorAll('tr').forEach(function (row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 2 || !tiers[rowIndex]) return;
      if (!/\d/.test(cells[0].textContent)) return;
      cells[1].innerHTML = tiers[rowIndex].priceHtml;
      rowIndex++;
    });
  }

  function tablePricesLookBroken(table, tiers) {
    if (!table || tiers.length < 2) return false;

    var prices = [];
    table.querySelectorAll('tr').forEach(function (row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 2 || !/\d/.test(cells[0].textContent)) return;
      prices.push(parseMoney(cells[1].textContent));
    });

    if (prices.length < 2) return false;
    var first = prices[0];
    return prices.every(function (p) { return p === first; }) &&
      tiers.some(function (t, i) { return Math.abs(t.price - first) > 0.001 && i > 0; });
  }

  function setTitlePrice(priceEl, titleText) {
    if (!priceEl) return;

    var regular = priceEl.querySelector('.price__regular');
    if (regular) {
      regular.textContent = titleText;
    }

    priceEl.querySelectorAll('[class*="wi2b"]').forEach(function (el) {
      if (el.closest('.product__badges')) return;
      el.textContent = titleText;
    });

    if (!regular) {
      var priceWrap = priceEl.querySelector('.price');
      if (priceWrap && !priceWrap.querySelector('.product__badges')) {
        var sale = priceWrap.querySelector('.price__sale');
        if (sale) sale.remove();
        priceWrap.textContent = titleText;
      }
    }
  }

  function WholesaleQtyPricing(config) {
    this.sectionId = config.sectionId;
    this.productId = config.productId;
    this.productFormId = config.productFormId;
    this.root = document.getElementById('shopify-section-' + config.sectionId) || document;
    this.tiers = [];
    this.table = null;
    this.initialized = false;
  }

  WholesaleQtyPricing.prototype.getQtyInput = function () {
    var form = document.getElementById(this.productFormId);
    if (form) {
      var inForm = form.querySelector('input[name="quantity"]');
      if (inForm) return inForm;
    }
    return this.root.querySelector('.product-form input[name="quantity"], .product__info input[name="quantity"]');
  };

  WholesaleQtyPricing.prototype.getQty = function () {
    var input = this.getQtyInput();
    var qty = parseInt(input && input.value, 10);
    if (!isNaN(qty) && qty > 0) return qty;
    if (input && input.min) {
      var minQty = parseInt(input.min, 10);
      if (!isNaN(minQty) && minQty > 0) return minQty;
    }
    return this.tiers[0] ? this.tiers[0].min : 1;
  };

  WholesaleQtyPricing.prototype.snapshotTable = function () {
    var table = findTierTable(this.root);
    if (!table) return false;

    var parsed = parseTierRows(table);
    if (!parsed.length) return false;

    var unique = {};
    parsed.forEach(function (t) { unique[t.price] = true; });

    if (Object.keys(unique).length > 1 || !this.tiers.length) {
      this.tiers = parsed;
      this.table = table;
      this.initialized = true;
      return true;
    }

    if (!this.table) this.table = table;
    return this.initialized;
  };

  WholesaleQtyPricing.prototype.updateDisplay = function () {
    if (!this.snapshotTable() || !this.tiers.length) return;

    if (tablePricesLookBroken(this.table, this.tiers)) {
      restoreTablePrices(this.table, this.tiers);
    }

    var qty = this.getQty();
    var tier = getTierForQty(this.tiers, qty);
    if (!tier) return;

    var unitPrice = tier.price;
    var total = unitPrice * qty;
    var unitFormatted = formatMoney(unitPrice);
    var totalFormatted = formatMoney(total);
    var moqTier = this.tiers[0];
    var titleText = 'From ' + moqTier.min + ' at ' + formatMoney(moqTier.price);

    setTitlePrice(
      document.getElementById('Price-' + this.sectionId + '-' + this.productId),
      titleText
    );

    var stickyEl = document.getElementById('StickyPriceV2-' + this.sectionId + '-' + this.productId);
    if (stickyEl) {
      stickyEl.innerHTML = '<div class="price flex flex-wrap items-center gap-2">' +
        '<span class="price__regular whitespace-nowrap">' + totalFormatted + '</span>' +
        '</div>';
    }

    this.root.querySelectorAll('price-per-item[id^="PricePerItem-' + this.sectionId + '-' + this.productId + '"] .price-per-item--current').forEach(function (el) {
      el.textContent = unitFormatted + ' each';
    });
  };

  WholesaleQtyPricing.prototype.bindEvents = function () {
    var self = this;

    function scheduleUpdate() {
      window.setTimeout(function () { self.updateDisplay(); }, 50);
      window.setTimeout(function () { self.updateDisplay(); }, 200);
      window.setTimeout(function () { self.updateDisplay(); }, 600);
    }

    this.root.querySelectorAll('input[name="quantity"]').forEach(function (input) {
      if (input.closest('.cart-drawer, [id*="CartDrawer"], .mini-cart')) return;
      input.addEventListener('change', scheduleUpdate);
      input.addEventListener('input', scheduleUpdate);
    });

    this.root.querySelectorAll('quantity-input button').forEach(function (button) {
      button.addEventListener('click', scheduleUpdate);
    });

    document.addEventListener('variant:change', scheduleUpdate);
    window.addEventListener('load', scheduleUpdate);

    var observer = new MutationObserver(function () {
      if (self.snapshotTable()) scheduleUpdate();
    });
    observer.observe(this.root, { childList: true, subtree: true, characterData: true });
  };

  WholesaleQtyPricing.prototype.init = function () {
    var self = this;
    this.bindEvents();

    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts++;
      if (self.snapshotTable()) {
        self.updateDisplay();
      }
      if (attempts > 80) {
        window.clearInterval(timer);
      }
    }, 200);
  };

  function boot() {
    document.querySelectorAll('[data-wholesale-qty-pricing]').forEach(function (node) {
      try {
        var config = JSON.parse(node.textContent);
        var instance = new WholesaleQtyPricing(config);
        instance.init();
      } catch (e) {
        console.warn('WholesaleQtyPricing init failed', e);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

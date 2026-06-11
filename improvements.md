# PulsePrice — Feature Improvements

## 1. Price Forecast / Predictive Trend

**What:** On the product detail page, show a small 7-day price forecast chart based on historical data.

**Why:** The stats engine (Pingouin/statsmodels) is already integrated — just need a simple regression (linear or ARIMA) over the existing price history and render it on the Chart.js line chart already in place.

**Impact:** Data science + fullstack = highly visible for evaluation.

---

## 2. Import Product by URL

**What:** User pastes a product URL (Amazon, BestBuy, Newegg...), the system detects the retailer, pushes it to the scraper queue, and the product appears in the watchlist once scraped.

**Why:** Shows the full pipeline working end-to-end in real time — from user action → scraper → ingestion → dashboard.

**Implementation notes:**
- Frontend: input field on the tracked products page
- Backend: endpoint that validates the URL, adds it to a pending scrape queue (Redis or DB)
- Scraper: worker picks up the URL, scrapes it, ingests via NiFi
- WebSocket notification when the product lands

---

## 3. Price Drop Calendar Heatmap

**What:** A GitHub-style contribution heatmap (calendar view) showing which days had the most/fewest price drops. User can click a day to see products that dropped.

**Why:** Visually striking, highly interactive, and leverages existing price drop data from BigQuery.

---

## 4. Telegram / Discord Notifications

**What:** In addition to WebSocket and email alerts, users can connect a Telegram bot or Discord webhook to receive price drop notifications.

**Why:** Modern, practical, and extends the notification system without complex infrastructure.

**Implementation notes:**
- Backend: simple webhook POST to Telegram Bot API or Discord
- Frontend: add webhook URL field in notification preferences
- Worker: check for webhook channel and send accordingly

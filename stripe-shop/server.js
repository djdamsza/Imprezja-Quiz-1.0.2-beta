/**
 * Serwer Stripe dla sklepu Imprezja Quiz
 * Subskrypcje: 1 miesiąc, 3 miesiące, 12 miesięcy
 * Jednorazowa płatność: licencja dożywotnia
 *
 * Uruchom: STRIPE_SECRET_KEY=sk_xxx STRIPE_WEBHOOK_SECRET=whsec_xxx node server.js
 * Port: 4242 (lub STRIPE_PORT)
 */

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();
const PORT = process.env.PORT || process.env.STRIPE_PORT || 4242;
const YOUR_DOMAIN = process.env.STRIPE_DOMAIN || `http://localhost:${PORT}`;

// Webhook MUSI mieć raw body – rejestruj przed express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET nie ustawiony – webhook nie weryfikowany');
        return res.sendStatus(200);
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            console.log('✅ Płatność zakończona:', session.id, 'customer:', session.customer);
            break;
        }
        case 'customer.subscription.created':
            console.log('📅 Subskrypcja utworzona:', event.data.object.id);
            break;
        case 'customer.subscription.updated':
            console.log('📅 Subskrypcja zaktualizowana:', event.data.object.id);
            break;
        case 'customer.subscription.deleted':
            console.log('❌ Subskrypcja anulowana:', event.data.object.id);
            break;
        case 'invoice.paid':
            console.log('💰 Faktura opłacona:', event.data.object.id);
            break;
        case 'invoice.payment_failed':
            console.log('⚠️ Płatność nieudana:', event.data.object.id);
            break;
        default:
            console.log('Event:', event.type);
    }

    res.sendStatus(200);
});

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

/** Tworzy sesję Checkout – subskrypcja (1m, 3m, 12m) lub płatność jednorazowa (lifetime) */
app.post('/create-checkout-session', async (req, res) => {
    const { lookup_key, price_id, success_url, cancel_url } = req.body;

    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Stripe nie jest skonfigurowany (STRIPE_SECRET_KEY)' });
    }

    try {
        let priceId = price_id;

        if (!priceId && lookup_key) {
            const prices = await stripe.prices.list({
                lookup_keys: [lookup_key],
                expand: ['data.product']
            });
            if (!prices.data.length) {
                return res.status(400).json({ error: `Nie znaleziono ceny dla: ${lookup_key}` });
            }
            priceId = prices.data[0].id;
        }

        if (!priceId) {
            return res.status(400).json({ error: 'Podaj lookup_key lub price_id' });
        }

        const price = await stripe.prices.retrieve(priceId);
        const isSubscription = price.recurring !== null;

        const sessionConfig = {
            payment_method_types: ['card', 'p24'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: isSubscription ? 'subscription' : 'payment',
            success_url: success_url || `${YOUR_DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancel_url || `${YOUR_DOMAIN}/checkout.html`,
            metadata: { product: 'imprezja-quiz' }
        };

        if (isSubscription) {
            sessionConfig.subscription_data = {
                metadata: { product: 'imprezja-quiz' }
            };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);
        res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
        console.error('Stripe Checkout error:', err);
        res.status(500).json({ error: err.message || 'Błąd tworzenia sesji' });
    }
});

/** Customer Portal – zarządzanie subskrypcją (anulowanie, zmiana karty) */
app.post('/create-portal-session', async (req, res) => {
    const { customer_id, return_url } = req.body;

    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Stripe nie jest skonfigurowany' });
    }

    if (!customer_id) {
        return res.status(400).json({ error: 'Brak customer_id' });
    }

    try {
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customer_id,
            return_url: return_url || YOUR_DOMAIN
        });
        res.json({ url: portalSession.url });
    } catch (err) {
        console.error('Portal error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/prices', async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return res.json({ prices: [] });
    }
    try {
        const prices = await stripe.prices.list({
            active: true,
            expand: ['data.product']
        });
        const imprezja = prices.data.filter(p =>
            p.product?.metadata?.product === 'imprezja-quiz' ||
            (p.product?.name && p.product.name.toLowerCase().includes('imprezja'))
        );
        res.json({ prices: imprezja });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Stripe Shop: http://localhost:${PORT}`);
    if (!process.env.STRIPE_SECRET_KEY) {
        console.warn('⚠️ Ustaw STRIPE_SECRET_KEY w .env');
    }
});

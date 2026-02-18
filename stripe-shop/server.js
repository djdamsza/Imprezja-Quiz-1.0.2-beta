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
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const { generateLicenseKey, LOOKUP_TO_TYPE } = require('./license-keygen');

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
    const { lookup_key, price_id, success_url, cancel_url } = req.body || {};

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

        const successUrl = typeof success_url === 'string' ? success_url : `${YOUR_DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = typeof cancel_url === 'string' ? cancel_url : `${YOUR_DOMAIN}/checkout.html`;

        const sessionConfig = {
            line_items: [{ price: String(priceId), quantity: 1 }],
            mode: isSubscription ? 'subscription' : 'payment',
            success_url: String(successUrl),
            cancel_url: String(cancelUrl),
            metadata: { product: 'imprezja-quiz', lookup_key: lookup_key || '' }
        };

        if (isSubscription) {
            sessionConfig.subscription_data = {
                metadata: { product: 'imprezja-quiz', lookup_key: lookup_key || '' }
            };
            // Revolut Pay obsługuje subskrypcje; BLIK – nie
            sessionConfig.payment_method_types = ['card', 'revolut_pay'];
        } else {
            // Płatność jednorazowa: karta, BLIK, Revolut Pay
            sessionConfig.payment_method_types = ['card', 'blik', 'revolut_pay'];
        }
        sessionConfig.locale = 'pl';

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

/** Wysyłka klucza licencyjnego po płatności – wymaga Machine ID od użytkownika */
app.post('/api/license/deliver', async (req, res) => {
    const { session_id, machine_id } = req.body || {};

    if (!session_id || !machine_id) {
        return res.status(400).json({ error: 'Wymagane: session_id i machine_id' });
    }

    const machineId = String(machine_id).trim();
    if (machineId.length < 8) {
        return res.status(400).json({ error: 'Machine ID musi mieć co najmniej 8 znaków' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Stripe nie jest skonfigurowany' });
    }

    if (!process.env.IMPREZJA_LICENSE_PRIVATE_KEY) {
        return res.status(500).json({ error: 'Klucz licencyjny nie jest skonfigurowany (IMPREZJA_LICENSE_PRIVATE_KEY)' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['line_items.data.price']
        });

        if (session.status !== 'complete' || session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Sesja nie została opłacona' });
        }

        let lookupKey = session.metadata?.lookup_key || '';
        if (!lookupKey && session.line_items?.data?.[0]?.price?.lookup_key) {
            lookupKey = session.line_items.data[0].price.lookup_key;
        }
        if (!lookupKey && session.line_items?.data?.[0]?.price?.id) {
            const prices = await stripe.prices.list({ active: true });
            const match = prices.data.find(p => p.id === session.line_items.data[0].price.id);
            if (match) lookupKey = match.lookup_key || '';
        }

        const licenseType = LOOKUP_TO_TYPE[lookupKey] || 'LT';
        const licenseKey = generateLicenseKey(machineId, licenseType);

        const customerEmail = session.customer_email || session.customer_details?.email;
        if (!customerEmail) {
            return res.status(400).json({ error: 'Brak adresu e-mail w sesji płatności' });
        }

        const emailFrom = process.env.LICENSE_EMAIL_FROM || 'licencje@nowajakoscrozrywki.pl';
        const emailHtml = `
<p>Dziękujemy za zakup Imprezja Quiz!</p>
<p><strong>Twój klucz licencyjny:</strong></p>
<p style="font-family: monospace; background: #f5f5f5; padding: 12px; border-radius: 6px; word-break: break-all;">${licenseKey}</p>
<p>Wklej ten klucz w programie (ekran aktywacji) i kliknij <strong>Aktywuj</strong>.</p>
<p>W razie pytań skontaktuj się z nami.</p>
        `.trim();
        const emailText = `Dziękujemy za zakup Imprezja Quiz!\n\nTwój klucz licencyjny:\n\n${licenseKey}\n\nWklej ten klucz w programie (ekran aktywacji) i kliknij Aktywuj.\n\nW razie pytań skontaktuj się z nami.`;

        if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const { error } = await resend.emails.send({
                from: emailFrom,
                to: customerEmail,
                subject: 'Imprezja Quiz – klucz licencyjny',
                html: emailHtml,
                text: emailText
            });
            if (error) throw new Error(error.message);
        } else if (process.env.SMTP_HOST) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: process.env.SMTP_SECURE === 'true',
                auth: process.env.SMTP_USER ? {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                } : undefined
            });
            await transporter.sendMail({
                from: emailFrom,
                to: customerEmail,
                subject: 'Imprezja Quiz – klucz licencyjny',
                text: emailText,
                html: emailHtml
            });
        } else {
            return res.status(500).json({ error: 'E-mail nie skonfigurowany. Ustaw RESEND_API_KEY lub SMTP_HOST. Skontaktuj się z obsługą.' });
        }

        console.log('✅ Klucz wysłany:', customerEmail, 'typ:', licenseType);
        res.json({ success: true, message: 'Klucz został wysłany na adres e-mail' });
    } catch (err) {
        console.error('License delivery error:', err);
        if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
            return res.status(500).json({ error: 'Błąd konfiguracji e-mail (SMTP). Skontaktuj się z obsługą.' });
        }
        res.status(500).json({ error: err.message || 'Błąd wysyłki klucza' });
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

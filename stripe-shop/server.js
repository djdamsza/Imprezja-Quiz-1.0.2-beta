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
const SUCCESS_PAGE_URL = process.env.SUCCESS_PAGE_URL || (YOUR_DOMAIN + '/success.html');

/** Buduje HTML e-maila w spójnym szablonie */
function buildEmail({ title, body, accentColor = '#3b82f6' }) {
    return `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#333;background:#f4f4f4;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4;padding:24px 0;"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;"><tr><td style="background:${accentColor};padding:4px 0;"></td></tr><tr><td style="padding:32px 40px;"><h1 style="margin:0 0 24px;font-size:20px;color:#1a1a2e;">${title}</h1>${body}<hr style="border:none;border-top:1px solid #eee;margin:24px 0;"><p style="margin:0;font-size:13px;color:#999;">Nowa Jakość Rozrywki · <a href="https://nowajakoscrozrywki.pl" style="color:#0073aa;">nowajakoscrozrywki.pl</a></p></td></tr></table></td></tr></table></body></html>`;
}

/** Liczba dni aktywności licencji dla planów jednorazowych */
const ONETIME_LICENSE_DAYS = {
    'imprezja-1m-onetime': 30,
    'imprezja-3m-onetime': 90,
    'imprezja-12m-onetime': 365,
};

/** Wysyła e-mail (Resend lub SMTP). Nie rzuca przy braku konfiguracji. */
async function sendEmail({ to, subject, html, text }) {
    const from = process.env.LICENSE_EMAIL_FROM || 'licencje@nowajakoscrozrywki.pl';
    if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({ from, to, subject, html, text });
        if (error) throw new Error(error.message);
    } else if (process.env.SMTP_HOST) {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
        });
        await transporter.sendMail({ from, to, subject, text: text || html, html });
    } else {
        throw new Error('E-mail nie skonfigurowany (RESEND_API_KEY lub SMTP_HOST)');
    }
}

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

            const email = session.customer_email || session.customer_details?.email;

            if (email && (process.env.RESEND_API_KEY || process.env.SMTP_HOST)) {
                const link = `${SUCCESS_PAGE_URL.replace(/\/$/, '')}?session_id=${session.id}`;
                const html = buildEmail({
                    title: '✅ Dziękujemy za zakup Imprezja Quiz!',
                    accentColor: '#27ae60',
                    body: `<p style="margin:0 0 16px;">Płatność została pomyślnie zrealizowana.</p>
<p style="margin:0 0 8px;font-weight:600;">Aby otrzymać klucz licencyjny:</p>
<ol style="margin:0 0 24px;padding-left:20px;">
<li style="margin-bottom:8px;">Uruchom program Imprezja Quiz – na ekranie aktywacji zobaczysz <strong>ID komputera</strong> (Machine ID).</li>
<li style="margin-bottom:8px;">Wejdź na stronę i podaj to ID: <a href="${link}" style="color:#3b82f6;">${link}</a></li>
<li style="margin-bottom:8px;">Klucz zostanie wysłany na ten adres e-mail w ciągu kilku minut.</li>
</ol>
<p style="margin:0 0 24px;color:#64748b;font-size:14px;">Zachowaj ten e-mail – link jest ważny do odebrania klucza.</p>`,
                });
                const text = `Dziękujemy za zakup Imprezja Quiz!\n\nAby otrzymać klucz licencyjny:\n1. Uruchom program – zobaczysz ID komputera (Machine ID).\n2. Wejdź na stronę i podaj to ID: ${link}\n3. Klucz zostanie wysłany na ten adres e-mail.\n\nZachowaj ten e-mail.`;
                try {
                    await sendEmail({ to: email, subject: 'Imprezja Quiz – potwierdzenie zakupu i odbiór klucza', html, text });
                    console.log('📧 E-mail z instrukcją wysłany:', email);
                } catch (err) {
                    console.error('⚠️ Błąd wysyłki e-mailu po płatności:', err.message);
                }
            }
            break;
        }
        case 'customer.subscription.created':
            console.log('📅 Subskrypcja utworzona:', event.data.object.id);
            break;
        case 'customer.subscription.updated':
            console.log('📅 Subskrypcja zaktualizowana:', event.data.object.id);
            break;
        case 'customer.subscription.deleted': {
            const sub = event.data.object;
            console.log('❌ Subskrypcja anulowana:', sub.id);
            try {
                const customer = await stripe.customers.retrieve(sub.customer);
                const email = customer.email;
                if (email && (process.env.RESEND_API_KEY || process.env.SMTP_HOST)) {
                    const renewUrl = 'https://nowajakoscrozrywki.pl/produkt/imprezja-quiz/';
                    const html = buildEmail({
                        title: 'Twoja subskrypcja Imprezja Quiz wygasła',
                        accentColor: '#64748b',
                        body: `<p style="margin:0 0 16px;">Twoja subskrypcja Imprezja Quiz została anulowana lub wygasła.</p>
<p style="margin:0 0 24px;">Program przejdzie w tryb demo. Jeśli chcesz kontynuować korzystanie z pełnej wersji, możesz w każdej chwili wznowić subskrypcję lub wybrać licencję jednorazową.</p>
<p style="margin:0 0 8px;text-align:center;"><a href="${renewUrl}" style="display:inline-block;padding:14px 28px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Wróć do Imprezja Quiz →</a></p>`,
                    });
                    const text = `Twoja subskrypcja Imprezja Quiz wygasła.\n\nAby kontynuować korzystanie z pełnej wersji, wznów subskrypcję:\n${renewUrl}`;
                    await sendEmail({ to: email, subject: 'Imprezja Quiz – subskrypcja wygasła', html, text });
                    console.log('📧 E-mail o anulowaniu wysłany:', email);
                }
            } catch (err) {
                console.error('⚠️ Błąd e-mailu o anulowaniu:', err.message);
            }
            break;
        }
        case 'invoice.paid': {
            const invoice = event.data.object;
            console.log('💰 Faktura opłacona:', invoice.id);
            // Wysyłaj potwierdzenie tylko przy odnowieniu subskrypcji (nie przy pierwszej płatności)
            if (invoice.billing_reason === 'subscription_cycle') {
                try {
                    const email = invoice.customer_email;
                    if (email && (process.env.RESEND_API_KEY || process.env.SMTP_HOST)) {
                        const amount = ((invoice.amount_paid || 0) / 100).toFixed(2);
                        const currency = (invoice.currency || 'pln').toUpperCase();
                        const nextDate = invoice.period_end
                            ? new Date(invoice.period_end * 1000).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })
                            : '–';
                        const portalUrl = 'https://nowajakoscrozrywki.pl/produkt/imprezja-quiz/';
                        const html = buildEmail({
                            title: 'Subskrypcja Imprezja Quiz odnowiona',
                            accentColor: '#27ae60',
                            body: `<p style="margin:0 0 16px;">Twoja subskrypcja została automatycznie odnowiona. Dziękujemy!</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:15px;">
<tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Kwota</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${amount} ${currency}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Kolejne odnowienie</td><td style="padding:8px 0;font-weight:600;text-align:right;">${nextDate}</td></tr>
</table>
<p style="margin:0 0 8px;text-align:center;"><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#f1f5f9;color:#1e293b;text-decoration:none;border-radius:8px;font-size:14px;">Zarządzaj subskrypcją</a></p>`,
                        });
                        const text = `Twoja subskrypcja Imprezja Quiz została odnowiona.\nKwota: ${amount} ${currency}\nKolejne odnowienie: ${nextDate}`;
                        await sendEmail({ to: email, subject: 'Imprezja Quiz – subskrypcja odnowiona', html, text });
                        console.log('📧 Potwierdzenie odnowienia wysłane:', email);
                    }
                } catch (err) {
                    console.error('⚠️ Błąd e-mailu o odnowieniu:', err.message);
                }
            }
            break;
        }
        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            console.log('⚠️ Płatność nieudana:', invoice.id);
            try {
                const email = invoice.customer_email;
                if (email && (process.env.RESEND_API_KEY || process.env.SMTP_HOST)) {
                    const portalUrl = 'https://nowajakoscrozrywki.pl/produkt/imprezja-quiz/';
                    const html = buildEmail({
                        title: '⚠️ Nie udało się odnowić subskrypcji',
                        accentColor: '#ef4444',
                        body: `<p style="margin:0 0 16px;">Próba pobrania płatności za subskrypcję Imprezja Quiz nie powiodła się.</p>
<p style="margin:0 0 24px;">Sprawdź, czy Twoja karta lub metoda płatności jest aktualna, aby uniknąć przerwy w dostępie.</p>
<p style="margin:0 0 8px;text-align:center;"><a href="${portalUrl}" style="display:inline-block;padding:14px 28px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Zaktualizuj metodę płatności →</a></p>`,
                    });
                    const text = `Nie udało się odnowić subskrypcji Imprezja Quiz. Zaktualizuj metodę płatności:\n${portalUrl}`;
                    await sendEmail({ to: email, subject: 'Imprezja Quiz – problem z płatnością', html, text });
                    console.log('📧 E-mail o nieudanej płatności wysłany:', email);
                }
            } catch (err) {
                console.error('⚠️ Błąd e-mailu o nieudanej płatności:', err.message);
            }
            break;
        }
        case 'charge.refunded': {
            const charge = event.data.object;
            console.log('↩️ Zwrot:', charge.id, 'amount_refunded:', charge.amount_refunded);
            try {
                // Pobierz e-mail z charge lub powiązanego klienta
                let email = charge.billing_details?.email;
                if (!email && charge.customer) {
                    const customer = await stripe.customers.retrieve(charge.customer);
                    email = customer.email;
                }
                if (email && (process.env.RESEND_API_KEY || process.env.SMTP_HOST)) {
                    const totalRefunded = ((charge.amount_refunded || 0) / 100).toFixed(2);
                    const currency = (charge.currency || 'pln').toUpperCase();
                    // Dane ostatniego częściowego lub pełnego zwrotu
                    const lastRefund = charge.refunds?.data?.[0];
                    const refundDate = lastRefund
                        ? new Date(lastRefund.created * 1000).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })
                        : new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });
                    const isPartial = charge.amount_refunded < charge.amount;
                    const html = buildEmail({
                        title: '↩️ Potwierdzenie zwrotu – Imprezja Quiz',
                        accentColor: '#64748b',
                        body: `<p style="margin:0 0 16px;">Informujemy, że ${isPartial ? 'częściowy zwrot' : 'zwrot'} za zamówienie Imprezja Quiz został zrealizowany.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:15px;">
<tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Kwota zwrotu</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${totalRefunded} ${currency}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Data zwrotu</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${refundDate}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Typ</td><td style="padding:8px 0;font-weight:600;text-align:right;">${isPartial ? 'Zwrot częściowy' : 'Zwrot pełny'}</td></tr>
</table>
<p style="margin:0 0 16px;font-size:14px;color:#64748b;">Środki powinny pojawić się na Twoim rachunku w ciągu 5–10 dni roboczych, w zależności od banku.</p>
<p style="margin:0 0 8px;font-size:14px;color:#64748b;">Masz pytania? Napisz do nas: <a href="mailto:biuro@imprezja.pl" style="color:#3b82f6;">biuro@imprezja.pl</a></p>`,
                    });
                    const text = `Potwierdzenie zwrotu – Imprezja Quiz\n\nKwota zwrotu: ${totalRefunded} ${currency}\nData: ${refundDate}\nTyp: ${isPartial ? 'Zwrot częściowy' : 'Zwrot pełny'}\n\nŚrodki powinny pojawić się na rachunku w ciągu 5–10 dni roboczych.\n\nPytania? biuro@imprezja.pl`;
                    await sendEmail({ to: email, subject: 'Imprezja Quiz – potwierdzenie zwrotu', html, text });
                    console.log('📧 E-mail potwierdzenia zwrotu wysłany:', email);
                }
            } catch (err) {
                console.error('⚠️ Błąd e-mailu o zwrocie:', err.message);
            }
            break;
        }
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

// Log każdego żądania – w logach Render widać, czy klik w sklepie dociera do serwera
app.use((req, res, next) => {
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${req.method} ${req.path} ${req.get('origin') || '-'}`);
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

/** Endpoint do pingowania (UptimeRobot, cron) – zapobiega cold start na Render */
app.get('/health', (req, res) => res.sendStatus(200));

/** Tworzy sesję Checkout – subskrypcja (1m, 3m, 12m) lub płatność jednorazowa (lifetime) */
app.post('/create-checkout-session', async (req, res) => {
    const { lookup_key, price_id, success_url, cancel_url } = req.body || {};
    console.log('Checkout request:', { lookup_key: lookup_key || '(brak)', price_id: price_id || '(brak)', origin: req.get('origin') });

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
            metadata: { product: 'imprezja-quiz', lookup_key: lookup_key || '' },
            locale: 'pl',
            billing_address_collection: 'auto',
        };

        if (isSubscription) {
            sessionConfig.subscription_data = {
                metadata: { product: 'imprezja-quiz', lookup_key: lookup_key || '' }
            };
            // Revolut Pay obsługuje subskrypcje; BLIK – nie
            sessionConfig.payment_method_types = ['card', 'revolut_pay'];
        } else {
            // Poniższe parametry tylko dla trybu payment
            sessionConfig.customer_creation = 'always';
            sessionConfig.tax_id_collection = { enabled: true };
            // Płatność jednorazowa: karta, BLIK, Revolut Pay
            sessionConfig.payment_method_types = ['card', 'blik', 'revolut_pay'];
            // Generuj fakturę dla płatności jednorazowych (z NIP klienta)
            sessionConfig.invoice_creation = {
                enabled: true,
                invoice_data: { metadata: { product: 'imprezja-quiz', lookup_key: lookup_key || '' } }
            };
        }
        // Pole "Masz kod rabatowy?" na stronie Stripe Checkout
        sessionConfig.allow_promotion_codes = true;

        const session = await stripe.checkout.sessions.create(sessionConfig);
        res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
        console.error('Stripe Checkout error:', err);
        res.status(500).json({ error: err.message || 'Błąd tworzenia sesji' });
    }
});

/**
 * Checkout via GET redirect – dla stron bez JavaScript (np. WordPress Custom HTML)
 * Użycie: /checkout?plan=imprezja-1m
 * Tworzy sesję Stripe i natychmiast przekierowuje użytkownika.
 */
app.get('/checkout', async (req, res) => {
    const plan = String(req.query.plan || '').trim();
    if (!plan) return res.status(400).send('Brak parametru: plan');
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).send('Stripe nie skonfigurowany');

    res.setHeader('Cache-Control', 'no-store, no-cache');

    try {
        const prices = await stripe.prices.list({ lookup_keys: [plan], expand: ['data.product'] });
        if (!prices.data.length) return res.status(404).send(`Plan "${plan}" nie istnieje w Stripe`);

        const price = prices.data[0];
        const isSubscription = price.recurring !== null;

        const referer = req.headers.referer || '';
        const cancelUrl = referer || 'https://nowajakoscrozrywki.pl/produkt/imprezja-quiz/';
        const successUrl = process.env.WP_SUCCESS_URL || 'https://nowajakoscrozrywki.pl/sukces/?session_id={CHECKOUT_SESSION_ID}';

        const sessionConfig = {
            line_items: [{ price: price.id, quantity: 1 }],
            mode: isSubscription ? 'subscription' : 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            locale: 'pl',
            metadata: { product: 'imprezja-quiz', lookup_key: plan },
            billing_address_collection: 'auto',
        };

        if (isSubscription) {
            sessionConfig.subscription_data = { metadata: { product: 'imprezja-quiz', lookup_key: plan } };
            sessionConfig.payment_method_types = ['card', 'revolut_pay'];
        } else {
            // Poniższe parametry tylko dla trybu payment
            sessionConfig.customer_creation = 'always';
            sessionConfig.tax_id_collection = { enabled: true };
            sessionConfig.payment_method_types = ['card', 'blik', 'revolut_pay'];
            // Generuj fakturę dla płatności jednorazowych (z NIP klienta)
            sessionConfig.invoice_creation = {
                enabled: true,
                invoice_data: { metadata: { product: 'imprezja-quiz', lookup_key: plan } }
            };
        }
        // Pole "Masz kod rabatowy?" na stronie Stripe Checkout
        sessionConfig.allow_promotion_codes = true;

        const session = await stripe.checkout.sessions.create(sessionConfig);
        console.log('✅ Checkout GET redirect:', plan, '->', session.url.substring(0, 60) + '...');
        res.redirect(303, session.url);
    } catch (err) {
        console.error('Checkout GET error:', err);
        res.status(500).send(`Błąd tworzenia sesji płatności: ${err.message}`);
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
        const emailSubject = 'Imprezja Quiz – potwierdzenie zakupu i klucz licencyjny';
        const emailHtml = `
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Potwierdzenie zakupu Imprezja Quiz</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f4f4f4;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
<tr><td style="padding: 32px 40px;">
<h1 style="margin: 0 0 24px 0; font-size: 22px; color: #27ae60;">Potwierdzenie zakupu Imprezja Quiz</h1>
<p style="margin: 0 0 20px 0;">Dziękujemy za zakup licencji Imprezja Quiz. Płatność została pomyślnie zrealizowana.</p>
<p style="margin: 0 0 16px 0;"><strong>Twój klucz licencyjny:</strong></p>
<div style="font-family: 'Courier New', monospace; font-size: 14px; background-color: #f8f9fa; padding: 16px; border-radius: 6px; border: 1px solid #e0e0e0; word-break: break-all; margin-bottom: 24px;">${licenseKey}</div>
<h2 style="margin: 0 0 12px 0; font-size: 16px;">Instrukcja aktywacji</h2>
<ol style="margin: 0 0 24px 0; padding-left: 20px;">
<li>Uruchom program Imprezja Quiz na swoim komputerze.</li>
<li>Na ekranie aktywacji skopiuj powyższy klucz i wklej go w pole „Klucz licencyjny”.</li>
<li>Kliknij przycisk <strong>Aktywuj</strong>.</li>
</ol>
<p style="margin: 0 0 24px 0; color: #666;">Zachowaj ten e-mail – klucz może się przydać przy ponownej instalacji programu.</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
<p style="margin: 0; font-size: 14px; color: #666;">Nowa Jakość Rozrywki · <a href="https://nowajakoscrozrywki.pl" style="color: #0073aa;">nowajakoscrozrywki.pl</a></p>
<p style="margin: 8px 0 0 0; font-size: 13px; color: #999;">Ten e-mail został wysłany w odpowiedzi na Twoje zamówienie. Nie odpowiadaj na tę wiadomość – w razie pytań skontaktuj się przez formularz na stronie.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
        `.trim();
        const emailText = `Potwierdzenie zakupu Imprezja Quiz

Dziękujemy za zakup licencji Imprezja Quiz. Płatność została pomyślnie zrealizowana.

Twój klucz licencyjny:
${licenseKey}

Instrukcja aktywacji:
1. Uruchom program Imprezja Quiz na swoim komputerze.
2. Na ekranie aktywacji skopiuj powyższy klucz i wklej go w pole "Klucz licencyjny".
3. Kliknij przycisk Aktywuj.

Zachowaj ten e-mail – klucz może się przydać przy ponownej instalacji programu.

---
Nowa Jakość Rozrywki
https://nowajakoscrozrywki.pl

Ten e-mail został wysłany w odpowiedzi na Twoje zamówienie.`;

        if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const { error } = await resend.emails.send({
                from: emailFrom,
                to: customerEmail,
                subject: emailSubject,
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
                subject: emailSubject,
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

/**
 * Endpoint wywoływany raz dziennie przez cron-job.org (bezpłatnie).
 * Sprawdza płatności jednorazowe w Stripe i wysyła e-mail klientom,
 * których licencja wygasa za dokładnie 7 dni.
 * Zabezpieczony tokenem: /api/cron/reminders?secret=CRON_SECRET
 */
app.get('/api/cron/reminders', async (req, res) => {
    const secret = req.query.secret || req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Brak autoryzacji' });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Stripe nie skonfigurowany' });
    }

    const REMINDER_DAYS_BEFORE = 7;
    const sent = [];
    const skipped = [];
    const errors = [];

    try {
        // Pobierz wszystkie sesje Checkout z ostatnich 13 miesięcy
        const since = Math.floor(Date.now() / 1000) - (395 * 24 * 3600);
        let hasMore = true;
        let startingAfter;
        const sessions = [];

        while (hasMore) {
            const page = await stripe.checkout.sessions.list({
                limit: 100,
                created: { gte: since },
                ...(startingAfter ? { starting_after: startingAfter } : {})
            });
            sessions.push(...page.data);
            hasMore = page.has_more;
            if (hasMore) startingAfter = page.data[page.data.length - 1].id;
        }

        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const renewUrl = 'https://nowajakoscrozrywki.pl/produkt/imprezja-quiz/';
        const videoUrl = 'https://youtu.be/pVK8s4TB_gI';

        for (const session of sessions) {
            if (session.payment_status !== 'paid') continue;

            const email = session.customer_email || session.customer_details?.email;
            if (!email) continue;

            const purchaseDate = new Date(session.created * 1000);
            purchaseDate.setHours(0, 0, 0, 0);
            const daysSincePurchase = Math.round((todayMidnight - purchaseDate) / (1000 * 3600 * 24));

            // Pobierz metadata PaymentIntent lub Subscription (wspólny obiekt do aktualizacji flag)
            const piId = session.payment_intent;
            const subId = session.subscription;
            let trackerObj = null;
            let trackerType = null;
            if (piId) {
                trackerObj = await stripe.paymentIntents.retrieve(piId);
                trackerType = 'paymentIntent';
            } else if (subId) {
                trackerObj = await stripe.subscriptions.retrieve(subId);
                trackerType = 'subscription';
            }
            const meta = trackerObj?.metadata || {};

            const updateMeta = async (flags) => {
                if (!trackerObj) return;
                const updated = { ...meta, ...flags };
                if (trackerType === 'paymentIntent') {
                    await stripe.paymentIntents.update(piId, { metadata: updated });
                } else {
                    await stripe.subscriptions.update(subId, { metadata: updated });
                }
            };

            const tryEmail = async ({ flagKey, subject, html, text, label }) => {
                if (meta[flagKey] === 'true') {
                    skipped.push({ session: session.id, reason: flagKey });
                    return;
                }
                try {
                    await sendEmail({ to: email, subject, html, text });
                    await updateMeta({ [flagKey]: 'true' });
                    sent.push({ email, session: session.id, type: label });
                    console.log(`📧 ${label}: ${email}`);
                } catch (err) {
                    errors.push({ session: session.id, email, error: err.message, type: label });
                    console.error(`⚠️ Błąd ${label} ${email}:`, err.message);
                }
            };

            // ── Dzień 2: Instrukcja wideo ────────────────────────────────────
            if (daysSincePurchase === 2) {
                await tryEmail({
                    flagKey: 'onboarding_video_sent',
                    label: 'onboarding_video',
                    subject: 'Imprezja Quiz – jak zacząć? Instrukcja wideo',
                    html: buildEmail({
                        title: '🎬 Jak zacząć z Imprezja Quiz?',
                        accentColor: '#3b82f6',
                        body: `<p style="margin:0 0 16px;">Dziękujemy, że jesteś z nami! Przygotowaliśmy krótkie wideo, które pokaże Ci jak w kilka minut uruchomić pierwszy quiz na imprezie.</p>
<p style="margin:0 0 24px;text-align:center;"><a href="${videoUrl}" style="display:inline-block;padding:14px 28px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">▶ Obejrzyj instrukcję wideo</a></p>
<p style="margin:0 0 8px;font-weight:600;">Szybki start w 3 krokach:</p>
<ol style="margin:0 0 24px;padding-left:20px;">
<li style="margin-bottom:8px;">Uruchom Imprezja Quiz i aktywuj licencję (klucz otrzymałeś e-mailem).</li>
<li style="margin-bottom:8px;">Stwórz swój pierwszy quiz w edytorze — zajmuje to mniej niż 5 minut.</li>
<li style="margin-bottom:8px;">Podłącz TV/projektor, udostępnij QR kod gościom i graj!</li>
</ol>`,
                    }),
                    text: `Jak zacząć z Imprezja Quiz?\n\nObejrzyj instrukcję wideo: ${videoUrl}\n\nSzybki start:\n1. Aktywuj licencję\n2. Stwórz quiz\n3. Podłącz TV i graj!`,
                });
            }

            // ── Dzień 7: Tips & tricks ───────────────────────────────────────
            if (daysSincePurchase === 7) {
                await tryEmail({
                    flagKey: 'onboarding_tips_sent',
                    label: 'onboarding_tips',
                    subject: 'Imprezja Quiz – 5 rzeczy, które warto wiedzieć',
                    html: buildEmail({
                        title: '💡 5 rzeczy, które warto wiedzieć',
                        accentColor: '#059669',
                        body: `<p style="margin:0 0 20px;">Masz już tydzień z Imprezja Quiz! Oto kilka wskazówek, które przydają się na prawdziwych imprezach:</p>
<ol style="margin:0 0 24px;padding-left:20px;">
<li style="margin-bottom:12px;"><strong>Tryb drużynowy</strong> — świetny na wesela. Drużyna Panny Młodej vs Pana Młodego zawsze buduje emocje.</li>
<li style="margin-bottom:12px;"><strong>Generator QR WiFi</strong> — zamiast mówić gościom hasło, wygeneruj QR kod — jeden skan i gotowe.</li>
<li style="margin-bottom:12px;"><strong>Tryb Speedrun</strong> — tylko pierwsze X osób z poprawną odpowiedzią dostaje punkty. Idealne na finał quizu.</li>
<li style="margin-bottom:12px;"><strong>Tunel (LTE)</strong> — gdy goście są w innej sieci niż Ty, włącz tunel i graj przez internet.</li>
<li style="margin-bottom:12px;"><strong>Pytania otwarte</strong> — chmura słów z odpowiedziami gości wygląda spektakularnie na dużym ekranie.</li>
</ol>
<p style="margin:0 0 8px;">Masz pytania? Skontaktuj się z nami:</p>
<p style="margin:0;"><a href="mailto:biuro@imprezja.pl" style="color:#3b82f6;">biuro@imprezja.pl</a></p>`,
                    }),
                    text: `5 rzeczy, które warto wiedzieć:\n1. Tryb drużynowy — Panna Młoda vs Pan Młody\n2. Generator QR WiFi — jeden skan zamiast hasła\n3. Speedrun — tylko najszybsi dostają punkty\n4. Tunel LTE — graj przez internet\n5. Pytania otwarte — spektakularna chmura słów\n\nPytania? biuro@imprezja.pl`,
                });
            }

            // ── 7 dni przed wygaśnięciem licencji jednorazowej ───────────────
            if (session.mode === 'payment') {
                const lookupKey = session.metadata?.lookup_key || '';
                const licenseDays = ONETIME_LICENSE_DAYS[lookupKey];
                if (licenseDays) {
                    const expiryDate = new Date(purchaseDate);
                    expiryDate.setDate(expiryDate.getDate() + licenseDays);
                    const daysUntilExpiry = Math.round((expiryDate - todayMidnight) / (1000 * 3600 * 24));

                    if (daysUntilExpiry === REMINDER_DAYS_BEFORE) {
                        const expiryStr = expiryDate.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });
                        await tryEmail({
                            flagKey: 'expiry_reminder_sent',
                            label: 'expiry_reminder',
                            subject: 'Imprezja Quiz – licencja wygasa za 7 dni',
                            html: buildEmail({
                                title: '⏰ Twoja licencja wygasa za 7 dni',
                                accentColor: '#f59e0b',
                                body: `<p style="margin:0 0 16px;">Data wygaśnięcia: <strong>${expiryStr}</strong></p>
<p style="margin:0 0 24px;">Po tej dacie program przejdzie w tryb demo. Aby kontynuować korzystanie z pełnej wersji, przedłuż licencję.</p>
<p style="margin:0 0 8px;text-align:center;"><a href="${renewUrl}" style="display:inline-block;padding:14px 28px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Przedłuż licencję →</a></p>`,
                            }),
                            text: `Twoja licencja Imprezja Quiz wygasa za 7 dni (${expiryStr}).\n\nPrzedłuż licencję:\n${renewUrl}`,
                        });
                    }

                    // ── 30 dni po wygaśnięciu: reaktywacja ──────────────────
                    if (daysUntilExpiry === -30) {
                        await tryEmail({
                            flagKey: 'reactivation_sent',
                            label: 'reactivation',
                            subject: 'Imprezja Quiz – tęsknimy za Tobą! Wróć z rabatem',
                            html: buildEmail({
                                title: '👋 Wróć do Imprezja Quiz',
                                accentColor: '#8b5cf6',
                                body: `<p style="margin:0 0 16px;">Minął miesiąc od wygaśnięcia Twojej licencji. Mamy nadzieję, że imprezy się udały! 🎉</p>
<p style="margin:0 0 24px;">Jeśli planujesz kolejne eventy, chętnie Cię przywitamy z powrotem. Kliknij poniżej, żeby wybrać nowy plan.</p>
<p style="margin:0 0 8px;text-align:center;"><a href="${renewUrl}" style="display:inline-block;padding:14px 28px;background:#8b5cf6;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Wróć do Imprezja Quiz →</a></p>`,
                            }),
                            text: `Minął miesiąc od wygaśnięcia licencji Imprezja Quiz.\n\nWróć i wybierz nowy plan:\n${renewUrl}`,
                        });
                    }
                }
            }
        }

        res.json({ ok: true, checked: sessions.length, sent, skipped: skipped.length, errors });
    } catch (err) {
        console.error('Cron reminders error:', err);
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

// ── /dolacz — stały punkt wejścia dla gości bez skanera QR ──
// Lokalne serwery rejestrują sesje przez POST /api/register-game-session
// Goście wchodzą na [render-url]/dolacz i wpisują 4-cyfrowy kod
const gameSessions = new Map(); // code → { redirectUrl, expires }

app.post('/api/register-game-session', express.json(), (req, res) => {
    const { code, redirectUrl } = req.body || {};
    if (!code || !redirectUrl) return res.status(400).json({ error: 'Brak code lub redirectUrl' });
    gameSessions.set(String(code), { redirectUrl, expires: Date.now() + 6 * 60 * 60 * 1000 }); // 6h
    // Wyczyść stare sesje
    for (const [k, v] of gameSessions) { if (v.expires < Date.now()) gameSessions.delete(k); }
    console.log(`🎮 Sesja zarejestrowana: kod=${code} url=${redirectUrl}`);
    res.json({ ok: true });
});

app.get('/dolacz', (req, res) => {
    const code = (req.query.kod || '').trim();
    if (code) {
        const session = gameSessions.get(code);
        if (session && session.expires > Date.now()) {
            return res.redirect(session.redirectUrl);
        }
    }
    // Formularz z kodem
    res.send(`<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dołącz do gry – Imprezja Quiz</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000c1a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12);border-radius:20px;padding:40px 32px;max-width:420px;width:100%;text-align:center}
.logo{font-size:3rem;margin-bottom:10px}
h1{font-size:1.5rem;color:#7dd3fc;margin-bottom:8px}
p{color:rgba(255,255,255,.6);font-size:.95rem;margin-bottom:32px;line-height:1.5}
.code-input{display:flex;gap:8px;justify-content:center;margin-bottom:20px}
.code-input input{width:64px;height:72px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.2);border-radius:12px;color:#fff;font-size:2rem;font-weight:900;text-align:center;outline:none;caret-color:#7dd3fc}
.code-input input:focus{border-color:#0ea5e9;background:rgba(14,165,233,.1)}
.btn{display:block;width:100%;padding:16px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;border:none;border-radius:12px;font-size:1.1rem;font-weight:800;cursor:pointer;margin-bottom:12px}
.btn:hover{opacity:.9}
.err{color:#ef4444;font-size:.9rem;margin-top:12px;display:none}
</style>
</head>
<body>
<div class="card">
    <div class="logo">🎮</div>
    <h1>Imprezja Quiz</h1>
    <p>Wpisz 4-cyfrowy kod wyświetlony na ekranie przez organizatora</p>
    <form method="GET" action="/dolacz" onsubmit="return validate()">
        <div class="code-input">
            <input type="text" name="d1" maxlength="1" pattern="[0-9]" inputmode="numeric" id="d1" autocomplete="off">
            <input type="text" name="d2" maxlength="1" pattern="[0-9]" inputmode="numeric" id="d2" autocomplete="off">
            <input type="text" name="d3" maxlength="1" pattern="[0-9]" inputmode="numeric" id="d3" autocomplete="off">
            <input type="text" name="d4" maxlength="1" pattern="[0-9]" inputmode="numeric" id="d4" autocomplete="off">
            <input type="hidden" name="kod" id="kod-hidden">
        </div>
        <button type="submit" class="btn">▶ Dołącz do gry</button>
        ${code ? '<div class="err" style="display:block">Nieprawidłowy lub nieaktywny kod. Sprawdź kod na ekranie.</div>' : ''}
    </form>
</div>
<script>
const inputs = [d1,d2,d3,d4];
inputs.forEach((el,i) => {
    el.addEventListener('input', () => {
        el.value = el.value.replace(/[^0-9]/g,'').slice(-1);
        if (el.value && i < 3) inputs[i+1].focus();
    });
    el.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !el.value && i > 0) inputs[i-1].focus();
    });
});
d1.focus();
function validate() {
    const code = inputs.map(e=>e.value).join('');
    if (code.length < 4) return false;
    document.getElementById('kod-hidden').value = code;
    return true;
}
</script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log(`Stripe Shop: http://localhost:${PORT}`);
    if (!process.env.STRIPE_SECRET_KEY) {
        console.warn('⚠️ Ustaw STRIPE_SECRET_KEY w .env');
    }
});

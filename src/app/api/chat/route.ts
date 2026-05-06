import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, stepCountIs, streamText, tool, UIMessage, wrapLanguageModel } from 'ai';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { getOrCreateWorkspace } from '@/lib/workspace';
import { createClientFromAI, markInvoicePaidFromAI, createInvoiceFromAI, InvoiceItemSchema } from '@/app/actions/ai-actions';

const googleProvider = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const groqProvider = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
});

function withFallback(primary: LanguageModelV3, fallback: LanguageModelV3): LanguageModelV3 {
    return wrapLanguageModel({
        model: primary,
        middleware: {
            specificationVersion: 'v3',
            wrapStream: async ({ doStream, params }) => {
                try {
                    return await doStream();
                } catch (err) {
                    console.warn('[chat] primary model failed, switching to fallback:', (err as Error).message);
                    return await fallback.doStream(params);
                }
            },
            wrapGenerate: async ({ doGenerate, params }) => {
                try {
                    return await doGenerate();
                } catch (err) {
                    console.warn('[chat] primary model failed, switching to fallback:', (err as Error).message);
                    return await fallback.doGenerate(params);
                }
            },
        },
    });
}

const CONSENT_RE = /\b(oui|yes|confirme?|ok|d'accord|valide?)\b/i;

function hasUserConsent(msgs: UIMessage[]): boolean {
    const lastUser = [...msgs].reverse().find(m => m.role === 'user');
    if (!lastUser) return false;
    // UIMessage in AI SDK v6 uses parts, not a content string
    const text = lastUser.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map(p => p.text)
        .join('');
    return CONSENT_RE.test(text);
}

// Shared schema for invoice tool inputs — used by both propose and confirm tools
const InvoiceToolInputSchema = z.object({
    client_id: z.string().uuid(),
    items: z.array(InvoiceItemSchema).min(1),
    due_date: z.string().nullable().optional(),
    currency: z.string().optional(),
    discount: z.number().min(0).max(100).optional(),
});

// Shared schema for client fields — used by both propose and confirm tools
const ClientFieldsSchema = z.object({
    name: z.string().min(1),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    ice: z.string().nullable().optional(),
});

export async function POST(req: Request) {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GROQ_API_KEY) {
            console.error('[chat] No AI provider API key configured');
            return new Response('Server misconfigured: no AI provider key set', { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('[chat] Unauthorized: no user session');
            return new Response('Unauthorized', { status: 401 });
        }

        let workspaceId: string;
        try {
            workspaceId = await getOrCreateWorkspace(supabase, user.id);
        } catch (err) {
            console.error('[chat] failed to resolve workspace:', err);
            return new Response('Workspace unavailable', { status: 500 });
        }

        console.log(`[chat] POST user=${user.id} workspace=${workspaceId}`);

        const { messages }: { messages: UIMessage[] } = await req.json();

        const result = streamText({
            model: withFallback(
                googleProvider('gemini-2.0-flash'),
                groqProvider('llama-3.1-8b-instant'),
            ),
            system: `Vous êtes l'assistant IA d'Invoicify. L'utilisateur actuel a l'ID ${user.id}.

RÈGLE ABSOLUE : Ne jamais appeler un outil dont le nom commence par "confirm" (confirmCreateClient, confirmMarkPaid, confirmCreateInvoice) sauf si le dernier message de l'utilisateur contient une confirmation explicite (oui / confirme / ok / d'accord / yes). En cas de doute, appelez l'outil "propose" correspondant d'abord.

Outils disponibles :
- getDashboardStats : statistiques générales (revenus, factures en attente, nombre de clients)
- getClients : liste tous les clients de l'espace de travail
- getRecentInvoices(limit?) : factures récentes avec statut et montant
- findClient(name) : recherche un client par nom — utiliser pour obtenir le client_id avant de créer une facture
- proposeCreateClient(fields) : prépare la création d'un client et retourne un aperçu — NE crée PAS en base de données
- confirmCreateClient(fields) : crée réellement le client — UNIQUEMENT après confirmation explicite
- proposeMarkPaid(invoice_number) : recherche la facture et retourne ses détails — NE marque PAS comme payée
- confirmMarkPaid(invoice_id) : marque la facture comme payée — UNIQUEMENT après confirmation explicite
- proposeInvoice(fields) : calcule les totaux et retourne un aperçu complet — NE crée PAS la facture
- confirmCreateInvoice(fields) : crée réellement la facture et ses lignes — UNIQUEMENT après confirmation explicite

Pour créer une facture : 1) appeler findClient pour obtenir le client_id, 2) appeler proposeInvoice, 3) attendre confirmation, 4) appeler confirmCreateInvoice.
Les quantités et prix sont des nombres. Les dates sont au format YYYY-MM-DD. TVA par défaut : 20%.

RÈGLE DE FORMAT ABSOLUE — FORMAT DES RÉPONSES TEXTE :
- Après chaque appel d'outil, rédigez TOUJOURS un message texte en français naturel pour l'utilisateur.
- Ne terminez jamais votre réponse sur un appel d'outil seul sans texte qui suit.
- INTERDICTION STRICTE d'inclure du JSON brut, des accolades { }, des crochets [ ], ou toute structure de données technique dans vos messages texte.
- Présentez TOUJOURS les données sous forme de liste à puces ou de phrases en français. Exemple : au lieu de {"name":"Dupont"}, écrivez "• Dupont".
- Si un outil retourne une liste de clients ou de factures, présentez-les ligne par ligne en français, jamais comme objet JSON.

Répondez toujours en français.`,
            messages: await convertToModelMessages(messages),
            stopWhen: stepCountIs(5),
            onError: ({ error }) => {
                console.error('[chat] streamText error:', error);
            },
            tools: {
                getDashboardStats: tool({
                    description: 'Obtenir les statistiques de revenus et factures en attente.',
                    inputSchema: z.object({}),
                    execute: async () => {
                        const t0 = Date.now();
                        console.log('[tool:getDashboardStats] start');
                        try {
                            const [{ data: invoices, error: invErr }, { data: clients, error: cliErr }] = await Promise.all([
                                supabase
                                    .from('invoices')
                                    .select('status, total_ttc')
                                    .eq('workspace_id', workspaceId),
                                supabase
                                    .from('clients')
                                    .select('id')
                                    .eq('workspace_id', workspaceId),
                            ]);

                            if (invErr) {
                                console.error('[tool:getDashboardStats] invoices error:', invErr);
                                return { error: `Failed to fetch invoices: ${invErr.message}` };
                            }
                            if (cliErr) {
                                console.error('[tool:getDashboardStats] clients error:', cliErr);
                                return { error: `Failed to fetch clients: ${cliErr.message}` };
                            }

                            const safeInvoices = invoices ?? [];
                            const totalPaid = safeInvoices
                                .filter((i) => i.status?.toLowerCase() === 'paid')
                                .reduce((sum, i) => sum + (Number(i.total_ttc) || 0), 0);

                            const pendingInvoices = safeInvoices.filter((i) => {
                                const s = (i.status ?? '').toLowerCase();
                                return s === 'sent' || s === 'pending' || s === 'en_attente' || s === 'en attente';
                            });

                            const out = {
                                totalRevenuePaid: totalPaid,
                                totalPendingAmount: pendingInvoices.reduce((sum, i) => sum + (Number(i.total_ttc) || 0), 0),
                                pendingCount: pendingInvoices.length,
                                totalInvoices: safeInvoices.length,
                                clientCount: (clients ?? []).length,
                            };
                            console.log(`[tool:getDashboardStats] done in ${Date.now() - t0}ms`);
                            return out;
                        } catch (err) {
                            console.error('[tool:getDashboardStats] threw:', err);
                            return { error: `Failed to fetch dashboard stats: ${err instanceof Error ? err.message : String(err)}` };
                        }
                    },
                }),

                getClients: tool({
                    description: "Lister les clients de l'utilisateur.",
                    inputSchema: z.object({}),
                    execute: async () => {
                        const t0 = Date.now();
                        console.log('[tool:getClients] start');
                        try {
                            const { data, error } = await supabase
                                .from('clients')
                                .select('id, name, email, phone, city, ice')
                                .eq('workspace_id', workspaceId)
                                .order('name', { ascending: true });

                            if (error) {
                                console.error('[tool:getClients] supabase error:', error);
                                return { error: `Failed to fetch clients: ${error.message}` };
                            }
                            console.log(`[tool:getClients] done in ${Date.now() - t0}ms, rows=${data?.length ?? 0}`);
                            return { clients: data ?? [] };
                        } catch (err) {
                            console.error('[tool:getClients] threw:', err);
                            return { error: `Failed to fetch clients: ${err instanceof Error ? err.message : String(err)}` };
                        }
                    },
                }),

                getRecentInvoices: tool({
                    description: 'Lister les factures récentes et leur statut.',
                    inputSchema: z.object({
                        limit: z.number().optional().default(5),
                    }),
                    execute: async ({ limit }) => {
                        const t0 = Date.now();
                        console.log(`[tool:getRecentInvoices] start limit=${limit}`);
                        try {
                            const { data, error } = await supabase
                                .from('invoices')
                                .select('id, invoice_number, status, total_ttc, due_date, created_at, client:clients(name)')
                                .eq('workspace_id', workspaceId)
                                .order('created_at', { ascending: false })
                                .limit(limit);

                            if (error) {
                                console.error('[tool:getRecentInvoices] supabase error:', error);
                                return { error: `Failed to fetch invoices: ${error.message}` };
                            }
                            const serialized = (data ?? []).map((row) => ({
                                ...row,
                                due_date: row.due_date ? String(row.due_date) : null,
                                created_at: row.created_at ? String(row.created_at) : null,
                            }));
                            console.log(`[tool:getRecentInvoices] done in ${Date.now() - t0}ms, rows=${serialized.length}`);
                            return { invoices: serialized };
                        } catch (err) {
                            console.error('[tool:getRecentInvoices] threw:', err);
                            return { error: `Failed to fetch invoices: ${err instanceof Error ? err.message : String(err)}` };
                        }
                    },
                }),

                findClient: tool({
                    description: 'Rechercher un client par nom (correspondance partielle, insensible à la casse). Utiliser pour résoudre un nom en identifiant avant de créer une facture.',
                    inputSchema: z.object({
                        name: z.string().min(1),
                    }),
                    execute: async ({ name }) => {
                        const t0 = Date.now();
                        console.log(`[tool:findClient] start name="${name}"`);
                        try {
                            const { data, error } = await supabase
                                .from('clients')
                                .select('id, name, email, city')
                                .eq('workspace_id', workspaceId)
                                .ilike('name', `%${name}%`)
                                .order('name', { ascending: true })
                                .limit(5);

                            if (error) {
                                console.error('[tool:findClient] supabase error:', error);
                                return { error: `Erreur recherche client: ${error.message}` };
                            }
                            console.log(`[tool:findClient] done in ${Date.now() - t0}ms, found=${data?.length ?? 0}`);
                            return { clients: data ?? [] };
                        } catch (err) {
                            console.error('[tool:findClient] threw:', err);
                            return { error: `Erreur recherche client: ${err instanceof Error ? err.message : String(err)}` };
                        }
                    },
                }),

                proposeCreateClient: tool({
                    description: "Prépare la création d'un client et retourne un aperçu structuré. NE crée PAS en base de données. Toujours appeler avant confirmCreateClient.",
                    inputSchema: ClientFieldsSchema,
                    execute: async (fields) => {
                        console.log('[tool:proposeCreateClient] preview for', fields.name);
                        const details = [
                            fields.email ? `email : ${fields.email}` : null,
                            fields.phone ? `tél : ${fields.phone}` : null,
                            fields.city ? `ville : ${fields.city}` : null,
                            fields.ice ? `ICE : ${fields.ice}` : null,
                        ].filter(Boolean).join(', ');

                        return {
                            proposal: {
                                name: fields.name,
                                email: fields.email ?? null,
                                phone: fields.phone ?? null,
                                address: fields.address ?? null,
                                city: fields.city ?? null,
                                ice: fields.ice ?? null,
                            },
                            confirmPrompt: `Aperçu du nouveau client :\n• Nom : ${fields.name}${details ? `\n• ${details.split(', ').join('\n• ')}` : ''}\n\nConfirmez-vous la création ? (oui/non)`,
                        };
                    },
                }),

                confirmCreateClient: tool({
                    description: "Crée réellement le client en base de données. UNIQUEMENT après confirmation explicite de l'utilisateur.",
                    inputSchema: ClientFieldsSchema,
                    execute: async (fields) => {
                        if (!hasUserConsent(messages)) {
                            return { error: 'Confirmation explicite requise. Répondez "oui" pour procéder.' };
                        }
                        const t0 = Date.now();
                        console.log('[tool:confirmCreateClient] start for', fields.name);
                        try {
                            const result = await createClientFromAI(fields);
                            if ('error' in result) {
                                console.error('[tool:confirmCreateClient] error:', result.error);
                                return { error: result.error };
                            }
                            console.log(`[tool:confirmCreateClient] done in ${Date.now() - t0}ms, id=${result.clientId}`);
                            return { success: true, clientId: result.clientId, name: result.name };
                        } catch (err) {
                            console.error('[tool:confirmCreateClient] threw:', err);
                            return { error: `Erreur création client: ${err instanceof Error ? err.message : String(err)}` };
                        }
                    },
                }),

                proposeMarkPaid: tool({
                    description: "Recherche une facture par numéro et retourne ses détails pour confirmation. NE marque PAS la facture comme payée. Toujours appeler avant confirmMarkPaid.",
                    inputSchema: z.object({
                        invoice_number: z.string().min(1),
                    }),
                    execute: async ({ invoice_number }) => {
                        const t0 = Date.now();
                        console.log(`[tool:proposeMarkPaid] start invoice_number="${invoice_number}"`);
                        try {
                            const { data, error } = await supabase
                                .from('invoices')
                                .select('id, invoice_number, status, total_ttc, due_date, client:clients(name)')
                                .eq('workspace_id', workspaceId)
                                .ilike('invoice_number', invoice_number.trim())
                                .single();

                            if (error || !data) {
                                console.error('[tool:proposeMarkPaid] not found:', error?.message);
                                return { error: `Facture "${invoice_number}" introuvable.` };
                            }

                            const clientName = Array.isArray(data.client)
                                ? (data.client[0] as { name: string } | undefined)?.name ?? 'Client inconnu'
                                : (data.client as { name: string } | null)?.name ?? 'Client inconnu';

                            console.log(`[tool:proposeMarkPaid] done in ${Date.now() - t0}ms`);
                            return {
                                proposal: {
                                    invoice_id: data.id,
                                    invoice_number: data.invoice_number,
                                    client_name: clientName,
                                    total_ttc: data.total_ttc,
                                    current_status: data.status,
                                    due_date: data.due_date ? String(data.due_date) : null,
                                },
                                confirmPrompt: `Aperçu :\n• Facture : ${data.invoice_number}\n• Client : ${clientName}\n• Montant : ${Number(data.total_ttc).toLocaleString('fr-MA')} MAD\n• Statut actuel : ${data.status}\n\nConfirmez-vous le marquage comme payée ? (oui/non)`,
                            };
                        } catch (err) {
                            console.error('[tool:proposeMarkPaid] threw:', err);
                            return { error: `Erreur recherche facture: ${err instanceof Error ? err.message : String(err)}` };
                        }
                    },
                }),

                confirmMarkPaid: tool({
                    description: "Marque réellement la facture comme payée en base de données. UNIQUEMENT après confirmation explicite de l'utilisateur.",
                    inputSchema: z.object({
                        invoice_id: z.string().uuid(),
                    }),
                    execute: async ({ invoice_id }) => {
                        if (!hasUserConsent(messages)) {
                            return { error: 'Confirmation explicite requise. Répondez "oui" pour procéder.' };
                        }
                        const t0 = Date.now();
                        console.log(`[tool:confirmMarkPaid] start invoice_id="${invoice_id}"`);
                        try {
                            const result = await markInvoicePaidFromAI(invoice_id);
                            if ('error' in result) {
                                console.error('[tool:confirmMarkPaid] error:', result.error);
                                return { error: result.error };
                            }
                            console.log(`[tool:confirmMarkPaid] done in ${Date.now() - t0}ms`);
                            return { success: true, invoiceNumber: result.invoiceNumber };
                        } catch (err) {
                            console.error('[tool:confirmMarkPaid] threw:', err);
                            return { error: `Erreur mise à jour facture: ${err instanceof Error ? err.message : String(err)}` };
                        }
                    },
                }),

                proposeInvoice: tool({
                    description: "Calcule les totaux et retourne un aperçu complet de la facture à créer. NE crée PAS la facture. Toujours appeler avant confirmCreateInvoice.",
                    inputSchema: InvoiceToolInputSchema,
                    execute: async ({ client_id, items, due_date, currency, discount }) => {
                        const t0 = Date.now();
                        console.log(`[tool:proposeInvoice] start client_id="${client_id}" items=${items.length}`);
                        try {
                            const { data: client } = await supabase
                                .from('clients')
                                .select('name')
                                .eq('id', client_id)
                                .eq('workspace_id', workspaceId)
                                .single();

                            if (!client) return { error: 'Client introuvable ou accès refusé.' };

                            const safeDiscount = discount ?? 0;
                            const safeCurrency = currency ?? 'MAD';
                            const totalHT_Gross = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
                            const discountRatio = totalHT_Gross > 0 ? (1 - safeDiscount / 100) : 1;
                            const totalHT_Net = totalHT_Gross * discountRatio;
                            const totalTVA = items.reduce((sum, item) => {
                                const lineHT = item.quantity * item.unit_price * discountRatio;
                                return sum + lineHT * (item.tva_rate / 100);
                            }, 0);
                            const totalTTC = totalHT_Net + totalTVA;

                            const itemLines = items.map((item) =>
                                `  • ${item.description} — ${item.quantity} × ${item.unit_price} ${safeCurrency} (TVA ${item.tva_rate}%)`
                            ).join('\n');

                            console.log(`[tool:proposeInvoice] done in ${Date.now() - t0}ms ttc=${totalTTC}`);
                            return {
                                proposal: {
                                    client_id,
                                    client_name: client.name,
                                    items,
                                    due_date: due_date ?? null,
                                    currency: safeCurrency,
                                    discount: safeDiscount,
                                    total_ht: Math.round(totalHT_Net * 100) / 100,
                                    total_tva: Math.round(totalTVA * 100) / 100,
                                    total_ttc: Math.round(totalTTC * 100) / 100,
                                },
                                confirmPrompt: `Aperçu de la facture :\n• Client : ${client.name}\n• Articles :\n${itemLines}${safeDiscount > 0 ? `\n• Remise : ${safeDiscount}%` : ''}\n• Total HT : ${totalHT_Net.toFixed(2)} ${safeCurrency}\n• TVA : ${totalTVA.toFixed(2)} ${safeCurrency}\n• **Total TTC : ${totalTTC.toFixed(2)} ${safeCurrency}**${due_date ? `\n• Échéance : ${due_date}` : ''}\n\nConfirmez-vous la création ? (oui/non)`,
                            };
                        } catch (err) {
                            console.error('[tool:proposeInvoice] threw:', err);
                            return { error: `Erreur aperçu facture: ${err instanceof Error ? err.message : String(err)}` };
                        }
                    },
                }),

                confirmCreateInvoice: tool({
                    description: "Crée réellement la facture et ses lignes en base de données. UNIQUEMENT après confirmation explicite de l'utilisateur.",
                    inputSchema: InvoiceToolInputSchema,
                    execute: async (fields) => {
                        if (!hasUserConsent(messages)) {
                            return { error: 'Confirmation explicite requise. Répondez "oui" pour procéder.' };
                        }
                        const t0 = Date.now();
                        console.log(`[tool:confirmCreateInvoice] start client_id="${fields.client_id}" items=${fields.items.length}`);
                        try {
                            const result = await createInvoiceFromAI({
                                client_id: fields.client_id,
                                items: fields.items,
                                due_date: fields.due_date,
                                currency: fields.currency ?? 'MAD',
                                discount: fields.discount ?? 0,
                            });
                            if ('error' in result) {
                                console.error('[tool:confirmCreateInvoice] error:', result.error);
                                return { error: result.error };
                            }
                            console.log(`[tool:confirmCreateInvoice] done in ${Date.now() - t0}ms invoice=${result.invoiceNumber}`);
                            return { success: true, invoiceId: result.invoiceId, invoiceNumber: result.invoiceNumber };
                        } catch (err) {
                            console.error('[tool:confirmCreateInvoice] threw:', err);
                            return { error: `Erreur création facture: ${err instanceof Error ? err.message : String(err)}` };
                        }
                    },
                }),
            },
        });

        return result.toUIMessageStreamResponse({
            onError: (error) => {
                const message = error instanceof Error ? error.message : String(error);
                console.error('[chat] stream emit error:', message);
                return `Erreur serveur: ${message}`;
            },
        });
    } catch (error) {
        console.error('[chat] top-level handler error:', error);
        const message = error instanceof Error ? error.message : 'Unknown server error';
        return new Response(`Erreur serveur: ${message}`, { status: 500 });
    }
}

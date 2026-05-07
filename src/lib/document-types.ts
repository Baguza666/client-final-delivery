export interface DocumentLineItem {
    line_uid: string
    description: string
    quantity: number
    unit_price: number
    tva_rate: number
    total: number
    unit?: string | null
}

export interface PoLineItem extends DocumentLineItem {
    purchase_order_id: string
}

export interface DnLineItem {
    delivery_note_id: string
    line_uid: string
    description: string
    quantity: number
    unit?: string | null
}

export interface InvoiceLineItem extends DocumentLineItem {
    invoice_id: string
}

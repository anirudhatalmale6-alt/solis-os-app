import { useEffect, useState, useRef } from 'react'
import {
  FileText, Plus, Send, CheckCircle2, Clock, X,
  Download, Eye, DollarSign, Printer, Copy, Check,
  MessageCircle, Mail, Image, Percent, ChevronDown, Pencil,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

function generateInvoiceNumber() {
  const d = new Date()
  const prefix = 'INV'
  const ts = d.getFullYear().toString().slice(2) + String(d.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}-${ts}-${rand}`
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function dueIn30() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

const API_BASE = 'https://chatbot.veltrixtv.com'

export default function InvoicesPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [bookings, setBookings] = useState([])
  const [services, setServices] = useState([])
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [viewInvoice, setViewInvoice] = useState(null)
  const [showSendMenu, setShowSendMenu] = useState(null)
  const [copied, setCopied] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [businessLogo, setBusinessLogo] = useState('')
  const printRef = useRef(null)

  // Create/Edit form
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [selCustomer, setSelCustomer] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selBooking, setSelBooking] = useState('')
  const [lineItems, setLineItems] = useState([{ description: '', qty: 1, price: 0 }])
  const [notes, setNotes] = useState('Thank you for your business!')
  const [dueDate, setDueDate] = useState(dueIn30())
  const [taxRate, setTaxRate] = useState(10)
  const [taxEnabled, setTaxEnabled] = useState(true)
  const [discount, setDiscount] = useState(0)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        const [b, s, c] = await Promise.all([
          dataStore.getBookings(biz.id),
          dataStore.getServices(biz.id),
          dataStore.getCustomers(biz.id),
        ])
        setBookings(b)
        setServices(s)
        setCustomers(c)
        const stored = localStorage.getItem(`invoices_${biz.id}`)
        if (stored) setInvoices(JSON.parse(stored))
        const logo = localStorage.getItem(`biz_logo_${biz.id}`)
        if (logo) setBusinessLogo(logo)
        try {
          const waResp = await fetch(`${API_BASE}/api/whatsapp/${biz.id}`)
          if (waResp.ok) {
            const waData = await waResp.json()
            if (waData.whatsapp_number) setWhatsappNumber(waData.whatsapp_number)
          }
        } catch {}
      }
    }
    load()
  }, [user])

  const saveInvoices = (updated) => {
    setInvoices(updated)
    if (business) {
      localStorage.setItem(`invoices_${business.id}`, JSON.stringify(updated))
      syncedSet(business.id, 'invoices', updated)
    }
  }

  const curr = business?.currency || 'USD'
  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹' }[curr] || '$'

  const completedBookings = bookings.filter(b => b.status === 'completed')

  const handleBookingSelect = (bookingId) => {
    setSelBooking(bookingId)
    if (bookingId) {
      const b = bookings.find(bk => bk.id === bookingId)
      if (b) {
        const svc = services.find(s => s.id === b.service_id)
        const svcName = b.service_name || svc?.name || 'Service'
        const price = svc?.price || 0
        setLineItems([{ description: svcName + ' — ' + (b.date || ''), qty: 1, price }])
        setSelCustomer(b.customer_name || '')
        setCustomerPhone(b.customer_phone || '')
        const cust = customers.find(c => c.name === b.customer_name)
        if (cust) {
          setCustomerEmail(cust.email || '')
          setCustomerPhone(cust.phone || b.customer_phone || '')
        }
      }
    }
  }

  const addLineItem = () => setLineItems([...lineItems, { description: '', qty: 1, price: 0 }])

  const updateLineItem = (idx, field, value) => {
    const updated = [...lineItems]
    updated[idx] = { ...updated[idx], [field]: field === 'qty' || field === 'price' ? parseFloat(value) || 0 : value }
    setLineItems(updated)
  }

  const removeLineItem = (idx) => {
    if (lineItems.length <= 1) return
    setLineItems(lineItems.filter((_, i) => i !== idx))
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.qty * item.price, 0)
  const taxAmount = taxEnabled ? subtotal * (taxRate / 100) : 0
  const discountAmount = discount > 0 ? subtotal * (discount / 100) : 0
  const total = subtotal + taxAmount - discountAmount

  const calcInvTotal = (inv) => {
    const sub = inv.items.reduce((s, i) => s + i.qty * i.price, 0)
    const tax = inv.tax_enabled ? sub * ((inv.tax_rate || 0) / 100) : 0
    const disc = inv.discount ? sub * (inv.discount / 100) : 0
    return sub + tax - disc
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setBusinessLogo(dataUrl)
      if (business) {
        localStorage.setItem(`biz_logo_${business.id}`, dataUrl)
        syncedSet(business.id, 'biz_logo', dataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleEdit = (inv) => {
    setEditingInvoice(inv)
    setSelCustomer(inv.customer_name || '')
    setCustomerEmail(inv.customer_email || '')
    setCustomerPhone(inv.customer_phone || '')
    setSelBooking(inv.booking_id || '')
    setLineItems(inv.items?.length > 0 ? inv.items.map(i => ({ ...i })) : [{ description: '', qty: 1, price: 0 }])
    setNotes(inv.notes || '')
    setDueDate(inv.due_date || dueIn30())
    setTaxRate(inv.tax_rate ?? 10)
    setTaxEnabled(inv.tax_enabled ?? true)
    setDiscount(inv.discount || 0)
    setShowCreate(true)
    setViewInvoice(null)
  }

  const handleCreate = () => {
    if (!selCustomer || lineItems.length === 0) return

    if (editingInvoice) {
      const updated = {
        ...editingInvoice,
        customer_name: selCustomer,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        booking_id: selBooking || null,
        items: lineItems,
        subtotal,
        tax_enabled: taxEnabled,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount,
        discount_amount: discountAmount,
        total,
        notes,
        due_date: dueDate || null,
        business_name: business?.name || '',
        business_email: business?.email || '',
        business_phone: business?.phone || '',
        business_address: business?.address || '',
        logo: businessLogo || '',
      }
      saveInvoices(invoices.map(inv => inv.id === editingInvoice.id ? updated : inv))
      setShowCreate(false)
      setViewInvoice(updated)
      setEditingInvoice(null)
      resetForm()
      return
    }

    const inv = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      number: generateInvoiceNumber(),
      customer_name: selCustomer,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      booking_id: selBooking || null,
      items: lineItems,
      subtotal,
      tax_enabled: taxEnabled,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount,
      discount_amount: discountAmount,
      total,
      notes,
      due_date: dueDate || null,
      status: 'draft',
      created_at: todayStr(),
      business_name: business?.name || '',
      business_email: business?.email || '',
      business_phone: business?.phone || '',
      business_address: business?.address || '',
      logo: businessLogo || '',
    }
    saveInvoices([inv, ...invoices])
    setShowCreate(false)
    setViewInvoice(inv)
    resetForm()
  }

  const resetForm = () => {
    setSelCustomer('')
    setCustomerEmail('')
    setCustomerPhone('')
    setSelBooking('')
    setLineItems([{ description: '', qty: 1, price: 0 }])
    setNotes('Thank you for your business!')
    setDueDate(dueIn30())
    setTaxRate(10)
    setTaxEnabled(true)
    setDiscount(0)
  }

  const markStatus = (id, status) => {
    saveInvoices(invoices.map(inv => inv.id === id ? { ...inv, status } : inv))
    if (viewInvoice?.id === id) setViewInvoice({ ...viewInvoice, status })
  }

  const deleteInvoice = (id) => {
    saveInvoices(invoices.filter(inv => inv.id !== id))
    if (viewInvoice?.id === id) setViewInvoice(null)
  }

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${viewInvoice.number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
        img { max-height: 72px; max-width: 72px; object-fit: contain; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; }
        @media print { body { padding: 20px; } }
      </style></head><body>`)
    win.document.write(content.innerHTML)
    win.document.write('</body></html>')
    win.document.close()
    setTimeout(() => { win.print() }, 300)
  }

  const buildInvoiceText = (inv) => {
    const invTotal = calcInvTotal(inv)
    let text = `INVOICE ${inv.number}\n`
    text += `From: ${inv.business_name || business?.name || 'Business'}\n`
    text += `To: ${inv.customer_name}\n`
    text += `Date: ${formatDate(inv.created_at)}\n`
    if (inv.due_date) text += `Due: ${formatDate(inv.due_date)}\n`
    text += `\nItems:\n`
    inv.items.forEach(item => {
      text += `  ${item.description} x${item.qty} = ${sym}${(item.qty * item.price).toFixed(2)}\n`
    })
    const sub = inv.items.reduce((s, i) => s + i.qty * i.price, 0)
    text += `\nSubtotal: ${sym}${sub.toFixed(2)}\n`
    if (inv.tax_enabled) text += `Tax (${inv.tax_rate}%): ${sym}${inv.tax_amount?.toFixed(2) || (sub * inv.tax_rate / 100).toFixed(2)}\n`
    if (inv.discount) text += `Discount (${inv.discount}%): -${sym}${inv.discount_amount?.toFixed(2) || (sub * inv.discount / 100).toFixed(2)}\n`
    text += `TOTAL: ${sym}${invTotal.toFixed(2)}\n`
    if (inv.notes) text += `\nNote: ${inv.notes}\n`
    return text
  }

  const drawInvoiceCanvas = async (inv) => {
    const invTotal = calcInvTotal(inv)
    const sub = inv.items.reduce((s, i) => s + i.qty * i.price, 0)
    const taxAmt = inv.tax_enabled ? sub * (inv.tax_rate / 100) : 0
    const discAmt = inv.discount ? sub * (inv.discount / 100) : 0
    const canvas = document.createElement('canvas')
    const sc = 2
    const W = 800, H = 1100
    canvas.width = W * sc
    canvas.height = H * sc
    const c = canvas.getContext('2d')
    c.scale(sc, sc)
    if (!c.roundRect) {
      c.roundRect = function(x, y, w, h, r) {
        const rad = typeof r === 'number' ? r : 0
        this.moveTo(x + rad, y)
        this.lineTo(x + w - rad, y)
        this.arcTo(x + w, y, x + w, y + rad, rad)
        this.lineTo(x + w, y + h - rad)
        this.arcTo(x + w, y + h, x + w - rad, y + h, rad)
        this.lineTo(x + rad, y + h)
        this.arcTo(x, y + h, x, y + h - rad, rad)
        this.lineTo(x, y + rad)
        this.arcTo(x, y, x + rad, y, rad)
        this.closePath()
      }
    }
    c.fillStyle = '#fff'
    c.fillRect(0, 0, W, H)
    let y = 50
    const L = 50, R = W - 50

    const drawLine = (x1, y1, x2, y2, color = '#e5e5e5', width = 1) => {
      c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke()
    }

    // Logo
    let logoBottom = y
    const logoSrc = inv.logo || businessLogo
    if (logoSrc) {
      try {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = logoSrc })
        const maxH = 80, maxW = 80
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
        const drawH = img.height * ratio
        c.drawImage(img, L, y, img.width * ratio, drawH)
        logoBottom = y + drawH
      } catch {}
    }

    // INVOICE title + number (right-aligned, vertically centered with logo)
    c.font = 'bold 32px sans-serif'; c.fillStyle = '#1a1a1a'; c.fillText('INVOICE', R - c.measureText('INVOICE').width, y + 28)
    c.font = '15px sans-serif'; c.fillStyle = '#666'; c.fillText(inv.number, R - c.measureText(inv.number).width, y + 48)

    // Status badge
    const stColors = { draft: ['#fef3c7', '#92400e'], sent: ['#dbeafe', '#1e40af'], paid: ['#d1fae5', '#065f46'], overdue: ['#fee2e2', '#991b1b'] }
    const [stBg, stFg] = stColors[inv.status] || stColors.draft
    c.font = 'bold 12px sans-serif'
    const stW = c.measureText(inv.status.toUpperCase()).width + 20
    c.fillStyle = stBg
    c.beginPath(); c.roundRect(R - stW, y + 56, stW, 24, 12); c.fill()
    c.fillStyle = stFg; c.fillText(inv.status.toUpperCase(), R - stW + 10, y + 72)

    y = Math.max(logoBottom, y + 85) + 20
    drawLine(L, y, R, y, '#e5e5e5', 2); y += 30

    // From / Bill To
    c.font = 'bold 11px sans-serif'; c.fillStyle = '#999'; c.fillText('FROM', L, y)
    c.fillText('BILL TO', W / 2 + 10, y); y += 18
    c.font = 'bold 16px sans-serif'; c.fillStyle = '#1a1a1a'
    c.fillText(inv.business_name || business?.name || '--', L, y)
    c.fillText(inv.customer_name, W / 2 + 10, y); y += 20
    c.font = '14px sans-serif'; c.fillStyle = '#555'
    const fromLines = [inv.business_email || business?.email, inv.business_phone || business?.phone, inv.business_address || business?.address].filter(Boolean)
    const toLines = [inv.customer_email, inv.customer_phone].filter(Boolean)
    const maxLines = Math.max(fromLines.length, toLines.length)
    for (let i = 0; i < maxLines; i++) {
      if (fromLines[i]) c.fillText(fromLines[i], L, y)
      if (toLines[i]) c.fillText(toLines[i], W / 2 + 10, y)
      y += 18
    }
    y += 10

    // Dates
    c.font = 'bold 11px sans-serif'; c.fillStyle = '#999'
    c.fillText('DATE', W / 2 + 10, y); if (inv.due_date) c.fillText('DUE DATE', W / 2 + 200, y)
    y += 16; c.font = '14px sans-serif'; c.fillStyle = '#333'
    c.fillText(formatDate(inv.created_at), W / 2 + 10, y); if (inv.due_date) c.fillText(formatDate(inv.due_date), W / 2 + 200, y)
    y += 35

    // Table header
    drawLine(L, y, R, y, '#ccc', 2); y += 5
    c.font = 'bold 12px sans-serif'; c.fillStyle = '#888'
    c.fillText('DESCRIPTION', L, y + 16); c.textAlign = 'center'; c.fillText('QTY', 530, y + 16)
    c.textAlign = 'right'; c.fillText('PRICE', 640, y + 16); c.fillText('TOTAL', R, y + 16)
    c.textAlign = 'left'; y += 28; drawLine(L, y, R, y, '#e5e5e5', 1); y += 5

    // Table rows
    c.font = '15px sans-serif'; c.fillStyle = '#1a1a1a'
    inv.items.forEach(item => {
      y += 20
      c.textAlign = 'left'; c.fillText(item.description, L, y)
      c.textAlign = 'center'; c.fillText(String(item.qty), 530, y)
      c.textAlign = 'right'; c.fillText(sym + item.price.toFixed(2), 640, y)
      c.font = 'bold 15px sans-serif'; c.fillText(sym + (item.qty * item.price).toFixed(2), R, y)
      c.font = '15px sans-serif'; y += 10
      drawLine(L, y, R, y, '#f0f0f0', 1)
    })
    y += 30

    // Totals (right-aligned block)
    const tL = 520
    c.textAlign = 'left'; c.font = '15px sans-serif'; c.fillStyle = '#333'
    c.fillText('Subtotal', tL, y); c.textAlign = 'right'; c.fillText(sym + sub.toFixed(2), R, y); y += 24
    if (inv.tax_enabled) {
      c.textAlign = 'left'; c.fillText('Tax (' + inv.tax_rate + '%)', tL, y); c.textAlign = 'right'; c.fillText(sym + taxAmt.toFixed(2), R, y); y += 24
    }
    if (inv.discount > 0) {
      c.textAlign = 'left'; c.fillText('Discount (' + inv.discount + '%)', tL, y); c.textAlign = 'right'; c.fillText('-' + sym + discAmt.toFixed(2), R, y); y += 24
    }
    drawLine(tL, y, R, y, '#1a1a1a', 2); y += 22
    c.font = 'bold 20px sans-serif'; c.fillStyle = '#1a1a1a'
    c.textAlign = 'left'; c.fillText('Total', tL, y); c.textAlign = 'right'; c.fillText(sym + invTotal.toFixed(2), R, y)
    y += 40

    // Notes
    if (inv.notes) {
      c.fillStyle = '#f5f5f5'; c.beginPath(); c.roundRect(L, y, R - L, 40, 8); c.fill()
      c.font = '14px sans-serif'; c.fillStyle = '#666'; c.textAlign = 'left'
      c.fillText(inv.notes, L + 14, y + 24)
      y += 60
    }

    // Footer
    y = Math.max(y + 20, H - 40)
    drawLine(L, y - 20, R, y - 20, '#eee', 1)
    c.font = '11px sans-serif'; c.fillStyle = '#bbb'; c.textAlign = 'center'
    c.fillText('Powered by Solis OS', W / 2, y)
    c.textAlign = 'left'
    return canvas
  }

  const sendViaWhatsApp = async (inv) => {
    const phone = inv.customer_phone?.replace(/[^0-9]/g, '')
    if (!phone) { alert('No customer phone number on this invoice.'); return }
    const canvas = await drawInvoiceCanvas(inv)
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
    const file = new File([blob], `Invoice-${inv.number}.png`, { type: 'image/png' })

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          text: `Invoice ${inv.number} - ${sym}${calcInvTotal(inv).toFixed(2)}`,
          files: [file],
        })
        markStatus(inv.id, 'sent')
        setShowSendMenu(null)
        return
      } catch {}
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Invoice-${inv.number}.png`; a.click()
    URL.revokeObjectURL(url)
    setTimeout(() => {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent('Hi, please see the attached invoice ' + inv.number + ' for ' + sym + calcInvTotal(inv).toFixed(2))}`, '_blank')
    }, 500)
    markStatus(inv.id, 'sent')
    setShowSendMenu(null)
  }

  const sendViaEmail = (inv) => {
    const email = inv.customer_email
    if (!email) { alert('No customer email on this invoice.'); return }
    const subject = `Invoice ${inv.number} from ${inv.business_name || business?.name || 'Business'}`
    const body = buildInvoiceText(inv)
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
    markStatus(inv.id, 'sent')
    setShowSendMenu(null)
  }

  const copyInvoice = (inv) => {
    const text = buildInvoiceText(inv)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setShowSendMenu(null)
  }

  const downloadInvoiceImage = async (inv) => {
    const canvas = await drawInvoiceCanvas(inv)
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Invoice-${inv.number}.png`; a.click()
    URL.revokeObjectURL(url)
  }

  const statusBadge = (status) => {
    const cls = { draft: 'badge-amber', sent: 'badge-blue', paid: 'badge-green', overdue: 'badge-rose' }[status] || 'badge-amber'
    return <span className={`badge ${cls}`} style={{ textTransform: 'capitalize' }}>{status}</span>
  }

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + calcInvTotal(i), 0)
  const totalOutstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + calcInvTotal(i), 0)
  const totalDraft = invoices.filter(i => i.status === 'draft').reduce((s, i) => s + calcInvTotal(i), 0)

  const labelStyle = { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', fontWeight: 600, marginBottom: '6px' }
  const valStyle = { fontSize: '16px', lineHeight: 1.7 }

  const InvoiceTemplate = ({ inv }) => {
    const invTotal = calcInvTotal(inv)
    const sub = inv.items.reduce((s, i) => s + i.qty * i.price, 0)
    return (
      <div ref={printRef}>
        {/* Header: logo + invoice title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: '2px solid #eee', paddingBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {(inv.logo || businessLogo) && (
              <img src={inv.logo || businessLogo} alt="Logo" style={{ maxHeight: '72px', maxWidth: '72px', objectFit: 'contain', borderRadius: '6px' }} />
            )}
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '2px' }}>INVOICE</div>
              <div style={{ fontSize: '15px', color: '#555', marginTop: '2px' }}>{inv.number}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
              background: inv.status === 'paid' ? '#d1fae5' : inv.status === 'sent' ? '#dbeafe' : inv.status === 'overdue' ? '#fee2e2' : '#fef3c7',
              color: inv.status === 'paid' ? '#065f46' : inv.status === 'sent' ? '#1e40af' : inv.status === 'overdue' ? '#991b1b' : '#92400e',
            }}>{inv.status}</span>
          </div>
        </div>

        {/* From / Bill To */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
          <div>
            <div style={labelStyle}>From</div>
            <div style={valStyle}>
              <div style={{ fontWeight: 600 }}>{inv.business_name || business?.name || '--'}</div>
              {(inv.business_email || business?.email) && <div>{inv.business_email || business?.email}</div>}
              {(inv.business_phone || business?.phone) && <div>{inv.business_phone || business?.phone}</div>}
              {(inv.business_address || business?.address) && <div>{inv.business_address || business?.address}</div>}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Bill To</div>
            <div style={valStyle}>
              <div style={{ fontWeight: 600 }}>{inv.customer_name}</div>
              {inv.customer_email && <div>{inv.customer_email}</div>}
              {inv.customer_phone && <div>{inv.customer_phone}</div>}
            </div>
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={labelStyle}>Date</div>
                <div style={{ fontSize: '15px' }}>{formatDate(inv.created_at)}</div>
              </div>
              {inv.due_date && (
                <div>
                  <div style={labelStyle}>Due Date</div>
                  <div style={{ fontSize: '15px' }}>{formatDate(inv.due_date)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
              <th style={{ textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', fontWeight: 600, padding: '12px 10px 12px 0' }}>Description</th>
              <th style={{ textAlign: 'center', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', fontWeight: 600, padding: '12px 10px', width: '70px' }}>Qty</th>
              <th style={{ textAlign: 'right', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', fontWeight: 600, padding: '12px 10px', width: '100px' }}>Price</th>
              <th style={{ textAlign: 'right', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', fontWeight: 600, padding: '12px 0 12px 10px', width: '110px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '14px 10px 14px 0', fontSize: '16px' }}>{item.description}</td>
                <td style={{ padding: '14px 10px', fontSize: '16px', textAlign: 'center' }}>{item.qty}</td>
                <td style={{ padding: '14px 10px', fontSize: '16px', textAlign: 'right' }}>{sym}{item.price.toFixed(2)}</td>
                <td style={{ padding: '14px 0 14px 10px', fontSize: '16px', textAlign: 'right', fontWeight: 600 }}>{sym}{(item.qty * item.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: '260px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '16px' }}>
              <span>Subtotal</span><span>{sym}{sub.toFixed(2)}</span>
            </div>
            {inv.tax_enabled && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '16px' }}>
                <span>Tax ({inv.tax_rate}%)</span><span>{sym}{(sub * inv.tax_rate / 100).toFixed(2)}</span>
              </div>
            )}
            {inv.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '16px' }}>
                <span>Discount ({inv.discount}%)</span><span>-{sym}{(sub * inv.discount / 100).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 8px', fontSize: '22px', fontWeight: 700, borderTop: '2px solid #1a1a1a', marginTop: '10px' }}>
              <span>Total</span><span>{sym}{invTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {inv.notes && (
          <div style={{ marginTop: '32px', padding: '16px 18px', background: '#f9f9f9', borderRadius: '8px', fontSize: '15px', color: '#555', lineHeight: 1.6 }}>
            {inv.notes}
          </div>
        )}
        <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '11px', color: '#bbb', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          Powered by Solis OS
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Create, send, and track invoices for your services</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Image size={14} /> {businessLogo ? 'Change Logo' : 'Upload Logo'}
            <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingInvoice(null); setShowCreate(true); resetForm() }}>
            <Plus size={16} style={{ marginRight: '6px' }} /> New Invoice
          </button>
        </div>
      </div>

      {/* Logo preview */}
      {businessLogo && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={businessLogo} alt="Business Logo" style={{ height: '40px', maxWidth: '120px', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--border)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>This logo will appear on all invoices</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setBusinessLogo(''); if (business) localStorage.removeItem(`biz_logo_${business.id}`) }} style={{ fontSize: '11px', color: 'var(--rose)' }}>Remove</button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.1)' }}><DollarSign size={22} style={{ color: 'var(--green)' }} /></div>
          <div className="stat-card-label">Paid</div>
          <div className="stat-card-value">{sym}{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}><Send size={22} style={{ color: 'var(--accent-bright)' }} /></div>
          <div className="stat-card-label">Outstanding</div>
          <div className="stat-card-value">{sym}{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}><Clock size={22} style={{ color: 'var(--amber)' }} /></div>
          <div className="stat-card-label">Drafts</div>
          <div className="stat-card-value">{sym}{totalDraft.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(167,139,250,0.1)' }}><FileText size={22} style={{ color: 'var(--purple)' }} /></div>
          <div className="stat-card-label">Total Invoices</div>
          <div className="stat-card-value">{invoices.length}</div>
        </div>
      </div>

      {/* Create Invoice */}
      {showCreate && (
        <div className="card" style={{ marginBottom: '20px', border: '1px solid var(--accent)', boxShadow: '0 0 20px rgba(59,130,246,0.1)' }}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{editingInvoice ? `Edit Invoice ${editingInvoice.number}` : 'New Invoice'}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowCreate(false); setEditingInvoice(null); resetForm() }}><X size={18} /></button>
          </div>

          {/* From booking or manual */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">From Booking (optional)</label>
              <select className="form-select" value={selBooking} onChange={e => handleBookingSelect(e.target.value)}>
                <option value="">Create manually</option>
                {completedBookings.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.customer_name} — {b.service_name || 'Service'} — {b.date}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input type="text" className="form-input" value={selCustomer} onChange={e => setSelCustomer(e.target.value)} placeholder="Customer name" />
            </div>
          </div>

          {/* Customer contact */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Customer Email</label>
              <input type="email" className="form-input" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="customer@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Customer Phone (for WhatsApp)</label>
              <input type="tel" className="form-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+1 555 123 4567" />
            </div>
          </div>

          {/* Line items */}
          <div style={{ marginBottom: '16px' }}>
            <div className="form-label" style={{ marginBottom: '8px' }}>Line Items</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 36px', gap: '8px', marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price</div>
              <div />
            </div>
            {lineItems.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 36px', gap: '8px', marginBottom: '8px' }}>
                <input type="text" className="form-input" placeholder="Service description" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} />
                <input type="number" className="form-input" min="1" value={item.qty} onChange={e => updateLineItem(idx, 'qty', e.target.value)} />
                <input type="number" className="form-input" min="0" step="0.01" value={item.price} onChange={e => updateLineItem(idx, 'price', e.target.value)} />
                <button className="btn btn-ghost btn-sm" onClick={() => removeLineItem(idx)} style={{ padding: '8px', color: 'var(--rose)' }}><X size={14} /></button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={addLineItem} style={{ marginTop: '4px' }}>
              <Plus size={14} style={{ marginRight: '4px' }} /> Add Item
            </button>
          </div>

          {/* Tax, Discount, Dates, Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={taxEnabled} onChange={e => setTaxEnabled(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
                Tax
              </label>
              {taxEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input type="number" className="form-input" min="0" max="100" step="0.5" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} style={{ width: '70px' }} />
                  <Percent size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Discount %</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="number" className="form-input" min="0" max="100" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} style={{ width: '70px' }} />
                <Percent size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Thank you note..." />
            </div>
          </div>

          {/* Totals bar */}
          <div style={{ padding: '16px', background: 'var(--bg-raised)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Subtotal: {sym}{subtotal.toFixed(2)}</span>
              {taxEnabled && <span>Tax ({taxRate}%): {sym}{taxAmount.toFixed(2)}</span>}
              {discount > 0 && <span>Discount ({discount}%): -{sym}{discountAmount.toFixed(2)}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '22px', fontFamily: 'var(--font-display)', color: 'var(--text)' }}>{sym}{total.toFixed(2)}</div>
              <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={!selCustomer || lineItems.every(i => !i.description)}>
                {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice */}
      {viewInvoice && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{viewInvoice.number}</span>
              {statusBadge(viewInvoice.status)}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {/* Send dropdown */}
              <div style={{ position: 'relative' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setShowSendMenu(showSendMenu === viewInvoice.id ? null : viewInvoice.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Send size={14} /> Send <ChevronDown size={12} />
                </button>
                {showSendMenu === viewInvoice.id && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px', minWidth: '180px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)', zIndex: 10,
                  }}>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', padding: '10px 12px' }} onClick={() => sendViaWhatsApp(viewInvoice)}>
                      <MessageCircle size={16} style={{ color: '#25D366' }} /> Send via WhatsApp
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', padding: '10px 12px' }} onClick={() => sendViaEmail(viewInvoice)}>
                      <Mail size={16} style={{ color: 'var(--accent-bright)' }} /> Send via Email
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', padding: '10px 12px' }} onClick={() => copyInvoice(viewInvoice)}>
                      {copied ? <Check size={16} style={{ color: 'var(--green)' }} /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                    <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', padding: '10px 12px' }} onClick={() => downloadInvoiceImage(viewInvoice)}>
                      <Image size={16} style={{ color: 'var(--purple)' }} /> Download as Image
                    </button>
                  </div>
                )}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Printer size={14} /> Print
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(viewInvoice)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Pencil size={14} /> Edit
              </button>
              {viewInvoice.status !== 'paid' && (
                <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => markStatus(viewInvoice.id, 'paid')}>
                  <CheckCircle2 size={14} /> Mark Paid
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setViewInvoice(null)}><X size={18} /></button>
            </div>
          </div>

          {/* Professional invoice template */}
          <div style={{ background: '#fff', color: '#1a1a1a', borderRadius: 'var(--radius)', padding: '40px', border: '1px solid #e5e5e5' }}>
            <InvoiceTemplate inv={viewInvoice} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button className="btn btn-danger btn-sm" onClick={() => deleteInvoice(viewInvoice.id)}>Delete Invoice</button>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <div className="card">
        <div className="card-title">All Invoices</div>
        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.3 }} />
            <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>No invoices yet</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Create your first invoice from a completed booking or from scratch.</div>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowCreate(true); resetForm() }}>
              <Plus size={14} style={{ marginRight: '4px' }} /> Create Invoice
            </button>
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Invoice</th>
                <th style={{ textAlign: 'left' }}>Customer</th>
                <th style={{ textAlign: 'left' }}>Date</th>
                <th style={{ textAlign: 'left' }}>Due</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 500 }}>{inv.number}</td>
                  <td>{inv.customer_name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{formatDate(inv.created_at)}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{inv.due_date ? formatDate(inv.due_date) : '--'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{sym}{calcInvTotal(inv).toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>{statusBadge(inv.status)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setViewInvoice(inv); setShowSendMenu(null) }} title="View"><Eye size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(inv)} title="Edit"><Pencil size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setViewInvoice(inv); setShowSendMenu(inv.id) }} title="Send"><Send size={14} /></button>
                      {inv.status !== 'paid' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => markStatus(inv.id, 'paid')} title="Mark Paid" style={{ color: 'var(--green)' }}><CheckCircle2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

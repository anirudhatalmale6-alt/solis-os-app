import { useEffect, useState, useRef } from 'react'
import {
  FileText, Plus, Send, CheckCircle2, Clock, X,
  Download, Eye, EyeOff, DollarSign, Printer, Copy, Check,
  MessageCircle, Mail, Image, Percent, ChevronDown, Pencil, Palette, Settings,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

const INVOICE_TEMPLATES = [
  { id: 'classic', name: 'Classic', desc: 'Clean and professional' },
  { id: 'modern', name: 'Modern', desc: 'Contemporary with blue accents' },
  { id: 'elegant', name: 'Elegant', desc: 'Minimal and sophisticated' },
  { id: 'executive', name: 'Executive', desc: 'Dark header, corporate style' },
  { id: 'fresh', name: 'Fresh', desc: 'Green accents, light and airy' },
  { id: 'sunset', name: 'Sunset', desc: 'Warm coral tones, friendly' },
]

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

const API_BASE = 'https://api.solis-os.com'

function buildInvoiceHTML(inv, sym, templateId = 'classic', bizName, bizEmail, bizPhone, bizAddress) {
  const sub = inv.items.reduce((s, i) => s + i.qty * i.price, 0)
  const taxAmt = inv.tax_enabled ? sub * (inv.tax_rate / 100) : 0
  const discAmt = inv.discount ? sub * (inv.discount / 100) : 0
  const total = sub + taxAmt - discAmt
  const fromName = inv.business_name || bizName || ''
  const fromEmail = inv.business_email || bizEmail || ''
  const fromPhone = inv.business_phone || bizPhone || ''
  const fromAddr = inv.business_address || bizAddress || ''
  const logoImg = inv.logo ? `<img src="${inv.logo}" alt="Logo" style="max-height:60px;max-width:120px;display:block" />` : ''

  const itemsHTML = inv.items.map((item, i) => {
    const rowBg = templateId === 'modern' && i % 2 === 0 ? '#f8fafc' : '#ffffff'
    return `<tr style="background:${rowBg}">
      <td style="padding:12px 16px;font-size:14px;border-bottom:1px solid #eee">${item.description}</td>
      <td style="padding:12px 16px;font-size:14px;border-bottom:1px solid #eee;text-align:center">${item.qty}</td>
      <td style="padding:12px 16px;font-size:14px;border-bottom:1px solid #eee;text-align:right">${sym}${item.price.toFixed(2)}</td>
      <td style="padding:12px 16px;font-size:14px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${sym}${(item.qty * item.price).toFixed(2)}</td>
    </tr>`
  }).join('')

  const statusColors = { draft: ['#fef3c7', '#92400e'], sent: ['#dbeafe', '#1e40af'], paid: ['#d1fae5', '#065f46'], overdue: ['#fee2e2', '#991b1b'] }
  const [stBg, stFg] = statusColors[inv.status] || statusColors.draft

  const totalsHTML = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
      <tr><td style="padding:6px 16px;font-size:14px;text-align:right;color:#666">Subtotal</td><td style="padding:6px 16px;font-size:14px;text-align:right;width:120px">${sym}${sub.toFixed(2)}</td></tr>
      ${inv.tax_enabled ? `<tr><td style="padding:6px 16px;font-size:14px;text-align:right;color:#666">Tax (${inv.tax_rate}%)</td><td style="padding:6px 16px;font-size:14px;text-align:right">${sym}${taxAmt.toFixed(2)}</td></tr>` : ''}
      ${inv.discount > 0 ? `<tr><td style="padding:6px 16px;font-size:14px;text-align:right;color:#666">Discount (${inv.discount}%)</td><td style="padding:6px 16px;font-size:14px;text-align:right">-${sym}${discAmt.toFixed(2)}</td></tr>` : ''}
      <tr><td colspan="2" style="padding:8px 16px"><hr style="border:none;border-top:2px solid ${templateId === 'modern' ? '#2563eb' : templateId === 'elegant' ? '#c8a45a' : '#1a1a1a'};margin:0" /></td></tr>
      <tr><td style="padding:8px 16px;font-size:20px;font-weight:700;text-align:right;color:${templateId === 'modern' ? '#2563eb' : '#1a1a1a'}">Total</td><td style="padding:8px 16px;font-size:20px;font-weight:700;text-align:right;color:${templateId === 'modern' ? '#2563eb' : '#1a1a1a'}">${sym}${total.toFixed(2)}</td></tr>
    </table>`

  const notesHTML = inv.notes ? `<div style="margin-top:28px;padding:16px 20px;background:#f9fafb;border-radius:8px;font-size:14px;color:#555;line-height:1.6">${inv.notes}</div>` : ''

  const font = templateId === 'elegant' ? 'Georgia,Times New Roman,serif' : 'Arial,Helvetica,sans-serif'

  if (templateId === 'modern') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f0f4ff;font-family:${font}">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:32px 0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
            <tr><td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:36px 40px;text-align:center">
              ${logoImg ? `<div style="margin-bottom:16px">${logoImg.replace('display:block', 'display:inline-block')}</div>` : ''}
              <div style="font-size:32px;font-weight:700;color:#fff;letter-spacing:3px">INVOICE</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.75);margin-top:6px">${inv.number}</div>
              <div style="margin-top:12px"><span style="display:inline-block;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;background:rgba(255,255,255,0.2);color:#fff">${inv.status}</span></div>
            </td></tr>
            <tr><td style="padding:36px 40px">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
                <tr>
                  <td width="50%" style="vertical-align:top">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;margin-bottom:8px">From</div>
                    <div style="font-size:15px;font-weight:600;color:#1e293b">${fromName}</div>
                    ${fromEmail ? `<div style="font-size:13px;color:#64748b;margin-top:3px">${fromEmail}</div>` : ''}
                    ${fromPhone ? `<div style="font-size:13px;color:#64748b;margin-top:2px">${fromPhone}</div>` : ''}
                    ${fromAddr ? `<div style="font-size:13px;color:#64748b;margin-top:2px">${fromAddr}</div>` : ''}
                  </td>
                  <td width="50%" style="vertical-align:top">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;margin-bottom:8px">Bill To</div>
                    <div style="font-size:15px;font-weight:600;color:#1e293b">${inv.customer_name}</div>
                    ${inv.customer_email ? `<div style="font-size:13px;color:#64748b;margin-top:3px">${inv.customer_email}</div>` : ''}
                    ${inv.customer_phone ? `<div style="font-size:13px;color:#64748b;margin-top:2px">${inv.customer_phone}</div>` : ''}
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
                <tr>
                  <td><span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600">Date</span><br/><span style="font-size:14px;color:#334155">${formatDate(inv.created_at)}</span></td>
                  ${inv.due_date ? `<td><span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600">Due Date</span><br/><span style="font-size:14px;color:#334155">${formatDate(inv.due_date)}</span></td>` : ''}
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
                <tr style="background:#1e40af">
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#fff;text-align:left;font-weight:600">Description</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#fff;text-align:center;font-weight:600;width:60px">Qty</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#fff;text-align:right;font-weight:600;width:90px">Price</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#fff;text-align:right;font-weight:600;width:100px">Total</th>
                </tr>
                ${itemsHTML}
              </table>
              ${totalsHTML}
              ${notesHTML}
            </td></tr>
            <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0">
              <span style="font-size:12px;color:#94a3b8">Powered by Solis OS</span>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`
  }

  if (templateId === 'elegant') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#faf9f7;font-family:${font}">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:32px 0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-top:4px solid #c8a45a">
            <tr><td style="padding:40px 48px 0">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="vertical-align:top">${logoImg}</td>
                  <td width="50%" style="vertical-align:top;text-align:right">
                    <div style="font-size:36px;font-weight:400;color:#2c2c2c;letter-spacing:4px">INVOICE</div>
                    <div style="font-size:14px;color:#999;margin-top:6px;letter-spacing:1px">${inv.number}</div>
                    <div style="margin-top:10px"><span style="display:inline-block;padding:3px 14px;border:1px solid ${stFg};border-radius:3px;font-size:11px;font-weight:600;text-transform:uppercase;color:${stFg};font-family:Arial,sans-serif">${inv.status}</span></div>
                  </td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding:28px 48px"><hr style="border:none;border-top:1px solid #e8e4dc;margin:0" /></td></tr>
            <tr><td style="padding:0 48px">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
                <tr>
                  <td width="50%" style="vertical-align:top">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#c8a45a;font-weight:600;margin-bottom:10px;font-family:Arial,sans-serif">From</div>
                    <div style="font-size:16px;font-weight:700;color:#2c2c2c">${fromName}</div>
                    ${fromEmail ? `<div style="font-size:14px;color:#777;margin-top:4px">${fromEmail}</div>` : ''}
                    ${fromPhone ? `<div style="font-size:14px;color:#777;margin-top:3px">${fromPhone}</div>` : ''}
                    ${fromAddr ? `<div style="font-size:14px;color:#777;margin-top:3px">${fromAddr}</div>` : ''}
                  </td>
                  <td width="50%" style="vertical-align:top">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#c8a45a;font-weight:600;margin-bottom:10px;font-family:Arial,sans-serif">Bill To</div>
                    <div style="font-size:16px;font-weight:700;color:#2c2c2c">${inv.customer_name}</div>
                    ${inv.customer_email ? `<div style="font-size:14px;color:#777;margin-top:4px">${inv.customer_email}</div>` : ''}
                    ${inv.customer_phone ? `<div style="font-size:14px;color:#777;margin-top:3px">${inv.customer_phone}</div>` : ''}
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px">
                <tr>
                  <td><span style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#c8a45a;font-weight:600;font-family:Arial,sans-serif">Date</span><br/><span style="font-size:14px;color:#2c2c2c;margin-top:4px">${formatDate(inv.created_at)}</span></td>
                  ${inv.due_date ? `<td><span style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#c8a45a;font-weight:600;font-family:Arial,sans-serif">Due Date</span><br/><span style="font-size:14px;color:#2c2c2c">${formatDate(inv.due_date)}</span></td>` : ''}
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
                <tr>
                  <th style="padding:14px 16px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;text-align:left;font-weight:600;border-bottom:2px solid #e8e4dc;font-family:Arial,sans-serif">Description</th>
                  <th style="padding:14px 16px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;text-align:center;font-weight:600;border-bottom:2px solid #e8e4dc;width:60px;font-family:Arial,sans-serif">Qty</th>
                  <th style="padding:14px 16px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;text-align:right;font-weight:600;border-bottom:2px solid #e8e4dc;width:90px;font-family:Arial,sans-serif">Price</th>
                  <th style="padding:14px 16px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;text-align:right;font-weight:600;border-bottom:2px solid #e8e4dc;width:100px;font-family:Arial,sans-serif">Total</th>
                </tr>
                ${itemsHTML}
              </table>
              ${totalsHTML}
              ${notesHTML}
            </td></tr>
            <tr><td style="padding:32px 48px 24px;text-align:center;border-top:1px solid #e8e4dc;margin-top:40px">
              <span style="font-size:11px;color:#ccc;letter-spacing:1px;font-family:Arial,sans-serif">Powered by Solis OS</span>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`
  }

  if (templateId === 'executive') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#e5e7eb;font-family:Arial,Helvetica,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#e5e7eb;padding:32px 0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
            <tr><td style="background:#1e293b;padding:36px 40px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="vertical-align:top">
                    ${logoImg ? `<div style="margin-bottom:12px">${logoImg.replace('display:block', 'display:inline-block')}</div>` : ''}
                    <div style="font-size:14px;color:#94a3b8;margin-top:4px">${fromName}</div>
                  </td>
                  <td width="50%" style="vertical-align:top;text-align:right">
                    <div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:3px">INVOICE</div>
                    <div style="font-size:13px;color:#94a3b8;margin-top:6px">${inv.number}</div>
                    <div style="margin-top:10px"><span style="display:inline-block;padding:4px 14px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;background:rgba(255,255,255,0.1);color:#e2e8f0;border:1px solid rgba(255,255,255,0.2)">${inv.status}</span></div>
                  </td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding:36px 40px">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
                <tr>
                  <td width="50%" style="vertical-align:top">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;font-weight:600;margin-bottom:8px">From</div>
                    <div style="font-size:15px;font-weight:600;color:#1e293b">${fromName}</div>
                    ${fromEmail ? `<div style="font-size:13px;color:#64748b;margin-top:3px">${fromEmail}</div>` : ''}
                    ${fromPhone ? `<div style="font-size:13px;color:#64748b;margin-top:2px">${fromPhone}</div>` : ''}
                    ${fromAddr ? `<div style="font-size:13px;color:#64748b;margin-top:2px">${fromAddr}</div>` : ''}
                  </td>
                  <td width="50%" style="vertical-align:top">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;font-weight:600;margin-bottom:8px">Bill To</div>
                    <div style="font-size:15px;font-weight:600;color:#1e293b">${inv.customer_name}</div>
                    ${inv.customer_email ? `<div style="font-size:13px;color:#64748b;margin-top:3px">${inv.customer_email}</div>` : ''}
                    ${inv.customer_phone ? `<div style="font-size:13px;color:#64748b;margin-top:2px">${inv.customer_phone}</div>` : ''}
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
                <tr>
                  <td><span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600">Date</span><br/><span style="font-size:14px;color:#334155">${formatDate(inv.created_at)}</span></td>
                  ${inv.due_date ? `<td><span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600">Due Date</span><br/><span style="font-size:14px;color:#334155">${formatDate(inv.due_date)}</span></td>` : ''}
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
                <tr style="background:#1e293b">
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#e2e8f0;text-align:left;font-weight:600">Description</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#e2e8f0;text-align:center;font-weight:600;width:60px">Qty</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#e2e8f0;text-align:right;font-weight:600;width:90px">Price</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#e2e8f0;text-align:right;font-weight:600;width:100px">Total</th>
                </tr>
                ${itemsHTML}
              </table>
              ${totalsHTML.replace(/#2563eb/g, '#1e293b')}
              ${notesHTML}
            </td></tr>
            <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0">
              <span style="font-size:12px;color:#94a3b8">Powered by Solis OS</span>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`
  }

  if (templateId === 'fresh') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#ecfdf5;font-family:Arial,Helvetica,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;padding:32px 0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.05)">
            <tr><td style="padding:40px 40px 0">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="vertical-align:top">
                    ${logoImg || ''}
                    <div style="font-size:16px;font-weight:700;color:#065f46;margin-top:${logoImg ? '10' : '0'}px">${fromName}</div>
                    ${fromEmail ? `<div style="font-size:13px;color:#6b7280;margin-top:3px">${fromEmail}</div>` : ''}
                    ${fromPhone ? `<div style="font-size:13px;color:#6b7280;margin-top:2px">${fromPhone}</div>` : ''}
                    ${fromAddr ? `<div style="font-size:13px;color:#6b7280;margin-top:2px">${fromAddr}</div>` : ''}
                  </td>
                  <td width="50%" style="vertical-align:top;text-align:right">
                    <div style="font-size:32px;font-weight:700;color:#10b981;letter-spacing:2px">INVOICE</div>
                    <div style="font-size:14px;color:#6b7280;margin-top:4px">${inv.number}</div>
                    <div style="margin-top:10px"><span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;background:${stBg};color:${stFg}">${inv.status}</span></div>
                  </td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding:24px 40px"><hr style="border:none;border-top:2px solid #d1fae5;margin:0" /></td></tr>
            <tr><td style="padding:0 40px">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
                <tr>
                  <td width="50%" style="vertical-align:top">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#10b981;font-weight:600;margin-bottom:8px">Bill To</div>
                    <div style="font-size:16px;font-weight:600;color:#1a1a1a">${inv.customer_name}</div>
                    ${inv.customer_email ? `<div style="font-size:13px;color:#6b7280;margin-top:4px">${inv.customer_email}</div>` : ''}
                    ${inv.customer_phone ? `<div style="font-size:13px;color:#6b7280;margin-top:3px">${inv.customer_phone}</div>` : ''}
                  </td>
                  <td width="50%" style="vertical-align:top">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#10b981;font-weight:600;margin-bottom:8px">Date</div>
                    <div style="font-size:14px;color:#333">${formatDate(inv.created_at)}</div>
                    ${inv.due_date ? `<div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#10b981;font-weight:600;margin-top:16px;margin-bottom:8px">Due Date</div><div style="font-size:14px;color:#333">${formatDate(inv.due_date)}</div>` : ''}
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-radius:12px;overflow:hidden;border:1px solid #d1fae5">
                <tr style="background:#ecfdf5">
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#065f46;text-align:left;font-weight:600">Description</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#065f46;text-align:center;font-weight:600;width:60px">Qty</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#065f46;text-align:right;font-weight:600;width:90px">Price</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#065f46;text-align:right;font-weight:600;width:100px">Total</th>
                </tr>
                ${itemsHTML}
              </table>
              ${totalsHTML.replace(/#2563eb/g, '#10b981').replace(/#1a1a1a/g, '#065f46')}
              ${notesHTML}
            </td></tr>
            <tr><td style="padding:32px 40px 24px;text-align:center;border-top:1px solid #d1fae5;margin-top:40px">
              <span style="font-size:11px;color:#a7f3d0">Powered by Solis OS</span>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`
  }

  if (templateId === 'sunset') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#fff7ed;font-family:Arial,Helvetica,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;padding:32px 0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
            <tr><td style="background:linear-gradient(135deg,#ea580c,#f97316);padding:36px 40px;text-align:center">
              ${logoImg ? `<div style="margin-bottom:16px">${logoImg.replace('display:block', 'display:inline-block')}</div>` : ''}
              <div style="font-size:32px;font-weight:700;color:#fff;letter-spacing:3px">INVOICE</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.75);margin-top:6px">${inv.number}</div>
              <div style="margin-top:12px"><span style="display:inline-block;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;background:rgba(255,255,255,0.2);color:#fff">${inv.status}</span></div>
            </td></tr>
            <tr><td style="padding:36px 40px">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
                <tr>
                  <td width="50%" style="vertical-align:top">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#f97316;font-weight:600;margin-bottom:8px">From</div>
                    <div style="font-size:15px;font-weight:600;color:#1e293b">${fromName}</div>
                    ${fromEmail ? `<div style="font-size:13px;color:#64748b;margin-top:3px">${fromEmail}</div>` : ''}
                    ${fromPhone ? `<div style="font-size:13px;color:#64748b;margin-top:2px">${fromPhone}</div>` : ''}
                    ${fromAddr ? `<div style="font-size:13px;color:#64748b;margin-top:2px">${fromAddr}</div>` : ''}
                  </td>
                  <td width="50%" style="vertical-align:top">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#f97316;font-weight:600;margin-bottom:8px">Bill To</div>
                    <div style="font-size:15px;font-weight:600;color:#1e293b">${inv.customer_name}</div>
                    ${inv.customer_email ? `<div style="font-size:13px;color:#64748b;margin-top:3px">${inv.customer_email}</div>` : ''}
                    ${inv.customer_phone ? `<div style="font-size:13px;color:#64748b;margin-top:2px">${inv.customer_phone}</div>` : ''}
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
                <tr>
                  <td><span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#f97316;font-weight:600">Date</span><br/><span style="font-size:14px;color:#334155">${formatDate(inv.created_at)}</span></td>
                  ${inv.due_date ? `<td><span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#f97316;font-weight:600">Due Date</span><br/><span style="font-size:14px;color:#334155">${formatDate(inv.due_date)}</span></td>` : ''}
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-radius:8px;overflow:hidden;border:1px solid #fed7aa">
                <tr style="background:#f97316">
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#fff;text-align:left;font-weight:600">Description</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#fff;text-align:center;font-weight:600;width:60px">Qty</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#fff;text-align:right;font-weight:600;width:90px">Price</th>
                  <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#fff;text-align:right;font-weight:600;width:100px">Total</th>
                </tr>
                ${itemsHTML}
              </table>
              ${totalsHTML.replace(/#2563eb/g, '#ea580c').replace(/#1a1a1a/g, '#ea580c')}
              ${notesHTML}
            </td></tr>
            <tr><td style="background:#fff7ed;padding:20px 40px;text-align:center;border-top:1px solid #fed7aa">
              <span style="font-size:12px;color:#fdba74">Powered by Solis OS</span>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`
  }

  // Classic template (default)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:${font}">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e5e5">
          <tr><td style="padding:40px 40px 0">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="vertical-align:top">${logoImg}
                  <div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-top:${logoImg ? '10' : '0'}px">${fromName}</div>
                  ${fromEmail ? `<div style="font-size:13px;color:#666;margin-top:3px">${fromEmail}</div>` : ''}
                  ${fromPhone ? `<div style="font-size:13px;color:#666;margin-top:2px">${fromPhone}</div>` : ''}
                  ${fromAddr ? `<div style="font-size:13px;color:#666;margin-top:2px">${fromAddr}</div>` : ''}
                </td>
                <td width="50%" style="vertical-align:top;text-align:right">
                  <div style="font-size:32px;font-weight:700;color:#1a1a1a;letter-spacing:2px">INVOICE</div>
                  <div style="font-size:14px;color:#666;margin-top:4px">${inv.number}</div>
                  <div style="margin-top:10px"><span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;background:${stBg};color:${stFg}">${inv.status}</span></div>
                </td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:24px 40px"><hr style="border:none;border-top:2px solid #eee;margin:0" /></td></tr>
          <tr><td style="padding:0 40px">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td width="50%" style="vertical-align:top">
                  <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#999;font-weight:600;margin-bottom:8px">Bill To</div>
                  <div style="font-size:16px;font-weight:600;color:#1a1a1a">${inv.customer_name}</div>
                  ${inv.customer_email ? `<div style="font-size:13px;color:#666;margin-top:4px">${inv.customer_email}</div>` : ''}
                  ${inv.customer_phone ? `<div style="font-size:13px;color:#666;margin-top:3px">${inv.customer_phone}</div>` : ''}
                </td>
                <td width="50%" style="vertical-align:top">
                  <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#999;font-weight:600;margin-bottom:8px">Date</div>
                  <div style="font-size:14px;color:#333">${formatDate(inv.created_at)}</div>
                  ${inv.due_date ? `<div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#999;font-weight:600;margin-top:16px;margin-bottom:8px">Due Date</div><div style="font-size:14px;color:#333">${formatDate(inv.due_date)}</div>` : ''}
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
              <tr style="border-bottom:2px solid #ddd">
                <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#888;text-align:left;font-weight:600;border-bottom:2px solid #ccc">Description</th>
                <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#888;text-align:center;font-weight:600;border-bottom:2px solid #ccc;width:60px">Qty</th>
                <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#888;text-align:right;font-weight:600;border-bottom:2px solid #ccc;width:90px">Price</th>
                <th style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#888;text-align:right;font-weight:600;border-bottom:2px solid #ccc;width:100px">Total</th>
              </tr>
              ${itemsHTML}
            </table>
            ${totalsHTML}
            ${notesHTML}
          </td></tr>
          <tr><td style="padding:32px 40px 24px;text-align:center;border-top:1px solid #eee;margin-top:40px">
            <span style="font-size:11px;color:#bbb">Powered by Solis OS</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`
}

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
  const [template, setTemplate] = useState('classic')

  // Email config state
  const [emailSetupOpen, setEmailSetupOpen] = useState(false)
  const [emailProvider, setEmailProvider] = useState('gmail')
  const [smtpEmail, setSmtpEmail] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [showSmtpPass, setShowSmtpPass] = useState(false)
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailTesting, setEmailTesting] = useState(false)
  const [emailTestResult, setEmailTestResult] = useState(null)

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
        try {
          const ecResp = await fetch(`${API_BASE}/api/email-config/${biz.id}`)
          if (ecResp.ok) {
            const ec = await ecResp.json()
            if (ec.configured) {
              setEmailProvider(ec.provider || 'gmail')
              setSmtpEmail(ec.email || '')
              setSmtpHost(ec.smtp_host || '')
              setSmtpPort(ec.smtp_port || '587')
              setEmailConfigured(true)
            }
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
    setTemplate(inv.template || 'classic')
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
        template,
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
      template,
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
    setTemplate('classic')
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
        if (!logoSrc.startsWith('data:')) img.crossOrigin = 'anonymous'
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

  const [sendingInvoice, setSendingInvoice] = useState(null)

  const sendViaWhatsApp = async (inv) => {
    const phone = inv.customer_phone?.replace(/[^0-9]/g, '')
    if (!phone) { alert('No customer phone number on this invoice.'); return }
    if (!business?.id) { alert('Business not loaded yet.'); return }

    setSendingInvoice('whatsapp')
    try {
      const canvas = await drawInvoiceCanvas(inv)
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
      const reader = new FileReader()
      const base64 = await new Promise((resolve) => {
        reader.onload = () => {
          const dataUrl = reader.result
          resolve(dataUrl.split(',')[1])
        }
        reader.readAsDataURL(blob)
      })
      const invTotal = calcInvTotal(inv)
      const caption = `Invoice ${inv.number} — ${sym}${invTotal.toFixed(2)}\nFrom: ${inv.business_name || business?.name || ''}\nDue: ${inv.due_date ? formatDate(inv.due_date) : 'N/A'}`
      const resp = await fetch('https://wa.solis-os.com/api/whatsapp/send-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          phone,
          image: base64,
          caption,
        }),
      })
      const data = await resp.json()
      if (data.success || data.messageId) {
        alert('Invoice image sent via WhatsApp!')
        markStatus(inv.id, 'sent')
      } else {
        alert('Could not send: ' + (data.error || 'WhatsApp not connected. Connect in the AI Assistant page first.'))
      }
    } catch (err) {
      alert('Failed to send via WhatsApp: ' + err.message)
    }
    setSendingInvoice(null)
    setShowSendMenu(null)
  }

  const sendViaEmail = async (inv) => {
    const custEmail = inv.customer_email
    if (!custEmail) { alert('No customer email on this invoice.'); return }

    setSendingInvoice('email')
    try {
      const bizName = inv.business_name || business?.name || 'Business'
      const subject = `Invoice ${inv.number} from ${bizName}`
      const invTotal = calcInvTotal(inv)

      const canvas = await drawInvoiceCanvas(inv)
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(blob)
      })

      const resp = await fetch(`${API_BASE}/api/send-invoice-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: custEmail,
          subject,
          from_name: bizName,
          reply_to: business?.email || '',
          invoice_image: base64,
          invoice_number: inv.number,
          total_amount: `${sym}${invTotal.toFixed(2)}`,
          customer_name: inv.customer_name,
          business_id: business?.id || '',
        }),
      })
      const data = await resp.json()
      if (data.success) {
        alert('Invoice PDF emailed to ' + custEmail + '!')
        markStatus(inv.id, 'sent')
      } else {
        alert('Could not send email: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Failed to send email. Please try again.')
    }
    setSendingInvoice(null)
    setShowSendMenu(null)
  }

  const copyInvoice = (inv) => {
    const text = buildInvoiceText(inv)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setShowSendMenu(null)
  }

  const downloadInvoicePDF = (inv) => {
    const html = buildInvoiceHTML(
      inv, sym, inv.template || 'classic',
      business?.name, business?.email, business?.phone, business?.address
    )
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print() }, 400)
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
    const tmpl = inv.template || 'classic'
    const isModern = tmpl === 'modern'
    const isElegant = tmpl === 'elegant'
    const isExecutive = tmpl === 'executive'
    const isFresh = tmpl === 'fresh'
    const isSunset = tmpl === 'sunset'
    const accentColor = isModern ? '#2563eb' : isElegant ? '#c8a45a' : isExecutive ? '#1e293b' : isFresh ? '#10b981' : isSunset ? '#ea580c' : '#1a1a1a'
    const labelColor = isElegant ? '#c8a45a' : isFresh ? '#10b981' : isSunset ? '#f97316' : isExecutive ? '#64748b' : '#888'
    const fontFamily = isElegant ? 'Georgia, Times New Roman, serif' : 'inherit'
    return (
      <div ref={printRef} style={{ fontFamily }}>
        {/* Header: logo + invoice title */}
        {(isModern || isSunset) ? (
          <div style={{ background: isModern ? 'linear-gradient(135deg, #1e40af, #3b82f6)' : 'linear-gradient(135deg, #ea580c, #f97316)', borderRadius: '12px', padding: '32px', marginBottom: '32px', textAlign: 'center', color: '#fff' }}>
            {(inv.logo || businessLogo) && (
              <img src={inv.logo || businessLogo} alt="Logo" style={{ maxHeight: '56px', maxWidth: '120px', objectFit: 'contain', borderRadius: '6px', marginBottom: '12px' }} />
            )}
            <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '3px' }}>INVOICE</div>
            <div style={{ fontSize: '15px', opacity: 0.75, marginTop: '4px' }}>{inv.number}</div>
            <div style={{ marginTop: '10px' }}>
              <span style={{ display: 'inline-block', padding: '4px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', background: 'rgba(255,255,255,0.2)', color: '#fff' }}>{inv.status}</span>
            </div>
          </div>
        ) : isExecutive ? (
          <div style={{ background: '#1e293b', borderRadius: '8px', padding: '32px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {(inv.logo || businessLogo) && (
                <img src={inv.logo || businessLogo} alt="Logo" style={{ maxHeight: '56px', maxWidth: '120px', objectFit: 'contain', borderRadius: '6px', marginBottom: '12px' }} />
              )}
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>{inv.business_name || business?.name || ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '3px', color: '#fff' }}>INVOICE</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>{inv.number}</div>
              <div style={{ marginTop: '10px' }}>
                <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.2)' }}>{inv.status}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: isElegant ? '1px solid #e8e4dc' : '2px solid #eee', paddingBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {(inv.logo || businessLogo) && (
                <img src={inv.logo || businessLogo} alt="Logo" style={{ maxHeight: '72px', maxWidth: '72px', objectFit: 'contain', borderRadius: '6px' }} />
              )}
              <div>
                <div style={{ fontSize: isElegant ? '36px' : '28px', fontWeight: isElegant ? 400 : 700, color: '#1a1a1a', letterSpacing: isElegant ? '4px' : '2px' }}>INVOICE</div>
                <div style={{ fontSize: '15px', color: '#555', marginTop: '2px', letterSpacing: isElegant ? '1px' : undefined }}>{inv.number}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-block', padding: isElegant ? '3px 14px' : '4px 14px', borderRadius: isElegant ? '3px' : '20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                background: isElegant ? 'transparent' : (inv.status === 'paid' ? '#d1fae5' : inv.status === 'sent' ? '#dbeafe' : inv.status === 'overdue' ? '#fee2e2' : '#fef3c7'),
                color: inv.status === 'paid' ? '#065f46' : inv.status === 'sent' ? '#1e40af' : inv.status === 'overdue' ? '#991b1b' : '#92400e',
                border: isElegant ? `1px solid ${inv.status === 'paid' ? '#065f46' : inv.status === 'sent' ? '#1e40af' : inv.status === 'overdue' ? '#991b1b' : '#92400e'}` : 'none',
              }}>{inv.status}</span>
            </div>
          </div>
        )}

        {/* From / Bill To */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
          <div>
            <div style={{ ...labelStyle, color: labelColor, letterSpacing: isElegant ? '2px' : '1px' }}>From</div>
            <div style={valStyle}>
              <div style={{ fontWeight: 600 }}>{inv.business_name || business?.name || '--'}</div>
              {(inv.business_email || business?.email) && <div>{inv.business_email || business?.email}</div>}
              {(inv.business_phone || business?.phone) && <div>{inv.business_phone || business?.phone}</div>}
              {(inv.business_address || business?.address) && <div>{inv.business_address || business?.address}</div>}
            </div>
          </div>
          <div>
            <div style={{ ...labelStyle, color: labelColor, letterSpacing: isElegant ? '2px' : '1px' }}>Bill To</div>
            <div style={valStyle}>
              <div style={{ fontWeight: 600 }}>{inv.customer_name}</div>
              {inv.customer_email && <div>{inv.customer_email}</div>}
              {inv.customer_phone && <div>{inv.customer_phone}</div>}
            </div>
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ ...labelStyle, color: labelColor, letterSpacing: isElegant ? '2px' : '1px' }}>Date</div>
                <div style={{ fontSize: '15px' }}>{formatDate(inv.created_at)}</div>
              </div>
              {inv.due_date && (
                <div>
                  <div style={{ ...labelStyle, color: labelColor, letterSpacing: isElegant ? '2px' : '1px' }}>Due Date</div>
                  <div style={{ fontSize: '15px' }}>{formatDate(inv.due_date)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', borderRadius: isModern ? '8px' : undefined, overflow: isModern ? 'hidden' : undefined, border: isModern ? '1px solid #e2e8f0' : undefined }}>
          <thead>
            <tr style={{ borderBottom: (isModern || isExecutive || isSunset) ? 'none' : `2px solid ${isElegant ? '#e8e4dc' : isFresh ? '#d1fae5' : '#e5e5e5'}`, background: isModern ? '#1e40af' : isExecutive ? '#1e293b' : isSunset ? '#f97316' : isFresh ? '#ecfdf5' : undefined }}>
              <th style={{ textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', letterSpacing: isElegant ? '1.5px' : '1px', color: (isModern || isExecutive || isSunset) ? '#fff' : isFresh ? '#065f46' : labelColor, fontWeight: 600, padding: '12px 10px 12px 0', fontFamily: isElegant ? 'Arial, sans-serif' : undefined }}>Description</th>
              <th style={{ textAlign: 'center', fontSize: '13px', textTransform: 'uppercase', letterSpacing: isElegant ? '1.5px' : '1px', color: (isModern || isExecutive || isSunset) ? '#fff' : isFresh ? '#065f46' : labelColor, fontWeight: 600, padding: '12px 10px', width: '70px', fontFamily: isElegant ? 'Arial, sans-serif' : undefined }}>Qty</th>
              <th style={{ textAlign: 'right', fontSize: '13px', textTransform: 'uppercase', letterSpacing: isElegant ? '1.5px' : '1px', color: (isModern || isExecutive || isSunset) ? '#fff' : isFresh ? '#065f46' : labelColor, fontWeight: 600, padding: '12px 10px', width: '100px', fontFamily: isElegant ? 'Arial, sans-serif' : undefined }}>Price</th>
              <th style={{ textAlign: 'right', fontSize: '13px', textTransform: 'uppercase', letterSpacing: isElegant ? '1.5px' : '1px', color: (isModern || isExecutive || isSunset) ? '#fff' : isFresh ? '#065f46' : labelColor, fontWeight: 600, padding: '12px 0 12px 10px', width: '110px', fontFamily: isElegant ? 'Arial, sans-serif' : undefined }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: isModern && i % 2 === 0 ? '#f8fafc' : undefined }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 8px', fontSize: '22px', fontWeight: 700, borderTop: `2px solid ${accentColor}`, marginTop: '10px', color: isModern ? accentColor : '#1a1a1a' }}>
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

      {/* Email Setup Banner */}
      <div style={{ marginBottom: '16px', borderRadius: '10px', border: `1px solid ${emailConfigured ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`, background: emailConfigured ? 'rgba(34,197,94,0.04)' : 'var(--bg-primary, #fff)', overflow: 'hidden' }}>
        <button
          onClick={() => setEmailSetupOpen(!emailSetupOpen)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={18} style={{ color: emailConfigured ? '#16a34a' : 'var(--accent-bright)' }} />
            {emailConfigured ? (
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>Invoices sent from: </span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{smtpEmail}</span>
              </div>
            ) : (
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Set up your email </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>- Send invoices from your own email address instead of solis.os.support@gmail.com</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {emailSaved && <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>Saved!</span>}
            <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: emailSetupOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
        </button>

        {emailSetupOpen && (
          <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
            {/* Step 1: Provider */}
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-bright)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>1</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>What type of email do you use?</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginLeft: '30px' }}>
                {[
                  { id: 'gmail', label: 'Gmail', desc: '@gmail.com' },
                  { id: 'outlook', label: 'Outlook', desc: '@outlook / @hotmail' },
                  { id: 'yahoo', label: 'Yahoo', desc: '@yahoo.com' },
                  { id: 'custom', label: 'Business Email', desc: '@yourdomain.com' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setEmailProvider(p.id)}
                    style={{
                      padding: '10px 6px', borderRadius: '8px', border: `2px solid ${emailProvider === p.id ? 'var(--accent-bright)' : 'var(--border)'}`,
                      background: emailProvider === p.id ? 'rgba(59,130,246,0.05)' : 'var(--bg)', cursor: 'pointer', textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, color: emailProvider === p.id ? 'var(--accent-bright)' : 'var(--text-primary)' }}>{p.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Instructions */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-bright)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>2</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {emailProvider === 'custom' ? 'Find your email server settings' : 'Get your App Password'}
                </div>
              </div>
              <div style={{ marginLeft: '30px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)', padding: '14px 16px', fontSize: '12px', lineHeight: '1.9', color: 'var(--text-primary)' }}>
                {emailProvider === 'gmail' && (
                  <>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>An App Password is a special password Google creates for you. It's NOT your regular Gmail password.</div>
                    <div><strong>1.</strong> Open <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-bright)', textDecoration: 'underline' }}>myaccount.google.com/security</a> and sign in</div>
                    <div><strong>2.</strong> Find "2-Step Verification" and turn it ON if not already</div>
                    <div><strong>3.</strong> Go back, scroll down and click <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-bright)', textDecoration: 'underline' }}>App Passwords</a></div>
                    <div><strong>4.</strong> Type "Solis OS" as the name, click Create</div>
                    <div><strong>5.</strong> Copy the 16-character password Google shows you and paste it below</div>
                    <div style={{ marginTop: '6px', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', color: '#92400E', fontWeight: 500, fontSize: '11px' }}>
                      Do NOT use your regular Gmail login password. Use the App Password that Google generates.
                    </div>
                  </>
                )}
                {emailProvider === 'outlook' && (
                  <>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>An App Password is a special password Microsoft creates for you. It's NOT your regular Outlook password.</div>
                    <div><strong>1.</strong> Open <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-bright)', textDecoration: 'underline' }}>account.microsoft.com/security</a> and sign in</div>
                    <div><strong>2.</strong> Click "Advanced security options"</div>
                    <div><strong>3.</strong> Turn on "Two-step verification" if not already on</div>
                    <div><strong>4.</strong> Scroll to "App passwords" and click "Create a new app password"</div>
                    <div><strong>5.</strong> Copy the password and paste it below</div>
                    <div style={{ marginTop: '6px', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', color: '#92400E', fontWeight: 500, fontSize: '11px' }}>
                      Do NOT use your regular Outlook login password. Use the App Password that Microsoft generates.
                    </div>
                  </>
                )}
                {emailProvider === 'yahoo' && (
                  <>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>An App Password is a special password Yahoo creates for you. It's NOT your regular Yahoo password.</div>
                    <div><strong>1.</strong> Go to <a href="https://login.yahoo.com/myaccount/security" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-bright)', textDecoration: 'underline' }}>Yahoo Account Security</a> and sign in</div>
                    <div><strong>2.</strong> Turn on "Two-step verification" if not already on</div>
                    <div><strong>3.</strong> Click "Generate app password"</div>
                    <div><strong>4.</strong> Select "Other App", type "Solis OS"</div>
                    <div><strong>5.</strong> Copy the password Yahoo shows you and paste it below</div>
                  </>
                )}
                {emailProvider === 'custom' && (
                  <>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>For business emails like sales@yourbusiness.com, you need your email server details.</div>
                    <div><strong>Where to find this:</strong> Log in to your hosting panel (cPanel, GoDaddy, Namecheap, etc.)</div>
                    <div><strong>Look for:</strong> "Email Accounts" or "Email Settings" or "SMTP Configuration"</div>
                    <div><strong>You need:</strong> SMTP server address (usually mail.yourdomain.com) and your email password</div>
                    <div style={{ marginTop: '6px', padding: '8px 12px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                      Common SMTP servers: mail.yourdomain.com or smtp.yourdomain.com. If unsure, ask your hosting provider for your "SMTP settings".
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Step 3: Enter details */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-bright)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>3</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Enter your details and save</div>
              </div>
              <div style={{ marginLeft: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Your Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={smtpEmail}
                    onChange={(e) => setSmtpEmail(e.target.value)}
                    placeholder={emailProvider === 'gmail' ? 'your@gmail.com' : emailProvider === 'outlook' ? 'your@outlook.com' : emailProvider === 'yahoo' ? 'your@yahoo.com' : 'sales@yourbusiness.com'}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>{emailProvider === 'custom' ? 'Email Password' : 'App Password (from Step 2)'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSmtpPass ? 'text' : 'password'}
                      className="form-input"
                      style={{ paddingRight: '36px' }}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder={emailConfigured ? '(saved - enter new to change)' : emailProvider === 'custom' ? 'Your email password' : 'Paste app password here'}
                    />
                    <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                      {showSmtpPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {emailProvider === 'custom' && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>SMTP Server Address</label>
                      <input type="text" className="form-input" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="mail.yourdomain.com" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Port</label>
                      <select className="form-select" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)}>
                        <option value="587">587 (TLS - most common)</option>
                        <option value="465">465 (SSL)</option>
                        <option value="25">25 (Unencrypted)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {emailTestResult && (
                <div style={{ marginLeft: '30px', marginTop: '10px', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: emailTestResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', color: emailTestResult.success ? '#16a34a' : '#ef4444', border: `1px solid ${emailTestResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  {emailTestResult.success ? 'Test email sent! Check your inbox to confirm it works.' : emailTestResult.error}
                </div>
              )}

              <div style={{ marginLeft: '30px', marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={emailSaving || !smtpEmail}
                  onClick={async () => {
                    if (!business || !smtpEmail) return
                    if (!emailConfigured && !smtpPassword) { alert('Please enter your app password.'); return }
                    setEmailSaving(true); setEmailTestResult(null)
                    try {
                      const payload = { provider: emailProvider, email: smtpEmail }
                      if (smtpPassword) payload.password = smtpPassword
                      else if (emailConfigured) payload.password = '__KEEP__'
                      if (emailProvider === 'custom') { payload.smtp_host = smtpHost; payload.smtp_port = smtpPort }
                      const resp = await fetch(`${API_BASE}/api/email-config/${business.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                      const data = await resp.json()
                      if (data.success) { setEmailConfigured(true); setEmailSaved(true); setTimeout(() => setEmailSaved(false), 3000) }
                      else alert(data.error || 'Failed to save')
                    } catch { alert('Failed to save email settings') }
                    setEmailSaving(false)
                  }}
                >
                  {emailSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '12px' }}
                  disabled={emailTesting || !emailConfigured}
                  onClick={async () => {
                    if (!business) return
                    setEmailTesting(true); setEmailTestResult(null)
                    try {
                      const resp = await fetch(`${API_BASE}/api/email-config/${business.id}/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test_to: smtpEmail }) })
                      const data = await resp.json()
                      setEmailTestResult(data.success ? { success: true } : { error: data.error || 'Test failed' })
                    } catch { setEmailTestResult({ error: 'Connection error. Try again.' }) }
                    setEmailTesting(false)
                  }}
                >
                  {emailTesting ? 'Sending...' : 'Send Test Email'}
                </button>
                {emailConfigured && (
                  <button
                    className="btn btn-sm"
                    style={{ color: '#ef4444', background: 'none', border: '1px solid rgba(239,68,68,0.3)', fontSize: '12px' }}
                    onClick={async () => {
                      if (!business || !confirm('Remove email settings? Invoices will be sent from the default Solis OS email.')) return
                      try { await fetch(`${API_BASE}/api/email-config/${business.id}`, { method: 'DELETE' }) } catch {}
                      setEmailConfigured(false); setSmtpEmail(''); setSmtpPassword(''); setSmtpHost(''); setSmtpPort('587'); setEmailProvider('gmail'); setEmailTestResult(null)
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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

          {/* Template selector */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={14} /> Invoice Template
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {INVOICE_TEMPLATES.map(t => (
                <button key={t.id} type="button" onClick={() => setTemplate(t.id)}
                  style={{
                    flex: '1 1 140px', padding: '12px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    border: template === t.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: template === t.id ? 'rgba(59,130,246,0.05)' : 'var(--bg)',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: template === t.id ? 'var(--accent)' : 'var(--text)' }}>{t.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.desc}</div>
                </button>
              ))}
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
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{viewInvoice.number}</span>
                {statusBadge(viewInvoice.status)}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewInvoice(null)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setShowSendMenu(showSendMenu === viewInvoice.id ? null : viewInvoice.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Send size={14} /> Send <ChevronDown size={12} />
                </button>
                {showSendMenu === viewInvoice.id && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px', minWidth: '200px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)', zIndex: 10,
                  }}>
                    <button className="btn btn-ghost btn-sm" disabled={!!sendingInvoice} style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', padding: '10px 12px' }} onClick={() => sendViaWhatsApp(viewInvoice)}>
                      <MessageCircle size={16} style={{ color: '#25D366' }} /> {sendingInvoice === 'whatsapp' ? 'Sending...' : 'Send via WhatsApp'}
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={!!sendingInvoice} style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', padding: '10px 12px' }} onClick={() => sendViaEmail(viewInvoice)}>
                      <Mail size={16} style={{ color: 'var(--accent-bright)' }} /> {sendingInvoice === 'email' ? 'Sending...' : 'Send via Email'}
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', padding: '10px 12px' }} onClick={() => copyInvoice(viewInvoice)}>
                      {copied ? <Check size={16} style={{ color: 'var(--green)' }} /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                    <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', padding: '10px 12px' }} onClick={() => downloadInvoicePDF(viewInvoice)}>
                      <Download size={16} style={{ color: 'var(--green)' }} /> Download / Print PDF
                    </button>
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
                  <CheckCircle2 size={14} /> Paid
                </button>
              )}
            </div>
          </div>

          {/* Template switcher */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
            <Palette size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>Template:</span>
            {INVOICE_TEMPLATES.map(t => (
              <button key={t.id} className="btn btn-ghost btn-sm"
                onClick={() => {
                  const updated = { ...viewInvoice, template: t.id }
                  setViewInvoice(updated)
                  saveInvoices(invoices.map(inv => inv.id === updated.id ? updated : inv))
                }}
                style={{
                  padding: '4px 12px', fontSize: '12px',
                  background: (viewInvoice.template || 'classic') === t.id ? 'var(--accent)' : undefined,
                  color: (viewInvoice.template || 'classic') === t.id ? '#fff' : undefined,
                  borderRadius: '16px',
                }}>
                {t.name}
              </button>
            ))}
          </div>

          {/* Professional invoice template */}
          <div style={{
            background: '#fff', color: '#1a1a1a', borderRadius: 'var(--radius)', padding: 'clamp(16px, 4vw, 40px)',
            border: `1px solid ${(viewInvoice.template || 'classic') === 'elegant' ? '#e8e4dc' : (viewInvoice.template || 'classic') === 'fresh' ? '#d1fae5' : (viewInvoice.template || 'classic') === 'sunset' ? '#fed7aa' : '#e5e5e5'}`,
            borderTop: (viewInvoice.template || 'classic') === 'elegant' ? '4px solid #c8a45a' : (viewInvoice.template || 'classic') === 'modern' ? '4px solid #2563eb' : (viewInvoice.template || 'classic') === 'executive' ? '4px solid #1e293b' : (viewInvoice.template || 'classic') === 'fresh' ? '4px solid #10b981' : (viewInvoice.template || 'classic') === 'sunset' ? '4px solid #f97316' : '1px solid #e5e5e5',
            overflowX: 'auto',
          }}>
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

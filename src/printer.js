// Non-blocking Hidden Iframe Thermal Receipt & Report Printer (Instant POS Performance)
export function formatCurrency(amount) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

export function formatDateTime(isoString) {
  const d = isoString ? new Date(isoString) : new Date();
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getPrintIframe() {
  let iframe = document.getElementById('receipt-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }
  return iframe;
}

// 1. พิมพ์ใบคิวสั่งอาหาร (Queue Ticket Only) หรือ ใบเสร็จเต็มรูป
export function printReceipt(order, type = 'queue', storeProfile = {}) {
  const iframe = getPrintIframe();
  const storeName = storeProfile.name || 'POS Store';
  const storeBranch = storeProfile.branch || 'Counter Terminal';
  const footerNote = storeProfile.footerNote || '*** กรุณารอเรียกหมายเลขคิว ขอบคุณครับ ***';

  const itemsHtml = (order.order_items || []).map(item => `
    <tr>
      <td style="text-align: left; padding: 4px 0; font-size: 14px;">
        <strong>${item.name}</strong>
        ${item.options ? `<div style="font-size: 12px; color: #333; margin-top: 2px;">• ${item.options}</div>` : ''}
      </td>
      <td style="text-align: right; padding: 4px 0; font-size: 15px; font-weight: bold; vertical-align: top;">x${item.qty}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>คิว: ${order.order_number}</title>
      <style>
        @page {
          margin: 0;
          size: 80mm auto;
        }
        body {
          font-family: 'Courier New', Courier, monospace, 'Sarabun', sans-serif;
          font-size: 14px;
          line-height: 1.3;
          margin: 0;
          padding: 12px 14px;
          color: #000;
          background: #fff;
          width: 280px;
        }
        .text-center { text-align: center; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .queue-badge {
          font-size: 42px;
          font-weight: 900;
          letter-spacing: 2px;
          margin: 6px 0;
          padding: 4px;
          border: 3px solid #000;
          display: inline-block;
          border-radius: 8px;
        }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        .footer-note { font-size: 12px; margin-top: 10px; text-align: center; font-weight: bold; }
        @media print {
          body { width: 100%; padding: 4px; }
        }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h2 style="margin: 0; font-size: 18px;">${storeName}</h2>
        <div style="font-size: 12px; margin-top: 2px;">${storeBranch}</div>
        <div class="divider"></div>
        <div style="font-size: 14px;">หมายเลขคิวของคุณ</div>
        <div class="queue-badge">${order.order_number}</div>
        <div style="font-size: 11px; color: #444;">${formatDateTime(order.created_at)}</div>
      </div>

      <div class="divider"></div>
      <div style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">รายการอาหาร/เครื่องดื่ม:</div>
      <table>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>
      <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold;">
        <span>ยอดรวม:</span>
        <span>${Number(order.total_amount).toFixed(2)} ฿</span>
      </div>

      <div class="divider"></div>
      <div class="footer-note">
        ${footerNote}
      </div>
    </body>
    </html>
  `;

  const frameDoc = iframe.contentWindow || iframe.contentDocument;
  const doc = frameDoc.document || frameDoc;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.warn('Silent print fallback', e);
    }
  }, 100);
}

// 2. พิมพ์สรุปยอดขายประจำวัน (Daily Sales Summary Report 80mm)
export function printSalesReport(reportData, storeProfile = {}) {
  const iframe = getPrintIframe();
  const storeName = storeProfile.name || 'POS Store';
  const storeBranch = storeProfile.branch || 'Counter Terminal';

  const ordersRows = (reportData.orders || []).map(ord => {
    const time = (ord.created_at ? new Date(ord.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-');
    const itemsCount = (ord.order_items || []).reduce((sum, i) => sum + i.qty, 0);
    return `
      <tr>
        <td style="padding: 2px 0;">${time}</td>
        <td style="padding: 2px 0; font-weight: bold;">${ord.order_number}</td>
        <td style="padding: 2px 0; text-align: center;">${itemsCount} ชิ้น</td>
        <td style="padding: 2px 0; text-align: right; font-weight: bold;">${Number(ord.total_amount).toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>สรุปยอดขาย</title>
      <style>
        @page {
          margin: 0;
          size: 80mm auto;
        }
        body {
          font-family: 'Courier New', Courier, monospace, 'Sarabun', sans-serif;
          font-size: 13px;
          line-height: 1.3;
          margin: 0;
          padding: 12px 14px;
          color: #000;
          background: #fff;
          width: 280px;
        }
        .text-center { text-align: center; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .double-divider { border-top: 2px solid #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 12px; }
        @media print {
          body { width: 100%; padding: 4px; }
        }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h2 style="margin: 0; font-size: 17px;">รายงานสรุปยอดขาย</h2>
        <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">${storeName}</div>
        <div style="font-size: 11px; color: #444;">${storeBranch}</div>
        <div style="font-size: 11px; color: #444; margin-top: 2px;">วันที่พิมพ์: ${formatDateTime(new Date())}</div>
      </div>

      <div class="double-divider"></div>
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
        <span>จำนวนบิลทั้งหมด:</span>
        <strong style="font-size: 15px;">${reportData.totalOrders} บิล</strong>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
        <span>ยอดเฉลี่ยต่อบิล:</span>
        <strong>${Number(reportData.avgOrder).toFixed(2)} ฿</strong>
      </div>
      <div class="divider"></div>
      <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
        <span>ยอดขายรวมสุทธิ:</span>
        <span style="font-size: 18px;">${Number(reportData.totalRevenue).toFixed(2)} ฿</span>
      </div>
      <div class="double-divider"></div>

      <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px;">ประวัติบิลออเดอร์:</div>
      <table>
        <thead>
          <tr style="border-bottom: 1px dashed #000;">
            <th style="text-align: left; padding-bottom: 3px;">เวลา</th>
            <th style="text-align: left; padding-bottom: 3px;">คิว</th>
            <th style="text-align: center; padding-bottom: 3px;">จำนวน</th>
            <th style="text-align: right; padding-bottom: 3px;">บาท</th>
          </tr>
        </thead>
        <tbody>
          ${ordersRows || '<tr><td colspan="4" style="text-align:center;">ไม่มีรายการ</td></tr>'}
        </tbody>
      </table>

      <div class="divider"></div>
      <div style="text-align: center; font-size: 11px; margin-top: 8px;">
        *** จบรายงานสรุปยอดขายประจำวัน ***
      </div>
    </body>
    </html>
  `;

  const frameDoc = iframe.contentWindow || iframe.contentDocument;
  const doc = frameDoc.document || frameDoc;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.warn('Silent report print fallback', e);
    }
  }, 100);
}

/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  const app = $app;
  const record = e.record;
  
  // Extract customer information (handle field name variations)
  const customerName = record.get("customer_name") || record.get("name") || "Customer";
  const customerEmail = record.get("customer_email") || record.get("email") || "";
  const customerPhone = record.get("customer_phone") || record.get("phone") || "";
  const shippingAddress = record.get("shipping_address") || "";
  const billingAddress = record.get("billing_address") || "";
  const orderNumber = record.get("order_number") || record.id;
  const subtotal = record.get("subtotal") || 0;
  const tax = record.get("tax") || 0;
  const total = record.get("total") || 0;
  const paymentMethod = record.get("payment_method") || "Not specified";
  const paymentStatus = record.get("payment_status") || "Pending";
  const orderStatus = record.get("order_status") || "Processing";
  const notes = record.get("notes") || "";
  
  // Parse order items — JSON fields come back as a Goja-wrapped value, not a
  // real JS array, so always coerce through the raw string.
  let orderItems = [];
  try {
    const raw = record.getString("order_items");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) orderItems = parsed;
      else if (parsed && typeof parsed === "object") orderItems = [parsed];
    }
  } catch (err) {
    console.log("Failed to parse order_items: " + err.message);
  }
  
  // Fetch product details for each order item
  let itemsWithDetails = [];
  if (Array.isArray(orderItems) && orderItems.length > 0) {
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const productId = item.productId || item.product_id || "";
      const quantity = item.quantity || 1;
      const price = item.price || 0;
      const itemTotal = quantity * price;
      
      let productName = item.productName || item.product_name || "Unknown Product";
      
      // Try to fetch product details if we have a product ID
      if (productId) {
        try {
          const product = app.findRecordById("products", productId);
          if (product) {
            productName = product.get("name") || productName;
          }
        } catch (err) {
          // Product not found, use item name
        }
      }
      
      itemsWithDetails.push({
        name: productName,
        quantity: quantity,
        price: price,
        total: itemTotal
      });
    }
  }
  
  // Build order items table HTML
  let itemsTableHtml = "";
  if (itemsWithDetails.length > 0) {
    itemsTableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f5f5f5; border-bottom: 2px solid #ddd;">
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Product</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Quantity</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Price</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    for (let i = 0; i < itemsWithDetails.length; i++) {
      const item = itemsWithDetails[i];
      itemsTableHtml += `
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(item.name)}</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">$${item.price.toFixed(2)}</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">$${item.total.toFixed(2)}</td>
          </tr>
      `;
    }
    
    itemsTableHtml += `
        </tbody>
      </table>
    `;
  }
  
  // Helper function to escape HTML
  function escapeHtml(text) {
    if (!text) return "";
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
  }
  
  // Admin notification email
  const adminEmailHtml = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .section { margin: 20px 0; }
          .section-title { font-weight: bold; font-size: 14px; color: #2c3e50; margin-bottom: 10px; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
          .info-row { display: flex; margin: 8px 0; }
          .info-label { font-weight: bold; width: 150px; color: #555; }
          .info-value { flex: 1; color: #333; }
          .totals { background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .total-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
          .total-final { display: flex; justify-content: space-between; margin: 12px 0; font-size: 16px; font-weight: bold; color: #27ae60; border-top: 2px solid #bdc3c7; padding-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #7f8c8d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Order Received</h1>
            <p>Order #${escapeHtml(orderNumber)}</p>
          </div>
          <div class="content">
            <div class="section">
              <div class="section-title">Customer Information</div>
              <div class="info-row">
                <div class="info-label">Name:</div>
                <div class="info-value">${escapeHtml(customerName)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Email:</div>
                <div class="info-value">${escapeHtml(customerEmail)}</div>
              </div>
              ${customerPhone ? `
              <div class="info-row">
                <div class="info-label">Phone:</div>
                <div class="info-value">${escapeHtml(customerPhone)}</div>
              </div>
              ` : ""}
            </div>
            
            <div class="section">
              <div class="section-title">Shipping & Billing</div>
              ${shippingAddress ? `
              <div class="info-row">
                <div class="info-label">Shipping:</div>
                <div class="info-value">${escapeHtml(shippingAddress)}</div>
              </div>
              ` : ""}
              ${billingAddress ? `
              <div class="info-row">
                <div class="info-label">Billing:</div>
                <div class="info-value">${escapeHtml(billingAddress)}</div>
              </div>
              ` : ""}
            </div>
            
            <div class="section">
              <div class="section-title">Order Items</div>
              ${itemsTableHtml}
            </div>
            
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              ${tax > 0 ? `
              <div class="total-row">
                <span>Tax:</span>
                <span>$${tax.toFixed(2)}</span>
              </div>
              ` : ""}
              <div class="total-final">
                <span>Total:</span>
                <span>$${total.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">Payment & Status</div>
              <div class="info-row">
                <div class="info-label">Payment Method:</div>
                <div class="info-value">${escapeHtml(paymentMethod)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Payment Status:</div>
                <div class="info-value">${escapeHtml(paymentStatus)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Order Status:</div>
                <div class="info-value">${escapeHtml(orderStatus)}</div>
              </div>
            </div>
            
            ${notes ? `
            <div class="section">
              <div class="section-title">Notes</div>
              <div class="info-value">${escapeHtml(notes)}</div>
            </div>
            ` : ""}
            
            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  
  // Customer confirmation email
  const customerEmailHtml = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .section { margin: 20px 0; }
          .section-title { font-weight: bold; font-size: 14px; color: #27ae60; margin-bottom: 10px; border-bottom: 2px solid #27ae60; padding-bottom: 5px; }
          .info-row { display: flex; margin: 8px 0; }
          .info-label { font-weight: bold; width: 150px; color: #555; }
          .info-value { flex: 1; color: #333; }
          .totals { background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .total-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
          .total-final { display: flex; justify-content: space-between; margin: 12px 0; font-size: 16px; font-weight: bold; color: #27ae60; border-top: 2px solid #bdc3c7; padding-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #7f8c8d; }
          .thank-you { font-size: 16px; color: #27ae60; font-weight: bold; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
            <p>Order #${escapeHtml(orderNumber)}</p>
          </div>
          <div class="content">
            <p>Dear ${escapeHtml(customerName)},</p>
            
            <p class="thank-you">Thank you for your order! We've received it and will process it shortly.</p>
            
            <div class="section">
              <div class="section-title">Order Summary</div>
              ${itemsTableHtml}
            </div>
            
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              ${tax > 0 ? `
              <div class="total-row">
                <span>Tax:</span>
                <span>$${tax.toFixed(2)}</span>
              </div>
              ` : ""}
              <div class="total-final">
                <span>Total:</span>
                <span>$${total.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">Shipping Address</div>
              <div class="info-value">${escapeHtml(shippingAddress || "Not provided")}</div>
            </div>
            
            <div class="section">
              <div class="section-title">Payment Method</div>
              <div class="info-value">${escapeHtml(paymentMethod)}</div>
            </div>
            
            <p>We'll send you a tracking number as soon as your order ships. If you have any questions, please don't hesitate to contact us.</p>
            
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>This is an automated confirmation. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  
  // Send emails with error handling
  try {
    // Send admin notification
    try {
      const adminMessage = new MailerMessage({
        from: {
          address: app.settings().meta.senderAddress,
          name: app.settings().meta.senderName
        },
        to: [{ address: "corevialabsca@gmail.com" }],
        subject: "New Order Received - Order #" + orderNumber,
        html: adminEmailHtml
      });
      app.newMailClient().send(adminMessage);
    } catch (adminErr) {
      console.log("Admin email failed: " + adminErr.message);
    }

    // Send customer confirmation
    if (customerEmail) {
      try {
        const customerMessage = new MailerMessage({
          from: {
            address: app.settings().meta.senderAddress,
            name: app.settings().meta.senderName
          },
          to: [{ address: customerEmail }],
          subject: "Order Confirmation - Order #" + orderNumber,
          html: customerEmailHtml
        });
        app.newMailClient().send(customerMessage);
      } catch (customerErr) {
        console.log("Customer email failed: " + customerErr.message);
      }
    }
  } catch (err) {
    console.log("Email sending error: " + err.message);
  }
  
  e.next();
}, "orders");
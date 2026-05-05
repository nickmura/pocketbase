/// <reference path="../pb_data/types.d.ts" />
onRecordCreate((e) => {
  try {
    // Find the latest order by creation date
    const latestOrders = $app.findRecordsByFilter(
      "orders",
      "",
      "-created",
      1,
      0
    );
    const latestOrder = latestOrders.length ? latestOrders[0] : null;

    let nextNumber = 43500; // Default starting number

    if (latestOrder) {
      // Extract numeric portion from existing order number (e.g., "CLP 43500" -> 43500)
      const orderNumberStr = latestOrder.get("order_number");
      if (orderNumberStr) {
        const match = orderNumberStr.match(/\d+/);
        if (match) {
          nextNumber = parseInt(match[0]) + 1;
        }
      }
    }

    // Format as "CLP XXXXX"
    const newOrderNumber = "CLP " + nextNumber;
    e.record.set("order_number", newOrderNumber);
  } catch (error) {
    // Fallback: generate random order number if lookup fails
    const randomNum = 43500 + Math.floor(Math.random() * 100000);
    e.record.set("order_number", "CLP " + randomNum);
  }

  e.next();
}, "orders");
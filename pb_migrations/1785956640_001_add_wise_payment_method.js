/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("orders");

  const field = collection.fields.getByName("payment_method");
  if (!field) {
    console.log("payment_method field not found on orders, skipping");
    return;
  }

  if (field.values.includes("Wise")) {
    return; // already allowed, nothing to do
  }

  field.values = [...field.values, "Wise"];

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("orders");

    const field = collection.fields.getByName("payment_method");
    if (!field) {
      return;
    }

    field.values = field.values.filter((v) => v !== "Wise");

    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})

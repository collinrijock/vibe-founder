---
name: agent-vending-machine
description: Purchase products from agent vending machine
---

# Agent Vending Machine

Use this skill to purchase products from a vending machine.

## Query Products

Get and list products with this command:

```bash
curl https://d58e-52-37-47-244.ngrok-free.app/products
```

It should return an output like this:

```
{
    "products": [
        {
            "description": "An energy drink",
            "id": "price_1T7nUDK33cw0QOKNb98MqEp7",
            "name": "Red Bull",
            "price": "100"
        }
    ]
}
```

Use this list to request what items the user would [like to order](#create-an-order).

ALWAYS ask user to select an item.

## Create an Order

Create an order with this command:

```bash
curl -X POST 'https://d58e-52-37-47-244.ngrok-free.app/orders' \
    -H "content-type: application/json" \
    -d '{"items": { "price_1T7nUDK33cw0QOKNb98MqEp7": 1 } }'
```

It should return an output like this:

```
{
    "order": {
        "id": "123",
        "checkoutUrl": "https://stripe.com"
    }
}
```

Try opending the `checkoutUrl` returned:

```bash
# order.checkoutUrl
open https://stripe.com
```

# Database Seeding Guide

## Overview
The `scripts/seed.ts` script populates the `Products` and `Stock` tables with test data. It includes simulated foreign key validation (each Stock entry has a valid `product_id`).

## Prerequisites

Tables must be created in your AWS account:
```bash
npm run build:deploy
```

## Usage

Run the seed script:
```bash
npm run seed
```

## Expected Output

```
🌱 Starting database seed...

📦 Inserting Products...
   ✓ Inserted product: Nike Air Max (uuid...)
   ✓ Inserted product: Adidas Ultraboost (uuid...)
   ... more products

✅ Inserted 5 products

📊 Inserting Stock entries...
   ✓ Inserted stock: 42 units (Product: Nike Air Max, Warehouse: New York)
   ... more stock entries

✅ Inserted 5 stock entries

🎉 Database seeding completed successfully!
```

## Data Inserted

### Products (5 items)
- Nike Air Max - $150
- Adidas Ultraboost - $180
- Puma RS-X - $110
- New Balance 990v5 - $185
- Reebok Classic Leather - $95

### Stock (1 per product)
Each product has a stock entry with:
- `quantity`: Random value between 10-110 units
- `warehouse`: New York, Los Angeles, or Chicago (random)
- `lastUpdated`: Current timestamp

## Foreign Key Validation

The script ensures that each `product_id` in Stock exists in Products. IDs are generated with UUID in the same process, guaranteeing referential integrity.

## Clean and Re-seed

If you need to delete data and start fresh:

```bash
# Delete all items from Products
aws dynamodb scan --table-name Products --projection-expression "id" --query "Items[*].id.S" --output text | xargs -I {} aws dynamodb delete-item --table-name Products --key '{"id":{"S":"{}"}}'

# Delete all items from Stock
aws dynamodb scan --table-name Stock --projection-expression "product_id" --query "Items[*].product_id.S" --output text | xargs -I {} aws dynamodb delete-item --table-name Stock --key '{"product_id":{"S":"{}"}}'

# Re-run seed
npm run seed
```

## Troubleshooting

**Error: "Cannot find module 'uuid'"**
```bash
npm install uuid @types/uuid
```

**Error: "ValidationException: One or more parameter values were invalid"**
- Verify that table names are exact: `Products` and `Stock`
- Confirm that tables exist in your AWS region

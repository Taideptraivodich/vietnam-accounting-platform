# Known Non-goals — MD01/EW01 Preseed v1.1

This patch does not:

```text
change EW accounting business logic
change Accounting Engine posting rules
weaken NOT NULL constraints
add database default hacks
use production data
fake UUIDs
bypass MD-01 seed
open P1/P2 scope
merge production
implement INT-01B approved-surface adapter bindings
```

VAT / AR / AP account creation is not added here because the existing MD01/EW01 preseed package is responsible only for company, inventory, COGS, revenue, purchase expense, and GRNI baseline accounts. If a later approved dispatch makes VAT / AR / AP account IDs required, this script should be extended with explicit subtype mappings using existing EW-01 subtype enum values.

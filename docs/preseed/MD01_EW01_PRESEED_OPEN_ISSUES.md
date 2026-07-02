# MD01/EW01 Preseed Open Issues P0 v1.1

```text
No known MD01/EW01 account_subtype implementation issue remains in this patch package.
```

Gate status remains:

```text
Final Integration Gate v1.0.3: BLOCKED until LOCAL-ASSEMBLY-01 rerun completes and INT-01B approved-surface adapter binding is applied.
Production merge: NOT ALLOWED.
```

Potential downstream issue if encountered:

```text
If EW-01 account_subtype is enum-typed and uses enum labels different from the dispatched subtype names, the script will fail closed with the enum label list. Senior must approve any mapping change.
```
